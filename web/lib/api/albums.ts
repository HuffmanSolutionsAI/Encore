import type { APIClient } from "./client";
import type { AlbumDetail } from "@/lib/types";

/** Calls into `/albums` (api/src/routes/albums.ts). */
export class AlbumsAPI {
  constructor(private readonly client: APIClient) {}

  /** `GET /albums/:id` — the full album page payload. */
  async detail(id: string): Promise<AlbumDetail> {
    return this.client.request<AlbumDetail>(`/albums/${id}`);
  }
}
