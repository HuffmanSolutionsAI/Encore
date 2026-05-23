import Foundation

/// Central place for product strings and remote-environment configuration.
///
/// Product strings live in this file. Environment values (API base URL,
/// Cognito hosted-UI domain and client id, OAuth redirect) are read from
/// the app's `Info.plist`, which substitutes user-defined build settings
/// (`ENCORE_API_BASE_URL`, `ENCORE_COGNITO_DOMAIN`, …) at build time. Real
/// values come from `terraform output` and live in a local xcconfig or the
/// project's build settings — never committed. See `.env.example`.
enum AppConfig {
    // MARK: - Product strings

    /// "Encore" is a working name pending trademark clearance (build spec
    /// Section 12) — keep the name changeable here.
    static let appName = "Encore"
    static let brandLine = "Music worth playing again."
    static let ratingPrompt = "Worth an encore?"

    // MARK: - Remote environment

    enum Remote {
        static let apiBaseURL: URL? = url(for: "EncoreAPIBaseURL")
        static let cognitoDomain: String? = string(for: "EncoreCognitoDomain")
        static let cognitoClientID: String? = string(for: "EncoreCognitoClientID")
        static let cognitoRedirectURI: URL? = url(for: "EncoreCognitoRedirectURI")

        /// `true` when every remote-environment value is present and looks valid.
        /// The sign-in screen surfaces a friendly configuration error otherwise,
        /// so design previews and unconfigured builds still launch.
        static var isConfigured: Bool {
            apiBaseURL != nil
                && cognitoDomain != nil
                && cognitoClientID != nil
                && cognitoRedirectURI?.scheme != nil
        }

        /// The redirect's URL scheme — `ASWebAuthenticationSession` keys on this.
        static var redirectScheme: String? {
            cognitoRedirectURI?.scheme
        }
    }

    private static func string(for key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        // Unresolved build-setting substitutions come through as literal "$(...)" —
        // treat those as missing so the app shows a configuration message rather
        // than firing requests at a garbage host.
        if trimmed.hasPrefix("$(") { return nil }
        return trimmed
    }

    private static func url(for key: String) -> URL? {
        guard let raw = string(for: key) else { return nil }
        return URL(string: raw)
    }
}
