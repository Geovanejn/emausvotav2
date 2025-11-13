// Cloudflare Pages Function: POST /api/auth/request-code
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, generateVerificationCode, normalizeUser } from "../../lib/utils";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../lib/email";

const requestCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  isPasswordReset: z.boolean().optional(),
});

export async function onRequestPost(context: EventContext) {
  try {
    const body = await parseBody(context.request);
    const validatedData = requestCodeSchema.parse(body);
    
    // Check if user exists
    const userRow = await context.env.DB
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(validatedData.email)
      .first();
    
    if (!userRow) {
      return errorResponse(
        "Este e-mail não está cadastrado no sistema. Entre em contato com o administrador.",
        404
      );
    }
    
    // Normalize user data from D1
    // Note: D1.first() returns Record<string, unknown> which requires 'as any' cast
    // normalizeUser performs defensive type conversion (toBoolean, null checks)
    const user = normalizeUser(userRow as any, false);
    
    if (!user) {
      return errorResponse("Erro ao processar dados do usuário", 500);
    }
    
    // Check if user already has a password and this is not a reset
    if (user.hasPassword && !validatedData.isPasswordReset) {
      return jsonResponse({
        message: "Usuário já possui senha cadastrada",
        hasPassword: true,
      });
    }
    
    // Delete existing codes for this email
    await context.env.DB
      .prepare("DELETE FROM verification_codes WHERE email = ?")
      .bind(validatedData.email)
      .run();
    
    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const isPasswordReset = validatedData.isPasswordReset || false;
    
    // Store verification code
    await context.env.DB
      .prepare(
        "INSERT INTO verification_codes (email, code, expires_at, is_password_reset) VALUES (?, ?, ?, ?)"
      )
      .bind(validatedData.email, code, expiresAt, isPasswordReset ? 1 : 0)
      .run();
    
    // Send email using Resend
    const emailSent = isPasswordReset
      ? await sendPasswordResetEmail(context.env, validatedData.email, code)
      : await sendVerificationEmail(context.env, validatedData.email, code);
    
    if (!emailSent) {
      console.log(
        `[FALLBACK] Código de ${isPasswordReset ? 'recuperação' : 'verificação'} para ${validatedData.email}: ${code}`
      );
    }
    
    return jsonResponse({
      message: "Código enviado para seu email",
      hasPassword: user.hasPassword,
    });
  } catch (error) {
    console.error("Request code error:", error);
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    
    return handleError(error);
  }
}
