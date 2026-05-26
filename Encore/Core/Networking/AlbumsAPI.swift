import Foundation

/// Calls into the `/albums` routes (see `api/src/routes/albums.ts`).
struct AlbumsAPI {
    let client: APIClient

    /// `GET /albums/:id` — the complete album page payload.
    func detail(id: UUID) async throws -> AlbumDetail {
        try await client.send(.get, "/albums/\(id.uuidString)")
    }
}
