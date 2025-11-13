// Authentication utilities for Cloudflare Functions
import jwt from "@tsndr/cloudflare-worker-jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { User } from "@shared/schema";
import type { EventContext, AuthUser, AuthContext } from "./types";

// Runtime validation schema for JWT payload
const authUserSchema = z.object({
  sub: z.string(),
  id: z.number(),
  fullName: z.string(),
  email: z.string().email(),
  hasPassword: z.boolean(),
  photoUrl: z.string().nullable(),
  birthdate: z.string().nullable(),
  isAdmin: z.boolean(),
  isMember: z.boolean(),
  activeMember: z.boolean(),
  exp: z.number(),
});

export async function generateToken(user: Omit<User, "password">, jwtSecret: string): Promise<string> {
  // Include all AuthUser fields in JWT payload to avoid re-querying DB on every request
  const payload = {
    sub: String(user.id), // Standard JWT claim for subject (user ID)
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    hasPassword: user.hasPassword,
    photoUrl: user.photoUrl,
    birthdate: user.birthdate,
    isAdmin: user.isAdmin,
    isMember: user.isMember,
    activeMember: user.activeMember,
    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours expiry
  };
  
  return await jwt.sign(payload, jwtSecret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function authenticateToken(context: EventContext): Promise<AuthUser | null> {
  const authHeader = context.request.headers.get("authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return null;
  }

  try {
    // Verify JWT signature
    const isValid = await jwt.verify(token, context.env.JWT_SECRET);
    if (!isValid) return null;
    
    // Decode and validate payload structure
    const { payload } = jwt.decode(token);
    const validatedPayload = authUserSchema.safeParse(payload);
    
    if (!validatedPayload.success) {
      console.error("[Auth] Invalid JWT payload structure:", validatedPayload.error);
      return null;
    }
    
    return validatedPayload.data as AuthUser;
  } catch (error) {
    console.error("[Auth] Token verification error:", error);
    return null;
  }
}

export async function requireAuth(context: EventContext): Promise<Response | AuthUser> {
  const user = await authenticateToken(context);
  
  if (!user) {
    return new Response(
      JSON.stringify({ message: "Token não fornecido ou inválido" }), 
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  return user;
}

export function requireAdmin(user: AuthUser): Response | null {
  if (!user.isAdmin) {
    return new Response(
      JSON.stringify({ message: "Acesso negado: apenas administradores" }), 
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}

export function requireMember(user: AuthUser): Response | null {
  if (!user.isMember && !user.isAdmin) {
    return new Response(
      JSON.stringify({ message: "Acesso negado: apenas membros" }), 
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}

// Helper to create an AuthContext from EventContext
export function createAuthContext<T = unknown>(
  context: EventContext<T>,
  user: AuthUser
): AuthContext<T> {
  return {
    ...context,
    user,
  };
}
