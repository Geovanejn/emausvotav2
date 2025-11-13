// POST /api/elections/:electionId/audit/save-hash - Save PDF verification hash (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";

export async function onRequestPost(context: EventContext<{ electionId: string }>) {
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

    const body = await parseBody<{ verificationHash: string; presidentName?: string }>(context.request);

    if (!body.verificationHash) {
      return errorResponse("Hash de verificação é obrigatório");
    }

    // Check if election exists
    const election = await context.env.DB
      .prepare("SELECT * FROM elections WHERE id = ?")
      .bind(electionId)
      .first();

    if (!election) {
      return errorResponse("Eleição não encontrada", 404);
    }

    // Save PDF verification
    const result = await context.env.DB
      .prepare(`
        INSERT INTO pdf_verifications (election_id, verification_hash, president_name, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `)
      .bind(electionId, body.verificationHash, body.presidentName || null)
      .run();

    if (!result.success) {
      return errorResponse("Erro ao salvar hash de verificação", 500);
    }

    return jsonResponse({ message: "Hash de verificação salvo com sucesso" }, 201);
  } catch (error) {
    return handleError(error);
  }
}
