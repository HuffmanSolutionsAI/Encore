import Foundation

/// Errors surfaced by `APIClient`. The server returns
/// `{ "error": "<code>", "message": "<human>" }` for non-2xx responses
/// (see `api/src/lib/http.ts`); we preserve the code so views can render
/// specific copy (e.g. "handle taken").
enum APIError: Error, LocalizedError, Equatable {
    case notConfigured
    case unauthorized
    case notFound(code: String?)
    case conflict(code: String?, message: String?)
    case validation(code: String?, message: String?)
    case server(status: Int, code: String?, message: String?)
    case decoding
    case transport

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Encore isn't configured for this build."
        case .unauthorized:
            return "Your session expired. Please sign in again."
        case .notFound(let code) where code == "profile_not_found":
            return nil  // expected during onboarding — not user-facing
        case .notFound:
            return "We couldn't find what you asked for."
        case .conflict(_, let message):
            return message ?? "That's already taken."
        case .validation(_, let message):
            return message ?? "That value isn't valid."
        case .server(_, _, let message):
            return message ?? "Something went wrong on our end. Try again."
        case .decoding:
            return "We received an unexpected response."
        case .transport:
            return "Can't reach Encore. Check your connection and try again."
        }
    }

    /// The stable error code returned by the server, when present.
    var code: String? {
        switch self {
        case .notFound(let code): return code
        case .conflict(let code, _), .validation(let code, _), .server(_, let code, _): return code
        default: return nil
        }
    }
}
