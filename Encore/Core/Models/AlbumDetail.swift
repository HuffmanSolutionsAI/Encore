import Foundation

/// Per-track row on the album page (`GET /albums/:id` → `tracks[]`).
struct AlbumTrack: Identifiable, Codable, Hashable {
    let id: UUID
    var mbid: String
    var title: String
    var trackNumber: Int
    var durationMs: Int?
    var weightedScore: Double?
    var avgScore: Double?
    var ratingCount: Int
    var userScore: Double?

    enum CodingKeys: String, CodingKey {
        case id, mbid, title
        case trackNumber = "track_number"
        case durationMs = "duration_ms"
        case weightedScore = "weighted_score"
        case avgScore = "avg_score"
        case ratingCount = "rating_count"
        case userScore = "user_score"
    }
}

/// Server aggregates for an album.
struct AlbumAggregateView: Codable, Hashable {
    var trackDerivedScore: Double?
    var directAlbumScore: Double?
    var directRatingCount: Int

    enum CodingKeys: String, CodingKey {
        case trackDerivedScore = "track_derived_score"
        case directAlbumScore = "direct_album_score"
        case directRatingCount = "direct_rating_count"
    }
}

/// One row in the highlights / skips list.
struct AlbumHighlight: Identifiable, Codable, Hashable {
    let id: UUID
    var title: String
    var weighted: Double

    enum CodingKeys: String, CodingKey {
        case id, title, weighted
    }
}

/// The signed-in user's view on this album.
struct PersonalAlbumScore: Codable, Hashable {
    var score: Double?
    var ratedTracks: Int
    var totalTracks: Int
    var albumRating: AlbumDirectRating?

    enum CodingKeys: String, CodingKey {
        case score
        case ratedTracks = "rated_tracks"
        case totalTracks = "total_tracks"
        case albumRating = "album_rating"
    }
}

struct AlbumDirectRating: Codable, Hashable {
    var score: Double?
    var reviewText: String?

    enum CodingKeys: String, CodingKey {
        case score
        case reviewText = "review_text"
    }
}

/// The whole album-page payload returned by `GET /albums/:id`.
struct AlbumDetail: Codable, Hashable {
    var album: Album
    var tracks: [AlbumTrack]
    var aggregate: AlbumAggregateView
    var highlights: [AlbumHighlight]
    var skips: [AlbumHighlight]
    var personal: PersonalAlbumScore
}
