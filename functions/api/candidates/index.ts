// GET /api/candidates - Get all candidates (Authenticated)
// POST /api/candidates - Create candidate (Admin only)
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, normalizeCandidates, type D1CandidateRow } from "../../lib/utils";
import { requireAuth } from "../../lib/auth";

const insertCandidateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  userId: z.number().int().positive("ID do usuário é obrigatório"),
  positionId: z.number().int().positive("ID do cargo é obrigatório"),
  electionId: z.number().int().positive("ID da eleição é obrigatório"),
});

export async function onRequestGet(context: EventContext) {
  try {
    // Require authentication
    const authResult = await requireAuth(context, false);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Get all candidates
    const candidates = await context.env.DB
      .prepare("SELECT * FROM candidates")
      .all<D1CandidateRow>();

    const normalized = normalizeCandidates(candidates.results);
    return jsonResponse(normalized);
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await parseBody(context.request);
    const validatedData = insertCandidateSchema.parse(body);

    // Check if candidate already exists for this user, position, and election
    const existing = await context.env.DB
      .prepare(`
        SELECT * FROM candidates 
        WHERE user_id = ? AND position_id = ? AND election_id = ?
      `)
      .bind(validatedData.userId, validatedData.positionId, validatedData.electionId)
      .first();

    if (existing) {
      return errorResponse("Este membro já está cadastrado como candidato para este cargo nesta eleição");
    }

    // Create candidate
    const result = await context.env.DB
      .prepare(`
        INSERT INTO candidates (name, email, user_id, position_id, election_id)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        validatedData.name,
        validatedData.email,
        validatedData.userId,
        validatedData.positionId,
        validatedData.electionId
      )
      .run();

    if (!result.success) {
      return errorResponse("Erro ao criar candidato", 500);
    }

    // Fetch the created candidate
    const newCandidate = await context.env.DB
      .prepare("SELECT * FROM candidates WHERE id = ?")
      .bind(result.meta.last_row_id)
      .first<D1CandidateRow>();

    if (!newCandidate) {
      return errorResponse("Erro ao buscar candidato criado", 500);
    }

    const normalized = {
      id: newCandidate.id,
      name: newCandidate.name,
      email: newCandidate.email,
      userId: newCandidate.user_id,
      positionId: newCandidate.position_id,
      electionId: newCandidate.election_id,
    };

    return jsonResponse(normalized, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    return handleError(error);
  }
}
