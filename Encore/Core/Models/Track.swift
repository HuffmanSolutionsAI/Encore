import Foundation

/// Catalog track (`tracks`), cached from MusicBrainz.
struct Track: Identifiable, Codable, Hashable {
    let id: UUID
    var mbid: String
    var albumID: UUID
    var title: String
    var trackNumber: Int
    var durationMs: Int?

    enum CodingKeys: String, CodingKey {
        case id, mbid, title
        case albumID = "album_id"
        case trackNumber = "track_number"
        case durationMs = "duration_ms"
    }
}
