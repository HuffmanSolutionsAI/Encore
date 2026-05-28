import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { HttpError } from "./http";

export interface AuthContext {
  /** The Cognito `sub` — also the `users.id` primary key. */
  userId: string;
  email?: string;
}

/**
 * Extract the authenticated user from the API Gateway JWT authorizer context.
 * The authorizer has already verified the token's signature, issuer, and
 * audience; here we only read the trusted claims.
 *
 * In local dev (`DEV_AUTH=1`) we instead trust an `x-dev-user-id` header
 * the local Express shim sets from the web client. This path NEVER runs in
 * Lambda — API Gateway strips arbitrary headers before invoking us, and
 * even if it didn't, `DEV_AUTH` isn't set in production.
 */
export function requireAuth(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): AuthContext {
  if (process.env.DEV_AUTH === "1") {
    const headers = event.headers ?? {};
    const userId = headers["x-dev-user-id"] ?? headers["X-Dev-User-Id"];
    if (typeof userId !== "string" || userId.length === 0) {
      throw new HttpError(401, "unauthorized", "Missing x-dev-user-id header");
    }
    return { userId, email: "dev@local" };
  }

  const claims = event.requestContext.authorizer?.jwt?.claims;
  const sub = claims?.["sub"];
  if (typeof sub !== "string" || sub.length === 0) {
    throw new HttpError(401, "unauthorized", "Missing authenticated user");
  }
  const email = claims?.["email"];
  return {
    userId: sub,
    email: typeof email === "string" ? email : undefined,
  };
}
