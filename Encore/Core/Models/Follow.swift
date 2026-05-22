import Foundation

/// A directed follow edge (`follows`).
struct Follow: Codable, Hashable {
    let followerID: UUID
    let followeeID: UUID
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case followerID = "follower_id"
        case followeeID = "followee_id"
        case createdAt = "created_at"
    }
}
