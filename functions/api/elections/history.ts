// GET /api/elections/history - Get election history (Admin only)
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, handleError, normalizeElections, type D1ElectionRow } from "../../lib/utils";
import { requireAuth } from "../../lib/auth";

export async function onRequestGet(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Get all elections ordered by creation date (newest first)
    const result = await context.env.DB
      .prepare(`
        SELECT * FROM elections 
        ORDER BY created_at DESC
      `)
      .all<D1ElectionRow>();

    const elections = normalizeElections(result.results);
    return jsonResponse(elections);
  } catch (error) {
    return handleError(error);
  }
}
