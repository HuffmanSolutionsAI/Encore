import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getPool } from "../lib/db";
import { json, HttpError } from "../lib/http";
import { requireAuth } from "../lib/auth";
import { toCSV } from "../lib/csv";

interface ExportRow {
  subject_type: "track" | "album";
  title: string | null;
  artist: string | null;
  album: string | null;
  score: string | null;
  review_text: string | null;
  is_relisten: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /export?format=csv|json
 * The user's full ratings history. The brand's trust promise (F8) — a
 * complete, well-formed file the user can keep.
 */
export async function exportRatings(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ReturnType<typeof json>> {
  const { userId } = requireAuth(event);
  const format = (event.queryStringParameters?.["format"] ?? "json").toLowerCase();
  if (format !== "csv" && format !== "json") {
    throw new HttpError(400, "invalid_format", "format must be 'csv' or 'json'");
  }

  const pool = await getPool();
  const { rows } = await pool.query<ExportRow>(
    `select r.subject_type,
            coalesce(t.title, a_alb.title)              as title,
            coalesce(a_trk.artist_name, a_alb.artist_name) as artist,
            coalesce(a_trk.title, a_alb.title)          as album,
            r.score, r.review_text, r.is_relisten, r.source,
            r.created_at, r.updated_at
     from ratings r
     left join tracks t  on r.subject_type = 'track' and t.id = r.subject_id
     left join albums a_trk on a_trk.id = t.album_id
     left join albums a_alb on r.subject_type = 'album' and a_alb.id = r.subject_id
     where r.user_id = $1
     order by r.updated_at desc`,
    [userId],
  );

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const body = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        count: rows.length,
        ratings: rows.map((r) => ({
          subject_type: r.subject_type,
          title: r.title,
          artist: r.artist,
          album: r.album,
          score: r.score === null ? null : Number(r.score),
          review: r.review_text,
          is_relisten: r.is_relisten,
          source: r.source,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
      },
      null,
      2,
    );
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="encore-ratings-${stamp}.json"`,
      },
      body,
    };
  }

  const csv = toCSV(
    ["subject_type", "title", "artist", "album", "score", "review", "is_relisten", "source", "created_at", "updated_at"],
    rows.map((r) => [
      r.subject_type,
      r.title,
      r.artist,
      r.album,
      r.score === null ? "" : Number(r.score),
      r.review_text,
      r.is_relisten,
      r.source,
      r.created_at,
      r.updated_at,
    ]),
  );
  return {
    statusCode: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="encore-ratings-${stamp}.csv"`,
    },
    body: csv,
  };
}
