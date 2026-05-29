import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { HttpError, json } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { getRecentTracksPage } from "../lib/lastfm";

interface RecentRow {
  played_at: string;
  track_title: string;
  artist_name: string;
  track_mbid: string | null;
}

/**
 * POST /me/history/sync
 * Walks the user's Last.fm scrobble history (newest first), inserting any
 * we haven't seen yet. Bounded — sync no more than `maxPages` pages per
 * call (default 10 × 200 tracks = ~2000 scrobbles) so the request returns
 * in time. Idempotent: a unique index dedupes repeat runs.
 */
export async function syncHistory(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();

  const { rows: userRows } = await pool.query<{ lastfm_username: string | null }>(
    "select lastfm_username from users where id = $1",
    [userId],
  );
  const lastfmUsername = userRows[0]?.lastfm_username;
  if (!lastfmUsername) {
    throw new HttpError(409, "lastfm_not_linked", "Link a Last.fm account first");
  }

  // Only fetch scrobbles newer than the most recent one we already have.
  const { rows: latest } = await pool.query<{ played_at: string }>(
    "select played_at from listen_events where user_id = $1 order by played_at desc limit 1",
    [userId],
  );
  const from = latest[0] ? new Date(latest[0].played_at) : undefined;

  const maxPages = 10;
  let inserted = 0;
  let page = 1;
  let totalPages = 1;

  while (page <= Math.min(maxPages, totalPages)) {
    const { tracks, totalPages: tp } = await getRecentTracksPage({
      username: lastfmUsername,
      page,
      limit: 200,
      from,
    });
    totalPages = tp;
    if (tracks.length === 0) break;

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (const t of tracks) {
      const i = values.length;
      placeholders.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
      values.push(userId, t.title, t.artist, t.trackMBID, t.playedAt.toISOString());
    }
    const res = await pool.query(
      `insert into listen_events (user_id, track_title, artist_name, track_mbid, played_at)
       values ${placeholders.join(",")}
       on conflict (user_id, played_at, track_title, artist_name) do nothing`,
      values,
    );
    inserted += res.rowCount ?? 0;
    page += 1;
  }

  return json(200, { inserted, pages_walked: page - 1 });
}

/**
 * GET /me/history?limit=N
 * The user's recent scrobbles, newest first, joined to their existing rating
 * (if any) so the UI can show "rate this" affordances for unrated plays.
 */
export async function listHistory(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const limit = Math.min(50, Math.max(1, Number(event.queryStringParameters?.["limit"] ?? "20")));
  const pool = await getPool();
  const { rows } = await pool.query<
    RecentRow & { rating_score: string | null; rating_review: string | null }
  >(
    `select le.played_at, le.track_title, le.artist_name, le.track_mbid,
            r.score as rating_score, r.review_text as rating_review
     from listen_events le
     left join tracks t on t.mbid = le.track_mbid
     left join ratings r on r.user_id = le.user_id and r.subject_type = 'track' and r.subject_id = t.id
     where le.user_id = $1
     order by le.played_at desc
     limit $2`,
    [userId, limit],
  );
  return json(200, {
    history: rows.map((r) => ({
      played_at: r.played_at,
      track_title: r.track_title,
      artist_name: r.artist_name,
      track_mbid: r.track_mbid,
      rated: r.rating_score !== null,
      score: r.rating_score === null ? null : Number(r.rating_score),
    })),
  });
}
