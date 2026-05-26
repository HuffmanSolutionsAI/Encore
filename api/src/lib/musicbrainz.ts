import { HttpError } from "./http";

// Build spec Section 9: "Set a descriptive User-Agent (required)." The
// version travels in the UA so MusicBrainz can throttle us specifically if
// we misbehave.
const USER_AGENT = "EncoreApp/0.1 ( contact@encoreapp.example )";
const BASE_URL = "https://musicbrainz.org/ws/2";
const COVER_ART_BASE = "https://coverartarchive.org";
const REQUEST_TIMEOUT_MS = 7_000;

/** Shape we resolve to before persisting catalog rows. */
export interface ResolvedAlbum {
  releaseGroupMBID: string;
  title: string;
  artistName: string;
  artistMBID: string | null;
  releaseYear: number | null;
  artworkURL: string | null;
  tracks: ResolvedTrack[];
}

export interface ResolvedTrack {
  /** MusicBrainz recording id. */
  mbid: string;
  title: string;
  trackNumber: number;
  durationMs: number | null;
}

interface MBArtistCredit {
  name?: string;
  artist?: { id?: string; name?: string };
}

interface MBRecording {
  id: string;
  title: string;
  length?: number;
  "first-release-date"?: string;
  "artist-credit"?: MBArtistCredit[];
  releases?: MBRelease[];
}

interface MBRelease {
  id: string;
  title: string;
  date?: string;
  "release-group"?: {
    id: string;
    title: string;
    "primary-type"?: string;
    "first-release-date"?: string;
  };
  "track-count"?: number;
  media?: MBMedium[];
}

interface MBMedium {
  position?: number;
  "track-count"?: number;
  tracks?: MBTrack[];
}

interface MBTrack {
  id: string;
  number?: string;
  position?: number;
  length?: number;
  title: string;
  recording?: { id: string; title: string; length?: number };
}

async function mbFetch<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("fmt", "json");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(503, "musicbrainz_unavailable", "Could not reach MusicBrainz");
  }
  if (res.status === 404) {
    throw new HttpError(404, "musicbrainz_not_found", "Not found in MusicBrainz");
  }
  if (!res.ok) {
    throw new HttpError(503, "musicbrainz_error", `MusicBrainz returned ${res.status}`);
  }
  return (await res.json()) as T;
}

function joinArtists(credit: MBArtistCredit[] | undefined): string | null {
  if (!credit || credit.length === 0) return null;
  return credit
    .map((c) => c.name ?? c.artist?.name ?? "")
    .filter((s) => s.length > 0)
    .join(" & ");
}

function primaryArtistMBID(credit: MBArtistCredit[] | undefined): string | null {
  return credit?.[0]?.artist?.id ?? null;
}

function yearFromDate(date: string | undefined): number | null {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date);
  return match ? Number(match[1]) : null;
}

