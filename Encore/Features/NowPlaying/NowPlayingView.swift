import SwiftUI

/// The home screen — shows the user's currently-playing track via the
/// backend's Last.fm proxy. Build spec F2.
struct NowPlayingView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: NowPlayingViewModel?
    @State private var ratingTrack: NowPlayingTrack?

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 28) {
                    header
                    content
                    Spacer(minLength: 12)
                }
                .padding(.top, 32)
                .padding(.bottom, 24)
                .frame(maxWidth: .infinity)
            }
            .refreshable { await model?.refresh() }
        }
        .task { ensureModel() }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:     model?.start()
            case .background: model?.stop()
            default:          break
            }
        }
        .onDisappear { model?.stop() }
        .sheet(item: $ratingTrack) { track in
            RatingSheetPlaceholder(track: track)
        }
    }

    // MARK: - Sections

    private var header: some View {
        VStack(spacing: 10) {
            Text(AppConfig.appName)
                .font(.encoreWordmark)
                .foregroundStyle(Color.encoreAccent)
            DoubleRule().frame(width: 80)
            Text("Now playing")
                .font(.encoreCaption)
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(Color.encoreText.opacity(0.55))
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model?.state ?? .loading {
        case .loading:
            LoadingCard()
                .padding(.horizontal, 24)
        case .playing(let track):
            PlayingCard(track: track) { ratingTrack = track }
                .padding(.horizontal, 24)
        case .nothingPlaying:
            EmptyCard()
                .padding(.horizontal, 24)
        case .lastfmNotLinked:
            MessageCard(
                title: "Last.fm isn't linked.",
                body: "Add your Last.fm username from settings so Encore can hear what you're playing.",
            )
            .padding(.horizontal, 24)
        case .error(let message):
            MessageCard(title: "We've lost the signal.", body: message) {
                Task { await model?.refresh() }
            }
            .padding(.horizontal, 24)
        }
    }

    private func ensureModel() {
        if model == nil {
            model = NowPlayingViewModel(api: session.nowPlaying)
        }
        model?.start()
    }
}

// MARK: - Cards

private struct PlayingCard: View {
    let track: NowPlayingTrack
    let onRate: () -> Void

    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 18) {
                Artwork(url: track.artworkURL)
                VStack(spacing: 6) {
                    Text(track.title)
                        .font(.encoreHeadline)
                        .foregroundStyle(Color.encoreText)
                        .multilineTextAlignment(.center)
                    Text(track.artist)
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText.opacity(0.8))
                        .multilineTextAlignment(.center)
                    if let album = track.album {
                        Text(album)
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.6))
                            .multilineTextAlignment(.center)
                    }
                }
                EncoreButton(title: AppConfig.ratingPrompt, kind: .brass, icon: "star.fill", action: onRate)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct EmptyCard: View {
    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 12) {
                Image(systemName: "music.note")
                    .font(.system(size: 28, weight: .light))
                    .foregroundStyle(Color.encoreText.opacity(0.45))
                Text("Nothing's playing.")
                    .font(.encoreHeadline)
                    .foregroundStyle(Color.encoreText)
                Text("Press play on Spotify and we'll catch the first note.")
                    .font(.encoreBody)
                    .foregroundStyle(Color.encoreText.opacity(0.7))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct LoadingCard: View {
    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 14) {
                ProgressView()
                    .tint(Color.encoreAccent)
                Text("Listening for what's on…")
                    .font(.encoreBody)
                    .foregroundStyle(Color.encoreText.opacity(0.7))
            }
            .frame(maxWidth: .infinity, minHeight: 120)
        }
    }
}

private struct MessageCard: View {
    let title: String
    let body: String
    var onRetry: (() -> Void)?

    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 12) {
                Text(title)
                    .font(.encoreHeadline)
                    .foregroundStyle(Color.encoreText)
                    .multilineTextAlignment(.center)
                Text(body)
                    .font(.encoreBody)
                    .foregroundStyle(Color.encoreText.opacity(0.75))
                    .multilineTextAlignment(.center)
                if let onRetry {
                    EncoreButton(title: "Try again", kind: .secondary, action: onRetry)
                        .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct Artwork: View {
    let url: URL?

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.encoreHairline.opacity(0.35))
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView().tint(Color.encoreAccent)
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        placeholderGlyph
                    @unknown default:
                        placeholderGlyph
                    }
                }
            } else {
                placeholderGlyph
            }
        }
        .frame(width: 220, height: 220)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(Color.encoreHairline, lineWidth: 1)
        )
    }

    private var placeholderGlyph: some View {
        Image(systemName: "music.note")
            .font(.system(size: 44, weight: .light))
            .foregroundStyle(Color.encoreText.opacity(0.4))
    }
}

// Lets `NowPlayingTrack` drive `.sheet(item:)`.
extension NowPlayingTrack: Identifiable {
    var id: String { "\(title)|\(artist)|\(album ?? "")" }
}

#Preview {
    NowPlayingView()
        .environment(SessionStore())
}
