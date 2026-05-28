// Dev-mode sign-in. When NEXT_PUBLIC_DEV_MODE === "true", the web app
// skips Cognito entirely: a single "Sign in as dev" button mints a UUID
// for the user and stores it in localStorage. The API client sends that
// id as `x-dev-user-id`; the local API (with DEV_AUTH=1) trusts it.
//
// NEVER ship to production. Gated by the dev-mode flag end-to-end.

const STORAGE_KEY = "encore.dev.user_id";

export function loadDevUserID(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function createDevUserID(): string {
  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function clearDevUserID(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
