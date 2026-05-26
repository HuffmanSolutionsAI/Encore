import Foundation
import Observation

/// App-wide auth + profile state. Drives `RootView`: launching → signed-out
/// → onboarding (handle → Last.fm → Spotify explainer) → ready.
///
/// Owns the keychain-persisted tokens and exposes a shared `APIClient` that
/// automatically refreshes the access token when it expires.
@MainActor
@Observable
final class SessionStore {
    enum Status: Equatable {
        case launching
        case signedOut(error: String? = nil)
        case onboarding(Stage)
        case ready(UserProfile)
    }

    enum Stage: Equatable {
        case chooseHandle
        case linkLastfm(UserProfile)
        case spotifyExplainer(UserProfile)
    }

    private(set) var status: Status = .launching

    /// API client shared by all features. Constructed once so the bearer
    /// token always reflects the current session.
    let api: APIClient

    /// Convenience accessors built atop `api`.
    var users: UsersAPI { UsersAPI(client: api) }
    var lastfm: LastfmAPI { LastfmAPI(client: api) }
    var nowPlaying: NowPlayingAPI { NowPlayingAPI(client: api) }

    private let auth: CognitoAuthService
    private let keychain: KeychainStore
    private let userDefaults: UserDefaults
    private let spotifyStepKey = "EncoreCompletedOnboardingSpotifyStep"

    private var tokens: AuthTokens?
    /// Coalesces concurrent refresh attempts so we only hit the token
    /// endpoint once even when many requests fire in parallel.
    private var pendingRefresh: Task<AuthTokens, Error>?

    init(
        auth: CognitoAuthService = CognitoAuthService(),
        keychain: KeychainStore = .authTokens,
        userDefaults: UserDefaults = .standard
    ) {
        self.auth = auth
        self.keychain = keychain
        self.userDefaults = userDefaults

        // The client needs to call back into the session for the bearer
        // token, but the session also owns the client — capture `self`
        // weakly through a local to avoid the retain cycle.
        weak var weakSelf: SessionStore?
        self.api = APIClient(tokenProvider: { await weakSelf?.validAccessToken() })
        weakSelf = self
    }

    // MARK: - Lifecycle

    /// Restore any persisted session and resolve the initial status. Call
    /// from `EncoreApp` once on launch.
    func bootstrap() async {
        do {
            tokens = try keychain.load()
        } catch {
            tokens = nil
        }

        guard tokens != nil else {
            status = .signedOut()
            return
        }

        await loadProfileAndAdvance()
    }

    func signIn() async {
        do {
            let tokens = try await auth.signInWithApple()
            try keychain.save(tokens)
            self.tokens = tokens
            await loadProfileAndAdvance()
        } catch AuthError.userCancelled {
            // Nothing to surface — the user dismissed the sheet themselves.
            if case .ready = status { return }
            status = .signedOut()
        } catch {
            status = .signedOut(error: (error as? LocalizedError)?.errorDescription
                                ?? "Couldn't sign in. Please try again.")
        }
    }

    func signOut() {
        try? keychain.delete()
        tokens = nil
        userDefaults.removeObject(forKey: spotifyStepKey)
        status = .signedOut()
    }

    // MARK: - Onboarding mutations

    /// Called by the handle screen after a successful `POST /users`.
    func didCreateProfile(_ profile: UserProfile) {
        advance(with: profile)
    }

    /// Called by the Last.fm screen after a successful `PATCH /users/me`.
    func didLinkLastfm(_ profile: UserProfile) {
        advance(with: profile)
    }

    /// Called by the Spotify explainer's "I'm in" CTA.
    func didFinishSpotifyExplainer() {
        guard case .onboarding(.spotifyExplainer(let profile)) = status else { return }
        userDefaults.set(true, forKey: spotifyStepKey)
        status = .ready(profile)
    }

    // MARK: - Internals

    private func loadProfileAndAdvance() async {
        do {
            if let profile = try await users.me() {
                advance(with: profile)
            } else {
                status = .onboarding(.chooseHandle)
            }
        } catch APIError.unauthorized {
            signOut()
        } catch {
            // Reachability failure on launch — surface as signed-out so the
            // user has an obvious recovery action.
            status = .signedOut(error: (error as? LocalizedError)?.errorDescription
                                ?? "Couldn't reach Encore.")
        }
    }

    private func advance(with profile: UserProfile) {
        if profile.lastfmUsername == nil {
            status = .onboarding(.linkLastfm(profile))
        } else if !userDefaults.bool(forKey: spotifyStepKey) {
            status = .onboarding(.spotifyExplainer(profile))
        } else {
            status = .ready(profile)
        }
    }

    // MARK: - Token provider

    /// Returns a valid bearer token, refreshing if the current one has
    /// expired. Concurrent callers share a single refresh round-trip.
    private func validAccessToken() async -> String? {
        guard let current = tokens else { return nil }
        if !current.isExpired { return current.accessToken }

        if let pending = pendingRefresh {
            return (try? await pending.value)?.accessToken
        }

        let task = Task<AuthTokens, Error> { [auth, keychain, current] in
            let refreshed = try await auth.refresh(using: current.refreshToken)
            try keychain.save(refreshed)
            return refreshed
        }
        pendingRefresh = task

        defer { pendingRefresh = nil }
        do {
            let refreshed = try await task.value
            tokens = refreshed
            return refreshed.accessToken
        } catch AuthError.refreshExpired {
            signOut()
            return nil
        } catch {
            return nil
        }
    }
}
