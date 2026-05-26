// Encore — scoring algorithm. Build spec Section 6.
//
// All math is pure and unit-tested in `scoring.test.ts`. The recompute
// orchestrator (read ratings → write aggregate rows) lives in
// `lib/aggregates.ts`; this module is the algorithm itself.

/** Smoothing constant for the Bayesian-weighted track score. */
export const TRACK_SMOOTHING_C = 5;

/**
 * Default global mean used for `weighted_track_score` when we don't yet
 * have enough data to compute a real one. Build spec: "default 3.5 until
 * there is enough data."
 */
export const DEFAULT_GLOBAL_MEAN = 3.5;

/**
 * Step 1 — Bayesian-weighted track score.
 *
 *   weighted = (C * m + sum_of_ratings) / (C + n)
 *
 * `n=0` returns `null` (an unrated track has no score to display); the
 * track-derived album score skips these.
 */
export function weightedTrackScore(input: {
  ratings: number[];
  globalMean?: number;
  smoothing?: number;
}): number | null {
  const { ratings } = input;
  if (ratings.length === 0) return null;

  const C = input.smoothing ?? TRACK_SMOOTHING_C;
  const m = input.globalMean ?? DEFAULT_GLOBAL_MEAN;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return (C * m + sum) / (C + ratings.length);
}

/** Step 1, supporting half — simple average for `avg_score`. */
export function meanRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

/**
 * Step 2 — album `track_derived_score`. Mean of `weightedTrackScore`
 * across the album's tracks that have at least one rating. `null` when
 * no track on the album has a rating.
 *
 * Each track counts equally (regardless of rating count) — build spec
 * "each track counts equally" is the key qualifier.
 */
export function trackDerivedAlbumScore(
  weightedTrackScores: Array<number | null>,
): number | null {
  const valid = weightedTrackScores.filter(
    (s): s is number => s !== null && Number.isFinite(s),
  );
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Step 3 — direct album score: simple average of direct album ratings. */
export function directAlbumScore(directRatings: number[]): number | null {
  return meanRating(directRatings);
}

/**
 * Personal album score for a user — simple mean of *that user's* track
 * ratings on the album, plus a coverage indicator. `null` score when
 * the user hasn't rated any track on the album.
 */
export function personalAlbumScore(input: {
  userTrackRatings: number[];
  albumTrackCount: number;
}): { score: number | null; ratedTracks: number; totalTracks: number } {
  const { userTrackRatings, albumTrackCount } = input;
  return {
    score: meanRating(userTrackRatings),
    ratedTracks: userTrackRatings.length,
    totalTracks: albumTrackCount,
  };
}
