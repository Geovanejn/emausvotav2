// Cloudflare Pages Function: GET /api/auth/validate-token
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse } from "../../lib/utils";
import { authenticateToken } from "../../lib/auth";

export async function onRequestGet(context: EventContext) {
  try {
    // Validate the JWT token
    const user = await authenticateToken(context);
    
    if (!user) {
      return errorResponse("Token inválido ou expirado", 401);
    }
    
    // Return user data from token payload (no need to query database)
    return jsonResponse({
      valid: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        hasPassword: user.hasPassword,
        photoUrl: user.photoUrl,
        birthdate: user.birthdate,
        isAdmin: user.isAdmin,
        isMember: user.isMember,
        activeMember: user.activeMember,
      },
    });
  } catch (error) {
    console.error("Validate token error:", error);
    return errorResponse("Erro ao validar token", 500);
  }
}
