// Email utilities for Cloudflare Functions using Resend
import { Resend } from "resend";
import type { Env } from "./types";

/**
 * Send verification code email for first access
 * @returns true if email was sent successfully, false otherwise
 * @throws Error if Resend API key is missing (should be handled by caller)
 */
export async function sendVerificationEmail(
  env: Env,
  email: string,
  code: string
): Promise<boolean> {
  // Enforce that Resend credentials are configured
  // Unlike the Express version, we explicitly check for missing config
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.error('[EMAIL ERROR] Missing RESEND_API_KEY or RESEND_FROM_EMAIL environment variable');
    console.log(`[FALLBACK] Verification code for ${email}: ${code}`);
    return false;
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: "Seu código de verificação - Emaús Vota",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FFA500;">Emaús Vota</h2>
          <p>Olá,</p>
          <p>Seu código de verificação para primeiro acesso é:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #FFA500; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>Este código expira em 15 minutos.</p>
          <p>Se você não solicitou este código, ignore este email.</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">UMP Emaús - Sistema de Votação</p>
        </div>
      `,
    });

    if (!result.data) {
      console.error('[EMAIL ERROR] Resend API returned no data:', result.error);
      return false;
    }

    console.log(`[EMAIL SUCCESS] Verification code sent to ${email} (ID: ${result.data.id})`);
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send verification email:", error);
    return false;
  }
}

/**
 * Send password reset email with verification code
 * @returns true if email was sent successfully, false otherwise
 * @throws Error if Resend API key is missing (should be handled by caller)
 */
export async function sendPasswordResetEmail(
  env: Env,
  email: string,
  code: string
): Promise<boolean> {
  // Enforce that Resend credentials are configured
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.error('[EMAIL ERROR] Missing RESEND_API_KEY or RESEND_FROM_EMAIL environment variable');
    console.log(`[FALLBACK] Password reset code for ${email}: ${code}`);
    return false;
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: "🔒 Recuperação de Senha - Emaús Vota",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">🔒 Recuperação de Senha</h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá!</p>
            
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Você solicitou a recuperação de senha para sua conta no sistema Emaús Vota.
            </p>

            <p style="font-size: 15px; color: #555; line-height: 1.6; margin-top: 20px;">
              Use o código abaixo para recuperar sua senha:
            </p>

            <!-- Code Card -->
            <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFE5B4 100%); border-left: 4px solid #FFA500; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Código de Recuperação</p>
              <h1 style="color: #FFA500; margin: 0; font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</h1>
            </div>

            <div style="background-color: #FFF3CD; border-left: 4px solid #FFA500; padding: 15px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⏱️ Atenção:</strong> Este código expira em <strong>15 minutos</strong>.
              </p>
            </div>

            <p style="font-size: 15px; color: #555; line-height: 1.6; margin-top: 25px;">
              Após inserir o código, você será solicitado a criar uma nova senha para sua conta.
            </p>

            <p style="font-size: 14px; color: #888; line-height: 1.6; margin-top: 25px; padding-top: 25px; border-top: 1px solid #eee;">
              <strong>Não solicitou esta recuperação?</strong><br>
              Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá inalterada e segura.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; color: #666; font-size: 13px;">
              <strong>UMP Emaús</strong> - Sistema de Votação
            </p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        </div>
      `,
    });

    if (!result.data) {
      console.error('[EMAIL ERROR] Resend API returned no data:', result.error);
      return false;
    }

    console.log(`[EMAIL SUCCESS] Password reset code sent to ${email} (ID: ${result.data.id})`);
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send password reset email:", error);
    return false;
  }
}

/**
 * Send birthday notification email
 */
export async function sendBirthdayEmail(
  env: Env,
  email: string,
  fullName: string
): Promise<boolean> {
  // Check if Resend is configured
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.log(`[EMAIL DISABLED] Birthday email for ${email}`);
    return false;
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: "🎉 Feliz Aniversário! - UMP Emaús",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Feliz Aniversário!</h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Querido(a) ${fullName},</p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.8;">
              Hoje é um dia muito especial! A família da <strong>UMP Emaús</strong> se une para celebrar sua vida e agradecer a Deus por você.
            </p>

            <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFE5B4 100%); border-left: 4px solid #FFA500; padding: 25px; margin: 30px 0; border-radius: 8px;">
              <p style="margin: 0; color: #666; font-size: 16px; line-height: 1.8; text-align: center; font-style: italic;">
                "Que este novo ano de vida seja repleto de bênçãos, alegrias e muitas realizações. Que Deus continue te guiando e te abençoando em todos os seus caminhos!"
              </p>
            </div>

            <p style="font-size: 16px; color: #555; line-height: 1.8; margin-top: 25px;">
              Você é uma pessoa muito especial para nossa comunidade. Que este dia seja inesquecível e que você sinta todo o carinho que temos por você.
            </p>

            <p style="font-size: 16px; color: #555; line-height: 1.8; margin-top: 20px; font-weight: bold; text-align: center;">
              Parabéns! 🎂🎈
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; color: #666; font-size: 13px;">
              <strong>Com carinho,</strong><br>
              <strong>UMP Emaús</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending birthday email:", error);
    return false;
  }
}

/**
 * Send audit report email with PDF attachment
 */
export async function sendAuditEmail(
  env: Env,
  email: string,
  electionTitle: string,
  pdfUrl: string
): Promise<boolean> {
  // Check if Resend is configured
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.log(`[EMAIL DISABLED] Audit email for ${email}`);
    return false;
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: `📊 Relatório de Auditoria - ${electionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FFA500;">Emaús Vota - Relatório de Auditoria</h2>
          <p>Olá,</p>
          <p>O relatório de auditoria da eleição <strong>${electionTitle}</strong> foi gerado com sucesso.</p>
          <p>Você pode acessar o documento PDF através do link abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${pdfUrl}" style="background-color: #FFA500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              📄 Baixar Relatório PDF
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            <strong>Nota:</strong> Este documento contém informações sensíveis e deve ser armazenado de forma segura.
          </p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">UMP Emaús - Sistema de Votação</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending audit email:", error);
    return false;
  }
}
