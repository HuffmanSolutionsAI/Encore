import SwiftUI
import UIKit

/// Onboarding step 4 — explain how Spotify fits in. Encore doesn't connect
/// to Spotify directly; it reads what you scrobble through Last.fm. The
/// "Open Spotify" CTA deep-links to the app (or the App Store fallback).
struct SpotifyConnectView: View {
    let profile: UserProfile

    @Environment(SessionStore.self) private var session

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                header

                Card {
                    VStack(alignment: .leading, spacing: 14) {
                        bullet(
                            icon: "music.note",
                            title: "Play music in Spotify",
                            body: "Encore reads what you listen to from Last.fm — Spotify scrobbles play to Last.fm automatically."
                        )
                        bullet(
                            icon: "sparkles",
                            title: "Tap the rating CTA",
                            body: "When something stops you in your tracks, rate it. That's your library."
                        )
                        bullet(
                            icon: "person.2",
                            title: "See friends' picks",
                            body: "Compare ratings with people you trust — no algorithms, just taste."
                        )
                    }
                }

                Spacer()

                VStack(spacing: 12) {
                    EncoreButton(
                        title: "Open Spotify",
                        kind: .secondary,
                        icon: "arrow.up.right.square"
                    ) {
                        openSpotify()
                    }

                    EncoreButton(
                        title: "I'm in",
                        kind: .brass,
                        icon: "checkmark"
                    ) {
                        session.didFinishSpotifyExplainer()
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 60)
            .padding(.bottom, 32)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Welcome, \(profile.displayName).")
                .font(.encoreTitle)
                .foregroundStyle(Color.encoreText)
            Text("Here's how Encore works.")
                .font(.encoreBody)
                .foregroundStyle(Color.encoreText.opacity(0.7))
        }
    }

    private func bullet(icon: String, title: String, body: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.encoreAccent)
                .frame(width: 22, alignment: .center)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.encoreHeadline)
                    .foregroundStyle(Color.encoreText)
                Text(body)
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.7))
            }
        }
    }

    private func openSpotify() {
        let app = URL(string: "spotify://")!
        let fallback = URL(string: "https://www.spotify.com/download")!
        if UIApplication.shared.canOpenURL(app) {
            UIApplication.shared.open(app)
        } else {
            UIApplication.shared.open(fallback)
        }
    }
}

#Preview {
    SpotifyConnectView(profile: .preview)
        .environment(SessionStore())
}
