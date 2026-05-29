import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { HttpError, json } from "../lib/http";

interface Row {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * GET /dev/users — list every account so the dev signin can resume an
 * existing one. Gated by `DEV_AUTH=1`; returns 404 in production so it
 * doesn't even hint at existing. Intentionally unauthenticated within
 * dev mode (the whole point is to pick *which* dev to sign in as).
 */
export async function listDevUsers(
  _event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  if (process.env.DEV_AUTH !== "1") {
    throw new HttpError(404, "not_found", "Not found");
  }
  const pool = await getPool();
  const { rows } = await pool.query<Row>(
    `select id, handle, display_name, avatar_url, created_at
     from users
     order by created_at desc
     limit 50`,
  );
  return json(200, { users: rows });
}
