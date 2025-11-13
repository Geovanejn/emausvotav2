// Cloudflare Pages Function: POST /api/auth/request-code
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, generateVerificationCode, normalizeUser } from "../../lib/utils";

const requestCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  isPasswordReset: z.boolean().optional(),
});

// TODO: CRITICAL - Implement Resend email integration before production deployment
// This stub always returns false, causing codes to be logged instead of emailed
async function sendEmail(
  env: any,
  email: string,
  code: string,
  isPasswordReset: boolean
): Promise<boolean> {
  // IMPLEMENTATION REQUIRED:
  // const resend = new Resend(env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: env.RESEND_FROM_EMAIL,
  //   to: email,
  //   subject: isPasswordReset ? "Recuperação de Senha" : "Código de Verificação",
  //   html: `...` // Use same templates from server/email.ts
  // });
  console.log(`[EMAIL STUB] Code for ${email}: ${code} (reset: ${isPasswordReset})`);
  return false; // STUB: Always returns false until Resend is implemented
}

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
    const user = normalizeUser(userRow, false);
    
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
    
    // Send email
    const emailSent = await sendEmail(
      context.env,
      validatedData.email,
      code,
      isPasswordReset
    );
    
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
