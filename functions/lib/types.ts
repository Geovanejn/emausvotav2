// Cloudflare Pages Functions types
import type { User } from "@shared/schema";

export interface Env {
  DB: D1Database;
  FOTOS: R2Bucket;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  JWT_SECRET: string;
  R2_PUBLIC_URL: string;
  ENVIRONMENT?: string; // Optional: "development" or "production"
}

export type EventContext<T = unknown> = {
  request: Request;
  env: Env;
  params: T;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: RequestInfo, init?: RequestInit) => Promise<Response>;
  functionPath: string;
};

export type AuthUser = Omit<User, "password"> & { id: number };

export interface AuthContext<T = unknown> extends EventContext<T> {
  user: AuthUser;
}
