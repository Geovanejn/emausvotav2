// GET /api/elections/:id/attendance - Get election attendance (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, normalizeAttendances, normalizeUser, type D1AttendanceRow, type D1UserRow } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestGet(context: EventContext<{ id: string }>) {
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

    // Get attendance records for this election
    const attendance = await context.env.DB
      .prepare("SELECT * FROM election_attendance WHERE election_id = ?")
      .bind(electionId)
      .all<D1AttendanceRow>();

    // Get winners to exclude them from the attendance list
    const winners = await context.env.DB
      .prepare(`
        SELECT user_id FROM election_winners ew
        JOIN candidates c ON ew.candidate_id = c.id
        WHERE ew.election_id = ?
      `)
      .bind(electionId)
      .all<{ user_id: number }>();

    const winnerUserIds = new Set(winners.results.map(w => w.user_id));

    // Join with user information and filter out winners
    const attendanceWithUsers = await Promise.all(
      attendance.results
        .filter(att => !winnerUserIds.has(att.member_id))
        .map(async (att) => {
          const user = await context.env.DB
            .prepare("SELECT * FROM users WHERE id = ?")
            .bind(att.member_id)
            .first<D1UserRow>();

          const normalizedUser = user ? normalizeUser(user) : null;
          const normalizedAtt = {
            ...att,
            isPresent: att.is_present === 1 || att.is_present === '1' || att.is_present === true,
            memberName: normalizedUser?.fullName || '',
            memberEmail: normalizedUser?.email || '',
          };

          return normalizedAtt;
        })
    );

    return jsonResponse(attendanceWithUsers);
  } catch (error) {
    return handleError(error);
  }
}
