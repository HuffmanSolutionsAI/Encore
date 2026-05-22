import SwiftUI

/// Raised surface — Surface fill, 1px Dust border, ~13pt corner radius.
struct Card<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .background(Color.encoreSurface)
            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .strokeBorder(Color.encoreHairline, lineWidth: 1)
            )
    }
}

#Preview {
    Card {
        Text("Music worth playing again.")
            .font(.encoreBody)
            .foregroundStyle(Color.encoreText)
    }
    .padding()
    .background(Color.encoreBackground)
}
