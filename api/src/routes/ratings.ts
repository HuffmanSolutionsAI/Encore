import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { HttpError, json, parseBody } from "../lib/http";
import { requireAuth } from "../lib/auth";
import {
  ensureAlbumByRecording,
  ensureAlbumByReleaseGroup,
  ensureAlbumByTitle,
  ensureTrackByTitle,
} from "../lib/catalog";
import { recomputeForRating } from "../lib/aggregates";

const MIN_SCORE = 0.5;
const MAX_SCORE = 5.0;

type Source = "now_playing" | "manual";

interface RatingRow {
  id: string;
  user_id: string;
  subject_type: "track" | "album";
  subject_id: string;
  score: string | null;
  review_text: string | null;
  is_relisten: boolean;
  source: Source;
  created_at: string;
  updated_at: string;
}

interface ResolvedSubject {
  subjectType: "track" | "album";
  subjectID: string;
}

function validateScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(400, "invalid_score", "score must be a number or null");
  }
  if (value < MIN_SCORE || value > MAX_SCORE) {
    throw new HttpError(400, "invalid_score", "score must be between 0.5 and 5.0");
  }
  if ((value * 2) % 1 !== 0) {
    throw new HttpError(400, "invalid_score", "score must be in 0.5 steps");
  }
  return value;
}

function validateReview(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_review", "review_text must be a string or null");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 4000) {
    throw new HttpError(400, "invalid_review", "review_text is too long");
  }
  return trimmed;
}

function validateSource(value: unknown): Source {
  if (value === undefined) return "manual";
  if (value === "now_playing" || value === "manual") return value;
  throw new HttpError(400, "invalid_source", "source must be 'now_playing' or 'manual'");
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve the subject of a rating into a real catalog row, caching from
 * MusicBrainz on a miss. Accepts either an explicit `subject_id` (when
 * the caller already has it — e.g. rating from an album page) or a
 * `hint` (e.g. now-playing → mbid or title+artist).
 */
async function resolveSubject(body: Record<string, unknown>): Promise<ResolvedSubject> {
  const subjectType = body["subject_type"];
  if (subjectType !== "track" && subjectType !== "album") {
    throw new HttpError(400, "invalid_subject_type", "subject_type must be 'track' or 'album'");
  }

  const explicitID = asNonEmptyString(body["subject_id"]);
  if (explicitID) {
    if (!/^[0-9a-f-]{36}$/i.test(explicitID)) {
      throw new HttpError(400, "invalid_subject_id", "subject_id must be a UUID");
    }
    return { subjectType, subjectID: explicitID };
  }

  const hint = body["hint"];
  if (!hint || typeof hint !== "object") {
    throw new HttpError(400, "missing_subject", "Provide subject_id or hint");
  }
  const h = hint as Record<string, unknown>;
  const mbid = asNonEmptyString(h["mbid"]);
  const title = asNonEmptyString(h["title"]);
  const artist = asNonEmptyString(h["artist"]);

  if (subjectType === "track") {
    if (mbid) {
      const { track } = await ensureAlbumByRecording(mbid);
      return { subjectType, subjectID: track.id };
    }
    if (title && artist) {
      const resolved = await ensureTrackByTitle({ title, artist });
      if (!resolved) {
        throw new HttpError(
          404,
          "track_not_found",
          "We couldn't find that track in our catalog source",
        );
      }
      return { subjectType, subjectID: resolved.track.id };
    }
    throw new HttpError(400, "invalid_hint", "track hint needs mbid or title+artist");
  }

  // Album subject.
  if (mbid) {
    const { album } = await ensureAlbumByReleaseGroup(mbid);
    return { subjectType, subjectID: album.id };
  }
  if (title && artist) {
    const resolved = await ensureAlbumByTitle({ title, artist });
    if (!resolved) {
      throw new HttpError(
        404,
        "album_not_found",
        "We couldn't find that album in our catalog source",
      );
    }
    return { subjectType, subjectID: resolved.album.id };
  }
  throw new HttpError(400, "invalid_hint", "album hint needs mbid or title+artist");
}

/**
 * POST /ratings
 * Upsert a rating by `(user_id, subject_type, subject_id)`. The unique
 * constraint guarantees one rating per subject per user — re-rating
 * updates the existing row, never duplicates.
 */
export async function upsertRating(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const body = parseBody(event);

  const score = validateScore(body["score"]);
  const review = validateReview(body["review_text"]);
  const isRelisten = body["is_relisten"] === true;
  const source = validateSource(body["source"]);

  if (score === null && review === null) {
    throw new HttpError(
      400,
      "empty_rating",
      "Provide a star score, a review, or both",
    );
  }

  const { subjectType, subjectID } = await resolveSubject(body);

  const pool = await getPool();
  const { rows } = await pool.query<RatingRow>(
    `insert into ratings
       (user_id, subject_type, subject_id, score, review_text, is_relisten, source)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (user_id, subject_type, subject_id) do update set
       score        = excluded.score,
       review_text  = excluded.review_text,
       is_relisten  = excluded.is_relisten,
       source       = excluded.source
     returning id, user_id, subject_type, subject_id, score, review_text,
               is_relisten, source, created_at, updated_at`,
    [userId, subjectType, subjectID, score, review, isRelisten, source],
  );

  await recomputeForRating({ subjectType, subjectID });

  const row = rows[0]!;
  return json(200, {
    ...row,
    score: row.score === null ? null : Number(row.score),
  });
}

interface RatingWithSubject extends RatingRow {
  track_title: string | null;
  album_id_for_track: string | null;
  album_title: string | null;
  album_artist: string | null;
  album_artwork_url: string | null;
}

/**
 * GET /ratings/me
 * The signed-in user's own ratings, joined to track/album metadata so the
 * library can render rows without an extra round trip. Most recent first.
 */
export async function listMyRatings(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();
  const { rows } = await pool.query<RatingWithSubject>(
    `select r.id, r.user_id, r.subject_type, r.subject_id, r.score, r.review_text,
            r.is_relisten, r.source, r.created_at, r.updated_at,
            t.title           as track_title,
            t.album_id        as album_id_for_track,
            a.title           as album_title,
            a.artist_name     as album_artist,
            a.artwork_url     as album_artwork_url
     from ratings r
     left join tracks t
       on r.subject_type = 'track' and t.id = r.subject_id
     left join albums a
       on (r.subject_type = 'album' and a.id = r.subject_id)
       or (r.subject_type = 'track' and a.id = t.album_id)
     where r.user_id = $1
     order by r.updated_at desc
     limit 200`,
    [userId],
  );
  // pg returns numeric columns as strings — coerce to keep the JSON shape
  // honest for the iOS decoder.
  const ratings = rows.map((r) => ({
    ...r,
    score: r.score === null ? null : Number(r.score),
  }));
  return json(200, { ratings });
}
