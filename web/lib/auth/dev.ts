// Dev-mode sign-in. When NEXT_PUBLIC_DEV_MODE === "true", the web app
// skips Cognito entirely: a single "Sign in as dev" button mints a UUID
// for the user and stores it in localStorage. The API client sends that
// id as `x-dev-user-id`; the local API (with DEV_AUTH=1) trusts it.
//
// NEVER ship to production. Gated by the dev-mode flag end-to-end.

import { remoteConfig } from "@/lib/config";

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

/** Switch the active dev session to an existing user id. */
export function setDevUserID(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function clearDevUserID(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Account record returned by /dev/users — used by the signin picker. */
export interface DevAccount {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Fetch the list of existing dev accounts so the signin page can offer a
 * "resume" picker. Unauthenticated — the API gates the route on
 * `DEV_AUTH=1`. Returns an empty list on failure rather than throwing,
 * so a bare-bones API stays a no-op for the picker.
 */
export async function listDevAccounts(): Promise<DevAccount[]> {
  if (!remoteConfig.apiBaseURL) return [];
  try {
    const url = `${remoteConfig.apiBaseURL.replace(/\/$/, "")}/dev/users`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const body = (await res.json()) as { users?: DevAccount[] };
    return body.users ?? [];
  } catch {
    return [];
  }
}
