import SwiftUI

/// Subject for a rating that's being composed — either a freshly-seen
/// now-playing track (resolved via Last.fm metadata + a hint) or an
/// album/track already in our catalog (UUID known).
enum RatingSubject: Hashable {
    case nowPlayingTrack(NowPlayingTrack)
    case catalogTrack(id: UUID, title: String, albumTitle: String?, artist: String, artworkURL: URL?)
    case catalogAlbum(id: UUID, title: String, artist: String, artworkURL: URL?)

    var title: String {
        switch self {
        case .nowPlayingTrack(let t): t.title
        case .catalogTrack(_, let title, _, _, _): title
        case .catalogAlbum(_, let title, _, _): title
        }
    }

    var artist: String {
        switch self {
        case .nowPlayingTrack(let t): t.artist
        case .catalogTrack(_, _, _, let artist, _): artist
        case .catalogAlbum(_, _, let artist, _): artist
        }
    }

    var albumLabel: String? {
        switch self {
        case .nowPlayingTrack(let t): t.album
        case .catalogTrack(_, _, let album, _, _): album
        case .catalogAlbum: nil
        }
    }

    var artworkURL: URL? {
        switch self {
        case .nowPlayingTrack(let t): t.artworkURL
        case .catalogTrack(_, _, _, _, let url): url
        case .catalogAlbum(_, _, _, let url): url
        }
    }

    var canSwitchToAlbum: Bool {
        switch self {
        case .nowPlayingTrack(let t): t.album != nil
        case .catalogTrack: false
        case .catalogAlbum: false
        }
    }

    var defaultSource: RatingSource {
        switch self {
        case .nowPlayingTrack: .nowPlaying
        case .catalogTrack, .catalogAlbum: .manual
        }
    }
}

/// The sheet itself — the M3 rating UX (F3).
struct RatingSheet: View {
    let subject: RatingSubject
    /// Existing user score for the subject, if any — keeps the stars pre-filled.
    var initialScore: Double?
    /// Existing review text, if any.
    var initialReview: String?
    /// Existing relisten flag.
    var initialIsRelisten: Bool = false
    /// Notifies the host when the rating successfully persists.
    var onSaved: ((Rating) -> Void)?

    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var mode: Mode
    @State private var score: Double?
    @State private var review: String
    @State private var isRelisten: Bool
    @State private var phase: Phase = .idle
    @State private var lastError: String?

    private enum Mode: String, CaseIterable, Identifiable {
        case song, album
        var id: String { rawValue }
        var label: String { self == .song ? "Song" : "Album" }
    }

    private enum Phase {
        case idle, saving, saved
    }

