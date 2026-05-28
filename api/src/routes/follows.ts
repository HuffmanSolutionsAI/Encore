import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool, isUniqueViolation } from "../lib/db";
import { HttpError, json, parseBody } from "../lib/http";
import { requireAuth } from "../lib/auth";

/**
 * POST /follows  { handle }
 * Follow another user by handle. Idempotent — re-following is a no-op.
 */
export async function follow(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const body = parseBody(event);
  const handle = typeof body["handle"] === "string" ? body["handle"].trim().toLowerCase() : "";
  if (!handle) throw new HttpError(400, "missing_handle", "handle is required");

  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    "select id from users where handle = $1",
    [handle],
  );
  const target = rows[0];
  if (!target) throw new HttpError(404, "user_not_found", "No user with that handle");
  if (target.id === userId) {
    throw new HttpError(400, "cannot_follow_self", "You can't follow yourself");
  }

  try {
    await pool.query(
      "insert into follows (follower_id, followee_id) values ($1, $2) on conflict do nothing",
      [userId, target.id],
    );
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
  return json(200, { following: true, followee_id: target.id });
}

/**
 * DELETE /follows/:id
 * Unfollow a user by their id. Idempotent.
 */
export async function unfollow(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const followeeId = event.pathParameters?.["id"];
  if (!followeeId || !/^[0-9a-f-]{36}$/i.test(followeeId)) {
    throw new HttpError(400, "invalid_id", "followee id must be a UUID");
  }
  const pool = await getPool();
  await pool.query("delete from follows where follower_id = $1 and followee_id = $2", [
    userId,
    followeeId,
  ]);
  return json(200, { following: false, followee_id: followeeId });
}
