import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { json } from "../lib/http";
import { requireAuth } from "../lib/auth";

interface FeedRow {
  id: string;
  rater_id: string;
  rater_handle: string;
  rater_display_name: string;
  subject_type: "track" | "album";
  subject_id: string;
  score: string | null;
  review_text: string | null;
  is_relisten: boolean;
  updated_at: string;
  track_title: string | null;
  album_id_for_track: string | null;
  album_title: string | null;
  album_artist: string | null;
  album_artwork_url: string | null;
}

/**
 * GET /feed
 * Recent ratings from the people the caller follows — newest first, joined
 * to rater + album/track metadata so the feed renders without extra calls.
 */
export async function getFeed(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const pool = await getPool();
  const { rows } = await pool.query<FeedRow>(
    `select r.id, r.subject_type, r.subject_id, r.score, r.review_text,
            r.is_relisten, r.updated_at,
            u.id           as rater_id,
            u.handle       as rater_handle,
            u.display_name as rater_display_name,
            t.title        as track_title,
            t.album_id     as album_id_for_track,
            a.title        as album_title,
            a.artist_name  as album_artist,
            a.artwork_url  as album_artwork_url
     from ratings r
     join follows f on f.followee_id = r.user_id and f.follower_id = $1
     join users u on u.id = r.user_id
     left join tracks t on r.subject_type = 'track' and t.id = r.subject_id
     left join albums a
       on (r.subject_type = 'album' and a.id = r.subject_id)
       or (r.subject_type = 'track' and a.id = t.album_id)
     order by r.updated_at desc
     limit 60`,
    [userId],
  );

  const feed = rows.map((r) => ({
    ...r,
    score: r.score === null ? null : Number(r.score),
  }));
  return json(200, { feed });
}
