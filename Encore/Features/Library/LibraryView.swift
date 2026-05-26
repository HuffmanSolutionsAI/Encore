import SwiftUI

/// User's ratings library (build spec F5). M3 ships a minimal list;
/// search/filter/sort lands in M5.
struct LibraryView: View {
    @Environment(SessionStore.self) private var session
    @State private var model: LibraryViewModel?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.encoreBackground.ignoresSafeArea()
                content
            }
            .navigationTitle("Library")
            .toolbarTitleDisplayMode(.inline)
            .toolbarBackground(Color.encoreBackground, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .navigationDestination(for: UUID.self) { albumID in
                AlbumDetailView(albumID: albumID)
            }
        }
        .task { await ensureLoaded() }
    }

    @ViewBuilder
    private var content: some View {
        switch model?.state ?? .loading {
        case .loading:
            ProgressView().tint(Color.encoreAccent)
        case .loaded(let entries) where entries.isEmpty:
            EmptyState()
                .padding(.horizontal, 24)
        case .loaded(let entries):
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(entries) { entry in
                        if let albumID = entry.navigableAlbumID {
                            NavigationLink(value: albumID) {
                                LibraryRow(entry: entry)
                            }
                            .buttonStyle(.plain)
                        } else {
                            LibraryRow(entry: entry)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 24)
            }
            .refreshable { await model?.load() }
        case .error(let message):
            MessageCard(title: "Can't open the library.", body: message) {
                Task { await model?.load() }
            }
            .padding(.horizontal, 24)
        }
    }

    private func ensureLoaded() async {
        if model == nil {
            model = LibraryViewModel(api: session.ratings)
        }
        await model?.load()
    }
}

private struct LibraryRow: View {
    let entry: LibraryEntry

    var body: some View {
        Card(padding: 14) {
            HStack(spacing: 14) {
                RowArtwork(url: entry.albumArtworkURL)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(subjectChip)
                            .font(.encoreCaption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.encoreHairline.opacity(0.4))
                            .clipShape(Capsule())
                            .foregroundStyle(Color.encoreText.opacity(0.7))
                        if entry.isRelisten {
                            Text("Relisten")
                                .font(.encoreCaption)
                                .foregroundStyle(Color.encoreAccent)
                        }
                    }
                    Text(entry.displayTitle)
                        .font(.encoreHeadline)
                        .foregroundStyle(Color.encoreText)
                        .lineLimit(2)
                    if let artist = entry.albumArtist {
                        Text(artist)
                            .font(.encoreBody)
                            .foregroundStyle(Color.encoreText.opacity(0.7))
                            .lineLimit(1)
                    }
                    HStack(spacing: 10) {
                        StarRating(score: entry.score, size: 14)
                        if let review = entry.reviewText, !review.isEmpty {
                            Image(systemName: "text.bubble")
                                .font(.system(size: 11))
                                .foregroundStyle(Color.encoreText.opacity(0.55))
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }

    private var subjectChip: String {
        entry.subjectType == .album ? "Album" : "Song"
    }
}

private struct RowArtwork: View {
    let url: URL?

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color.encoreHairline.opacity(0.35))
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty: Color.clear
                    case .success(let image): image.resizable().scaledToFill()
                    case .failure: placeholder
                    @unknown default: placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: 56, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var placeholder: some View {
        Image(systemName: "music.note")
            .font(.system(size: 20, weight: .light))
            .foregroundStyle(Color.encoreText.opacity(0.4))
    }
}

private struct EmptyState: View {
    var body: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "books.vertical")
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(Color.encoreText.opacity(0.45))
            Text("Nothing in here yet.")
                .font(.encoreHeadline)
                .foregroundStyle(Color.encoreText)
            Text("Rate the last song that stopped you in your tracks.")
                .font(.encoreBody)
                .foregroundStyle(Color.encoreText.opacity(0.7))
                .multilineTextAlignment(.center)
            Spacer()
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
