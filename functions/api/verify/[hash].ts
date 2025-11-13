// GET /api/verify/:hash - Verify PDF hash (Public)
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, handleError } from "../../lib/utils";

export async function onRequestGet(context: EventContext<{ hash: string }>) {
  try {
    const hash = context.params.hash;

    if (!hash) {
      return errorResponse("Hash é obrigatório");
    }

    // Get PDF verification
    const verification = await context.env.DB
      .prepare(`
        SELECT 
          pv.*,
          e.name as election_name,
          e.created_at as election_created_at,
          e.closed_at as election_closed_at
        FROM pdf_verifications pv
        JOIN elections e ON pv.election_id = e.id
        WHERE pv.verification_hash = ?
        LIMIT 1
      `)
      .bind(hash)
      .first<{
        id: number;
        election_id: number;
        verification_hash: string;
        president_name: string | null;
        created_at: string;
        election_name: string;
        election_created_at: string;
        election_closed_at: string | null;
      }>();

    if (!verification) {
      return jsonResponse({ valid: false, message: "Hash não encontrado" });
    }

    const result = {
      valid: true,
      election: {
        id: verification.election_id,
        name: verification.election_name,
        createdAt: verification.election_created_at,
        closedAt: verification.election_closed_at,
      },
      verificationHash: verification.verification_hash,
      presidentName: verification.president_name,
      verifiedAt: verification.created_at,
    };

    return jsonResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
