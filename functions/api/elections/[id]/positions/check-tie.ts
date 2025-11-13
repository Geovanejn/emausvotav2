// GET /api/elections/:id/positions/check-tie - Check for tie in current position (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError, type D1ElectionPositionRow } from "../../../../lib/utils";
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

    // Get active position
    const activePosition = await context.env.DB
      .prepare("SELECT * FROM election_positions WHERE election_id = ? AND status = 'active' LIMIT 1")
      .bind(electionId)
      .first<D1ElectionPositionRow>();

    if (!activePosition) {
      return errorResponse("Nenhum cargo ativo encontrado", 404);
    }

    // Get vote counts for current scrutiny
    const voteCounts = await context.env.DB
      .prepare(`
        SELECT candidate_id, COUNT(*) as vote_count
        FROM votes
        WHERE election_id = ? 
          AND position_id = ?
          AND scrutiny_round = ?
        GROUP BY candidate_id
        ORDER BY vote_count DESC
      `)
      .bind(electionId, activePosition.position_id, activePosition.current_scrutiny)
      .all<{ candidate_id: number; vote_count: number }>();

    if (voteCounts.results.length < 2) {
      return jsonResponse({ hasTie: false });
    }

    // Check if top two have same vote count
    const topVotes = voteCounts.results[0].vote_count;
    const secondVotes = voteCounts.results[1].vote_count;

    const hasTie = topVotes === secondVotes;

    if (hasTie) {
      return jsonResponse({
        hasTie: true,
        tiedCandidates: voteCounts.results
          .filter(vc => vc.vote_count === topVotes)
          .map(vc => vc.candidate_id),
        voteCount: topVotes,
      });
    }

    return jsonResponse({ hasTie: false });
  } catch (error) {
    return handleError(error);
  }
}
