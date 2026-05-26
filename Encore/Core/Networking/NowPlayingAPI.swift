import Foundation

/// Calls into the `/now-playing` route (see `api/src/routes/nowPlaying.ts`).
struct NowPlayingAPI {
    let client: APIClient

    /// `GET /now-playing` — the user's currently-playing track via the
    /// backend's Last.fm proxy, or `nil` when nothing is on.
    func current() async throws -> NowPlayingTrack? {
        let response: NowPlayingResponse = try await client.send(.get, "/now-playing")
        return response.track
    }
}
