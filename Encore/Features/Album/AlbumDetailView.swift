import SwiftUI

/// Album page (build spec F6). Renders the album payload from
/// `GET /albums/:id`: cover, scores, tracklist, highlights & skips, and
/// the user's personal coverage indicator. Rating an album or track
/// pops the shared RatingSheet and reloads on save.
struct AlbumDetailView: View {
    let albumID: UUID

    @Environment(SessionStore.self) private var session
    @State private var model: AlbumDetailViewModel?
    @State private var ratingSubject: RatingSubject?

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()
            content
        }
        .navigationTitle(model?.state.albumTitle ?? "")
        .toolbarTitleDisplayMode(.inline)
        .task { await ensureLoaded() }
        .sheet(item: $ratingSubject) { subject in
            RatingSheet(
                subject: subject,
                initialScore: initialScore(for: subject),
                initialReview: initialReview(for: subject),
                onSaved: { _ in Task { await model?.load() } },
            )
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model?.state ?? .loading {
        case .loading:
            ProgressView().tint(Color.encoreAccent)
        case .loaded(let detail):
            ScrollView {
                VStack(spacing: 22) {
                    AlbumHero(detail: detail)
                    ScoresPanel(detail: detail) {
                        ratingSubject = .catalogAlbum(
                            id: detail.album.id,
                            title: detail.album.title,
                            artist: detail.album.artistName,
                            artworkURL: detail.album.artworkURL,
                        )
                    }
                    Tracklist(detail: detail) { track in
                        ratingSubject = .catalogTrack(
                            id: track.id,
                            title: track.title,
                            albumTitle: detail.album.title,
                            artist: detail.album.artistName,
                            artworkURL: detail.album.artworkURL,
                        )
                    }
                    if !detail.highlights.isEmpty || !detail.skips.isEmpty {
                        HighlightsPanel(detail: detail)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 20)
            }
            .refreshable { await model?.load() }
        case .error(let message):
            ErrorCard(message: message) {
                Task { await model?.load() }
            }
            .padding(.horizontal, 20)
        }
    }

    private func ensureLoaded() async {
        if model == nil {
            model = AlbumDetailViewModel(albumID: albumID, api: session.albums)
        }
        await model?.load()
    }

    private func initialScore(for subject: RatingSubject) -> Double? {
        guard case .loaded(let detail) = model?.state else { return nil }
        switch subject {
        case .catalogAlbum: return detail.personal.albumRating?.score
        case .catalogTrack(let id, _, _, _, _):
            return detail.tracks.first(where: { $0.id == id })?.userScore
        case .nowPlayingTrack: return nil
        }
    }

    private func initialReview(for subject: RatingSubject) -> String? {
        guard case .loaded(let detail) = model?.state, case .catalogAlbum = subject else { return nil }
        return detail.personal.albumRating?.reviewText
    }
}

// MARK: - Hero

private struct AlbumHero: View {
    let detail: AlbumDetail

    var body: some View {
        VStack(spacing: 12) {
            BigArtwork(url: detail.album.artworkURL)
            VStack(spacing: 4) {
                Text(detail.album.title)
                    .font(.encoreTitle)
                    .foregroundStyle(Color.encoreText)
                    .multilineTextAlignment(.center)
                Text(detail.album.artistName)
                    .font(.encoreBody)
                    .foregroundStyle(Color.encoreText.opacity(0.8))
                if let year = detail.album.releaseYear {
                    Text(String(year))
                        .font(.encoreCaption)
                        .foregroundStyle(Color.encoreText.opacity(0.55))
                }
            }
        }
    }
}

// MARK: - Scores

private struct ScoresPanel: View {
    let detail: AlbumDetail
    let onRateAlbum: () -> Void

    var body: some View {
        Card(padding: 18) {
            VStack(spacing: 16) {
                HStack(alignment: .top, spacing: 18) {
                    VStack(spacing: 4) {
                        Text("From songs")
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.6))
                        ScoreText(score: detail.aggregate.trackDerivedScore, size: 36)
                    }
                    .frame(maxWidth: .infinity)
                    Rectangle()
                        .fill(Color.encoreHairline)
                        .frame(width: 1, height: 56)
                    VStack(spacing: 4) {
                        Text("Direct")
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.6))
                        ScoreText(score: detail.aggregate.directAlbumScore, size: 24)
                        Text("\(detail.aggregate.directRatingCount) ratings")
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity)
                }
                Divider().overlay(Color.encoreHairline)
                PersonalRow(personal: detail.personal)
                EncoreButton(title: "Rate this album", kind: .brass, icon: "star.fill", action: onRateAlbum)
            }
        }
    }
}

private struct ScoreText: View {
    let score: Double?
    var size: CGFloat = 36

