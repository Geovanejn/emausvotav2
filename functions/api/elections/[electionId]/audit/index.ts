// GET /api/elections/:electionId/audit - Get audit data for election (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, handleError } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestGet(context: EventContext<{ electionId: string }>) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const electionId = parseInt(context.params.electionId);
    if (isNaN(electionId)) {
      return errorResponse("ID inválido");
    }

    // Get election details
    const election = await context.env.DB
      .prepare("SELECT * FROM elections WHERE id = ?")
      .bind(electionId)
      .first();

    if (!election) {
      return errorResponse("Eleição não encontrada", 404);
    }

    // Get voter attendance (who voted)
    const voterAttendance = await context.env.DB
      .prepare(`
        SELECT DISTINCT
          ea.member_id,
          u.full_name,
          u.email,
          ea.is_present,
          ea.marked_at
        FROM election_attendance ea
        JOIN users u ON ea.member_id = u.id
        WHERE ea.election_id = ?
        ORDER BY u.full_name
      `)
      .bind(electionId)
      .all();

    // Get vote timeline
    const voteTimeline = await context.env.DB
      .prepare(`
        SELECT 
          v.id,
          v.voted_at,
          v.scrutiny_round,
          p.name as position_name,
          c.name as candidate_name
        FROM votes v
        JOIN positions p ON v.position_id = p.id
        JOIN candidates c ON v.candidate_id = c.id
        WHERE v.election_id = ?
        ORDER BY v.voted_at
      `)
      .bind(electionId)
      .all();

    // Get winners
    const winners = await context.env.DB
      .prepare(`
        SELECT 
          ew.position_id,
          ew.won_at_scrutiny,
          c.name as candidate_name,
          c.email as candidate_email,
          p.name as position_name
        FROM election_winners ew
        JOIN candidates c ON ew.candidate_id = c.id
        JOIN positions p ON ew.position_id = p.id
        WHERE ew.election_id = ?
        ORDER BY p.name
      `)
      .bind(electionId)
      .all();

    const auditData = {
      election: {
        id: election.id,
        name: election.name,
        createdAt: election.created_at,
        closedAt: election.closed_at,
      },
      voterAttendance: voterAttendance.results.map((va: any) => ({
        memberId: va.member_id,
        memberName: va.full_name,
        memberEmail: va.email,
        isPresent: va.is_present === 1 || va.is_present === '1' || va.is_present === true,
        markedAt: va.marked_at,
      })),
      voteTimeline: voteTimeline.results.map((vt: any) => ({
        id: vt.id,
        votedAt: vt.voted_at,
        scrutinyRound: vt.scrutiny_round,
        positionName: vt.position_name,
        candidateName: vt.candidate_name,
      })),
      winners: winners.results.map((w: any) => ({
        positionId: w.position_id,
        positionName: w.position_name,
        wonAtScrutiny: w.won_at_scrutiny,
        candidateName: w.candidate_name,
        candidateEmail: w.candidate_email,
      })),
    };

    return jsonResponse(auditData);
  } catch (error) {
    return handleError(error);
  }
}
