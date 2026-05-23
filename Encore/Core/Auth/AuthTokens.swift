import Foundation

/// The token bundle returned by Cognito's `/oauth2/token` endpoint.
///
/// Cognito issues an access token (used as the API bearer), an id token
/// (carries the verified email/sub claims), and a refresh token (good for
/// 30 days by default). The refresh grant does not rotate the refresh
/// token, so we keep the original until sign-out.
struct AuthTokens: Codable, Equatable {
    var accessToken: String
    var idToken: String
    var refreshToken: String
    var expiresAt: Date

    /// True when the access token has expired or is within the safety window.
    /// The 30-second skew accounts for clock drift and in-flight requests.
    var isExpired: Bool {
        Date() >= expiresAt.addingTimeInterval(-30)
    }
}
