// POST /api/elections/:id/attendance/initialize - Initialize attendance (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, toInt, type D1UserRow } from "../../../../lib/utils";
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

    // Check if election exists
    const election = await context.env.DB
      .prepare("SELECT * FROM elections WHERE id = ?")
      .bind(electionId)
      .first();

    if (!election) {
      return errorResponse("Eleição não encontrada", 404);
    }

    // Delete existing attendance for this election
    await context.env.DB
      .prepare("DELETE FROM election_attendance WHERE election_id = ?")
      .bind(electionId)
      .run();

    // Get all active members
    const members = await context.env.DB
      .prepare("SELECT * FROM users WHERE is_member = 1 AND active_member = 1")
      .all<D1UserRow>();

    // Create attendance records for all active members
    const insertPromises = members.results.map(member =>
      context.env.DB
        .prepare(`
          INSERT INTO election_attendance (election_id, member_id, is_present, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `)
        .bind(electionId, member.id, toInt(false))
        .run()
    );

    await Promise.all(insertPromises);

    return jsonResponse({ message: "Lista de presença inicializada" });
  } catch (error) {
    return handleError(error);
  }
}
