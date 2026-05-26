import SwiftUI

/// Top-level router. Renders one of three states based on `SessionStore`:
/// a launch splash while the persisted session is restored, the onboarding
/// flow when the user isn't signed in or hasn't finished setup, or the
/// home screen once everything is ready.
struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        Group {
            switch session.status {
            case .launching:
                LaunchSplash()
            case .signedOut, .onboarding:
                OnboardingView()
            case .ready:
                NowPlayingView()
            }
        }
        .animation(.easeInOut(duration: 0.18), value: statusKey(session.status))
        .task { await bootstrapIfNeeded() }
    }

    private func bootstrapIfNeeded() async {
        if case .launching = session.status {
            await session.bootstrap()
        }
    }

    /// Stable identity for `animation(_:value:)` — the status enum carries a
    /// `UserProfile` payload that's not `Hashable`, so we collapse to a tag.
    private func statusKey(_ status: SessionStore.Status) -> String {
        switch status {
        case .launching: return "launching"
        case .signedOut: return "signedOut"
        case .onboarding(.chooseHandle): return "onboarding.handle"
        case .onboarding(.linkLastfm): return "onboarding.lastfm"
        case .onboarding(.spotifyExplainer): return "onboarding.spotify"
        case .ready: return "ready"
        }
    }
}

private struct LaunchSplash: View {
    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()
            VStack(spacing: 12) {
                Text(AppConfig.appName)
                    .font(.encoreWordmark)
                    .foregroundStyle(Color.encoreAccent)
                DoubleRule()
                    .frame(width: 80)
            }
        }
    }
}

#Preview {
    RootView()
        .environment(SessionStore())
}
