import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool, isUniqueViolation } from "../lib/db";
import { HttpError, json, parseBody } from "../lib/http";
import { requireAuth } from "../lib/auth";

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

interface UserRow {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  lastfm_username: string | null;
  created_at: string;
}

function requireHandle(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_handle", "handle is required");
  }
  const handle = value.trim().toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    throw new HttpError(
      400,
      "invalid_handle",
      "handle must be 3-30 characters: lowercase letters, numbers, underscore",
    );
  }
  return handle;
}

function requireDisplayName(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_display_name", "display_name is required");
  }
  const name = value.trim();
  if (name.length < 1 || name.length > 80) {
    throw new HttpError(400, "invalid_display_name", "display_name must be 1-80 characters");
  }
  return name;
}

function requireLastfmUsername(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_lastfm_username", "lastfm_username must be a string");
  }
  const name = value.trim();
  if (name.length < 1 || name.length > 64 || /\s/.test(name)) {
    throw new HttpError(400, "invalid_lastfm_username", "lastfm_username is not valid");
  }
  return name;
}

/** GET /users/me — the authenticated user's profile. */
export async function getMe(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();
  const { rows } = await pool.query<UserRow>(
    "select id, handle, display_name, avatar_url, lastfm_username, created_at from users where id = $1",
    [userId],
  );
  const profile = rows[0];
  if (!profile) throw new HttpError(404, "profile_not_found", "No profile for this account");
  return json(200, profile);
}

/** POST /users — create the profile for the authenticated account (onboarding). */
export async function createUser(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const body = parseBody(event);
  const handle = requireHandle(body["handle"]);
  const displayName = requireDisplayName(body["display_name"]);

  const pool = await getPool();
  try {
    const { rows } = await pool.query<UserRow>(
      `insert into users (id, handle, display_name)
       values ($1, $2, $3)
       returning id, handle, display_name, avatar_url, lastfm_username, created_at`,
      [userId, handle, displayName],
    );
    return json(201, rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      if (err.constraint === "users_handle_key") {
        throw new HttpError(409, "handle_taken", "That handle is already taken");
      }
      throw new HttpError(409, "profile_exists", "This account already has a profile");
    }
    throw err;
  }
}

interface PublicProfileRow {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  records: string;
  ovations: string;
  followers: string;
  following: string;
  is_following: boolean;
}

/** GET /users/:handle — public profile + stats, with the caller's follow state. */
export async function getProfile(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const handle = event.pathParameters?.["handle"]?.trim().toLowerCase();
  if (!handle || !HANDLE_RE.test(handle)) {
    throw new HttpError(400, "invalid_handle", "handle is not valid");
  }

  const pool = await getPool();
  const { rows } = await pool.query<PublicProfileRow>(
    `select u.id, u.handle, u.display_name, u.avatar_url, u.created_at,
            (select count(*) from ratings r where r.user_id = u.id)                          as records,
            (select count(*) from ratings r where r.user_id = u.id and r.score = 5)          as ovations,
            (select count(*) from follows f where f.followee_id = u.id)                       as followers,
            (select count(*) from follows f where f.follower_id = u.id)                       as following,
            exists(select 1 from follows f where f.follower_id = $2 and f.followee_id = u.id) as is_following
     from users u
     where u.handle = $1`,
    [handle, userId],
  );
  const p = rows[0];
  if (!p) throw new HttpError(404, "user_not_found", "No user with that handle");

  return json(200, {
    id: p.id,
    handle: p.handle,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    is_following: p.is_following,
    is_self: p.id === userId,
    stats: {
      records: Number(p.records),
      ovations: Number(p.ovations),
      followers: Number(p.followers),
      following: Number(p.following),
    },
  });
}

/** GET /users?q=... — find people by handle or display name. */
export async function searchUsers(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const q = event.queryStringParameters?.["q"]?.trim();
  if (!q || q.length < 2) return json(200, { users: [] });

  const pool = await getPool();
  const { rows } = await pool.query(
    `select u.id, u.handle, u.display_name, u.avatar_url,
            exists(select 1 from follows f where f.follower_id = $2 and f.followee_id = u.id) as is_following
     from users u
     where u.id <> $2 and (u.handle ilike $1 or u.display_name ilike $1)
     order by u.handle asc
     limit 12`,
    [`%${q}%`, userId],
  );
  return json(200, { users: rows });
}

/** PATCH /users/me — update mutable profile fields (e.g. the Last.fm username). */
export async function updateMe(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const body = parseBody(event);

  const columns: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    values.push(value);
    columns.push(`${column} = $${values.length}`);
  };

  if ("display_name" in body) set("display_name", requireDisplayName(body["display_name"]));
  if ("lastfm_username" in body) {
    const raw = body["lastfm_username"];
    set("lastfm_username", raw === null ? null : requireLastfmUsername(raw));
  }
  if (columns.length === 0) {
    throw new HttpError(400, "no_fields", "No updatable fields supplied");
  }

  values.push(userId);
  const pool = await getPool();
  const { rows } = await pool.query<UserRow>(
    `update users set ${columns.join(", ")}
     where id = $${values.length}
     returning id, handle, display_name, avatar_url, lastfm_username, created_at`,
    values,
  );
  const profile = rows[0];
  if (!profile) throw new HttpError(404, "profile_not_found", "No profile for this account");
  return json(200, profile);
}
