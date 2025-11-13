// POST /api/elections/:electionId/audit/send-email - Send audit email (Admin only)
import type { EventContext } from "../../../../lib/types";
import { jsonResponse, errorResponse, parseBody, handleError } from "../../../../lib/utils";
import { requireAuth } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/email";

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

    const body = await parseBody<{ recipientEmail: string; pdfUrl: string }>(context.request);

    if (!body.recipientEmail || !body.pdfUrl) {
      return errorResponse("Email do destinatário e URL do PDF são obrigatórios");
    }

    // Get election details
    const election = await context.env.DB
      .prepare("SELECT * FROM elections WHERE id = ?")
      .bind(electionId)
      .first<{ id: number; name: string }>();

    if (!election) {
      return errorResponse("Eleição não encontrada", 404);
    }

    // Send email
    const emailSent = await sendEmail(
      context,
      body.recipientEmail,
      `Relatório de Auditoria - ${election.name}`,
      `
        <h2>Relatório de Auditoria</h2>
        <p>Segue em anexo o relatório de auditoria da eleição "${election.name}".</p>
        <p><a href="${body.pdfUrl}">Clique aqui para acessar o PDF</a></p>
      `
    );

    if (!emailSent) {
      return errorResponse("Erro ao enviar email", 500);
    }

    return jsonResponse({ message: "Email enviado com sucesso" });
  } catch (error) {
    return handleError(error);
  }
}
