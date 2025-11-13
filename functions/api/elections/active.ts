// GET /api/elections/active - Get active election (Public)
import type { EventContext } from "../../lib/types";
import { jsonResponse, handleError, normalizeElection, type D1ElectionRow } from "../../lib/utils";

export async function onRequestGet(context: EventContext) {
  try {
    // Get active election
    const result = await context.env.DB
      .prepare("SELECT * FROM elections WHERE is_active = 1 LIMIT 1")
      .first<D1ElectionRow>();

    const election = result ? normalizeElection(result) : null;
    return jsonResponse(election);
  } catch (error) {
    return handleError(error);
  }
}
