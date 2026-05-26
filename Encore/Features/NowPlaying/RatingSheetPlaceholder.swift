import SwiftUI

/// Stub for the rating sheet (build spec F3). M2 only wires the entry
/// point — the real interactive stars, review field, and persistence
/// land in Milestone 3.
struct RatingSheetPlaceholder: View {
    let track: NowPlayingTrack
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            VStack(spacing: 24) {
                Capsule()
                    .fill(Color.encoreHairline)
                    .frame(width: 36, height: 4)
                    .padding(.top, 10)

                VStack(spacing: 6) {
                    Text("Worth an encore?")
                        .font(.encoreTitle)
                        .foregroundStyle(Color.encoreAccent)
                    DoubleRule().frame(width: 60)
                }

                VStack(spacing: 6) {
                    Text(track.title)
                        .font(.encoreHeadline)
                        .foregroundStyle(Color.encoreText)
                        .multilineTextAlignment(.center)
                    Text(track.artist)
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText.opacity(0.75))
                        .multilineTextAlignment(.center)
                }

                StarRating(score: nil, size: 36)

                Text("Stars, reviews, and the first-listen toggle arrive in Milestone 3.")
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.55))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                Spacer()

                EncoreButton(title: "Close", kind: .secondary) { dismiss() }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
            }
            .frame(maxWidth: .infinity)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
    }
}

#Preview {
    RatingSheetPlaceholder(track: NowPlayingTrack(
        title: "Sweet Thing",
        artist: "Van Morrison",
        album: "Astral Weeks",
        artworkURL: nil,
        trackMBID: nil,
        lastfmURL: nil
    ))
}
