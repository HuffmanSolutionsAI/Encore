import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { HttpError, json } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { getNowPlaying } from "../lib/lastfm";

interface UsernameRow {
  lastfm_username: string | null;
}

/**
 * GET /now-playing
 * Returns the user's currently-playing track (per Last.fm), or
 * `{ playing: false, track: null }` when nothing is on.
 */
export async function nowPlaying(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);

  const pool = await getPool();
  const { rows } = await pool.query<UsernameRow>(
    "select lastfm_username from users where id = $1",
    [userId],
  );
  const profile = rows[0];
  if (!profile) {
    throw new HttpError(404, "profile_not_found", "No profile for this account");
  }
  if (!profile.lastfm_username) {
    throw new HttpError(
      409,
      "lastfm_not_linked",
      "Link a Last.fm account to use now-playing",
    );
  }

  const track = await getNowPlaying(profile.lastfm_username);
  return json(200, { playing: track !== null, track });
}
