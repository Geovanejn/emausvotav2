// GET /api/elections/:id/positions/active - Get active position (Authenticated)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, type D1ElectionPositionRow, type D1PositionRow } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestGet(context: EventContext<{ id: string }>) {
  try {
    // Require authentication
    const authResult = await requireAuth(context, false);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.id);
    if (isNaN(electionId)) {
      return errorResponse("ID inválido");
    }

    // Get active election position
    const activePosition = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE election_id = ? AND status = 'active' LIMIT 1")
      .bind(electionId)
      .first<D1ElectionPositionRow>();

    if (!activePosition) {
      return jsonResponse(null);
    }

    // Join with position name
    const position = await context.env.DB
      .prepare("SELECT * FROM positions WHERE id = ?")
      .bind(activePosition.position_id)
      .first<D1PositionRow>();

    const result = {
      id: activePosition.id,
      electionId: activePosition.election_id,
      positionId: activePosition.position_id,
      orderIndex: activePosition.order_index,
      status: activePosition.status,
      currentScrutiny: activePosition.current_scrutiny,
      openedAt: activePosition.opened_at ?? null,
      closedAt: activePosition.closed_at ?? null,
      createdAt: activePosition.created_at,
      positionName: position?.name || '',
    };

    return jsonResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