    init(
        subject: RatingSubject,
        initialScore: Double? = nil,
        initialReview: String? = nil,
        initialIsRelisten: Bool = false,
        onSaved: ((Rating) -> Void)? = nil
    ) {
        self.subject = subject
        self.initialScore = initialScore
        self.initialReview = initialReview
        self.initialIsRelisten = initialIsRelisten
        self.onSaved = onSaved

        let defaultMode: Mode = switch subject {
        case .catalogAlbum: .album
        case .nowPlayingTrack, .catalogTrack: .song
        }
        _mode = State(initialValue: defaultMode)
        _score = State(initialValue: initialScore)
        _review = State(initialValue: initialReview ?? "")
        _isRelisten = State(initialValue: initialIsRelisten)
    }

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 22) {
                    handle
                    header
                    subjectCard
                    if subject.canSwitchToAlbum { modePicker }
                    stars
                    reviewField
                    relistenToggle
                    if let lastError {
                        Text(lastError)
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 16)
                    }
                    saveButton
                    if phase == .saved { savedNote }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.hidden)
    }

    // MARK: - Sections

    private var handle: some View {
        Capsule()
            .fill(Color.encoreHairline)
            .frame(width: 36, height: 4)
            .padding(.top, 10)
    }

    private var header: some View {
        VStack(spacing: 6) {
            Text(AppConfig.ratingPrompt)
                .font(.encoreTitle)
                .foregroundStyle(Color.encoreAccent)
            DoubleRule().frame(width: 60)
        }
    }

    private var subjectCard: some View {
        Card(padding: 16) {
            HStack(spacing: 14) {
                Artwork(url: subject.artworkURL, size: 64)
                VStack(alignment: .leading, spacing: 4) {
                    Text(mode == .album ? (subject.albumLabel ?? subject.title) : subject.title)
                        .font(.encoreHeadline)
                        .foregroundStyle(Color.encoreText)
                        .lineLimit(2)
                    Text(subject.artist)
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText.opacity(0.75))
                        .lineLimit(1)
                    if mode == .song, let album = subject.albumLabel {
                        Text(album)
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.6))
                            .lineLimit(1)
                    }
                }
                Spacer()
            }
        }
    }

    private var modePicker: some View {
        Picker("Rate", selection: $mode) {
            ForEach(Mode.allCases) { Text($0.label).tag($0) }
        }
        .pickerStyle(.segmented)
    }

    private var stars: some View {
        VStack(spacing: 8) {
            StarRating(score: score, size: 40) { newScore in
                // Tap the same star to clear back to "no score yet".
                if score == newScore { score = nil } else { score = newScore }
            }
            HStack {
                Button("Clear stars") { score = nil }
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(score == nil ? 0.3 : 0.6))
                    .disabled(score == nil)
                Spacer()
                if let score {
                    Text(scoreLabel(score))
                        .font(.encoreCaption)
                        .foregroundStyle(Color.encoreAccent)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private var reviewField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("A few words (optional)")
                .font(.encoreCaption)
                .foregroundStyle(Color.encoreText.opacity(0.6))
            TextField(
                "Why's it worth an encore?",
                text: $review,
                axis: .vertical,
            )
            .lineLimit(3...6)
            .font(.encoreBody)
            .foregroundStyle(Color.encoreText)
            .padding(12)
            .background(Color.encoreSurface)
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(Color.encoreHairline, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
    }

    private var relistenToggle: some View {
        Toggle(isOn: $isRelisten) {
            VStack(alignment: .leading, spacing: 2) {
                Text(isRelisten ? "Relisten" : "First listen")
                    .font(.encoreLabel)
                    .foregroundStyle(Color.encoreText)
                Text(isRelisten ? "You've heard it before." : "First time through.")
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.6))
            }
        }
        .tint(Color.encoreAccent)
        .padding(.vertical, 4)
    }

    private var saveButton: some View {
        EncoreButton(
            title: phase == .saving ? "Saving…" : "Save",
            kind: .brass,
            icon: "star.fill",
            action: save,
        )
        .disabled(phase == .saving || !canSave)
        .opacity(canSave ? 1 : 0.55)
    }

    @ViewBuilder
    private var savedNote: some View {
        // Voice from the build spec: 5-star → "Bravo. That's an encore."
        let copy: String = (score == 5.0) ? "Bravo. That's an encore." : "Saved."
        Text(copy)
            .font(.encoreBody)
            .foregroundStyle(Color.encoreAccent)
            .padding(.top, 2)
    }

    // MARK: - Behaviour

    private var canSave: Bool {
        score != nil || !review.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func scoreLabel(_ score: Double) -> String {
        let formatter = NumberFormatter()
        formatter.minimumFractionDigits = 1
        formatter.maximumFractionDigits = 1
        let value = formatter.string(from: NSNumber(value: score)) ?? "\(score)"
        return "\(value) stars"
    }

    private func save() {
        guard canSave, phase != .saving else { return }
        lastError = nil
        phase = .saving

        Task { @MainActor in
            do {
                let saved = try await persist()
                phase = .saved
                onSaved?(saved)
                // Brief celebration moment, then dismiss.
                try? await Task.sleep(for: .milliseconds(900))
                dismiss()
            } catch {
                phase = .idle
                lastError = (error as? LocalizedError)?.errorDescription
                    ?? "We couldn't save that rating. Try again shortly."
            }
        }
    }

    private func persist() async throws -> Rating {
        let trimmed = review.trimmingCharacters(in: .whitespacesAndNewlines)
        let reviewText = trimmed.isEmpty ? nil : trimmed

        switch (subject, mode) {
        case (.nowPlayingTrack(let np), .song):
            return try await session.ratings.upsert(
                subjectType: .track,
                hint: hint(forTrack: np),
                score: score,
                reviewText: reviewText,
                isRelisten: isRelisten,
                source: subject.defaultSource,
            )
        case (.nowPlayingTrack(let np), .album):
            return try await session.ratings.upsert(
                subjectType: .album,
                hint: hint(forAlbumOf: np),
                score: score,
                reviewText: reviewText,
                isRelisten: isRelisten,
                source: subject.defaultSource,
            )
        case (.catalogTrack(let id, _, _, _, _), _):
            return try await session.ratings.upsert(
                subjectType: .track,
                subjectID: id,
                score: score,
                reviewText: reviewText,
                isRelisten: isRelisten,
                source: subject.defaultSource,
            )
        case (.catalogAlbum(let id, _, _, _), _):
            return try await session.ratings.upsert(
                subjectType: .album,
                subjectID: id,
                score: score,
                reviewText: reviewText,
                isRelisten: isRelisten,
                source: subject.defaultSource,
            )
        }
    }

    private func hint(forTrack track: NowPlayingTrack) -> RatingsAPI.SubjectHint {
        RatingsAPI.SubjectHint(
            mbid: track.trackMBID,
            title: track.title,
            artist: track.artist,
        )
    }

    private func hint(forAlbumOf track: NowPlayingTrack) -> RatingsAPI.SubjectHint {
        RatingsAPI.SubjectHint(
            mbid: nil,
            title: track.album ?? track.title,
            artist: track.artist,
        )
    }
}

// MARK: - Helpers

private struct Artwork: View {
    let url: URL?
    var size: CGFloat = 64

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
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
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var placeholder: some View {
        Image(systemName: "music.note")
            .font(.system(size: size * 0.4, weight: .light))
            .foregroundStyle(Color.encoreText.opacity(0.4))
    }
}

#Preview {
    RatingSheet(
        subject: .nowPlayingTrack(NowPlayingTrack(
            title: "Sweet Thing",
            artist: "Van Morrison",
            album: "Astral Weeks",
            artworkURL: nil,
            trackMBID: nil,
            lastfmURL: nil,
        )),
    )
    .environment(SessionStore())
}
