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
export type D1UserRow = {
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

// Types for normalized election objects
export type D1ElectionRow = {
  id: number;
  name: string;
  is_active: number | string | boolean;
  created_at: string;
  closed_at?: string | null;
};

export type NormalizedElection = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  closedAt: string | null;
};

export function normalizeElection(row: D1ElectionRow | null | undefined): NormalizedElection | null {
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    closedAt: row.closed_at ?? null,
  };
}

export function normalizeElections(rows: D1ElectionRow[]): NormalizedElection[] {
  return rows.map(row => normalizeElection(row)).filter((e): e is NormalizedElection => e !== null);
}

// Types for normalized position objects
export type D1PositionRow = {
  id: number;
  name: string;
};

export type NormalizedPosition = {
  id: number;
  name: string;
};

export function normalizePosition(row: D1PositionRow | null | undefined): NormalizedPosition | null {
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
  };
}

export function normalizePositions(rows: D1PositionRow[]): NormalizedPosition[] {
  return rows.map(row => normalizePosition(row)).filter((p): p is NormalizedPosition => p !== null);
}

// Types for normalized election position objects
export type D1ElectionPositionRow = {
  id: number;
  election_id: number;
  position_id: number;
  order_index: number;
  status: string;
  current_scrutiny: number;
  opened_at?: string | null;
  closed_at?: string | null;
  created_at: string;
};

export type NormalizedElectionPosition = {
  id: number;
  electionId: number;
  positionId: number;
  orderIndex: number;
  status: string;
  currentScrutiny: number;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

export function normalizeElectionPosition(row: D1ElectionPositionRow | null | undefined): NormalizedElectionPosition | null {
  if (!row) return null;
  
  return {
    id: row.id,
    electionId: row.election_id,
    positionId: row.position_id,
    orderIndex: row.order_index,
    status: row.status,
    currentScrutiny: row.current_scrutiny,
    openedAt: row.opened_at ?? null,
    closedAt: row.closed_at ?? null,
    createdAt: row.created_at,
  };
}

export function normalizeElectionPositions(rows: D1ElectionPositionRow[]): NormalizedElectionPosition[] {
  return rows.map(row => normalizeElectionPosition(row)).filter((ep): ep is NormalizedElectionPosition => ep !== null);
}

// Types for normalized attendance objects
export type D1AttendanceRow = {
  id: number;
  election_id: number;
  election_position_id?: number | null;
  member_id: number;
  is_present: number | string | boolean;
  marked_at?: string | null;
  created_at: string;
};

export type NormalizedAttendance = {
  id: number;
  electionId: number;
  electionPositionId: number | null;
  memberId: number;
  isPresent: boolean;
  markedAt: string | null;
  createdAt: string;
};

export function normalizeAttendance(row: D1AttendanceRow | null | undefined): NormalizedAttendance | null {
  if (!row) return null;
  
  return {
    id: row.id,
    electionId: row.election_id,
    electionPositionId: row.election_position_id ?? null,
    memberId: row.member_id,
    isPresent: toBoolean(row.is_present),
    markedAt: row.marked_at ?? null,
    createdAt: row.created_at,
  };
}

export function normalizeAttendances(rows: D1AttendanceRow[]): NormalizedAttendance[] {
  return rows.map(row => normalizeAttendance(row)).filter((a): a is NormalizedAttendance => a !== null);
}

// Types for normalized candidate objects
export type D1CandidateRow = {
  id: number;
  name: string;
  email: string;
  user_id: number;
  position_id: number;
  election_id: number;
};

export type NormalizedCandidate = {
  id: number;
  name: string;
  email: string;
  userId: number;
  positionId: number;
  electionId: number;
};

export function normalizeCandidate(row: D1CandidateRow | null | undefined): NormalizedCandidate | null {
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    userId: row.user_id,
    positionId: row.position_id,
    electionId: row.election_id,
  };
}

export function normalizeCandidates(rows: D1CandidateRow[]): NormalizedCandidate[] {
  return rows.map(row => normalizeCandidate(row)).filter((c): c is NormalizedCandidate => c !== null);
}
