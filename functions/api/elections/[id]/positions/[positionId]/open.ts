// POST /api/elections/:id/positions/:positionId/open - Open specific position (Admin only)
import type { EventContext } from "../../../../../lib/types";
import { jsonResponse, errorResponse, handleError, type D1ElectionPositionRow, type D1PositionRow } from "../../../../../lib/utils";
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

    if (electionPosition.status !== 'pending') {
      return errorResponse("Cargo já foi aberto ou completado");
    }

    // Close any currently active positions
    await context.env.DB
      .prepare(`
        UPDATE election_positions 
        SET status = 'completed', closed_at = datetime('now')
        WHERE election_id = ? AND status = 'active'
      `)
      .bind(electionId)
      .run();

    // Open the specified position
    await context.env.DB
      .prepare(`
        UPDATE election_positions 
        SET status = 'active', opened_at = datetime('now')
        WHERE id = ?
      `)
      .bind(electionPositionId)
      .run();

    // Get position name
    const position = await context.env.DB
      .prepare("SELECT * FROM positions WHERE id = ?")
      .bind(electionPosition.position_id)
      .first<D1PositionRow>();

    const result = {
      id: electionPosition.id,
      electionId: electionPosition.election_id,
      positionId: electionPosition.position_id,
      orderIndex: electionPosition.order_index,
      status: 'active',
      currentScrutiny: electionPosition.current_scrutiny,
      openedAt: new Date().toISOString(),
      closedAt: null,
      createdAt: electionPosition.created_at,
      positionName: position?.name || '',
    };

    return jsonResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
