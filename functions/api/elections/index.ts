// POST /api/elections - Create a new election (Admin only)
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError, toInt } from "../../lib/utils";
import { normalizeElection, type D1ElectionRow } from "../../lib/utils";
import { requireAuth } from "../../lib/auth";

export async function onRequestPost(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await parseBody<{ name: string }>(context.request);
    
    if (!body.name || typeof body.name !== "string") {
      return errorResponse("Nome da eleição é obrigatório");
    }

    const { DB } = context.env;

    // Deactivate all current active elections
    await DB.prepare("UPDATE elections SET is_active = 0 WHERE is_active = 1").run();

    // Create election
    const result = await DB
      .prepare(`
        INSERT INTO elections (name, is_active, created_at)
        VALUES (?, ?, datetime('now'))
        RETURNING id, name, is_active, created_at, closed_at
      `)
      .bind(body.name, toInt(true))
      .first<D1ElectionRow>();

    if (!result) {
      return errorResponse("Erro ao criar eleição", 500);
    }

    // CRITICAL: Create election_positions for all positions (sequential voting)
    // Get all positions ordered by display_order
    const positionsResult = await DB
      .prepare("SELECT * FROM positions ORDER BY display_order ASC")
      .all();

    const positions = positionsResult.results;

    // GUARD: Prevent creating elections without positions (would break the system)
    if (!positions || positions.length === 0) {
      // Rollback: Delete the election we just created since it would be broken
      await DB
        .prepare("DELETE FROM elections WHERE id = ?")
        .bind(result.id)
        .run();
      
      return errorResponse(
        "Não é possível criar eleição sem cargos cadastrados. Por favor, cadastre os cargos primeiro.",
        400
      );
    }

    // Create election_position for each position, all starting as 'pending'
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i] as any;
      await DB
        .prepare(`
          INSERT INTO election_positions (
            election_id, 
            position_id, 
            order_index, 
            status, 
            current_scrutiny,
            created_at
          )
          VALUES (?, ?, ?, 'pending', 1, datetime('now'))
        `)
        .bind(result.id, position.id, i)
        .run();
    }

    const election = normalizeElection(result);
    return jsonResponse(election, 201);
  } catch (error) {
    return handleError(error);
  }
}
