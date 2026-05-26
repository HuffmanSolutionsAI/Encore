import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLOBAL_MEAN,
  TRACK_SMOOTHING_C,
  directAlbumScore,
  meanRating,
  personalAlbumScore,
  trackDerivedAlbumScore,
  weightedTrackScore,
} from "./scoring";

describe("weightedTrackScore", () => {
  it("returns null when there are no ratings", () => {
    expect(weightedTrackScore({ ratings: [] })).toBe(null);
  });

  it("equals the global mean for a single rating equal to the mean", () => {
    expect(weightedTrackScore({ ratings: [DEFAULT_GLOBAL_MEAN] })).toBeCloseTo(
      DEFAULT_GLOBAL_MEAN,
      6,
    );
  });

  it("pulls a single five toward the mean (C=5, m=3.5)", () => {
    // (5*3.5 + 5) / (5+1) = (17.5+5)/6 = 22.5/6 = 3.75
    expect(weightedTrackScore({ ratings: [5] })).toBeCloseTo(3.75, 6);
  });

  it("pulls a single one toward the mean (C=5, m=3.5)", () => {
    // (5*3.5 + 1) / (5+1) = (17.5+1)/6 = 18.5/6 ≈ 3.0833
    expect(weightedTrackScore({ ratings: [1] })).toBeCloseTo(3.0833333, 5);
  });

  it("approaches the raw mean as ratings pile up", () => {
    const lots = Array.from({ length: 200 }, () => 5);
    const score = weightedTrackScore({ ratings: lots })!;
    expect(score).toBeGreaterThan(4.85);
    expect(score).toBeLessThan(5);
  });

  it("honours a custom global mean", () => {
    // (5*4 + 4) / (5+1) = 24/6 = 4.0
    expect(weightedTrackScore({ ratings: [4], globalMean: 4 })).toBeCloseTo(4, 6);
  });

  it("honours a custom smoothing constant", () => {
    // Bigger C → more pull toward the mean.
    const c5 = weightedTrackScore({ ratings: [5], smoothing: 5 })!;
    const c20 = weightedTrackScore({ ratings: [5], smoothing: 20 })!;
    expect(c20).toBeLessThan(c5);
    expect(c20).toBeGreaterThan(DEFAULT_GLOBAL_MEAN);
  });

  it("matches the documented constants", () => {
    expect(TRACK_SMOOTHING_C).toBe(5);
    expect(DEFAULT_GLOBAL_MEAN).toBe(3.5);
  });
});

describe("meanRating", () => {
  it("returns null on empty input", () => {
    expect(meanRating([])).toBe(null);
  });

  it("averages a simple list", () => {
    expect(meanRating([2, 3, 4])).toBeCloseTo(3, 6);
  });

  it("handles a single rating", () => {
    expect(meanRating([4.5])).toBe(4.5);
  });
});

describe("trackDerivedAlbumScore", () => {
  it("returns null when no track on the album has a rating", () => {
    expect(trackDerivedAlbumScore([null, null, null])).toBe(null);
  });

  it("skips unrated tracks when averaging", () => {
    // weighted scores 4.0 and 3.0; mean of just those two is 3.5.
    expect(trackDerivedAlbumScore([4, null, 3])).toBeCloseTo(3.5, 6);
  });

  it("counts each rated track equally regardless of rating volume", () => {
    const trackA = weightedTrackScore({ ratings: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5] })!;
    const trackB = weightedTrackScore({ ratings: [1] })!;
    const album = trackDerivedAlbumScore([trackA, trackB])!;
    // Track A is heavy on votes but contributes equally to the mean.
    expect(album).toBeCloseTo((trackA + trackB) / 2, 6);
  });

  it("returns null when only NaN/Infinity sneak in", () => {
    expect(trackDerivedAlbumScore([NaN, Infinity])).toBe(null);
  });
});

describe("directAlbumScore", () => {
  it("returns null when nobody rated the album directly", () => {
    expect(directAlbumScore([])).toBe(null);
  });

  it("averages direct album ratings", () => {
    expect(directAlbumScore([5, 4, 3])).toBeCloseTo(4, 6);
  });
});

describe("personalAlbumScore", () => {
  it("reports the simple mean of the user's track ratings, with coverage", () => {
    const result = personalAlbumScore({
      userTrackRatings: [5, 4, 3],
      albumTrackCount: 10,
    });
    expect(result.score).toBeCloseTo(4, 6);
    expect(result.ratedTracks).toBe(3);
    expect(result.totalTracks).toBe(10);
  });

  it("returns a null score when the user has rated no track on the album", () => {
    const result = personalAlbumScore({ userTrackRatings: [], albumTrackCount: 11 });
    expect(result.score).toBe(null);
    expect(result.ratedTracks).toBe(0);
    expect(result.totalTracks).toBe(11);
  });

  it("survives the edge case where the album has zero tracks (Last.fm-only catalog miss)", () => {
    const result = personalAlbumScore({ userTrackRatings: [4], albumTrackCount: 0 });
    expect(result.score).toBe(4);
    expect(result.ratedTracks).toBe(1);
    expect(result.totalTracks).toBe(0);
  });
});
