import type { PoolClient } from "pg";
import { getPool } from "./db";
import { HttpError } from "./http";
import {
  resolveAlbumByRecording,
  resolveAlbumByReleaseGroup,
  searchRecording,
  searchReleaseGroup,
  type ResolvedAlbum,
} from "./musicbrainz";

export interface CachedAlbum {
  id: string;
  mbid: string;
  title: string;
  artist_name: string;
  artist_mbid: string | null;
  release_year: number | null;
  artwork_url: string | null;
  track_count: number;
  created_at: string;
}

export interface CachedTrack {
  id: string;
  mbid: string;
  album_id: string;
  title: string;
  track_number: number;
  duration_ms: number | null;
}

/**
 * Insert (or merge into) an album + its tracks. Idempotent: the unique
 * `mbid` lets us upsert and skip MusicBrainz on repeat lookups.
 *
 * Returns the album row and the full track listing as cached.
 */
export async function upsertAlbum(album: ResolvedAlbum): Promise<{
  album: CachedAlbum;
  tracks: CachedTrack[];
}> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const albumRes = await client.query<CachedAlbum>(
      `insert into albums (mbid, title, artist_name, artist_mbid, release_year, artwork_url, track_count)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (mbid) do update set
         title       = excluded.title,
         artist_name = excluded.artist_name,
         artist_mbid = excluded.artist_mbid,
         release_year = excluded.release_year,
         artwork_url  = coalesce(excluded.artwork_url, albums.artwork_url),
         track_count  = excluded.track_count
       returning id, mbid, title, artist_name, artist_mbid, release_year, artwork_url, track_count, created_at`,
      [
        album.releaseGroupMBID,
        album.title,
        album.artistName,
        album.artistMBID,
        album.releaseYear,
        album.artworkURL,
        album.tracks.length,
      ],
    );
    const albumRow = albumRes.rows[0]!;

    const tracks: CachedTrack[] = [];
    for (const track of album.tracks) {
      const trackRes = await client.query<CachedTrack>(
        `insert into tracks (mbid, album_id, title, track_number, duration_ms)
         values ($1, $2, $3, $4, $5)
         on conflict (mbid) do update set
           album_id     = excluded.album_id,
           title        = excluded.title,
           track_number = excluded.track_number,
           duration_ms  = excluded.duration_ms
         returning id, mbid, album_id, title, track_number, duration_ms`,
        [track.mbid, albumRow.id, track.title, track.trackNumber, track.durationMs],
      );
      tracks.push(trackRes.rows[0]!);
    }

    await client.query("commit");
    return { album: albumRow, tracks };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Resolve and cache an album from a recording (track) mbid. If the album
 * is already in the catalog (by release-group mbid), short-circuits without
 * hitting MusicBrainz. Returns the album, its tracks, and the cached track
 * row matching the recording mbid.
 */
export async function ensureAlbumByRecording(recordingMBID: string): Promise<{
  album: CachedAlbum;
  tracks: CachedTrack[];
  track: CachedTrack;
}> {
  const pool = await getPool();

  // Fast path — the track is already cached.
  const cached = await pool.query<CachedTrack>(
    "select id, mbid, album_id, title, track_number, duration_ms from tracks where mbid = $1",
    [recordingMBID],
  );
  if (cached.rows[0]) {
    const trackRow = cached.rows[0];
    const albumRows = await loadAlbumWithTracks(pool, trackRow.album_id);
    const track = albumRows.tracks.find((t) => t.id === trackRow.id) ?? trackRow;
    return { ...albumRows, track };
  }

  const { album: resolved } = await resolveAlbumByRecording(recordingMBID);
  const { album, tracks } = await upsertAlbum(resolved);
  const track = tracks.find((t) => t.mbid === recordingMBID);
  if (!track) {
    throw new HttpError(
      404,
      "track_not_in_release",
      "Couldn't place that recording on its album",
    );
  }
  return { album, tracks, track };
}

/**
 * Resolve and cache an album from a release-group mbid. Cache-first.
 */
export async function ensureAlbumByReleaseGroup(rgMBID: string): Promise<{
  album: CachedAlbum;
  tracks: CachedTrack[];
}> {
  const pool = await getPool();
  const cached = await pool.query<CachedAlbum>(
    "select id, mbid, title, artist_name, artist_mbid, release_year, artwork_url, track_count, created_at from albums where mbid = $1",
    [rgMBID],
  );
  if (cached.rows[0]) {
    return loadAlbumWithTracks(pool, cached.rows[0].id);
  }
  const resolved = await resolveAlbumByReleaseGroup(rgMBID);
  return upsertAlbum(resolved);
}

/**
 * Resolve and cache a track by title + artist (no mbid). Used when
 * Last.fm gives us only text metadata. Falls through to MusicBrainz
 * search; returns null when there's no match.
 */
export async function ensureTrackByTitle(hint: {
  title: string;
  artist: string;
}): Promise<{ album: CachedAlbum; tracks: CachedTrack[]; track: CachedTrack } | null> {
  const mbid = await searchRecording(hint);
  if (!mbid) return null;
  return ensureAlbumByRecording(mbid);
}

/**
 * Resolve and cache an album by title + artist.
 */
export async function ensureAlbumByTitle(hint: {
  title: string;
  artist: string;
}): Promise<{ album: CachedAlbum; tracks: CachedTrack[] } | null> {
  const mbid = await searchReleaseGroup(hint);
  if (!mbid) return null;
  return ensureAlbumByReleaseGroup(mbid);
}

/**
 * Load an album + its tracks from the cache. The pool argument keeps the
 * call usable inside an open transaction.
 */
async function loadAlbumWithTracks(
  pool: { query: PoolClient["query"] },
  albumID: string,
): Promise<{ album: CachedAlbum; tracks: CachedTrack[] }> {
  const albumRes = await pool.query<CachedAlbum>(
    "select id, mbid, title, artist_name, artist_mbid, release_year, artwork_url, track_count, created_at from albums where id = $1",
    [albumID],
  );
  const album = albumRes.rows[0];
  if (!album) {
    throw new HttpError(404, "album_not_found", "Album not in catalog");
  }
  const tracksRes = await pool.query<CachedTrack>(
    `select id, mbid, album_id, title, track_number, duration_ms
     from tracks where album_id = $1
     order by track_number asc`,
    [albumID],
  );
  return { album, tracks: tracksRes.rows };
}

export const _internal = { loadAlbumWithTracks };
