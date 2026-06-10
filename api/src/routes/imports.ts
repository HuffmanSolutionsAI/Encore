import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { HttpError, json, parseBody } from "../lib/http";
import { requireAuth } from "../lib/auth";
import {
  ensureAlbumByReleaseGroup,
  ensureAlbumByTitle,
} from "../lib/catalog";
import { recomputeAlbumAggregate } from "../lib/aggregates";
import { getPool } from "../lib/db";

interface ImportRow {
  title: string;
  artist: string;
  score: number | null;
  review?: string | null;
  rated_at?: string | null;
  /** Optional pre-resolved release-group mbid — skips a MusicBrainz lookup. */
  mbid?: string | null;
}

interface ImportResult {
  album_title: string;
  artist: string;
  status: "imported" | "updated" | "skipped" | "failed";
  reason?: string;
}

const SCALES: Record<string, (n: number) => number | null> = {
  "0.5-5": (n) => snap(n),
  "1-10": (n) => snap(n / 2),
  "1-100": (n) => snap(n / 20),
};

/** Snap to the nearest 0.5 step within [0.5, 5]. Null if not a valid number. */
function snap(n: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const snapped = Math.round(n * 2) / 2;
  if (snapped < 0.5) return null;
  if (snapped > 5) return 5;
  return snapped;
}

/**
 * POST /imports/ratings
 *
 * Bulk-import the caller's ratings from another service. Each row gets
 * resolved against the MusicBrainz catalog (via mbid if supplied, else by
 * title+artist) and upserted via the same path as a manual rating. Sequential
 * (one MusicBrainz call at a time) — caller waits for the response.
 *
 * Body:
 *   {
 *     "source": "musicboard",            // free text; informational only
 *     "score_scale": "1-10",             // "0.5-5" | "1-10" | "1-100"
 *     "ratings": [
 *       { "title": "Kid A", "artist": "Radiohead", "score": 10, "review": "…", "rated_at": "2024-05-12" }
 *     ]
 *   }
 *
 * Response:
 *   { imported: 12, updated: 0, skipped: 1, failed: 3, results: [...] }
 */
export async function importRatings(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const body = parseBody(event);

  const scaleKey = typeof body["score_scale"] === "string" ? body["score_scale"] : "0.5-5";
  const scale = SCALES[scaleKey];
  if (!scale) {
    throw new HttpError(400, "invalid_scale", "score_scale must be one of 0.5-5, 1-10, 1-100");
  }

  const raw = body["ratings"];
  if (!Array.isArray(raw)) {
    throw new HttpError(400, "missing_ratings", "ratings must be an array");
  }
  if (raw.length === 0) return json(200, { imported: 0, updated: 0, skipped: 0, failed: 0, results: [] });
  if (raw.length > 1000) {
    throw new HttpError(400, "too_many", "Send at most 1000 ratings per request");
  }

  const pool = await getPool();
  const albumsTouched = new Set<string>();
  const results: ImportResult[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of raw as Array<Partial<ImportRow>>) {
    const title = (row.title ?? "").toString().trim();
    const artist = (row.artist ?? "").toString().trim();
    if (!title || !artist) {
      results.push({ album_title: title || "(missing)", artist: artist || "(missing)", status: "skipped", reason: "missing title or artist" });
      skipped++;
      continue;
    }

    const score = row.score == null ? null : scale(Number(row.score));
    const review = row.review == null ? null : String(row.review).trim() || null;
    if (score === null && !review) {
      results.push({ album_title: title, artist, status: "skipped", reason: "no score and no review" });
      skipped++;
      continue;
    }

    try {
      // Resolve the album row. mbid is the fast path (one MusicBrainz call,
      // cached after); title+artist requires a search.
      const resolved =
        typeof row.mbid === "string" && row.mbid
          ? await ensureAlbumByReleaseGroup(row.mbid)
          : await ensureAlbumByTitle({ title, artist });
      if (!resolved) {
        results.push({ album_title: title, artist, status: "failed", reason: "not found in catalog" });
        failed++;
        continue;
      }

      // Upsert as a direct album rating. Source = "manual" — the import
      // doesn't claim these came from a now-playing event.
      const ratedAt = row.rated_at ? new Date(row.rated_at) : new Date();
      const isValidDate = !Number.isNaN(ratedAt.getTime());
      const ins = await pool.query<{ inserted: boolean }>(
        `insert into ratings
           (user_id, subject_type, subject_id, score, review_text, is_relisten, source, created_at, updated_at)
         values ($1, 'album', $2, $3, $4, false, 'manual', $5, $5)
         on conflict (user_id, subject_type, subject_id) do update set
           score        = excluded.score,
           review_text  = excluded.review_text,
           updated_at   = greatest(ratings.updated_at, excluded.updated_at)
         returning (xmax = 0) as inserted`,
        [userId, resolved.album.id, score, review, isValidDate ? ratedAt.toISOString() : new Date().toISOString()],
      );
      if (ins.rows[0]?.inserted) {
        imported++;
        results.push({ album_title: title, artist, status: "imported" });
      } else {
        updated++;
        results.push({ album_title: title, artist, status: "updated" });
      }
      albumsTouched.add(resolved.album.id);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      results.push({ album_title: title, artist, status: "failed", reason });
      failed++;
    }
  }

  // Recompute aggregates once per touched album, instead of after every row.
  for (const albumId of albumsTouched) {
    try {
      await recomputeAlbumAggregate(albumId);
    } catch {
      // soft-fail aggregate recompute — the data still landed correctly
    }
  }

  return json(200, { imported, updated, skipped, failed, results });
}
