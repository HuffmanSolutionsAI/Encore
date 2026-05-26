import { getPool } from "./db";
import {
  directAlbumScore,
  meanRating,
  trackDerivedAlbumScore,
  weightedTrackScore,
} from "./scoring";

/**
 * Minimal pg surface — accepts a Pool, a PoolClient (mid-transaction), or
 * any test double. We don't need the full overloaded query() typing here.
 */
interface DBExec {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
}

/**
 * Recompute `track_aggregates` for a single track. Reads every rating
 * for that track and rewrites the row. Idempotent.
 */
export async function recomputeTrackAggregate(trackID: string, db?: DBExec): Promise<void> {
  const exec: DBExec = db ?? (await getPool());
  const { rows } = await exec.query(
    "select score from ratings where subject_type = 'track' and subject_id = $1 and score is not null",
    [trackID],
  );
  const scores = (rows as Array<{ score: string }>).map((r) => Number(r.score));

  const avg = meanRating(scores);
  const weighted = weightedTrackScore({ ratings: scores });

  await exec.query(
    `insert into track_aggregates (track_id, avg_score, rating_count, weighted_score, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (track_id) do update set
       avg_score      = excluded.avg_score,
       rating_count   = excluded.rating_count,
       weighted_score = excluded.weighted_score,
       updated_at     = now()`,
    [trackID, avg, scores.length, weighted],
  );
}

/**
 * Recompute `album_aggregates` for a single album. Pulls every track's
 * weighted score plus the direct album ratings, then writes the row.
 */
export async function recomputeAlbumAggregate(albumID: string, db?: DBExec): Promise<void> {
  const exec: DBExec = db ?? (await getPool());

  // Track-derived: re-derive from the live ratings table so we don't
  // depend on `track_aggregates` being fresh. Tracks with zero ratings
  // are skipped by definition (their list is empty → null weighted).
  const trackRowsRes = await exec.query(
    `select t.id as track_id, r.score
     from tracks t
     left join ratings r
       on r.subject_type = 'track'
       and r.subject_id = t.id
       and r.score is not null
     where t.album_id = $1`,
    [albumID],
  );
  const ratingsByTrack = new Map<string, number[]>();
  for (const row of trackRowsRes.rows as Array<{ track_id: string; score: string | null }>) {
    if (!ratingsByTrack.has(row.track_id)) ratingsByTrack.set(row.track_id, []);
    if (row.score !== null) ratingsByTrack.get(row.track_id)!.push(Number(row.score));
  }
  const trackWeights = [...ratingsByTrack.values()].map((scores) =>
    scores.length === 0 ? null : weightedTrackScore({ ratings: scores }),
  );
  const trackDerived = trackDerivedAlbumScore(trackWeights);

  const directRes = await exec.query(
    "select score from ratings where subject_type = 'album' and subject_id = $1 and score is not null",
    [albumID],
  );
  const directScores = (directRes.rows as Array<{ score: string }>).map((r) =>
    Number(r.score),
  );
  const direct = directAlbumScore(directScores);

  await exec.query(
    `insert into album_aggregates (album_id, track_derived_score, direct_album_score, direct_rating_count, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (album_id) do update set
       track_derived_score = excluded.track_derived_score,
       direct_album_score  = excluded.direct_album_score,
       direct_rating_count = excluded.direct_rating_count,
       updated_at          = now()`,
    [albumID, trackDerived, direct, directScores.length],
  );
}

/**
 * Recompute everything affected by a rating change. Tracks: recompute the
 * track row and the parent album. Albums: recompute the album only.
 */
export async function recomputeForRating(input: {
  subjectType: "track" | "album";
  subjectID: string;
  db?: DBExec;
}): Promise<void> {
  if (input.subjectType === "album") {
    await recomputeAlbumAggregate(input.subjectID, input.db);
    return;
  }

  await recomputeTrackAggregate(input.subjectID, input.db);

  const exec: DBExec = input.db ?? (await getPool());
  const { rows } = await exec.query(
    "select album_id from tracks where id = $1",
    [input.subjectID],
  );
  const albumID = (rows as Array<{ album_id: string }>)[0]?.album_id;
  if (albumID) await recomputeAlbumAggregate(albumID, exec);
}

