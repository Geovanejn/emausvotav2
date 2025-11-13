// Cloudflare Pages Function: GET /api/positions
// List all positions (Public route)
import type { EventContext } from "../../lib/types";
import { jsonResponse, handleError } from "../../lib/utils";

export async function onRequestGet(context: EventContext) {
  try {
    // Fetch all positions
    const result = await context.env.DB
      .prepare("SELECT * FROM positions ORDER BY display_order ASC")
      .all();

    // Normalize position data from snake_case to camelCase
    const positions = result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || null,
      displayOrder: row.display_order,
      maxCandidates: row.max_candidates,
    }));

    return jsonResponse(positions);
  } catch (error) {
    console.error("Get positions error:", error);
    return handleError(error);
  }
}
