// Cloudflare Pages Function: PATCH/DELETE /api/admin/members/:id
// Update or delete a member (Admin only)
import { z } from "zod";
import type { EventContext } from "../../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeUser } from "../../../lib/utils";
import { requireAuth } from "../../../lib/auth";

const updateMemberSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  photoUrl: z.string().url().nullable().optional(),
  birthdate: z.string().nullable().optional(),
  activeMember: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isMember: z.boolean().optional(),
});

export async function onRequestPatch(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const memberId = parseInt(context.params.id as string);

    if (isNaN(memberId)) {
      return errorResponse("ID inválido", 400);
    }

    const body = await parseBody(context.request);
    const validatedData = updateMemberSchema.parse(body);

    // If email is being changed, check if it's already in use
    if (validatedData.email) {
      const existingUser = await context.env.DB
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .bind(validatedData.email, memberId)
        .first();

      if (existingUser) {
        return errorResponse("Este email já está sendo usado por outro membro", 400);
      }
    }

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];

    if (validatedData.fullName !== undefined) {
      updates.push("full_name = ?");
      values.push(validatedData.fullName);
    }
    if (validatedData.email !== undefined) {
      updates.push("email = ?");
      values.push(validatedData.email);
    }
    if (validatedData.photoUrl !== undefined) {
      updates.push("photo_url = ?");
      values.push(validatedData.photoUrl);
    }
    if (validatedData.birthdate !== undefined) {
      updates.push("birthdate = ?");
      values.push(validatedData.birthdate);
    }
    if (validatedData.activeMember !== undefined) {
      updates.push("active_member = ?");
      values.push(validatedData.activeMember ? 1 : 0);
    }
    if (validatedData.isAdmin !== undefined) {
      updates.push("is_admin = ?");
      values.push(validatedData.isAdmin ? 1 : 0);
    }
    if (validatedData.isMember !== undefined) {
      updates.push("is_member = ?");
      values.push(validatedData.isMember ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse("Nenhum campo para atualizar", 400);
    }

    // Add memberId to the end of values array
    values.push(memberId);

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    const result = await context.env.DB.prepare(query).bind(...values).run();

    if (!result.success) {
      return errorResponse("Erro ao atualizar membro", 500);
    }

    // Fetch updated user
    const updatedUser = await context.env.DB
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(memberId)
      .first();

    if (!updatedUser) {
      return errorResponse("Membro não encontrado", 404);
    }

    // Normalize and return (without password)
    // Note: D1.first() returns Record<string, unknown> which requires 'as any' cast
    const userObj = normalizeUser(updatedUser as any, false);

    if (!userObj) {
      return errorResponse("Erro ao processar dados do usuário", 500);
    }

    return jsonResponse(userObj);
  } catch (error) {
    console.error("Update member error:", error);

    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }

    return handleError(error);
  }
}

export async function onRequestDelete(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const memberId = parseInt(context.params.id as string);

    if (isNaN(memberId)) {
      return errorResponse("ID inválido", 400);
    }

    // IMPORTANT: Express backend prevents deleting admins via query filter (WHERE is_admin = 0)
    // This migration preserves that behavior - only non-admin members can be deleted
    
    // Delete related data first (cascading delete to avoid foreign key issues)
    // Note: These cascade deletes match Express backend logic in storage.deleteMember()
    
    // Delete votes where user was the voter
    await context.env.DB
      .prepare("DELETE FROM votes WHERE voter_id = ?")
      .bind(memberId)
      .run();

    // Delete votes where user was the candidate (via candidates table)
    // Express: DELETE FROM votes WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = ?)
    await context.env.DB
      .prepare(
        `DELETE FROM votes 
         WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = ?)`
      )
      .bind(memberId)
      .run();

    await context.env.DB
      .prepare(
        `DELETE FROM election_winners 
         WHERE candidate_id IN (SELECT id FROM candidates WHERE user_id = ?)`
      )
      .bind(memberId)
      .run();

    await context.env.DB
      .prepare("DELETE FROM candidates WHERE user_id = ?")
      .bind(memberId)
      .run();

    await context.env.DB
      .prepare("DELETE FROM election_attendance WHERE user_id = ?")
      .bind(memberId)
      .run();

    // Finally, delete the member (only if not admin, matching Express behavior)
    const result = await context.env.DB
      .prepare("DELETE FROM users WHERE id = ? AND is_admin = 0")
      .bind(memberId)
      .run();

    if (!result.success || (result.meta.changes === 0)) {
      // If no rows were affected, either the user doesn't exist or is an admin
      return errorResponse(
        "Não é possível deletar um administrador ou o membro não foi encontrado",
        400
      );
    }

    return jsonResponse({ message: "Membro removido com sucesso" });
  } catch (error) {
    console.error("Delete member error:", error);
    return handleError(error);
  }
}
