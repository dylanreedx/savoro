import SwiftUI

// MARK: - ViewfinderOverlay

struct ViewfinderOverlay: View {
    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height) * 0.72
            let rect = CGRect(
                x: (geo.size.width - side) / 2,
                y: (geo.size.height - side) / 2,
                width: side,
                height: side
            )

            Canvas { context, size in
                // Dimmed background with cutout
                var dimPath = Path(CGRect(origin: .zero, size: size))
                dimPath.addRoundedRect(
                    in: rect,
                    cornerSize: CGSize(width: 16, height: 16)
                )
                context.fill(
                    dimPath,
                    with: .color(Color.black.opacity(0.55)),
                    style: FillStyle(eoFill: true)
                )
            }
            .allowsHitTesting(false)

            // Corner brackets
            cornerBrackets(in: rect)
                .stroke(SavoroColors.rose, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                .allowsHitTesting(false)

            // Instruction label
            VStack {
                Spacer()
                    .frame(height: rect.maxY + 32)

                Text("Point at a barcode")
                    .font(SavoroFonts.callout)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
            }
            .frame(maxWidth: .infinity)
        }
        .ignoresSafeArea()
    }

    // MARK: - Corner Brackets

    private func cornerBrackets(in rect: CGRect) -> Path {
        let arm: CGFloat = 28
        let r: CGFloat = 16

        var path = Path()

        // Top-left
        path.move(to: CGPoint(x: rect.minX, y: rect.minY + arm))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + r))
        path.addQuadCurve(
            to: CGPoint(x: rect.minX + r, y: rect.minY),
            control: CGPoint(x: rect.minX, y: rect.minY)
        )
        path.addLine(to: CGPoint(x: rect.minX + arm, y: rect.minY))

        // Top-right
        path.move(to: CGPoint(x: rect.maxX - arm, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - r, y: rect.minY))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY + r),
            control: CGPoint(x: rect.maxX, y: rect.minY)
        )
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + arm))

        // Bottom-right
        path.move(to: CGPoint(x: rect.maxX, y: rect.maxY - arm))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - r))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX - r, y: rect.maxY),
            control: CGPoint(x: rect.maxX, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: rect.maxX - arm, y: rect.maxY))

        // Bottom-left
        path.move(to: CGPoint(x: rect.minX + arm, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX + r, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: rect.minX, y: rect.maxY - r),
            control: CGPoint(x: rect.minX, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - arm))

        return path
    }
}

#Preview {
    ZStack {
        Color.black
        ViewfinderOverlay()
    }
}
