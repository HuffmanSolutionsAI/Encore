import SwiftUI

/// Container for the onboarding flow. Switches between sub-screens based
/// on the session's current onboarding stage. The actual stage progression
/// is driven by `SessionStore` — each screen calls back into the store
/// when its step is complete and the view re-renders on the new stage.
struct OnboardingView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        switch session.status {
        case .signedOut:
            SignInView()
        case .onboarding(.chooseHandle):
            HandleView()
        case .onboarding(.linkLastfm(let profile)):
            LastfmConnectView(profile: profile)
        case .onboarding(.spotifyExplainer(let profile)):
            SpotifyConnectView(profile: profile)
        case .launching, .ready:
            // RootView handles these — included for exhaustiveness so a
            // mis-route shows the brand backdrop rather than crashing.
            Color.encoreBackground.ignoresSafeArea()
        }
    }
}

#Preview {
    OnboardingView()
        .environment(SessionStore())
}
