import SwiftUI

/// Two thin brass lines — the brand's section divider.
struct DoubleRule: View {
    var spacing: CGFloat = 3

    var body: some View {
        VStack(spacing: spacing) {
            line
            line
        }
        .accessibilityHidden(true)
    }

    private var line: some View {
        Rectangle()
            .fill(Color.brass)
            .frame(height: 1)
    }
}

#Preview {
    DoubleRule()
        .frame(width: 120)
        .padding()
        .background(Color.encoreBackground)
}
