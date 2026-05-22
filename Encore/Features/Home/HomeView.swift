import SwiftUI

/// Branded placeholder home screen for Milestone 0. The now-playing screen
/// (F2) replaces this in Milestone 2.
struct HomeView: View {
    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                VStack(spacing: 12) {
                    Text(AppConfig.appName)
                        .font(.encoreWordmark)
                        .foregroundStyle(Color.encoreAccent)
                    DoubleRule()
                        .frame(width: 92)
                    Text(AppConfig.brandLine)
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText.opacity(0.75))
                }

                Card {
                    VStack(spacing: 14) {
                        Text("Nothing in here yet.")
                            .font(.encoreHeadline)
                            .foregroundStyle(Color.encoreText)
                        Text("Rate the last song that stopped you in your tracks.")
                            .font(.encoreBody)
                            .foregroundStyle(Color.encoreText.opacity(0.7))
                            .multilineTextAlignment(.center)
                        StarRating(score: 4.5, size: 30)
                            .padding(.top, 2)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 24)

                Spacer()

                EncoreButton(title: AppConfig.ratingPrompt, kind: .brass, icon: "star.fill") {
                    // Rating flow arrives in Milestone 3.
                }
                .padding(.horizontal, 24)

                Text("Milestone 0 — foundations")
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.45))
                    .padding(.bottom, 12)
            }
        }
    }
}

#Preview {
    HomeView()
}
