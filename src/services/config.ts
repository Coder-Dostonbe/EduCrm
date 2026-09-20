/**
 * One switch decides where the app gets its data.
 *
 *   NEXT_PUBLIC_API_MODE=mock   → the bundled mock data (default, no backend)
 *   NEXT_PUBLIC_API_MODE=api    → the Django REST API at NEXT_PUBLIC_API_URL
 *
 * Components never read this: they call the service functions in
 * `src/services/`, which pick the right source themselves. That is what makes
 * swapping the mock layer for the real backend a config change, not a rewrite.
 */

export const API_MODE: "mock" | "api" =
  process.env.NEXT_PUBLIC_API_MODE === "api" ? "api" : "mock";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export const USE_REAL_API = API_MODE === "api";

/**
 * Google Sign-In client ID. Public by design — it is baked into the browser
 * bundle. The matching secret plays no part in this flow: the frontend obtains
 * an ID token and the backend verifies it against Google directly.
 *
 * Empty means Google sign-in is simply not offered.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Storage keys — kept in one place so nothing drifts. */
export const STORAGE = {
  access: "eduflow.access",
  refresh: "eduflow.refresh",
  session: "eduflow.session",
  language: "eduflow.language",
  branch: "eduflow.branch",
} as const;
