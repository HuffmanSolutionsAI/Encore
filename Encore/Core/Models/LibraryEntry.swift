import Foundation

/// A single row from `GET /ratings/me` — the user's own rating joined to
/// the track/album metadata needed to render a library row.
struct LibraryEntry: Identifiable, Codable, Hashable {
    let id: UUID
    let userID: UUID
    var subjectType: RatingSubjectType
    var subjectID: UUID
    var score: Double?
    var reviewText: String?
    var isRelisten: Bool
    var source: RatingSource
    var createdAt: Date
    var updatedAt: Date

    var trackTitle: String?
    var albumIDForTrack: UUID?
    var albumTitle: String?
    var albumArtist: String?
    var albumArtworkURL: URL?

    enum CodingKeys: String, CodingKey {
        case id, score, source
        case userID = "user_id"
        case subjectType = "subject_type"
        case subjectID = "subject_id"
        case reviewText = "review_text"
        case isRelisten = "is_relisten"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case trackTitle = "track_title"
        case albumIDForTrack = "album_id_for_track"
        case albumTitle = "album_title"
        case albumArtist = "album_artist"
        case albumArtworkURL = "album_artwork_url"
    }

    /// Display title — track title for track ratings, album title for album.
    var displayTitle: String {
        switch subjectType {
        case .track: trackTitle ?? "Untitled track"
        case .album: albumTitle ?? "Untitled album"
        }
    }

    /// The album id to navigate to from this row, if any.
    var navigableAlbumID: UUID? {
        switch subjectType {
        case .track: albumIDForTrack
        case .album: subjectID
        }
    }
}
