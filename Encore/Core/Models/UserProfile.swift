import Foundation

/// App profile row (`users`). Credentials live in Supabase `auth.users`;
/// `id` matches the auth uid.
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
