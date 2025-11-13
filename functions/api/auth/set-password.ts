// Cloudflare Pages Function: POST /api/auth/set-password
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeUser, toInt } from "../../lib/utils";
import { requireAuth, generateToken, hashPassword } from "../../lib/auth";
import type { AuthResponse } from "@shared/schema";
import type { AuthUser } from "../../lib/types";

const setPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

export async function onRequestPost(context: EventContext) {
  try {
    // Require authentication
    const authResult = await requireAuth(context);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const user = authResult as AuthUser;
    
    const body = await parseBody(context.request);
    const validatedData = setPasswordSchema.parse(body);
    
    // Hash the new password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Update user in D1 database
    const updatedUser = await context.env.DB
      .prepare(
        "UPDATE users SET password = ?, has_password = ? WHERE id = ? RETURNING *"
      )
      .bind(hashedPassword, toInt(true), user.id)
      .first();
    
    if (!updatedUser) {
      return errorResponse("Usuário não encontrado", 404);
    }
    
    // Normalize user data (without password)
    // Note: D1.first() returns Record<string, unknown> which requires 'as any' cast
    // normalizeUser performs defensive type conversion (toBoolean, null checks)
    const userObj = normalizeUser(updatedUser as any, false);
    
    if (!userObj) {
      return errorResponse("Erro ao processar dados do usuário", 500);
    }
    
    // Generate new JWT token with updated user data
    const token = await generateToken(userObj, context.env.JWT_SECRET);
    
    const response: AuthResponse = {
      user: userObj,
      token,
    };
    
    return jsonResponse(response);
  } catch (error) {
    console.error("Set password error:", error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    
    return handleError(error);
  }
}
