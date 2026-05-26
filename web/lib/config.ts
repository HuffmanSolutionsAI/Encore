// Central place for product strings and remote-environment configuration.
// Product strings live here; environment values come from `NEXT_PUBLIC_*`
// env vars (real values from `terraform output` go into `.env.local`,
// which is gitignored).

export const APP_NAME = "Encore";
export const BRAND_LINE = "Music worth playing again.";
export const RATING_PROMPT = "Worth an encore?";

/**
 * Public web-app configuration. These values are baked into the client bundle
 * — only put values here that are safe to expose (Cognito client id, hosted
 * UI domain, API base URL).
 */
export const remoteConfig = {
  apiBaseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  cognito: {
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
    clientID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
    redirectURI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ?? "",
  },
} as const;

export function isRemoteConfigured(): boolean {
  return Boolean(
    remoteConfig.apiBaseURL &&
      remoteConfig.cognito.domain &&
      remoteConfig.cognito.clientID &&
      remoteConfig.cognito.redirectURI,
  );
}
