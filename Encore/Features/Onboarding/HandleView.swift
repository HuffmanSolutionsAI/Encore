import SwiftUI

/// Onboarding step 2 — pick a unique handle and a display name.
/// Submits to `POST /users`; conflicts on the handle bubble up as inline
/// validation copy.
struct HandleView: View {
    @Environment(SessionStore.self) private var session
    @State private var viewModel = HandleViewModel()
    @FocusState private var focused: Field?

    enum Field { case handle, displayName }

    var body: some View {
        ZStack {
            Color.encoreBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                header

                Card {
                    VStack(alignment: .leading, spacing: 18) {
                        labelledField(
                            "Your handle",
                            placeholder: "e.g. evening_dj",
                            text: $viewModel.handle,
                            field: .handle,
                            autocap: .never,
                            footer: viewModel.handleFooter
                        )

                        labelledField(
                            "Display name",
                            placeholder: "What friends call you",
                            text: $viewModel.displayName,
                            field: .displayName,
                            autocap: .words,
                            footer: nil
                        )
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.encoreCaption)
                        .foregroundStyle(Color.red.opacity(0.85))
                }

                Spacer()

                EncoreButton(
                    title: viewModel.isSubmitting ? "Saving…" : "Continue",
                    kind: .primary
                ) {
                    focused = nil
                    Task { await viewModel.submit(with: session) }
                }
                .disabled(!viewModel.canSubmit)
            }
            .padding(.horizontal, 24)
            .padding(.top, 60)
            .padding(.bottom, 32)
        }
        .onAppear { focused = .handle }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Claim your handle")
                .font(.encoreTitle)
                .foregroundStyle(Color.encoreText)
            Text("Friends will find you by this. Lowercase letters, numbers, and underscores — three to thirty characters.")
                .font(.encoreBody)
                .foregroundStyle(Color.encoreText.opacity(0.7))
        }
    }

    @ViewBuilder
    private func labelledField(
        _ label: String,
        placeholder: String,
        text: Binding<String>,
        field: Field,
        autocap: TextInputAutocapitalization,
        footer: String?
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.encoreLabel)
                .foregroundStyle(Color.encoreText.opacity(0.7))
            TextField(placeholder, text: text)
                .font(.encoreBody)
                .foregroundStyle(Color.encoreText)
                .textInputAutocapitalization(autocap)
                .autocorrectionDisabled()
                .focused($focused, equals: field)
                .submitLabel(field == .handle ? .next : .done)
                .onSubmit {
                    focused = field == .handle ? .displayName : nil
                }
            Rectangle()
                .fill(Color.encoreHairline)
                .frame(height: 1)
            if let footer {
                Text(footer)
                    .font(.encoreCaption)
                    .foregroundStyle(Color.encoreText.opacity(0.55))
            }
        }
    }
}

@Observable
final class HandleViewModel {
    var handle: String = ""
    var displayName: String = ""
    var errorMessage: String?
    var isSubmitting: Bool = false

    private static let handleRegex = #/^[a-z0-9_]{3,30}$/#

    var normalizedHandle: String {
        handle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    var normalizedDisplayName: String {
        displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var isHandleValid: Bool {
        (try? Self.handleRegex.wholeMatch(in: normalizedHandle)) != nil
    }

    var isDisplayNameValid: Bool {
        (1...80).contains(normalizedDisplayName.count)
    }

    var canSubmit: Bool {
        !isSubmitting && isHandleValid && isDisplayNameValid
    }

    var handleFooter: String {
        if handle.isEmpty {
            return "Lowercase letters, numbers, and underscores."
        }
        return isHandleValid ? "Looks good." : "3–30 characters, lowercase letters, numbers, underscores."
    }

    @MainActor
    func submit(with session: SessionStore) async {
        guard canSubmit else { return }
        isSubmitting = true
        errorMessage = nil

        do {
            let profile = try await session.users.create(
                handle: normalizedHandle,
                displayName: normalizedDisplayName
            )
            session.didCreateProfile(profile)
        } catch APIError.conflict(let code, _) where code == "handle_taken" {
            errorMessage = "That handle is already taken — try another."
        } catch APIError.conflict(_, let message) {
            errorMessage = message ?? "Something already exists with these details."
        } catch APIError.validation(_, let message) {
            errorMessage = message ?? "Those values aren't valid."
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription
                ?? "Couldn't save your profile. Try again."
        }

        isSubmitting = false
    }
}

#Preview {
    HandleView()
        .environment(SessionStore())
}
