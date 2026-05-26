import XCTest
@testable import Encore

/// Locks in the JSON contract between `GET /albums/:id` and the iOS decoder.
final class AlbumDetailDecodingTests: XCTestCase {
    private func decoder() -> JSONDecoder {
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

    func testAlbumDetailDecodes() throws {
        let json = """
        {
          "album": {
            "id": "44444444-4444-4444-4444-444444444444",
            "mbid": "rg-mbid",
            "title": "Astral Weeks",
            "artist_name": "Van Morrison",
            "artist_mbid": null,
            "release_year": 1968,
            "artwork_url": "https://example.com/art.jpg",
            "track_count": 8,
            "created_at": "2026-05-26T12:00:00Z"
          },
          "tracks": [
            {
              "id": "11111111-1111-1111-1111-111111111111",
              "mbid": "t1",
              "title": "Astral Weeks",
              "track_number": 1,
              "duration_ms": 425000,
              "weighted_score": 4.10,
              "avg_score": 4.50,
              "rating_count": 2,
              "user_score": 4.5
            },
            {
              "id": "22222222-2222-2222-2222-222222222222",
              "mbid": "t2",
              "title": "Beside You",
              "track_number": 2,
              "duration_ms": 320000,
              "weighted_score": null,
              "avg_score": null,
              "rating_count": 0,
              "user_score": null
            }
          ],
          "aggregate": {
            "track_derived_score": 4.10,
            "direct_album_score": null,
            "direct_rating_count": 0
          },
          "highlights": [
            { "id": "11111111-1111-1111-1111-111111111111", "title": "Astral Weeks", "weighted": 4.10 }
          ],
          "skips": [],
          "personal": {
            "score": 4.5,
            "rated_tracks": 1,
            "total_tracks": 8,
            "album_rating": null
          }
        }
        """.data(using: .utf8)!

        let detail = try decoder().decode(AlbumDetail.self, from: json)
        XCTAssertEqual(detail.album.title, "Astral Weeks")
        XCTAssertEqual(detail.album.releaseYear, 1968)
        XCTAssertEqual(detail.tracks.count, 2)
        XCTAssertEqual(detail.tracks[0].weightedScore, 4.10)
        XCTAssertNil(detail.tracks[1].weightedScore)
        XCTAssertEqual(detail.aggregate.trackDerivedScore, 4.10)
        XCTAssertNil(detail.aggregate.directAlbumScore)
        XCTAssertEqual(detail.highlights.count, 1)
        XCTAssertEqual(detail.personal.score, 4.5)
        XCTAssertEqual(detail.personal.totalTracks, 8)
        XCTAssertNil(detail.personal.albumRating)
    }

    func testAlbumDetailWithDirectRatingDecodes() throws {
        let json = """
        {
          "album": {
            "id": "44444444-4444-4444-4444-444444444444",
            "mbid": "rg-mbid",
            "title": "Astral Weeks",
            "artist_name": "Van Morrison",
            "artist_mbid": null,
            "release_year": 1968,
            "artwork_url": null,
            "track_count": 0,
            "created_at": "2026-05-26T12:00:00Z"
          },
          "tracks": [],
          "aggregate": {
            "track_derived_score": null,
            "direct_album_score": 4.75,
            "direct_rating_count": 4
          },
          "highlights": [],
          "skips": [],
          "personal": {
            "score": null,
            "rated_tracks": 0,
            "total_tracks": 0,
            "album_rating": { "score": 5.0, "review_text": "Top to bottom." }
          }
        }
        """.data(using: .utf8)!

        let detail = try decoder().decode(AlbumDetail.self, from: json)
        XCTAssertEqual(detail.aggregate.directAlbumScore, 4.75)
        XCTAssertEqual(detail.aggregate.directRatingCount, 4)
        XCTAssertEqual(detail.personal.albumRating?.score, 5.0)
        XCTAssertEqual(detail.personal.albumRating?.reviewText, "Top to bottom.")
    }
}
