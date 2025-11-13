// POST /api/candidates/batch - Create multiple candidates at once (Admin only)
import { z } from "zod";
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError } from "../../lib/utils";
import { requireAuth } from "../../lib/auth";

const batchCandidateSchema = z.object({
  candidates: z.array(z.object({
    userId: z.number().int().positive(),
    positionId: z.number().int().positive(),
    electionId: z.number().int().positive(),
  })).min(1, "Pelo menos um candidato é necessário"),
});

export async function onRequestPost(context: EventContext) {
  try {
    // Require admin authentication
    const authResult = await requireAuth(context, true);
    if ('error' in authResult) {
      return authResult.error;
    }

    const body = await parseBody(context.request);
    const validatedData = batchCandidateSchema.parse(body);

    // Process each candidate
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const candidate of validatedData.candidates) {
      try {
        // Get user details
        const user = await context.env.DB
          .prepare("SELECT full_name, email FROM users WHERE id = ?")
          .bind(candidate.userId)
          .first<{ full_name: string; email: string }>();

        if (!user) {
          results.errors.push(`Usuário ${candidate.userId} não encontrado`);
          results.skipped++;
          continue;
        }

        // Check if candidate already exists
        const existing = await context.env.DB
          .prepare(`
            SELECT * FROM candidates 
            WHERE user_id = ? AND position_id = ? AND election_id = ?
          `)
          .bind(candidate.userId, candidate.positionId, candidate.electionId)
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create candidate
        const result = await context.env.DB
          .prepare(`
            INSERT INTO candidates (name, email, user_id, position_id, election_id)
            VALUES (?, ?, ?, ?, ?)
          `)
          .bind(
            user.full_name,
            user.email,
            candidate.userId,
            candidate.positionId,
            candidate.electionId
          )
          .run();

        if (result.success) {
          results.created++;
        } else {
          results.errors.push(`Erro ao criar candidato para usuário ${candidate.userId}`);
          results.skipped++;
        }
      } catch (error) {
        results.errors.push(`Erro ao processar candidato ${candidate.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    return jsonResponse(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    return handleError(error);
  }
}
