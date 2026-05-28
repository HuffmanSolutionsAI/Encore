import type { APIClient } from "./client";
import { APIError } from "./client";
import type { UserProfile } from "@/lib/types";

/** Calls into the `/users` routes (api/src/routes/users.ts). */
export class UsersAPI {
  constructor(private readonly client: APIClient) {}

  /** `GET /users/me` — or `null` when no profile exists yet (during onboarding). */
  async me(): Promise<UserProfile | null> {
    try {
      return await this.client.request<UserProfile>("/users/me");
    } catch (err) {
      if (err instanceof APIError && err.code === "not_found" && err.serverCode === "profile_not_found") {
        return null;
      }
      throw err;
    }
  }

  /** `POST /users` — create the profile during onboarding. */
  async create(input: { handle: string; displayName: string }): Promise<UserProfile> {
    return this.client.request<UserProfile>("/users", {
      method: "POST",
      body: { handle: input.handle, display_name: input.displayName },
    });
  }

  /** `PATCH /users/me` — update mutable fields (display name, Last.fm username). */
  async update(input: { displayName?: string; lastfmUsername?: string | null }): Promise<UserProfile> {
    const body: Record<string, unknown> = {};
    if ("displayName" in input) body["display_name"] = input.displayName;
    if ("lastfmUsername" in input) body["lastfm_username"] = input.lastfmUsername;
    return this.client.request<UserProfile>("/users/me", { method: "PATCH", body });
  }
}
