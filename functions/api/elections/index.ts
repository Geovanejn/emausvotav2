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

    // Create election
    const result = await context.env.DB
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

    const election = normalizeElection(result);
    return jsonResponse(election, 201);
  } catch (error) {
    return handleError(error);
  }
}
