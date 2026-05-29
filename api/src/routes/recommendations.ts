import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { json } from "../lib/http";
import { requireAuth } from "../lib/auth";

interface RecRow {
  album_id: string;
  album_title: string;
  album_artist: string;
  album_artwork_url: string | null;
  friend_count: string;
  best_score: string;
  top_friend_handle: string;
  top_friend_display_name: string;
}

/**
 * GET /recommendations
 * Albums your follows rated 4.5+ that you haven't rated yourself. Ranked
 * by friend-count overlap, then their top score.
 */
export async function getRecommendations(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();
  const { rows } = await pool.query<RecRow>(
    `with friend_picks as (
       select coalesce(t.album_id, r.subject_id) as album_id,
              u.id as friend_id, u.handle, u.display_name,
              r.score
       from ratings r
       join follows f on f.followee_id = r.user_id and f.follower_id = $1
       join users u   on u.id = r.user_id
       left join tracks t on r.subject_type = 'track' and t.id = r.subject_id
       where r.score >= 4.5
     ),
     -- Filter out anything the caller has already touched (rated the album
     -- directly, or rated any track on it).
     already_known as (
       select a.id from albums a
       where exists (select 1 from ratings r where r.user_id = $1
                       and ((r.subject_type = 'album' and r.subject_id = a.id)
                         or (r.subject_type = 'track' and r.subject_id in
                             (select id from tracks where album_id = a.id))))
     )
     select fp.album_id,
            a.title       as album_title,
            a.artist_name as album_artist,
            a.artwork_url as album_artwork_url,
            count(distinct fp.friend_id) as friend_count,
            max(fp.score) as best_score,
            (array_agg(fp.handle       order by fp.score desc))[1] as top_friend_handle,
            (array_agg(fp.display_name order by fp.score desc))[1] as top_friend_display_name
     from friend_picks fp
     join albums a on a.id = fp.album_id
     where fp.album_id not in (select id from already_known)
     group by fp.album_id, a.title, a.artist_name, a.artwork_url
     order by friend_count desc, best_score desc
     limit 12`,
    [userId],
  );

  return json(200, {
    recommendations: rows.map((r) => ({
      album_id: r.album_id,
      album_title: r.album_title,
      album_artist: r.album_artist,
      album_artwork_url: r.album_artwork_url,
      friend_count: Number(r.friend_count),
      best_score: Number(r.best_score),
      top_friend: {
        handle: r.top_friend_handle,
        display_name: r.top_friend_display_name,
      },
    })),
  });
}
