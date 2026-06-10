import type { APIClient } from "./client";

export type ImportScale = "0.5-5" | "1-10" | "1-100";

export interface ImportRow {
  title: string;
  artist: string;
  score: number | null;
  review?: string | null;
  rated_at?: string | null;
  mbid?: string | null;
}

export interface ImportResult {
  album_title: string;
  artist: string;
  status: "imported" | "updated" | "skipped" | "failed";
  reason?: string;
}

export interface ImportResponse {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  results: ImportResult[];
}

/** Bulk-import ratings — `/imports/ratings`. */
export class ImportsAPI {
  constructor(private readonly client: APIClient) {}

  async ratings(input: {
    source: string;
    scoreScale: ImportScale;
    ratings: ImportRow[];
  }): Promise<ImportResponse> {
    return this.client.request<ImportResponse>("/imports/ratings", {
      method: "POST",
      body: {
        source: input.source,
        score_scale: input.scoreScale,
        ratings: input.ratings,
      },
    });
  }
}