/** Try to fetch the cover art front image URL. Returns null if missing. */
async function coverArtURL(releaseGroupMBID: string): Promise<string | null> {
  try {
    const res = await fetch(`${COVER_ART_BASE}/release-group/${releaseGroupMBID}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      images?: Array<{ front?: boolean; image?: string; thumbnails?: { large?: string } }>;
    };
    const front = body.images?.find((img) => img.front) ?? body.images?.[0];
    return front?.thumbnails?.large ?? front?.image ?? null;
  } catch {
    return null;
  }
}

/**
 * Pick the canonical release for a release-group — preferring the official
 * one with the most metadata. Returns the release id (or null if none).
 */
function pickCanonicalReleaseID(releases: MBRelease[] | undefined): string | null {
  if (!releases || releases.length === 0) return null;
  // Heuristic: highest track count, oldest date. Good enough for MVP.
  const sorted = [...releases].sort((a, b) => {
    const ta = a["track-count"] ?? 0;
    const tb = b["track-count"] ?? 0;
    if (tb !== ta) return tb - ta;
    return (a.date ?? "9999").localeCompare(b.date ?? "9999");
  });
  return sorted[0]?.id ?? null;
}

/**
 * Resolve a release-group (album) MBID to its full track listing — pulling
 * one canonical release, its tracks, and cover art. The resulting
 * `ResolvedAlbum` is what `catalog.upsertAlbum` writes to Postgres.
 */
export async function resolveAlbumByReleaseGroup(rgMBID: string): Promise<ResolvedAlbum> {
  const rg = await mbFetch<{
    id: string;
    title: string;
    "first-release-date"?: string;
    "artist-credit"?: MBArtistCredit[];
    releases?: MBRelease[];
  }>(`/release-group/${rgMBID}`, { inc: "releases+artist-credits" });

  const releaseID = pickCanonicalReleaseID(rg.releases);
  if (!releaseID) {
    throw new HttpError(404, "musicbrainz_no_release", "Release group has no releases");
  }

  const release = await mbFetch<MBRelease & { "artist-credit"?: MBArtistCredit[] }>(
    `/release/${releaseID}`,
    { inc: "recordings+artist-credits" },
  );

  const tracks: ResolvedTrack[] = [];
  for (const medium of release.media ?? []) {
    for (const t of medium.tracks ?? []) {
      const recording = t.recording;
      if (!recording) continue;
      tracks.push({
        mbid: recording.id,
        title: t.title ?? recording.title,
        trackNumber: t.position ?? tracks.length + 1,
        durationMs: t.length ?? recording.length ?? null,
      });
    }
  }

  const artworkURL = await coverArtURL(rg.id);

  return {
    releaseGroupMBID: rg.id,
    title: rg.title,
    artistName: joinArtists(rg["artist-credit"]) ?? "Unknown artist",
    artistMBID: primaryArtistMBID(rg["artist-credit"]),
    releaseYear: yearFromDate(rg["first-release-date"]),
    artworkURL,
    tracks,
  };
}

/**
 * Resolve a recording (track) MBID to its parent album. We pick the
 * recording's first associated release-group and resolve from there so the
 * full album is cached as a unit.
 */
export async function resolveAlbumByRecording(recordingMBID: string): Promise<{
  album: ResolvedAlbum;
  /** The mbid of the recording we resolved from — for finding it in tracks. */
  recordingMBID: string;
}> {
  const recording = await mbFetch<MBRecording>(
    `/recording/${recordingMBID}`,
    { inc: "releases+release-groups+artist-credits" },
  );
  const rgMBID = recording.releases?.find((r) => r["release-group"]?.id)
    ?.["release-group"]?.id;
  if (!rgMBID) {
    throw new HttpError(404, "musicbrainz_no_release_group", "Recording has no release group");
  }
  const album = await resolveAlbumByReleaseGroup(rgMBID);
  return { album, recordingMBID };
}

/**
 * Find a recording by title + artist. Returns the top match's MBID, or
 * `null` if MusicBrainz returns no hits. Used when Last.fm gives us only
 * text metadata (no mbid).
 */
export async function searchRecording(input: {
  title: string;
  artist: string;
}): Promise<string | null> {
  // Escape Lucene reserved characters that would break the query.
  const escape = (s: string) => s.replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, " ").trim();
  const query = `recording:"${escape(input.title)}" AND artist:"${escape(input.artist)}"`;
  const result = await mbFetch<{ recordings?: Array<{ id: string; score?: number }> }>(
    "/recording",
    { query, limit: "1" },
  );
  return result.recordings?.[0]?.id ?? null;
}

/**
 * Find a release-group by title + artist. Used when the user rates an album
 * by name (e.g. "rate the album of the now-playing track").
 */
export async function searchReleaseGroup(input: {
  title: string;
  artist: string;
}): Promise<string | null> {
  const escape = (s: string) => s.replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, " ").trim();
  const query = `releasegroup:"${escape(input.title)}" AND artist:"${escape(input.artist)}"`;
  const result = await mbFetch<{ "release-groups"?: Array<{ id: string }> }>(
    "/release-group",
    { query, limit: "1" },
  );
  return result["release-groups"]?.[0]?.id ?? null;
}
