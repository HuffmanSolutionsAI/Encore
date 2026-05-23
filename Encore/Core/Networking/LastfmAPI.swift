import Foundation

/// Calls into the `/lastfm` routes (see `api/src/routes/lastfm.ts`).
struct LastfmAPI {
    let client: APIClient

    /// `GET /lastfm/verify?username=...` — confirm a Last.fm username exists
    /// before onboarding accepts it.
    func verify(username: String) async throws -> Bool {
        let trimmed = username.trimmingCharacters(in: .whitespacesAndNewlines)
        let response: VerifyResponse = try await client.send(
            .get, "/lastfm/verify",
            query: [URLQueryItem(name: "username", value: trimmed)]
        )
        return response.exists
    }

    private struct VerifyResponse: Decodable {
        let username: String
        let exists: Bool
    }
}
