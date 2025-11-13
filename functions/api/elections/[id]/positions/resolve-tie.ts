// POST /api/elections/:id/positions/resolve-tie - Resolve tie using age criteria (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, type D1ElectionPositionRow, type D1UserRow } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestPost(context: EventContext<{ id: string }>) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.id);
    if (isNaN(electionId)) {
      return errorResponse("ID inválido");
    }

    const body = await parseBody<{ candidateId: number }>(context.request);

    if (!body.candidateId) {
      return errorResponse("ID do candidato é obrigatório");
    }

    // Get active position
    const activePosition = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE election_id = ? AND status = 'active' LIMIT 1")
      .bind(electionId)
      .first<D1ElectionPositionRow>();

    if (!activePosition) {
      return errorResponse("Nenhum cargo ativo encontrado", 404);
    }

    // Set winner in election_winners table
    await context.env.DB
      .prepare(`
        INSERT INTO election_winners (election_id, position_id, candidate_id, won_at_scrutiny, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `)
      .bind(electionId, activePosition.position_id, body.candidateId, activePosition.current_scrutiny)
      .run();

    // Complete the position
    await context.env.DB
      .prepare(`
        UPDATE election_positions 
        SET status = 'completed', closed_at = datetime('now')
        WHERE id = ?
      `)
      .bind(activePosition.id)
      .run();

    return jsonResponse({ message: "Empate resolvido e vencedor registrado" });
  } catch (error) {
    return handleError(error);
  }
}
