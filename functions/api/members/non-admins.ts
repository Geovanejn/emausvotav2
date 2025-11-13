// Cloudflare Pages Function: GET /api/members/non-admins
// List non-admin members with optional election filtering (Admin only)
import type { EventContext } from "../../lib/types";
import { jsonResponse, handleError, normalizeUsers } from "../../lib/utils";
import { requireAuth } from "../../lib/auth";

export async function onRequestGet(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Get query parameters
    const url = new URL(context.request.url);
    const electionIdParam = url.searchParams.get("electionId");
    const electionId = electionIdParam ? parseInt(electionIdParam) : null;

    // Fetch all members (exclude admins)
    const result = await context.env.DB
      .prepare("SELECT * FROM users WHERE is_admin = 0 ORDER BY full_name ASC")
      .all();

    let members = normalizeUsers(result.results as any[], false);

    // If electionId is provided, apply filtering
    if (electionId && !isNaN(electionId)) {
      console.log(`\n[API /api/members/non-admins] ========== MEMBER FILTERING DEBUG ==========`);
      console.log(`[DEBUG] Election ID: ${electionId}`);
      console.log(`[DEBUG] Total members before filtering:`, members.length);

      // 1. Get election winners (members who won positions in this election)
      // IMPORTANT: Use election_winners table, NOT candidates.elected flag (matches Express)
      const winnersResult = await context.env.DB
        .prepare(
          `SELECT DISTINCT ew.user_id
           FROM election_winners ew
           WHERE ew.election_id = ?`
        )
        .bind(electionId)
        .all();

      const winnerUserIds = new Set(
        winnersResult.results.map((row: any) => row.user_id)
      );

      console.log(`[DEBUG] Winner User IDs:`, Array.from(winnerUserIds));
      console.log(`[DEBUG] Members before filtering (id, fullName):`, members.map(m => ({ id: m.id, fullName: m.fullName })));

      // Filter out winners
      const beforeWinnerFilter = members.length;
      members = members.filter(m => {
        const isWinner = winnerUserIds.has(m.id);
        if (isWinner) {
          console.log(`[DEBUG] Filtering out winner: ${m.fullName} (id: ${m.id})`);
        }
        return !isWinner;
      });

      console.log(`[DEBUG] Filtered out ${beforeWinnerFilter - members.length} winners`);
      console.log(`[DEBUG] Members after winner filter:`, members.length);

      // 2. Filter by presence (only include members marked as present in this election)
      const presenceResult = await context.env.DB
        .prepare(
          `SELECT user_id FROM election_attendance WHERE election_id = ? AND present = 1`
        )
        .bind(electionId)
        .all();

      const presentUserIds = new Set(
        presenceResult.results.map((row: any) => row.user_id)
      );

      members = members.filter(m => presentUserIds.has(m.id));

      console.log(`[DEBUG] Members after presence filter:`, members.length);
      console.log(`[DEBUG] Final members (id, fullName):`, members.map(m => ({ id: m.id, fullName: m.fullName })));
      console.log(`[API /api/members/non-admins] ========== END DEBUG ==========\n`);
    }

    return jsonResponse(members);
  } catch (error) {
    console.error("Get non-admin members error:", error);
    return handleError(error);
  }
}
