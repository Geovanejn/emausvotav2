// Utility functions for Cloudflare Functions
import type { EventContext } from "./types";

// Helper to create JSON responses
export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to create error responses
export function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ message }, status);
}

// Helper to parse JSON body
export async function parseBody<T = any>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch (error) {
    throw new Error("Invalid JSON body");
  }
}

// Helper to handle errors in Functions
export function handleError(error: unknown): Response {
  console.error("Function error:", error);
  
  if (error instanceof Error) {
    return errorResponse(error.message);
  }
  
  return errorResponse("Erro interno do servidor", 500);
}

// Helper for CORS headers
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS requests for CORS
export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// Convert D1 boolean (0/1 or string "0"/"1") to JavaScript boolean
// D1 can return integers or strings depending on driver, so we defensively handle both
export function toBoolean(value: number | string | boolean | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num)) return num === 1;
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'number') return value === 1;
  return Boolean(value);
}

// Convert JavaScript boolean to D1 integer (0/1)
export function toInt(value: boolean | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value ? 1 : 0;
}

// Helper to generate verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Types for normalized user objects matching @shared/schema User type
type D1UserRow = {
  id: number;
  full_name: string;
  email: string;
  password: string;
  has_password: number | string | boolean;
  photo_url?: string | null;
  birthdate?: string | null;
  is_admin: number | string | boolean;
  is_member: number | string | boolean;
  active_member: number | string | boolean;
};

export type NormalizedUser = {
  id: number;
  fullName: string;
  email: string;
  hasPassword: boolean;
  photoUrl: string | null;
  birthdate: string | null;
  isAdmin: boolean;
  isMember: boolean;
  activeMember: boolean;
};

export type NormalizedUserWithPassword = NormalizedUser & {
  password: string;
};

// Helper to normalize D1 user row (snake_case) to camelCase API format
// Matches the User type from @shared/schema
// Overloaded to provide correct typing based on includePassword parameter
export function normalizeUser(row: D1UserRow | null | undefined): NormalizedUser | null;
export function normalizeUser(row: D1UserRow | null | undefined, includePassword: true): NormalizedUserWithPassword | null;
export function normalizeUser(row: D1UserRow | null | undefined, includePassword: false): NormalizedUser | null;
export function normalizeUser(
  row: D1UserRow | null | undefined,
  includePassword: boolean = false
): NormalizedUser | NormalizedUserWithPassword | null {
  if (!row) return null;
  
  // Normalize all fields from D1 snake_case to camelCase
  const normalized: NormalizedUser = {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    hasPassword: toBoolean(row.has_password),
    photoUrl: row.photo_url ?? null,
    birthdate: row.birthdate ?? null,
    isAdmin: toBoolean(row.is_admin),
    isMember: toBoolean(row.is_member),
    activeMember: toBoolean(row.active_member),
  };
  
  // Only include password field if explicitly requested (for auth operations)
  if (includePassword && row.password !== undefined) {
    return {
      ...normalized,
      password: row.password,
    } as NormalizedUserWithPassword;
  }
  
  return normalized;
}

// Helper to normalize multiple user rows
export function normalizeUsers(rows: D1UserRow[]): NormalizedUser[];
export function normalizeUsers(rows: D1UserRow[], includePassword: true): NormalizedUserWithPassword[];
export function normalizeUsers(rows: D1UserRow[], includePassword: false): NormalizedUser[];
export function normalizeUsers(
  rows: D1UserRow[],
  includePassword?: boolean
): NormalizedUser[] | NormalizedUserWithPassword[] {
  if (includePassword === true) {
    return rows.map(row => normalizeUser(row, true)).filter((u): u is NormalizedUserWithPassword => u !== null);
  }
  return rows.map(row => normalizeUser(row, false)).filter((u): u is NormalizedUser => u !== null);
}
