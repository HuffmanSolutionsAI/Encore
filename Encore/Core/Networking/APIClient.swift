import Foundation

/// Typed async/await HTTP client for the Encore API.
///
/// `tokenProvider` returns a valid access token (refreshing if necessary) or
/// `nil` if the user isn't signed in. The client attaches it as a bearer
/// header on every request. The Cognito JWT authorizer on API Gateway
/// verifies the token's signature, issuer, and audience; the Lambda enforces
/// per-user ownership using the verified `sub` claim.
final class APIClient {
    typealias TokenProvider = () async -> String?

    private let baseURL: URL?
    private let session: URLSession
    private let tokenProvider: TokenProvider
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(
        baseURL: URL? = AppConfig.Remote.apiBaseURL,
        session: URLSession = .shared,
        tokenProvider: @escaping TokenProvider
    ) {
        self.baseURL = baseURL
        self.session = session
        self.tokenProvider = tokenProvider

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            if let date = APIDateFormatter.iso8601WithFractional.date(from: raw) { return date }
            if let date = APIDateFormatter.iso8601.date(from: raw) { return date }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Expected ISO 8601 date, got \(raw)"
            )
        }
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    /// `Void`-returning request — used when the response body is irrelevant.
    func send(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem] = [],
        body: Encodable? = nil
    ) async throws {
        _ = try await sendRequest(method, path, query: query, body: body, requiresAuth: true)
    }

    /// Decode the response body into `Response`.
    func send<Response: Decodable>(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem] = [],
        body: Encodable? = nil,
        as: Response.Type = Response.self
    ) async throws -> Response {
        let data = try await sendRequest(method, path, query: query, body: body, requiresAuth: true)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    enum HTTPMethod: String {
        case get = "GET"
        case post = "POST"
        case patch = "PATCH"
        case delete = "DELETE"
    }

    // MARK: - Internals

    private func sendRequest(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem],
        body: Encodable?,
        requiresAuth: Bool
    ) async throws -> Data {
        guard let baseURL else { throw APIError.notConfigured }
        guard var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false) else {
            throw APIError.notConfigured
        }
        if !query.isEmpty { components.queryItems = query }
        guard let url = components.url else { throw APIError.notConfigured }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if requiresAuth {
            guard let token = await tokenProvider() else { throw APIError.unauthorized }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let data: Data
        let response: HTTPURLResponse
        do {
            let (d, r) = try await session.data(for: request)
            data = d
            guard let http = r as? HTTPURLResponse else { throw APIError.transport }
            response = http
        } catch is APIError {
            throw APIError.transport
        } catch {
            throw APIError.transport
        }

        return try handle(response: response, data: data)
    }

    private func handle(response: HTTPURLResponse, data: Data) throws -> Data {
        switch response.statusCode {
        case 200..<300:
            return data
        case 401, 403:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound(code: serverError(data)?.error)
        case 409:
            let err = serverError(data)
            throw APIError.conflict(code: err?.error, message: err?.message)
        case 400, 422:
            let err = serverError(data)
            throw APIError.validation(code: err?.error, message: err?.message)
        default:
            let err = serverError(data)
            throw APIError.server(status: response.statusCode, code: err?.error, message: err?.message)
        }
    }

    private func serverError(_ data: Data) -> ServerErrorBody? {
        try? decoder.decode(ServerErrorBody.self, from: data)
    }
}

/// Matches the API's error envelope from `api/src/lib/http.ts`.
private struct ServerErrorBody: Decodable {
    let error: String?
    let message: String?
}

/// Box that lets us pass any `Encodable` through `JSONEncoder.encode`.
private struct AnyEncodable: Encodable {
    let value: any Encodable
    init(_ value: any Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}

/// Postgres serialises timestamps with millisecond precision, which the
/// stock `.iso8601` strategy rejects. We try the fractional formatter first
/// and fall back to the strict one.
private enum APIDateFormatter {
    static let iso8601: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static let iso8601WithFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
