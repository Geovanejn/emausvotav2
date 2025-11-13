// GET /api/elections/:id/positions - Get election positions (Authenticated)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, normalizeElectionPositions, normalizePosition, type D1ElectionPositionRow, type D1PositionRow } from "../../../../lib/utils";
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

    // Get election positions
    const electionPositions = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE election_id = ? ORDER BY order_index")
      .bind(electionId)
      .all<D1ElectionPositionRow>();

    // Join with position names
    const positionsWithNames = await Promise.all(
      electionPositions.results.map(async (ep) => {
        const position = await context.env.DB
          .prepare("SELECT * FROM positions WHERE id = ?")
          .bind(ep.position_id)
          .first<D1PositionRow>();

        return {
          id: ep.id,
          electionId: ep.election_id,
          positionId: ep.position_id,
          orderIndex: ep.order_index,
          status: ep.status,
          currentScrutiny: ep.current_scrutiny,
          openedAt: ep.opened_at ?? null,
          closedAt: ep.closed_at ?? null,
          createdAt: ep.created_at,
          positionName: position?.name || '',
        };
      })
    );

    return jsonResponse(positionsWithNames);
  } catch (error) {
    return handleError(error);
  }
}
