// Cloudflare Pages Function: POST /api/auth/login-password
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeUser, toBoolean } from "../../lib/utils";
import { generateToken, comparePassword } from "../../lib/auth";
import type { AuthResponse } from "@shared/schema";

const loginPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export async function onRequestPost(context: EventContext) {
  try {
    const body = await parseBody(context.request);
    const validatedData = loginPasswordSchema.parse(body);
    
    // Query user from D1 database (with password for verification)
    const user = await context.env.DB
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(validatedData.email)
      .first();
    
    if (!user) {
      return errorResponse("Email ou senha incorretos", 401);
    }
    
    // Check if user has a password set
    // Note: D1 returns unknown types, defensive casting required
    const hasPassword = toBoolean(user.has_password as any);
    if (!hasPassword) {
      return errorResponse(
        "Você ainda não definiu uma senha. Use o código de verificação para fazer login.",
        400
      );
    }
    
    // Verify password (password field is guaranteed to exist if hasPassword is true)
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.password as string
    );
    
    if (!isPasswordValid) {
      return errorResponse("Email ou senha incorretos", 401);
    }
    
    // Normalize user data (without password)
    // Note: D1.first() returns Record<string, unknown> which requires 'as any' cast
    // normalizeUser performs defensive type conversion (toBoolean, null checks)
    const userObj = normalizeUser(user as any, false);
    
    if (!userObj) {
      return errorResponse("Erro ao processar dados do usuário", 500);
    }
    
    // Generate JWT token
    const token = await generateToken(userObj, context.env.JWT_SECRET);
    
    const response: AuthResponse = {
      user: userObj,
      token,
    };
    
    return jsonResponse(response);
  } catch (error) {
    console.error("Login password error:", error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    
    return handleError(error);
  }
}
