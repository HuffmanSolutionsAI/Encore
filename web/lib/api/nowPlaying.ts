import type { APIClient } from "./client";
import type { NowPlayingResponse, NowPlayingTrack } from "@/lib/types";

/** Calls into `/now-playing` (api/src/routes/nowPlaying.ts). */
export class NowPlayingAPI {
  constructor(private readonly client: APIClient) {}

  /** Returns the currently-playing track, or `null` if nothing is on. */
  async current(): Promise<NowPlayingTrack | null> {
    const res = await this.client.request<NowPlayingResponse>("/now-playing");
    return res.track;
  }
}
