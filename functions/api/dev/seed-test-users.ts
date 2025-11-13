// POST /api/dev/seed-test-users - Create test users for development (Dev only)
import type { EventContext } from "../../lib/types";
import { jsonResponse, errorResponse, handleError, toInt } from "../../lib/utils";
import { hashPassword } from "../../lib/auth";

export async function onRequestPost(context: EventContext) {
  try {
    // Only allow in development
    const isDev = context.env.ENVIRONMENT === 'development' || !context.env.ENVIRONMENT;
    if (!isDev) {
      return errorResponse("Esta rota só está disponível em desenvolvimento", 403);
    }

    const testUsers = [
      {
        fullName: "Admin User",
        email: "admin@emausvota.com",
        password: "admin123",
        isAdmin: true,
        isMember: true,
        activeMember: true,
      },
      {
        fullName: "Membro Teste 1",
        email: "membro1@emausvota.com",
        password: "membro123",
        isAdmin: false,
        isMember: true,
        activeMember: true,
      },
      {
        fullName: "Membro Teste 2",
        email: "membro2@emausvota.com",
        password: "membro123",
        isAdmin: false,
        isMember: true,
        activeMember: true,
      },
    ];

    const results = {
      created: 0,
      skipped: 0,
    };

    for (const user of testUsers) {
      // Check if user already exists
      const existing = await context.env.DB
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(user.email)
        .first();

      if (existing) {
        results.skipped++;
        continue;
      }

      // Hash password
      const hashedPassword = await hashPassword(user.password);

      // Create user
      const result = await context.env.DB
        .prepare(`
          INSERT INTO users (full_name, email, password, has_password, photo_url, birthdate, is_admin, is_member, active_member)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          user.fullName,
          user.email,
          hashedPassword,
          toInt(true),
          null,
          null,
          toInt(user.isAdmin),
          toInt(user.isMember),
          toInt(user.activeMember)
        )
        .run();

      if (result.success) {
        results.created++;
      } else {
        results.skipped++;
      }
    }

    return jsonResponse(results);
  } catch (error) {
    return handleError(error);
  }
}
