// Cloudflare Pages Function: POST /api/auth/login
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeUser } from "../../lib/utils";
import { generateToken, comparePassword } from "../../lib/auth";
import type { AuthResponse } from "@shared/schema";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export async function onRequestPost(context: EventContext) {
  try {
    const body = await parseBody(context.request);
    const validatedData = loginSchema.parse(body);
    
    // Query user from D1 database
    const user = await context.env.DB
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(validatedData.email)
      .first();
    
    if (!user) {
      return errorResponse("Email ou senha incorretos", 401);
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.password as string
    );
    
    if (!isPasswordValid) {
      return errorResponse("Email ou senha incorretos", 401);
    }
    
    // Normalize D1 row to camelCase (without password)
    const userObj = normalizeUser(user, false);
    
    // Generate JWT token (async with Cloudflare Workers JWT library)
    const token = await generateToken(userObj, context.env.JWT_SECRET);
    
    const response: AuthResponse = {
      user: userObj,
      token,
    };
    
    return jsonResponse(response);
  } catch (error) {
    console.error("Login error:", error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    
    return handleError(error);
  }
}
