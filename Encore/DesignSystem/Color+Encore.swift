import SwiftUI
import UIKit

extension Color {
    init(hex: UInt) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }

    // Brand tokens — build spec Section 8.1. Use only these.
    static let ink          = Color(hex: 0x211B14)
    static let paper        = Color(hex: 0xF4EDDF)
    static let cocoa        = Color(hex: 0x3D2F22)
    static let cocoaDeep    = Color(hex: 0x241A12)
    static let brass        = Color(hex: 0xB98C3F)
    static let surface      = Color(hex: 0xFBF7EC)
    static let dust         = Color(hex: 0xDCCFB2)
    static let night        = Color(hex: 0x1B1712)
    static let nightSurface = Color(hex: 0x2A231C)
    static let clay         = Color(hex: 0x8C6A47)

    // Semantic colors that resolve per light/dark mode.
    static let encoreBackground = adaptive(light: 0xF4EDDF, dark: 0x1B1712)
    static let encoreSurface    = adaptive(light: 0xFBF7EC, dark: 0x2A231C)
    static let encoreText       = adaptive(light: 0x211B14, dark: 0xF4EDDF)
    static let encoreAccent     = adaptive(light: 0x3D2F22, dark: 0x8C6A47)
    static let encoreHairline   = adaptive(light: 0xDCCFB2, dark: 0x3D2F22)

    private static func adaptive(light: UInt, dark: UInt) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
