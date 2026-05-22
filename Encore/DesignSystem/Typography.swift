import SwiftUI

// Build spec Section 8.2: Fraunces for display, Inter for UI text.
// `Font.custom` falls back to the system font when a file is missing, so the
// app still builds before the licensed font files are added to Resources/Fonts.
enum EncoreFont {
    /// Display — Fraunces SemiBold. Never rendered below 19pt.
    static func display(_ size: CGFloat) -> Font {
        .custom("Fraunces-SemiBold", size: max(size, 19), relativeTo: .title)
    }

    /// Text & UI — Inter.
    static func text(_ size: CGFloat, weight: InterWeight = .regular) -> Font {
        .custom(weight.fileName, size: size, relativeTo: .body)
    }

    enum InterWeight {
        case regular, medium, semibold, bold

        var fileName: String {
            switch self {
            case .regular:  "Inter-Regular"
            case .medium:   "Inter-Medium"
            case .semibold: "Inter-SemiBold"
            case .bold:     "Inter-Bold"
            }
        }
    }
}

extension Font {
    static let encoreWordmark = EncoreFont.display(34)
    static let encoreTitle    = EncoreFont.display(24)
    static let encoreHeadline = EncoreFont.display(19)
    static let encoreScore    = EncoreFont.display(40)
    static let encoreBody     = EncoreFont.text(16)
    static let encoreLabel    = EncoreFont.text(14, weight: .medium)
    static let encoreCaption  = EncoreFont.text(12, weight: .medium)
    static let encoreButton   = EncoreFont.text(16, weight: .semibold)
}
