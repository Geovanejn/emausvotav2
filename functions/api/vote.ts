// POST /api/vote - Cast a vote (Member only)
import { z } from "zod";
import type { EventContext } from "../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, type D1ElectionPositionRow } from "../lib/utils";
import { requireAuth } from "../lib/auth";

const voteSchema = z.object({
  candidateId: z.number().int().positive("ID do candidato é obrigatório"),
  positionId: z.number().int().positive("ID do cargo é obrigatório"),
  electionId: z.number().int().positive("ID da eleição é obrigatório"),
});

export async function onRequestPost(context: EventContext) {
  try {
    // Require authentication (member or admin)
    const authResult = await requireAuth(context, false);
    if ('error' in authResult) {
      return authResult.error;
    }

    const user = authResult.user;

    // Check if user is a member or admin
    if (!user.isMember && !user.isAdmin) {
      return errorResponse("Apenas membros podem votar", 403);
    }

    const body = await parseBody(context.request);
    const validatedData = voteSchema.parse(body);

    // Get the election position to check current scrutiny
    const electionPosition = await context.env.DB
      .prepare(`
        SELECT * FROM election_positions 
        WHERE election_id = ? AND position_id = ? AND status = 'active'
        LIMIT 1
      `)
      .bind(validatedData.electionId, validatedData.positionId)
      .first<D1ElectionPositionRow>();

    if (!electionPosition) {
      return errorResponse("Esta votação não está ativa no momento");
    }

    const currentScrutiny = electionPosition.current_scrutiny;

    // Check if user has already voted in this scrutiny
    const existingVote = await context.env.DB
      .prepare(`
        SELECT * FROM votes 
        WHERE voter_id = ? 
          AND position_id = ? 
          AND election_id = ? 
          AND scrutiny_round = ?
      `)
      .bind(user.id, validatedData.positionId, validatedData.electionId, currentScrutiny)
      .first();

    if (existingVote) {
      return errorResponse("Você já votou neste escrutínio");
    }

    // Check if member is present
    const attendance = await context.env.DB
      .prepare(`
        SELECT * FROM election_attendance 
        WHERE election_id = ? AND member_id = ?
      `)
      .bind(validatedData.electionId, user.id)
      .first<{ is_present: number | string | boolean }>();

    if (!attendance) {
      return errorResponse("Você não está na lista de presença desta eleição");
    }

    const isPresent = attendance.is_present === 1 || attendance.is_present === '1' || attendance.is_present === true;
    if (!isPresent) {
      return errorResponse("Você não está marcado como presente nesta eleição");
    }

    // Verify candidate exists and belongs to this position/election
    const candidate = await context.env.DB
      .prepare(`
        SELECT * FROM candidates 
        WHERE id = ? AND position_id = ? AND election_id = ?
      `)
      .bind(validatedData.candidateId, validatedData.positionId, validatedData.electionId)
      .first();

    if (!candidate) {
      return errorResponse("Candidato não encontrado para este cargo");
    }

    // Create vote
    const result = await context.env.DB
      .prepare(`
        INSERT INTO votes (voter_id, candidate_id, position_id, election_id, scrutiny_round, voted_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        user.id,
        validatedData.candidateId,
        validatedData.positionId,
        validatedData.electionId,
        currentScrutiny
      )
      .run();

    if (!result.success) {
      return errorResponse("Erro ao registrar voto", 500);
    }

    return jsonResponse({ message: "Voto registrado com sucesso" }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    return handleError(error);
  }
}
