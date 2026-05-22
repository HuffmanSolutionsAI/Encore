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
 */
export function requireAuth(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): AuthContext {
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
