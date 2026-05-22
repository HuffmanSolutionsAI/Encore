import SwiftUI

struct EncoreButton: View {
    enum Kind {
        /// Cocoa fill, Paper text — the default action.
        case primary
        /// Ink outline, transparent fill.
        case secondary
        /// Brass fill — reserved for the rating CTA.
        case brass
    }

    let title: String
    var kind: Kind = .primary
    var icon: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon) }
                Text(title)
            }
            .font(.encoreButton)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 20)
        }
        .buttonStyle(EncoreButtonStyle(kind: kind))
    }
}

private struct EncoreButtonStyle: ButtonStyle {
    let kind: EncoreButton.Kind

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foreground)
            .background(background(pressed: configuration.isPressed))
            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: kind == .secondary ? 1.5 : 0)
            )
            .opacity(configuration.isPressed ? 0.88 : 1)
    }

    private var foreground: Color {
        switch kind {
        case .primary: .paper
        case .secondary: .encoreText
        case .brass: .cocoaDeep
        }
    }

    private func background(pressed: Bool) -> Color {
        switch kind {
        case .primary: pressed ? .cocoaDeep : .cocoa
        case .secondary: .clear
        case .brass: .brass
        }
    }

    private var borderColor: Color {
        kind == .secondary ? .encoreText : .clear
    }
}

#Preview {
    VStack(spacing: 16) {
        EncoreButton(title: "Continue") {}
        EncoreButton(title: "Not now", kind: .secondary) {}
        EncoreButton(title: "Worth an encore?", kind: .brass, icon: "star.fill") {}
    }
    .padding()
    .background(Color.encoreBackground)
}
