import SwiftUI

/// Five-star rating with half-star support. Read-only by default; pass
/// `onChange` to make it interactive (the rating CTA).
struct StarRating: View {
    /// Score in 0.5 steps within 0...5. `nil` renders all stars empty.
    var score: Double?
    var size: CGFloat = 24
    /// When set, the control becomes interactive and reports new scores (0.5...5.0).
    var onChange: ((Double) -> Void)?

    private let starCount = 5

    var body: some View {
        HStack(spacing: size * 0.18) {
            ForEach(0..<starCount, id: \.self) { index in
                star(at: index)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Rating")
        .accessibilityValue(score.map { "\($0.formatted()) of 5 stars" } ?? "Not rated")
    }

    private func star(at index: Int) -> some View {
        ZStack {
            Image(systemName: "star.fill")
                .foregroundStyle(Color.dust)
            Image(systemName: "star.fill")
                .foregroundStyle(Color.brass)
                .mask(alignment: .leading) {
                    GeometryReader { geo in
                        Rectangle().frame(width: geo.size.width * fillAmount(for: index))
                    }
                }
        }
        .font(.system(size: size))
        .contentShape(Rectangle())
        .allowsHitTesting(onChange != nil)
        .onTapGesture { location in
            guard let onChange else { return }
            let isHalf = location.x < size / 2
            onChange(Double(index) + (isHalf ? 0.5 : 1.0))
        }
    }

    private func fillAmount(for index: Int) -> Double {
        let value = (score ?? 0) - Double(index)
        return min(max(value, 0), 1)
    }
}

#Preview {
    VStack(spacing: 20) {
        StarRating(score: 3.5)
        StarRating(score: 5.0, size: 32)
        StarRating(score: nil)
        StarRating(score: 2.0, size: 36, onChange: { _ in })
    }
    .padding()
    .background(Color.encoreBackground)
}
