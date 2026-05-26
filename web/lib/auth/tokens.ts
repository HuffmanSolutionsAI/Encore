// Browser-side token persistence. localStorage lets us survive reloads
// and new tabs; we accept the standard XSS trade-off in exchange for not
// requiring a custom server-side session cookie / extra Lambda routes.
//
// All accesses are gated through these helpers — never reach into
// localStorage directly elsewhere.

import type { AuthTokens } from "./cognito";

const STORAGE_KEY = "encore.auth.tokens";

interface Persisted {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function loadTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens satisfies Persisted));
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** True when the access token expires within the next 60 seconds. */
export function isExpired(tokens: AuthTokens, leewayMs = 60_000): boolean {
  return Date.now() + leewayMs >= tokens.expiresAt;
}
