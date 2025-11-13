// POST /api/elections/:id/positions/open-next - Open next position (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, toInt, type D1ElectionPositionRow, type D1PositionRow } from "../../../../lib/utils";
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

    // Close any currently active positions
    await context.env.DB
      .prepare(`
        UPDATE election_positions 
        SET status = 'completed', closed_at = datetime('now')
        WHERE election_id = ? AND status = 'active'
      `)
      .bind(electionId)
      .run();

    // Get next pending position
    const nextPosition = await context.env.DB
      .prepare(`
        SELECT * FROM election_positions 
        WHERE election_id = ? AND status = 'pending'
        ORDER BY order_index
        LIMIT 1
      `)
      .bind(electionId)
      .first<D1ElectionPositionRow>();

    if (!nextPosition) {
      return errorResponse("Não há mais cargos para abrir", 404);
    }

    // Open the position
    await context.env.DB
      .prepare(`
        UPDATE election_positions 
        SET status = 'active', opened_at = datetime('now')
        WHERE id = ?
      `)
      .bind(nextPosition.id)
      .run();

    // Get position name
    const position = await context.env.DB
      .prepare("SELECT * FROM positions WHERE id = ?")
      .bind(nextPosition.position_id)
      .first<D1PositionRow>();

    const result = {
      id: nextPosition.id,
      electionId: nextPosition.election_id,
      positionId: nextPosition.position_id,
      orderIndex: nextPosition.order_index,
      status: 'active',
      currentScrutiny: nextPosition.current_scrutiny,
      openedAt: new Date().toISOString(),
      closedAt: null,
      createdAt: nextPosition.created_at,
      positionName: position?.name || '',
    };

    return jsonResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
