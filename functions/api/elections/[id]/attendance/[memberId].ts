// PATCH /api/elections/:id/attendance/:memberId - Update member attendance (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, toInt } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestPatch(context: EventContext<{ id: string; memberId: string }>) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.id);
    const memberId = parseInt(context.params.memberId);

    if (isNaN(electionId) || isNaN(memberId)) {
      return errorResponse("ID inválido");
    }

    const body = await parseBody<{ isPresent: boolean }>(context.request);

    if (typeof body.isPresent !== 'boolean') {
      return errorResponse("isPresent deve ser booleano");
    }

    // Update attendance
    await context.env.DB
      .prepare(`
        UPDATE election_attendance 
        SET is_present = ?, marked_at = datetime('now')
        WHERE election_id = ? AND member_id = ?
      `)
      .bind(toInt(body.isPresent), electionId, memberId)
      .run();

    return jsonResponse({ message: "Presença atualizada" });
  } catch (error) {
    return handleError(error);
  }
}