    var body: some View {
        Text(score.map { String(format: "%.2f", $0) } ?? "—")
            .font(EncoreFont.display(size))
            .foregroundStyle(Color.encoreAccent)
    }
}

private struct PersonalRow: View {
    let personal: PersonalAlbumScore

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Your score")
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.6))
                if let score = personal.score {
                    Text(String(format: "%.2f", score))
                        .font(.encoreHeadline)
                        .foregroundStyle(Color.encoreText)
                } else {
                    Text("Not yet rated")
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText.opacity(0.6))
                }
                Text(coverageLabel)
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.55))
            }
            Spacer()
        }
    }

    private var coverageLabel: String {
        if personal.totalTracks == 0 {
            return "based on \(personal.ratedTracks) tracks"
        }
        return "based on \(personal.ratedTracks) of \(personal.totalTracks) tracks"
    }
}

// MARK: - Tracklist

private struct Tracklist: View {
    let detail: AlbumDetail
    let onRateTrack: (AlbumTrack) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Tracks")
                .font(.encoreCaption)
                .tracking(1.2)
                .textCase(.uppercase)
                .foregroundStyle(Color.encoreText.opacity(0.6))
            Card(padding: 0) {
                VStack(spacing: 0) {
                    ForEach(Array(detail.tracks.enumerated()), id: \.element.id) { idx, track in
                        if idx > 0 {
                            Divider().overlay(Color.encoreHairline)
                        }
                        TrackRow(track: track) { onRateTrack(track) }
                    }
                }
            }
        }
    }
}

private struct TrackRow: View {
    let track: AlbumTrack
    let onRate: () -> Void

    var body: some View {
        Button(action: onRate) {
            HStack(spacing: 12) {
                Text("\(track.trackNumber)")
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.5))
                    .frame(width: 22, alignment: .trailing)
                VStack(alignment: .leading, spacing: 2) {
                    Text(track.title)
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText)
                        .lineLimit(2)
                    if let weighted = track.weightedScore {
                        Text("crowd \(String(format: "%.2f", weighted)) · \(track.ratingCount)")
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.55))
                    }
                }
                Spacer(minLength: 8)
                if let score = track.userScore {
                    StarRating(score: score, size: 12)
                } else {
                    Image(systemName: "star")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.encoreText.opacity(0.35))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Highlights / skips

private struct HighlightsPanel: View {
    let detail: AlbumDetail

    var body: some View {
        VStack(spacing: 12) {
            if !detail.highlights.isEmpty {
                HighlightList(title: "Highlights", icon: "sparkles", items: detail.highlights)
            }
            if !detail.skips.isEmpty {
                HighlightList(title: "Skips", icon: "forward", items: detail.skips)
            }
        }
    }
}

private struct HighlightList: View {
    let title: String
    let icon: String
    let items: [AlbumHighlight]

    var body: some View {
        Card(padding: 16) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.encoreAccent)
                    Text(title)
                        .font(.encoreLabel)
                        .foregroundStyle(Color.encoreText)
                }
                ForEach(items) { item in
                    HStack {
                        Text(item.title)
                            .font(.encoreBody)
                            .foregroundStyle(Color.encoreText)
                            .lineLimit(1)
                        Spacer()
                        Text(String(format: "%.2f", item.weighted))
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.65))
                    }
                }
            }
        }
    }
}

// MARK: - Atoms

private struct BigArtwork: View {
    let url: URL?

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.encoreHairline.opacity(0.35))
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty: ProgressView().tint(Color.encoreAccent)
                    case .success(let image): image.resizable().scaledToFill()
                    case .failure: placeholder
                    @unknown default: placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: 220, height: 220)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.encoreHairline, lineWidth: 1)
        )
    }

    private var placeholder: some View {
        Image(systemName: "music.note")
            .font(.system(size: 44, weight: .light))
            .foregroundStyle(Color.encoreText.opacity(0.4))
    }
}

private struct ErrorCard: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        Card(padding: 22) {
            VStack(spacing: 12) {
                Text("Can't open this album.")
                    .font(.encoreHeadline)
                    .foregroundStyle(Color.encoreText)
                Text(message)
                    .font(.encoreBody)
                    .foregroundStyle(Color.encoreText.opacity(0.75))
                    .multilineTextAlignment(.center)
                EncoreButton(title: "Try again", kind: .secondary, action: onRetry)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Identifiable adapters

extension RatingSubject: Identifiable {
    var id: String {
        switch self {
        case .nowPlayingTrack(let t): "np-\(t.id)"
        case .catalogTrack(let id, _, _, _, _): "ct-\(id)"
        case .catalogAlbum(let id, _, _, _): "ca-\(id)"
        }
    }
}

extension AlbumDetailViewModel.State {
    fileprivate var albumTitle: String {
        if case .loaded(let detail) = self { return detail.album.title }
        return ""
    }
}
