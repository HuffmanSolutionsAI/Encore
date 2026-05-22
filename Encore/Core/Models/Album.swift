import Foundation

/// Catalog album (`albums`), cached from MusicBrainz release groups.
struct Album: Identifiable, Codable, Hashable {
    let id: UUID
    var mbid: String
    var title: String
    var artistName: String
    var artistMBID: String?
    var releaseYear: Int?
    var artworkURL: URL?
    var trackCount: Int
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, mbid, title
        case artistName = "artist_name"
        case artistMBID = "artist_mbid"
        case releaseYear = "release_year"
        case artworkURL = "artwork_url"
        case trackCount = "track_count"
        case createdAt = "created_at"
    }
}
