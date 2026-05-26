import Foundation

/// Calls into the `/ratings` routes (see `api/src/routes/ratings.ts`).
struct RatingsAPI {
    let client: APIClient

    /// `POST /ratings` — upsert a rating. The caller either knows the
    /// catalog subject id or supplies a hint that the backend resolves
    /// via MusicBrainz (mbid preferred, title+artist as a fallback).
    @discardableResult
    func upsert(
        subjectType: RatingSubjectType,
        subjectID: UUID? = nil,
        hint: SubjectHint? = nil,
        score: Double?,
        reviewText: String?,
        isRelisten: Bool,
        source: RatingSource
    ) async throws -> Rating {
        try await client.send(
            .post, "/ratings",
            body: UpsertBody(
                subject_type: subjectType.rawValue,
                subject_id: subjectID?.uuidString,
                hint: hint,
                score: score,
                review_text: reviewText,
                is_relisten: isRelisten,
                source: source.rawValue,
            )
        )
    }

    /// `GET /ratings/me` — the user's own ratings, newest first.
    func mine() async throws -> [LibraryEntry] {
        let response: ListResponse = try await client.send(.get, "/ratings/me")
        return response.ratings
    }

    // MARK: - Bodies

    struct SubjectHint: Encodable, Equatable {
        var mbid: String?
        var title: String?
        var artist: String?

        init(mbid: String? = nil, title: String? = nil, artist: String? = nil) {
            self.mbid = mbid
            self.title = title
            self.artist = artist
        }
    }

    private struct UpsertBody: Encodable {
        let subject_type: String
        let subject_id: String?
        let hint: SubjectHint?
        let score: Double?
        let review_text: String?
        let is_relisten: Bool
        let source: String
    }

    private struct ListResponse: Decodable {
        let ratings: [LibraryEntry]
    }
}
