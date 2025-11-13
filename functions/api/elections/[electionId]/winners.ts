// GET /api/elections/:electionId/winners - Get winners for an election (Public)
import type { EventContext } from "../../../lib/types";
import { jsonResponse, errorResponse, handleError } from "../../../lib/utils";

export async function onRequestGet(context: EventContext<{ electionId: string }>) {
  try {
    const electionId = parseInt(context.params.electionId);
    if (isNaN(electionId)) {
      return errorResponse("ID inválido");
    }

    // Get winners with full details
    const winners = await context.env.DB
      .prepare(`
        SELECT 
          ew.id,
          ew.election_id,
          ew.position_id,
          ew.candidate_id,
          ew.won_at_scrutiny,
          ew.created_at,
          c.name as candidate_name,
          c.email as candidate_email,
          c.user_id,
          p.name as position_name,
          u.full_name,
          u.photo_url,
          u.birthdate
        FROM election_winners ew
        JOIN candidates c ON ew.candidate_id = c.id
        JOIN positions p ON ew.position_id = p.id
        JOIN users u ON c.user_id = u.id
        WHERE ew.election_id = ?
        ORDER BY p.name
      `)
      .bind(electionId)
      .all<{
        id: number;
        election_id: number;
        position_id: number;
        candidate_id: number;
        won_at_scrutiny: number;
        created_at: string;
        candidate_name: string;
        candidate_email: string;
        user_id: number;
        position_name: string;
        full_name: string;
        photo_url: string | null;
        birthdate: string | null;
      }>();

    const results = winners.results.map(w => ({
      id: w.id,
      electionId: w.election_id,
      positionId: w.position_id,
      positionName: w.position_name,
      candidateId: w.candidate_id,
      wonAtScrutiny: w.won_at_scrutiny,
      createdAt: w.created_at,
      candidate: {
        id: w.candidate_id,
        name: w.candidate_name,
        email: w.candidate_email,
        userId: w.user_id,
        fullName: w.full_name,
        photoUrl: w.photo_url,
        birthdate: w.birthdate,
      },
    }));

    return jsonResponse(results);
  } catch (error) {
    return handleError(error);
  }
}
