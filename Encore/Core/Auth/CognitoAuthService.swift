import AuthenticationServices
import Foundation
import UIKit

/// Drives the Cognito hosted-UI sign-in (Sign in with Apple) and exchanges
/// the resulting authorization code for tokens. Stateless — `SessionStore`
/// owns persistence and refresh orchestration.
@MainActor
final class CognitoAuthService {
    private let session: URLSession
    private let presentationAnchor = PresentationAnchor()

    init(session: URLSession = .shared) {
        self.session = session
    }

    /// Run the hosted-UI flow against Cognito's Apple identity provider and
    /// return the issued tokens. The caller is responsible for persisting them.
    func signInWithApple() async throws -> AuthTokens {
        guard
            let domain = AppConfig.Remote.cognitoDomain,
            let clientID = AppConfig.Remote.cognitoClientID,
            let redirect = AppConfig.Remote.cognitoRedirectURI,
            let scheme = AppConfig.Remote.redirectScheme
        else {
            throw AuthError.notConfigured
        }

        let authorizeURL = try buildAuthorizeURL(domain: domain, clientID: clientID, redirect: redirect)
        let callbackURL = try await authenticate(url: authorizeURL, scheme: scheme)
        let code = try extractCode(from: callbackURL)
        return try await exchangeCode(code, domain: domain, clientID: clientID, redirect: redirect)
    }

    /// Trade a refresh token for a fresh access/id token pair. Cognito does
    /// not rotate the refresh token on this grant, so we carry it forward.
    func refresh(using refreshToken: String) async throws -> AuthTokens {
        guard
            let domain = AppConfig.Remote.cognitoDomain,
            let clientID = AppConfig.Remote.cognitoClientID
        else {
            throw AuthError.notConfigured
        }

        let body = formURLEncoded([
            "grant_type": "refresh_token",
            "client_id": clientID,
            "refresh_token": refreshToken,
        ])
        let response = try await postToken(domain: domain, body: body)
        // Refresh responses omit `refresh_token`; reuse the existing one.
        return AuthTokens(
            accessToken: response.access_token,
            idToken: response.id_token,
            refreshToken: response.refresh_token ?? refreshToken,
            expiresAt: Date().addingTimeInterval(TimeInterval(response.expires_in))
        )
    }

    // MARK: - Hosted UI

    private func buildAuthorizeURL(domain: String, clientID: String, redirect: URL) throws -> URL {
        var components = URLComponents()
        components.scheme = "https"
        components.host = domain
        components.path = "/oauth2/authorize"
        components.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirect.absoluteString),
            URLQueryItem(name: "scope", value: "email openid profile"),
            URLQueryItem(name: "identity_provider", value: "SignInWithApple"),
        ]
        guard let url = components.url else { throw AuthError.notConfigured }
        return url
    }

    private func authenticate(url: URL, scheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError {
                    switch error.code {
                    case .canceledLogin:
                        continuation.resume(throwing: AuthError.userCancelled)
                    default:
                        continuation.resume(throwing: AuthError.transport(error))
                    }
                    return
                }
                if let error {
                    continuation.resume(throwing: AuthError.transport(error))
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: AuthError.missingAuthorizationCode)
                    return
                }
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = presentationAnchor
            session.prefersEphemeralWebBrowserSession = false
            if !session.start() {
                continuation.resume(throwing: AuthError.transport(URLError(.cannotConnectToHost)))
            }
        }
    }

    private func extractCode(from callbackURL: URL) throws -> String {
        let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
        guard let code = components?.queryItems?.first(where: { $0.name == "code" })?.value else {
            throw AuthError.missingAuthorizationCode
        }
        return code
    }

    // MARK: - Token endpoint

    private func exchangeCode(_ code: String, domain: String, clientID: String, redirect: URL) async throws -> AuthTokens {
        let body = formURLEncoded([
            "grant_type": "authorization_code",
            "client_id": clientID,
            "code": code,
            "redirect_uri": redirect.absoluteString,
        ])
        let response = try await postToken(domain: domain, body: body)
        guard let refresh = response.refresh_token else {
            throw AuthError.malformedTokenResponse
        }
        return AuthTokens(
            accessToken: response.access_token,
            idToken: response.id_token,
            refreshToken: refresh,
            expiresAt: Date().addingTimeInterval(TimeInterval(response.expires_in))
        )
    }

    private func postToken(domain: String, body: Data) async throws -> TokenResponse {
        var request = URLRequest(url: URL(string: "https://\(domain)/oauth2/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let data: Data
        let httpResponse: HTTPURLResponse
        do {
            let (d, r) = try await session.data(for: request)
            data = d
            guard let http = r as? HTTPURLResponse else { throw AuthError.malformedTokenResponse }
            httpResponse = http
        } catch let error as AuthError {
            throw error
        } catch {
            throw AuthError.transport(error)
        }

        if httpResponse.statusCode == 400 || httpResponse.statusCode == 401 {
            // `invalid_grant` on the refresh path means the refresh token has expired —
            // the user must sign in again.
            if let errorBody = try? JSONDecoder().decode(TokenErrorResponse.self, from: data),
               errorBody.error == "invalid_grant" {
                throw AuthError.refreshExpired
            }
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let body = try? JSONDecoder().decode(TokenErrorResponse.self, from: data)
            throw AuthError.tokenExchangeFailed(
                status: httpResponse.statusCode,
                message: body?.error_description ?? body?.error
            )
        }

        do {
            return try JSONDecoder().decode(TokenResponse.self, from: data)
        } catch {
            throw AuthError.malformedTokenResponse
        }
    }

    private func formURLEncoded(_ params: [String: String]) -> Data {
        var components = URLComponents()
        components.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        return Data((components.percentEncodedQuery ?? "").utf8)
    }
}

// MARK: - Token endpoint payloads

private struct TokenResponse: Decodable {
    let access_token: String
    let id_token: String
    let refresh_token: String?
    let expires_in: Int
    let token_type: String
}

private struct TokenErrorResponse: Decodable {
    let error: String?
    let error_description: String?
}

// MARK: - Presentation anchor

private final class PresentationAnchor: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let window = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }
        return window ?? ASPresentationAnchor()
    }
}
