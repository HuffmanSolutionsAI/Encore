import Foundation

enum RatingSubjectType: String, Codable, Hashable {
    case track
    case album
}

enum RatingSource: String, Codable, Hashable {
    case nowPlaying = "now_playing"
    case manual
}

/// A user's rating of a track or album (`ratings`). `score` is nullable —
/// a review with no stars is valid (build spec F3).
struct Rating: Identifiable, Codable, Hashable {
    let id: UUID
    let userID: UUID
    var subjectType: RatingSubjectType
    var subjectID: UUID
    var score: Double?
    var reviewText: String?
    var isRelisten: Bool
    var source: RatingSource
    let createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, score, source
        case userID = "user_id"
        case subjectType = "subject_type"
        case subjectID = "subject_id"
        case reviewText = "review_text"
        case isRelisten = "is_relisten"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
