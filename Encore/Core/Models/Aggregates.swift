import Foundation

/// Server-computed crowd score for a track (`track_aggregates`).
/// See build spec Section 6, Step 1.
struct TrackAggregate: Codable, Hashable {
    let trackID: UUID
    var avgScore: Double?
    var ratingCount: Int
    var weightedScore: Double?
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case trackID = "track_id"
        case avgScore = "avg_score"
        case ratingCount = "rating_count"
        case weightedScore = "weighted_score"
        case updatedAt = "updated_at"
    }
}

/// Server-computed aggregate score for an album (`album_aggregates`).
/// See build spec Section 6, Steps 2–3.
struct AlbumAggregate: Codable, Hashable {
    let albumID: UUID
    var trackDerivedScore: Double?
    var directAlbumScore: Double?
    var directRatingCount: Int
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case albumID = "album_id"
        case trackDerivedScore = "track_derived_score"
        case directAlbumScore = "direct_album_score"
        case directRatingCount = "direct_rating_count"
        case updatedAt = "updated_at"
    }
}
