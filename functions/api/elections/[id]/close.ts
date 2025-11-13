// PATCH /api/elections/:id/close - Close an election (Admin only)
import type { EventContext } from "../../../lib/types";
import { jsonResponse, errorResponse, handleError, normalizeElection, type D1ElectionRow } from "../../../lib/utils";
import { requireAuth } from "../../../lib/auth";

export async function onRequestPatch(context: EventContext<{ id: string }>) {
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
      .first<D1ElectionRow>();

    if (!election) {
      return errorResponse("Eleição não encontrada", 404);
    }

    // Close election
    await context.env.DB
      .prepare(`
        UPDATE elections 
        SET is_active = 0, closed_at = datetime('now')
        WHERE id = ?
      `)
      .bind(electionId)
      .run();

    return jsonResponse({ message: "Eleição encerrada com sucesso" });
  } catch (error) {
    return handleError(error);
  }
}
