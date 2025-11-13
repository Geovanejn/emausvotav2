// POST /api/elections/:id/positions/advance-scrutiny - Advance to next scrutiny (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, type D1ElectionPositionRow } from "../../../../lib/utils";
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

    // Get active position
    const activePosition = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE election_id = ? AND status = 'active' LIMIT 1")
      .bind(electionId)
      .first<D1ElectionPositionRow>();

    if (!activePosition) {
      return errorResponse("Nenhum cargo ativo encontrado", 404);
    }

    // Advance scrutiny
    const nextScrutiny = activePosition.current_scrutiny + 1;
    if (nextScrutiny > 3) {
      return errorResponse("Já está no último escrutínio");
    }

    await context.env.DB
      .prepare("UPDATE election_positions SET current_scrutiny = ? WHERE id = ?")
      .bind(nextScrutiny, activePosition.id)
      .run();

    return jsonResponse({ 
      message: `Avançado para ${nextScrutiny}º escrutínio`,
      currentScrutiny: nextScrutiny
    });
  } catch (error) {
    return handleError(error);
  }
}
