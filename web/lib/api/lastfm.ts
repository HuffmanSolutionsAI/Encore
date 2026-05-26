import type { APIClient } from "./client";

/** Calls into the `/lastfm` routes (api/src/routes/lastfm.ts). */
export class LastfmAPI {
  constructor(private readonly client: APIClient) {}

  /** `GET /lastfm/verify?username=…` — confirm a Last.fm username exists. */
  async verify(username: string): Promise<boolean> {
    const trimmed = username.trim();
    const result = await this.client.request<{ username: string; exists: boolean }>(
      "/lastfm/verify",
      { query: { username: trimmed } },
    );
    return result.exists;
  }
}
