import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { json } from "../lib/http";
import { requireAuth } from "../lib/auth";

interface Row {
  id: string;
  kind: "follow" | "ovation";
  actor_id: string | null;
  actor_handle: string | null;
  actor_display_name: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

/** GET /notifications — last 50 for the caller, newest first. */
export async function listNotifications(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();
  const { rows } = await pool.query<Row>(
    `select n.id, n.kind, n.actor_id, n.payload, n.created_at, n.read_at,
            u.handle       as actor_handle,
            u.display_name as actor_display_name
     from notifications n
     left join users u on u.id = n.actor_id
     where n.user_id = $1
     order by n.created_at desc
     limit 50`,
    [userId],
  );
  const { rows: countRow } = await pool.query<{ unread: string }>(
    "select count(*)::text as unread from notifications where user_id = $1 and read_at is null",
    [userId],
  );
  return json(200, { notifications: rows, unread: Number(countRow[0]?.unread ?? 0) });
}

/** POST /notifications/mark-read — mark all of the caller's notifications read. */
export async function markRead(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();
  await pool.query(
    "update notifications set read_at = now() where user_id = $1 and read_at is null",
    [userId],
  );
  return json(200, { ok: true });
}
