import SwiftUI

// MARK: - GlassCard Variant

enum GlassCardVariant {
    case `default`
    case subtle

    var backgroundColor: Color {
        switch self {
        case .default: SavoroColors.Glass.bg
        case .subtle:  SavoroColors.Glass.bgSubtle
        }
    }

    var borderColor: Color {
        switch self {
        case .default: SavoroColors.Glass.border
        case .subtle:  SavoroColors.Glass.borderSubtle
        }
    }
}

// MARK: - GlassCard Modifier

struct GlassCardModifier: ViewModifier {
    var cornerRadius: CGFloat = SavoroColors.Glass.cornerRadius
    var variant: GlassCardVariant = .default

    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial)
            .background(variant.backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(variant.borderColor, lineWidth: 0.5)
            )
            .shadow(
                color: SavoroColors.Glass.shadowColor,
                radius: SavoroColors.Glass.shadowRadius,
                x: 0,
                y: SavoroColors.Glass.shadowY
            )
    }
}

// MARK: - View Extension

extension View {
    func glassCard(
        cornerRadius: CGFloat = SavoroColors.Glass.cornerRadius,
        variant: GlassCardVariant = .default
    ) -> some View {
        modifier(GlassCardModifier(cornerRadius: cornerRadius, variant: variant))
    }
}
