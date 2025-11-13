// POST /api/elections/:id/finalize - Finalize an election (Admin only)
import type { EventContext } from "../../../lib/types";
import { jsonResponse, errorResponse, handleError, normalizeElection, normalizeElectionPositions, type D1ElectionRow, type D1ElectionPositionRow } from "../../../lib/utils";
import { requireAuth } from "../../../lib/auth";

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

    // Check if election exists
    const election = await context.env.DB
      .prepare("SELECT * FROM elections WHERE id = ?")
      .bind(electionId)
      .first<D1ElectionRow>();

    if (!election) {
      return errorResponse("Eleição não encontrada", 404);
    }

    // Check if all positions are completed
    const positions = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE election_id = ?")
      .bind(electionId)
      .all<D1ElectionPositionRow>();

    const allCompleted = positions.results.every(p => p.status === 'completed');
    
    if (!allCompleted) {
      return errorResponse("Todos os cargos devem estar decididos antes de finalizar a eleição");
    }

    // Mark election as finalized (closed and inactive)
    await context.env.DB
      .prepare(`
        UPDATE elections 
        SET is_active = 0, closed_at = datetime('now')
        WHERE id = ?
      `)
      .bind(electionId)
      .run();

    return jsonResponse({ message: "Eleição finalizada com sucesso" });
  } catch (error) {
    return handleError(error);
  }
}
