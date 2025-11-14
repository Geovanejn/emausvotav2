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

    // GUARD: Validate positions exist BEFORE making any database changes
    const positionsResult = await DB
      .prepare("SELECT * FROM positions ORDER BY display_order ASC")
      .all();

    const positions = positionsResult.results;

    if (!positions || positions.length === 0) {
      return errorResponse(
        "Não é possível criar eleição sem cargos cadastrados. Por favor, cadastre os cargos primeiro.",
        400
      );
    }

    // SAFE PATTERN: Create election as INACTIVE first, then activate only if everything succeeds
    // This prevents data corruption if election_positions creation fails
    const result = await DB
      .prepare(`
        INSERT INTO elections (name, is_active, created_at)
        VALUES (?, 0, datetime('now'))
        RETURNING id, name, is_active, created_at, closed_at
      `)
      .bind(body.name)
      .first<D1ElectionRow>();

    if (!result) {
      return errorResponse("Erro ao criar eleição", 500);
    }

    // CRITICAL: Create election_position for each position, all starting as 'pending'
    // Use Promise.all for atomic-like behavior (all succeed or all fail)
    try {
      await Promise.all(
        positions.map((position: any, i: number) =>
          DB.prepare(`
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
          .run()
        )
      );

      // SUCCESS: All positions created. Now safe to activate this election and deactivate others.
      // SAVE currently active election IDs for rollback if activation fails
      const previouslyActive = await DB
        .prepare("SELECT id FROM elections WHERE is_active = 1")
        .all<{ id: number }>();
      
      const previousActiveIds = previouslyActive.results.map(e => e.id);

      try {
        // Deactivate all other elections first
        await DB.prepare("UPDATE elections SET is_active = 0 WHERE is_active = 1").run();
        
        // Then activate the new election
        await DB.prepare("UPDATE elections SET is_active = 1 WHERE id = ?").bind(result.id).run();
      } catch (activationError) {
        // CRITICAL: Restore previously active elections
        if (previousActiveIds.length > 0) {
          await Promise.all(
            previousActiveIds.map(id =>
              DB.prepare("UPDATE elections SET is_active = 1 WHERE id = ?").bind(id).run()
            )
          );
        }
        throw activationError;
      }

    } catch (error) {
      // ROLLBACK: Delete the election AND any election_positions created
      await DB.prepare("DELETE FROM election_positions WHERE election_id = ?").bind(result.id).run();
      await DB.prepare("DELETE FROM elections WHERE id = ?").bind(result.id).run();
      
      throw new Error("Erro ao criar eleição: " + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Return the election with updated is_active status
    const finalElection = {
      id: result.id,
      name: result.name,
      isActive: true,
      createdAt: result.created_at,
      closedAt: result.closed_at,
    };

    return jsonResponse(finalElection, 201);
  } catch (error) {
    return handleError(error);
  }
}
