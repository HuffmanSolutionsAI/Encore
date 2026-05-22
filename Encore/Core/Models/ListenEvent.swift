import Foundation

/// A captured play, synced from Last.fm (`listen_events`).
struct ListenEvent: Identifiable, Codable, Hashable {
    let id: UUID
    let userID: UUID
    var trackTitle: String
    var artistName: String
    var trackMBID: String?
    var playedAt: Date
    var source: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, source
        case userID = "user_id"
        case trackTitle = "track_title"
        case artistName = "artist_name"
        case trackMBID = "track_mbid"
        case playedAt = "played_at"
        case createdAt = "created_at"
    }
}
