import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { HttpError, json } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { personalAlbumScore } from "../lib/scoring";

interface AlbumRow {
  id: string;
  mbid: string;
  title: string;
  artist_name: string;
  artist_mbid: string | null;
  release_year: number | null;
  artwork_url: string | null;
  track_count: number;
}

interface TrackRow {
  id: string;
  mbid: string;
  title: string;
  track_number: number;
  duration_ms: number | null;
  weighted_score: string | null;
  avg_score: string | null;
  rating_count: number;
  user_score: string | null;
}

interface AggregateRow {
  track_derived_score: string | null;
  direct_album_score: string | null;
  direct_rating_count: number;
}

function num(value: string | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * GET /albums/:id
 *
 * Returns everything the album page needs:
 *   - album metadata
 *   - tracklist with each track's weighted score, avg, and the caller's score
 *   - aggregate row (track-derived + direct)
 *   - highlights & skips (highest- and lowest-weighted_score tracks)
 *   - the caller's own ratings (album-level + personal aggregate)
 */
export async function getAlbum(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);

  const id = event.pathParameters?.["id"];
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new HttpError(400, "invalid_album_id", "album id must be a UUID");
  }

  const pool = await getPool();

  const albumRes = await pool.query<AlbumRow>(
    `select id, mbid, title, artist_name, artist_mbid, release_year, artwork_url, track_count
     from albums where id = $1`,
    [id],
  );
  const albumRow = albumRes.rows[0];
  if (!albumRow) {
    throw new HttpError(404, "album_not_found", "Album not in catalog");
  }

  const tracksRes = await pool.query<TrackRow>(
    `select t.id, t.mbid, t.title, t.track_number, t.duration_ms,
            ta.weighted_score, ta.avg_score, coalesce(ta.rating_count, 0) as rating_count,
            r.score as user_score
     from tracks t
     left join track_aggregates ta on ta.track_id = t.id
     left join ratings r
       on r.subject_type = 'track' and r.subject_id = t.id and r.user_id = $2
     where t.album_id = $1
     order by t.track_number asc`,
    [id, userId],
  );

  const aggRes = await pool.query<AggregateRow>(
    `select track_derived_score, direct_album_score, direct_rating_count
     from album_aggregates where album_id = $1`,
    [id],
  );
  const agg = aggRes.rows[0] ?? {
    track_derived_score: null,
    direct_album_score: null,
    direct_rating_count: 0,
  };

  const userAlbumRatingRes = await pool.query<{ score: string | null; review_text: string | null }>(
    `select score, review_text from ratings
     where user_id = $1 and subject_type = 'album' and subject_id = $2`,
    [userId, id],
  );

  // Highlights & skips fall straight out of the weighted track scores.
  const ratedTracks = tracksRes.rows
    .map((t) => ({ id: t.id, title: t.title, weighted: num(t.weighted_score) }))
    .filter((t): t is { id: string; title: string; weighted: number } => t.weighted !== null);
  const sorted = [...ratedTracks].sort((a, b) => b.weighted - a.weighted);
  const highlights = sorted.slice(0, 3);
  const skips = ratedTracks.length >= 4
    ? [...sorted].reverse().slice(0, 2)
    : [];

  const userTrackScores = tracksRes.rows
    .map((t) => num(t.user_score))
    .filter((s): s is number => s !== null);
  const personal = personalAlbumScore({
    userTrackRatings: userTrackScores,
    albumTrackCount: albumRow.track_count,
  });

  // How the caller's friends (followed users) rated this album — their direct
  // album score if they gave one, else the average of their track ratings on it.
  const friendsRes = await pool.query<{
    handle: string;
    display_name: string;
    score: string | null;
  }>(
    `select u.handle, u.display_name,
       coalesce(
         (select r.score from ratings r
            where r.user_id = u.id and r.subject_type = 'album' and r.subject_id = $2),
         (select avg(r.score) from ratings r
            join tracks t on t.id = r.subject_id
            where r.user_id = u.id and r.subject_type = 'track'
              and t.album_id = $2 and r.score is not null)
       ) as score
     from users u
     join follows f on f.followee_id = u.id and f.follower_id = $1
     where exists (select 1 from ratings r
                     where r.user_id = u.id and r.subject_type = 'album' and r.subject_id = $2)
        or exists (select 1 from ratings r
                     join tracks t on t.id = r.subject_id
                     where r.user_id = u.id and r.subject_type = 'track' and t.album_id = $2)
     order by score desc nulls last
     limit 12`,
    [userId, id],
  );
  const friends = friendsRes.rows.map((f) => ({
    handle: f.handle,
    display_name: f.display_name,
    score: num(f.score),
  }));

  return json(200, {
    album: albumRow,
    tracks: tracksRes.rows.map((t) => ({
      id: t.id,
      mbid: t.mbid,
      title: t.title,
      track_number: t.track_number,
      duration_ms: t.duration_ms,
      weighted_score: num(t.weighted_score),
      avg_score: num(t.avg_score),
      rating_count: t.rating_count,
      user_score: num(t.user_score),
    })),
    aggregate: {
      track_derived_score: num(agg.track_derived_score),
      direct_album_score: num(agg.direct_album_score),
      direct_rating_count: agg.direct_rating_count,
    },
    highlights,
    skips,
    friends,
    personal: {
      score: personal.score,
      rated_tracks: personal.ratedTracks,
      total_tracks: personal.totalTracks,
      album_rating: userAlbumRatingRes.rows[0]
        ? {
            score: num(userAlbumRatingRes.rows[0].score),
            review_text: userAlbumRatingRes.rows[0].review_text,
          }
        : null,
    },
  });
}
