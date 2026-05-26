import XCTest
@testable import Encore

/// Locks in the JSON contract between `GET /now-playing` and the iOS decoder.
final class NowPlayingDecodingTests: XCTestCase {
    func testPlayingTrackDecodes() throws {
        let json = """
        {
          "playing": true,
          "track": {
            "title": "Sweet Thing",
            "artist": "Van Morrison",
            "album": "Astral Weeks",
            "artworkURL": "https://example.com/art.jpg",
            "trackMBID": "abcd-1234",
            "lastfmURL": "https://www.last.fm/music/Van+Morrison/_/Sweet+Thing"
          }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(NowPlayingResponse.self, from: json)
        XCTAssertTrue(response.playing)
        XCTAssertEqual(response.track?.title, "Sweet Thing")
        XCTAssertEqual(response.track?.artist, "Van Morrison")
        XCTAssertEqual(response.track?.album, "Astral Weeks")
        XCTAssertEqual(response.track?.trackMBID, "abcd-1234")
        XCTAssertEqual(response.track?.artworkURL?.absoluteString, "https://example.com/art.jpg")
    }

    func testNothingPlayingDecodes() throws {
        let json = """
        { "playing": false, "track": null }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(NowPlayingResponse.self, from: json)
        XCTAssertFalse(response.playing)
        XCTAssertNil(response.track)
    }

    func testTrackWithOnlyTitleAndArtistDecodes() throws {
        // Last.fm often omits album metadata on obscure tracks; the API
        // still returns a now-playing payload.
        let json = """
        {
          "playing": true,
          "track": {
            "title": "Untitled",
            "artist": "Unknown Artist",
            "album": null,
            "artworkURL": null,
            "trackMBID": null,
            "lastfmURL": null
          }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(NowPlayingResponse.self, from: json)
        XCTAssertNil(response.track?.album)
        XCTAssertNil(response.track?.artworkURL)
    }
}
