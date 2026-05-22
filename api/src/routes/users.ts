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
