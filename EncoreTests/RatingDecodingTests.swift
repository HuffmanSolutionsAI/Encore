import XCTest
@testable import Encore

/// Locks in the JSON contract between the API Lambda and the iOS decoder.
/// If a field is renamed server-side, these tests fail fast.
final class RatingDecodingTests: XCTestCase {
    private func decoder() -> JSONDecoder {
        // Mirrors the configuration in APIClient (timestamps with optional
        // fractional seconds; both formats round-trip).
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            let f1 = ISO8601DateFormatter()
            f1.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let d = f1.date(from: raw) { return d }
            let f2 = ISO8601DateFormatter()
            f2.formatOptions = [.withInternetDateTime]
            if let d = f2.date(from: raw) { return d }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: raw)
        }
        return d
    }

    // MARK: - Rating

    func testRatingDecodesAPIShape() throws {
        let json = """
        {
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "22222222-2222-2222-2222-222222222222",
          "subject_type": "track",
          "subject_id": "33333333-3333-3333-3333-333333333333",
          "score": 4.5,
          "review_text": "Worth an encore.",
          "is_relisten": false,
          "source": "now_playing",
          "created_at": "2026-05-26T12:00:00.000Z",
          "updated_at": "2026-05-26T12:00:00.000Z"
        }
        """.data(using: .utf8)!

        let rating = try decoder().decode(Rating.self, from: json)
        XCTAssertEqual(rating.subjectType, .track)
        XCTAssertEqual(rating.score, 4.5)
        XCTAssertEqual(rating.reviewText, "Worth an encore.")
        XCTAssertEqual(rating.source, .nowPlaying)
        XCTAssertFalse(rating.isRelisten)
    }

    func testRatingAcceptsNullScore() throws {
        let json = """
        {
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "22222222-2222-2222-2222-222222222222",
          "subject_type": "album",
          "subject_id": "33333333-3333-3333-3333-333333333333",
          "score": null,
          "review_text": "All review, no stars.",
          "is_relisten": true,
          "source": "manual",
          "created_at": "2026-05-26T12:00:00Z",
          "updated_at": "2026-05-26T12:00:00Z"
        }
        """.data(using: .utf8)!

        let rating = try decoder().decode(Rating.self, from: json)
        XCTAssertNil(rating.score)
        XCTAssertEqual(rating.subjectType, .album)
        XCTAssertEqual(rating.source, .manual)
        XCTAssertTrue(rating.isRelisten)
    }

    // MARK: - LibraryEntry

    func testLibraryEntryTrackRowDecodes() throws {
        let json = """
        {
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "22222222-2222-2222-2222-222222222222",
          "subject_type": "track",
          "subject_id": "33333333-3333-3333-3333-333333333333",
          "score": 4.5,
          "review_text": null,
          "is_relisten": false,
          "source": "now_playing",
          "created_at": "2026-05-26T12:00:00Z",
          "updated_at": "2026-05-26T12:00:00Z",
          "track_title": "Sweet Thing",
          "album_id_for_track": "44444444-4444-4444-4444-444444444444",
          "album_title": "Astral Weeks",
          "album_artist": "Van Morrison",
          "album_artwork_url": "https://example.com/art.jpg"
        }
        """.data(using: .utf8)!

        let entry = try decoder().decode(LibraryEntry.self, from: json)
        XCTAssertEqual(entry.displayTitle, "Sweet Thing")
        XCTAssertEqual(entry.navigableAlbumID?.uuidString.lowercased(),
                       "44444444-4444-4444-4444-444444444444")
        XCTAssertEqual(entry.albumArtworkURL?.absoluteString, "https://example.com/art.jpg")
    }

    func testLibraryEntryAlbumRowFallsBackToAlbumTitle() throws {
        let json = """
        {
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "22222222-2222-2222-2222-222222222222",
          "subject_type": "album",
          "subject_id": "55555555-5555-5555-5555-555555555555",
          "score": 5.0,
          "review_text": "Top to bottom.",
          "is_relisten": true,
          "source": "manual",
          "created_at": "2026-05-26T12:00:00Z",
          "updated_at": "2026-05-26T12:00:00Z",
          "track_title": null,
          "album_id_for_track": null,
          "album_title": "Astral Weeks",
          "album_artist": "Van Morrison",
          "album_artwork_url": null
        }
        """.data(using: .utf8)!

        let entry = try decoder().decode(LibraryEntry.self, from: json)
        XCTAssertEqual(entry.subjectType, .album)
        XCTAssertEqual(entry.displayTitle, "Astral Weeks")
        // Album subjects navigate to themselves.
        XCTAssertEqual(entry.navigableAlbumID, entry.subjectID)
        XCTAssertNil(entry.albumArtworkURL)
    }
}
