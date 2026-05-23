import Foundation

/// Calls into the `/users` routes (see `api/src/routes/users.ts`).
struct UsersAPI {
    let client: APIClient

    /// `GET /users/me` — the signed-in user's profile, or `nil` if no profile
    /// row has been created yet (the 404 from the API during onboarding).
    func me() async throws -> UserProfile? {
        do {
            return try await client.send(.get, "/users/me")
        } catch APIError.notFound(let code) where code == "profile_not_found" {
            return nil
        }
    }

    /// `POST /users` — create the profile during onboarding. Returns the
    /// freshly-created row.
    func create(handle: String, displayName: String) async throws -> UserProfile {
        try await client.send(
            .post, "/users",
            body: CreateBody(handle: handle, display_name: displayName)
        )
    }

    /// `PATCH /users/me` — update mutable profile fields. Used for the
    /// Last.fm username during onboarding.
    func update(lastfmUsername: String?) async throws -> UserProfile {
        try await client.send(
            .patch, "/users/me",
            body: UpdateLastfmBody(lastfm_username: lastfmUsername)
        )
    }

    // MARK: - Bodies

    private struct CreateBody: Encodable {
        let handle: String
        let display_name: String
    }

    private struct UpdateLastfmBody: Encodable {
        let lastfm_username: String?
    }
}
