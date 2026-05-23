import SwiftUI

/// Onboarding step 3 — enter a Last.fm username, verified through the API
/// before we save it. Last.fm is how Encore reads your "now playing" data,
/// so we never accept a username we can't reach.
struct LastfmConnectView: View {
    let profile: UserProfile

    @Environment(SessionStore.self) private var session
    @State private var viewModel = LastfmConnectViewModel()
    @FocusState private var focused: Bool

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                header

                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Last.fm username")
                            .font(.encoreLabel)
                            .foregroundStyle(Color.encoreText.opacity(0.7))
                        TextField("e.g. evening_dj", text: $viewModel.username)
                            .font(.encoreBody)
                            .foregroundStyle(Color.encoreText)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focused)
                            .submitLabel(.go)
                            .onSubmit {
                                focused = false
                                Task { await viewModel.submit(profile: profile, with: session) }
                            }
                        Rectangle()
                            .fill(Color.encoreHairline)
                            .frame(height: 1)
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.encoreCaption)
                        .foregroundStyle(Color.red.opacity(0.85))
                }

                infoCard

                Spacer()

                EncoreButton(
                    title: viewModel.buttonTitle,
                    kind: .primary
                ) {
                    focused = false
                    Task { await viewModel.submit(profile: profile, with: session) }
                }
                .disabled(!viewModel.canSubmit)
            }
            .padding(.horizontal, 24)
            .padding(.top, 60)
            .padding(.bottom, 32)
        }
        .onAppear { focused = true }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Connect Last.fm")
                .font(.encoreTitle)
                .foregroundStyle(Color.encoreText)
            Text("Encore reads your listening history from Last.fm. We need your username so we know what to look for.")
                .font(.encoreBody)
                .foregroundStyle(Color.encoreText.opacity(0.7))
        }
    }

    private var infoCard: some View {
        Card(padding: 14) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "info.circle")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.encoreAccent)
                    .padding(.top, 2)
                Text("Don't have a Last.fm account? Make one at last.fm/join, then come back.")
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.7))
            }
        }
    }
}

@Observable
final class LastfmConnectViewModel {
    var username: String = ""
    var errorMessage: String?
    var isWorking: Bool = false

    var normalized: String {
        username.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var canSubmit: Bool {
        !isWorking && !normalized.isEmpty && !normalized.contains(" ")
    }

    var buttonTitle: String {
        isWorking ? "Verifying…" : "Continue"
    }

    @MainActor
    func submit(profile: UserProfile, with session: SessionStore) async {
        guard canSubmit else { return }
        isWorking = true
        errorMessage = nil

        do {
            let exists = try await session.lastfm.verify(username: normalized)
            guard exists else {
                errorMessage = "We can't find that Last.fm user. Double-check the spelling."
                isWorking = false
                return
            }
            let updated = try await session.users.update(lastfmUsername: normalized)
            session.didLinkLastfm(updated)
        } catch APIError.validation(_, let message) {
            errorMessage = message ?? "That username isn't valid."
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription
                ?? "Couldn't reach Last.fm. Try again in a moment."
        }

        isWorking = false
    }
}

#Preview {
    LastfmConnectView(profile: .preview)
        .environment(SessionStore())
}

extension UserProfile {
    static var preview: UserProfile {
        UserProfile(
            id: UUID(),
            handle: "evening_dj",
            displayName: "Evening DJ",
            avatarURL: nil,
            lastfmUsername: nil,
            createdAt: .now
        )
    }
}
