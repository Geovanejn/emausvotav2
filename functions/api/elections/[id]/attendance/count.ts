// GET /api/elections/:id/attendance/count - Get present count (Authenticated)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestGet(context: EventContext<{ id: string }>) {
  try {
    // Require authentication (any authenticated user can see count)
    const authResult = await requireAuth(context, false);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.id);
    if (isNaN(electionId)) {
      return errorResponse("ID inválido");
    }

    // Count present members
    const result = await context.env.DB
      .prepare(`
        SELECT COUNT(*) as count 
        FROM election_attendance 
        WHERE election_id = ? AND is_present = 1
      `)
      .bind(electionId)
      .first<{ count: number }>();

    const presentCount = result?.count || 0;
    return jsonResponse({ presentCount });
  } catch (error) {
    return handleError(error);
  }
}
