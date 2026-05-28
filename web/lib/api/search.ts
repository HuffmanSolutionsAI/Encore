import type { APIClient } from "./client";
import type { AlbumSearchResult } from "@/lib/types";

/** Album search + resolve — `/search/albums`, `/albums/resolve`. */
export class SearchAPI {
  constructor(private readonly client: APIClient) {}

  /** Free-text album search (MusicBrainz-backed). */
  async albums(q: string): Promise<AlbumSearchResult[]> {
    const res = await this.client.request<{ albums: AlbumSearchResult[] }>("/search/albums", {
      query: { q },
    });
    return res.albums;
  }

  /** Resolve a release-group mbid to an internal album id (caches it). */
  async resolveAlbum(mbid: string): Promise<{ id: string }> {
    return this.client.request<{ id: string }>("/albums/resolve", { query: { mbid } });
  }
}
