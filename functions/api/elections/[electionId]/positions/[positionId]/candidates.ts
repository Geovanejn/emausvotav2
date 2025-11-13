// GET /api/elections/:electionId/positions/:positionId/candidates - Get candidates for position (Authenticated)
import type { EventContext } from "../../../../../lib/types";
import { jsonResponse, errorResponse, handleError, type D1CandidateRow } from "../../../../../lib/utils";
import { requireAuth } from "../../../../../lib/auth";

export async function onRequestGet(context: EventContext<{ electionId: string; positionId: string }>) {
  try {
    // Require authentication
    const authResult = await requireAuth(context, false);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.electionId);
    const positionId = parseInt(context.params.positionId);

    if (isNaN(electionId) || isNaN(positionId)) {
      return errorResponse("ID inválido");
    }

    // Get candidates for this position and election
    const candidates = await context.env.DB
      .prepare(`
        SELECT * FROM candidates 
        WHERE election_id = ? AND position_id = ?
        ORDER BY name
      `)
      .bind(electionId, positionId)
      .all<D1CandidateRow>();

    const normalized = candidates.results.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      userId: c.user_id,
      positionId: c.position_id,
      electionId: c.election_id,
    }));

    return jsonResponse(normalized);
  } catch (error) {
    return handleError(error);
  }
}
