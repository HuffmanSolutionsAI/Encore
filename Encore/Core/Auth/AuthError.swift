import Foundation

/// Errors surfaced by `CognitoAuthService` and `SessionStore` during sign-in
/// and token management. Mapped to user-facing copy by the view layer.
enum AuthError: Error, LocalizedError, Equatable {
    /// `Remote` values are missing or look like unresolved build-setting placeholders.
    case notConfigured
    /// The user dismissed the hosted-UI sheet without completing sign-in.
    case userCancelled
    /// The OAuth redirect arrived but the `code` query parameter was missing.
    case missingAuthorizationCode
    /// The token endpoint returned a non-2xx response.
    case tokenExchangeFailed(status: Int, message: String?)
    /// The token endpoint returned a body that could not be decoded.
    case malformedTokenResponse
    /// The refresh token is no longer valid — the user must sign in again.
    case refreshExpired
    /// Networking / transport-level failure.
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Encore isn't configured for this build. Set the Cognito and API values in your build settings."
        case .userCancelled:
            return "Sign-in was cancelled."
        case .missingAuthorizationCode:
            return "Sign-in didn't return a usable code. Please try again."
        case .tokenExchangeFailed(_, let message):
            return message ?? "Couldn't complete sign-in. Please try again."
        case .malformedTokenResponse:
            return "Couldn't read the sign-in response."
        case .refreshExpired:
            return "Your session expired. Please sign in again."
        case .transport:
            return "Couldn't reach the sign-in service. Check your connection and try again."
        }
    }

    static func == (lhs: AuthError, rhs: AuthError) -> Bool {
        switch (lhs, rhs) {
        case (.notConfigured, .notConfigured),
             (.userCancelled, .userCancelled),
             (.missingAuthorizationCode, .missingAuthorizationCode),
             (.malformedTokenResponse, .malformedTokenResponse),
             (.refreshExpired, .refreshExpired):
            return true
        case let (.tokenExchangeFailed(a, b), .tokenExchangeFailed(c, d)):
            return a == c && b == d
        case (.transport, .transport):
            return true
        default:
            return false
        }
    }
}
