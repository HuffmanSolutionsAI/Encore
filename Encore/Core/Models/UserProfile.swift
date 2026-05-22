import Foundation

/// App profile row (`users`). Credentials are managed by Amazon Cognito;
/// `id` holds the Cognito `sub`.
struct UserProfile: Identifiable, Codable, Hashable {
    let id: UUID
    var handle: String
    var displayName: String
    var avatarURL: URL?
    var lastfmUsername: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, handle
        case displayName = "display_name"
        case avatarURL = "avatar_url"
        case lastfmUsername = "lastfm_username"
        case createdAt = "created_at"
    }
}
