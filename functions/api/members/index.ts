// Cloudflare Pages Function: GET /api/members
// List all members (Admin only)
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

    // Fetch all users
    const result = await context.env.DB
      .prepare("SELECT * FROM users ORDER BY full_name ASC")
      .all();

    // Normalize users (without passwords)
    const members = normalizeUsers(result.results as any[], false);

    return jsonResponse(members);
  } catch (error) {
    console.error("Get members error:", error);
    return handleError(error);
  }
}
