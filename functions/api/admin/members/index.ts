// Cloudflare Pages Function: POST /api/admin/members
// Create a new member (Admin only)
import { z } from "zod";
import type { EventContext } from "../../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeUser } from "../../../lib/utils";
import { requireAuth } from "../../../lib/auth";

const addMemberSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  photoUrl: z.string().url().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  activeMember: z.boolean().default(true),
});

export async function onRequestPost(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await parseBody(context.request);
    const validatedData = addMemberSchema.parse(body);

    // Check if email already exists
    const existingUser = await context.env.DB
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(validatedData.email)
      .first();

    if (existingUser) {
      return errorResponse("Email já cadastrado", 400);
    }

    // Create random password (user will set their own via verification code)
    // IMPORTANT: Express stores this in PLAINTEXT so it can potentially be recovered/communicated
    // This matches Express storage.createUser() behavior exactly
    const randomPassword = Math.random().toString(36);

    // Insert new member
    const result = await context.env.DB
      .prepare(
        `INSERT INTO users (full_name, email, password, has_password, photo_url, birthdate, is_admin, is_member, active_member)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        validatedData.fullName,
        validatedData.email,
        randomPassword, // Plaintext, matching Express baseline
        0, // has_password = false
        validatedData.photoUrl || null,
        validatedData.birthdate || null,
        0, // is_admin = false
        1, // is_member = true
        validatedData.activeMember ? 1 : 0
      )
      .run();

    if (!result.success) {
      return errorResponse("Erro ao criar membro", 500);
    }

    // Fetch the created user
    const newUser = await context.env.DB
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(result.meta.last_row_id)
      .first();

    if (!newUser) {
      return errorResponse("Erro ao buscar membro criado", 500);
    }

    // Normalize and return (without password)
    // Note: D1.first() returns Record<string, unknown> which requires 'as any' cast
    const userObj = normalizeUser(newUser as any, false);

    if (!userObj) {
      return errorResponse("Erro ao processar dados do usuário", 500);
    }

    return jsonResponse(userObj, 201);
  } catch (error) {
    console.error("Add member error:", error);

    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }

    return handleError(error);
  }
}
