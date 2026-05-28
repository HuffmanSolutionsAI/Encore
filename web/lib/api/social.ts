import type { APIClient } from "./client";
import type { FeedItem, PublicProfile, UserSearchResult } from "@/lib/types";

/** Follows graph — `/follows` (api/src/routes/follows.ts). */
export class FollowsAPI {
  constructor(private readonly client: APIClient) {}

  async follow(handle: string): Promise<{ following: boolean; followee_id: string }> {
    return this.client.request("/follows", { method: "POST", body: { handle } });
  }

  async unfollow(followeeId: string): Promise<{ following: boolean }> {
    return this.client.request(`/follows/${followeeId}`, { method: "DELETE" });
  }
}

/** Activity feed — `/feed` (api/src/routes/feed.ts). */
export class FeedAPI {
  constructor(private readonly client: APIClient) {}

  async get(): Promise<FeedItem[]> {
    const res = await this.client.request<{ feed: FeedItem[] }>("/feed");
    return res.feed;
  }
}

/** Profiles + people search — extends the `/users` routes. */
export class ProfilesAPI {
  constructor(private readonly client: APIClient) {}

  async byHandle(handle: string): Promise<PublicProfile> {
    return this.client.request<PublicProfile>(`/users/${encodeURIComponent(handle)}`);
  }

  async search(q: string): Promise<UserSearchResult[]> {
    const res = await this.client.request<{ users: UserSearchResult[] }>("/users", { query: { q } });
    return res.users;
  }
}

/** Data export — `/export` (api/src/routes/export.ts). */
export class ExportAPI {
  constructor(private readonly client: APIClient) {}

  /** Fetches the file and triggers a browser download. */
  async download(format: "csv" | "json"): Promise<void> {
    const { blob, filename } = await this.client.getFile("/export", { format });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
