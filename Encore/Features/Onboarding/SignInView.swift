import SwiftUI

/// Onboarding step 1 — landing screen with the Sign in with Apple CTA.
/// Auth happens through Cognito's hosted UI; we just kick it off.
struct SignInView: View {
    @Environment(SessionStore.self) private var session
    @State private var viewModel = SignInViewModel()

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 14) {
                    Text(AppConfig.appName)
                        .font(.encoreWordmark)
                        .foregroundStyle(Color.encoreAccent)
                    DoubleRule()
                        .frame(width: 92)
                    Text(AppConfig.brandLine)
                        .font(.encoreBody)
                        .foregroundStyle(Color.encoreText.opacity(0.75))
                }

                Spacer()

                VStack(spacing: 16) {
                    if let copy = viewModel.errorMessage(for: session.status) {
                        Text(copy)
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 8)
                    }

                    EncoreButton(
                        title: viewModel.isSigningIn ? "Signing in…" : "Sign in with Apple",
                        kind: .primary,
                        icon: "applelogo"
                    ) {
                        Task { await viewModel.signIn(with: session) }
                    }
                    .disabled(viewModel.isSigningIn || !AppConfig.Remote.isConfigured)

                    if !AppConfig.Remote.isConfigured {
                        Text("This build isn't configured — set the Cognito and API values in your Xcode build settings.")
                            .font(.encoreCaption)
                            .foregroundStyle(Color.encoreText.opacity(0.6))
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 36)
            }
        }
    }
}

@Observable
final class SignInViewModel {
    var isSigningIn: Bool = false

    @MainActor
    func signIn(with session: SessionStore) async {
        guard !isSigningIn else { return }
        isSigningIn = true
        await session.signIn()
        isSigningIn = false
    }

    /// Pulls a friendly message out of `SessionStore.Status` when a previous
    /// sign-in attempt failed.
    func errorMessage(for status: SessionStore.Status) -> String? {
        if case .signedOut(let error) = status { return error }
        return nil
    }
}

#Preview {
    SignInView()
        .environment(SessionStore())
}
