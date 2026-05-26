import Foundation

/// A single now-playing snapshot from the API (`GET /now-playing`). The
/// underlying source is Last.fm; the backend normalises the response so
/// the client never speaks to Last.fm directly.
struct NowPlayingTrack: Codable, Hashable {
    var title: String
    var artist: String
    var album: String?
    var artworkURL: URL?
    var trackMBID: String?
    var lastfmURL: URL?
}

/// Envelope returned by `GET /now-playing`. `track` is `nil` when nothing
/// is currently playing on the user's linked Last.fm account.
struct NowPlayingResponse: Codable, Hashable {
    var playing: Bool
    var track: NowPlayingTrack?
}
