// GET /api/results/latest - Get latest election results (Public)
import type { EventContext } from "../../lib/types";
import { jsonResponse, handleError, type D1ElectionRow } from "../../lib/utils";

export async function onRequestGet(context: EventContext) {
  try {
    // Get latest closed election
    const election = await context.env.DB
      .prepare(`
        SELECT * FROM elections 
        WHERE closed_at IS NOT NULL 
        ORDER BY closed_at DESC 
        LIMIT 1
      `)
      .first<D1ElectionRow>();

    if (!election) {
      return jsonResponse(null);
    }

    // Get winners for this election
    const winners = await context.env.DB
      .prepare(`
        SELECT 
          ew.position_id,
          ew.won_at_scrutiny,
          c.id as candidate_id,
          c.name as candidate_name,
          c.email as candidate_email,
          c.user_id,
          p.name as position_name
        FROM election_winners ew
        JOIN candidates c ON ew.candidate_id = c.id
        JOIN positions p ON ew.position_id = p.id
        WHERE ew.election_id = ?
        ORDER BY p.name
      `)
      .bind(election.id)
      .all<{
        position_id: number;
        won_at_scrutiny: number;
        candidate_id: number;
        candidate_name: string;
        candidate_email: string;
        user_id: number;
        position_name: string;
      }>();

    const results = {
      election: {
        id: election.id,
        name: election.name,
        isActive: election.is_active === 1 || election.is_active === '1' || election.is_active === true,
        createdAt: election.created_at,
        closedAt: election.closed_at,
      },
      winners: winners.results.map(w => ({
        positionId: w.position_id,
        positionName: w.position_name,
        wonAtScrutiny: w.won_at_scrutiny,
        candidate: {
          id: w.candidate_id,
          name: w.candidate_name,
          email: w.candidate_email,
          userId: w.user_id,
        },
      })),
    };

    return jsonResponse(results);
  } catch (error) {
    return handleError(error);
  }
}
