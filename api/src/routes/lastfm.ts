import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { HttpError, json } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { lastfmUserExists } from "../lib/lastfm";

/**
 * GET /lastfm/verify?username=<name>
 * Confirms a Last.fm username exists before onboarding accepts it.
 */
export async function verifyLastfm(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  requireAuth(event);

  const username = event.queryStringParameters?.["username"]?.trim();
  if (!username) {
    throw new HttpError(400, "missing_username", "username query parameter is required");
  }

  const exists = await lastfmUserExists(username);
  return json(200, { username, exists });
}
