// Cloudflare Pages Function: POST /api/auth/verify-code
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeUser } from "../../lib/utils";
import { generateToken } from "../../lib/auth";
import type { AuthResponse } from "@shared/schema";

const verifyCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().length(6, "Código deve ter 6 dígitos"),
});

export async function onRequestPost(context: EventContext) {
  try {
    const body = await parseBody(context.request);
    const validatedData = verifyCodeSchema.parse(body);
    
    // Get valid verification code from D1
    const verificationCode = await context.env.DB
      .prepare(
        "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
      )
      .bind(validatedData.email, validatedData.code)
      .first();
    
    if (!verificationCode) {
      return errorResponse("Código inválido ou expirado", 401);
    }
    
    // Query user from D1 database
    const user = await context.env.DB
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(validatedData.email)
      .first();
    
    if (!user) {
      return errorResponse("Este e-mail não está cadastrado no sistema", 404);
    }
    
    // Delete ONLY the specific verification code that was used
    // Do NOT delete all codes for this email to preserve concurrent password-reset tokens
    await context.env.DB
      .prepare("DELETE FROM verification_codes WHERE email = ? AND code = ?")
      .bind(validatedData.email, validatedData.code)
      .run();
    
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
    
    // If this is a password reset, indicate that user needs to set new password
    if (verificationCode.is_password_reset) {
      return jsonResponse({
        ...response,
        requiresPasswordReset: true,
      });
    }
    
    return jsonResponse(response);
  } catch (error) {
    console.error("Verify code error:", error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    
    return handleError(error);
  }
}
