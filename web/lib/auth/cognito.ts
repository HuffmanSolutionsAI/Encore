// Cognito hosted-UI OAuth flow for a public web client. Authorization
// Code grant + PKCE (mandatory for browser SPAs).
//
// Build spec F1: Sign in with Apple is the primary method, with email
// fallback. We pass `identity_provider=SignInWithApple` so Cognito sends
// the user straight to Apple; if the user has no Apple ID, Cognito's
// hosted UI falls back to email/password from the same screen.

import { remoteConfig } from "@/lib/config";

const VERIFIER_KEY = "encore.oauth.code_verifier";
const STATE_KEY = "encore.oauth.state";
const RETURN_KEY = "encore.oauth.return_to";

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // ms epoch
}

export class AuthError extends Error {
  constructor(
    readonly code:
      | "not_configured"
      | "state_mismatch"
      | "missing_code"
      | "token_exchange_failed"
      | "refresh_expired"
      | "network",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AuthError";
  }
}

/**
 * Kick off the hosted-UI flow. Generates a PKCE verifier + state, stashes
 * them in sessionStorage, then redirects the browser to Cognito.
 */
export async function startSignIn(returnTo: string = "/"): Promise<void> {
  if (!isConfigured()) throw new AuthError("not_configured");

  const verifier = generateVerifier();
  const challenge = await sha256Base64URL(verifier);
  const state = generateVerifier(32);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_KEY, returnTo);

  const url = new URL(`https://${remoteConfig.cognito.domain}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", remoteConfig.cognito.clientID);
  url.searchParams.set("redirect_uri", remoteConfig.cognito.redirectURI);
  url.searchParams.set("scope", "email openid profile");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  url.searchParams.set("identity_provider", "SignInWithApple");

  window.location.assign(url.toString());
}

/** Where to land the user after a successful exchange. */
export function consumeReturnTo(): string {
  const v = sessionStorage.getItem(RETURN_KEY) ?? "/";
  sessionStorage.removeItem(RETURN_KEY);
  return v;
}

/**
 * Exchange the authorization code returned in the callback URL for tokens.
 * Validates state and clears the PKCE artifacts on success.
 */
export async function exchangeCode(params: {
  code: string;
  state: string | null;
}): Promise<AuthTokens> {
  if (!isConfigured()) throw new AuthError("not_configured");

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!expectedState || params.state !== expectedState) {
    throw new AuthError("state_mismatch", "Auth state didn't match — try signing in again.");
  }
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    throw new AuthError("missing_code", "Couldn't find the sign-in challenge — try again.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: remoteConfig.cognito.clientID,
    code: params.code,
    redirect_uri: remoteConfig.cognito.redirectURI,
    code_verifier: verifier,
  });

  const tokens = await postToken(body);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return tokens;
}

/** Trade a refresh token for a fresh access/id pair. */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  if (!isConfigured()) throw new AuthError("not_configured");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: remoteConfig.cognito.clientID,
    refresh_token: refreshToken,
  });
  const next = await postToken(body);
  // Cognito doesn't rotate the refresh token on this grant — carry it forward.
  return { ...next, refreshToken: next.refreshToken || refreshToken };
}

/** Redirect to Cognito's hosted-UI logout endpoint. */
export function startSignOut(): void {
  if (!isConfigured()) {
    window.location.assign("/");
    return;
  }
  const logout = new URL(`https://${remoteConfig.cognito.domain}/logout`);
  logout.searchParams.set("client_id", remoteConfig.cognito.clientID);
  // Cognito needs the post-logout URL to match a registered `logout_urls`
  // entry. We register `/auth/signed-out` in Terraform.
  const redirectBase = new URL(remoteConfig.cognito.redirectURI);
  logout.searchParams.set(
    "logout_uri",
    `${redirectBase.origin}/auth/signed-out`,
  );
  window.location.assign(logout.toString());
}

export function isConfigured(): boolean {
  return Boolean(
    remoteConfig.cognito.domain &&
      remoteConfig.cognito.clientID &&
      remoteConfig.cognito.redirectURI,
  );
}

// MARK: - Internals

async function postToken(body: URLSearchParams): Promise<AuthTokens> {
  let res: Response;
  try {
    res = await fetch(`https://${remoteConfig.cognito.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw new AuthError("network", "Couldn't reach the sign-in service.");
  }
  const text = await res.text();
  if (res.status === 400 || res.status === 401) {
    const parsed = safeJSON(text);
    if (parsed?.error === "invalid_grant") {
      throw new AuthError("refresh_expired", "Your session expired — please sign in again.");
    }
    throw new AuthError(
      "token_exchange_failed",
      parsed?.error_description ?? parsed?.error ?? text,
    );
  }
  if (!res.ok) {
    throw new AuthError("token_exchange_failed", `Sign-in service returned ${res.status}`);
  }
  const body2 = safeJSON(text);
  if (!body2?.access_token || !body2?.id_token || !body2?.expires_in) {
    throw new AuthError("token_exchange_failed", "Malformed token response");
  }
  return {
    accessToken: body2.access_token,
    idToken: body2.id_token,
    refreshToken: body2.refresh_token ?? "",
    expiresAt: Date.now() + Number(body2.expires_in) * 1000,
  };
}

function safeJSON(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// PKCE: code_verifier is a high-entropy random string; the challenge is its
// SHA-256 hash, base64url-encoded.
function generateVerifier(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64URL(bytes);
}

async function sha256Base64URL(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URL(new Uint8Array(hash));
}

function base64URL(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
