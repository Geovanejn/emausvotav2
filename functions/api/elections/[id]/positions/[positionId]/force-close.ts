// POST /api/elections/:id/positions/:positionId/force-close - Force close position (Admin only)
import type { EventContext } from "../../../../../lib/types";
import { jsonResponse, errorResponse, handleError, type D1ElectionPositionRow } from "../../../../../lib/utils";
import { requireAuth } from "../../../../../lib/auth";

export async function onRequestPost(context: EventContext<{ id: string; positionId: string }>) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.id);
    const electionPositionId = parseInt(context.params.positionId);

    if (isNaN(electionId) || isNaN(electionPositionId)) {
      return errorResponse("ID inválido");
    }

    // Get the election position
    const electionPosition = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE id = ? AND election_id = ?")
      .bind(electionPositionId, electionId)
      .first<D1ElectionPositionRow>();

    if (!electionPosition) {
      return errorResponse("Cargo não encontrado", 404);
    }

    if (electionPosition.status === 'completed') {
      return errorResponse("Cargo já foi completado");
    }

    // Force close the position
    await context.env.DB
      .prepare(`
        UPDATE election_positions 
        SET status = 'completed', closed_at = datetime('now')
        WHERE id = ?
      `)
      .bind(electionPositionId)
      .run();

    return jsonResponse({ message: "Cargo encerrado com sucesso" });
  } catch (error) {
    return handleError(error);
  }
}
