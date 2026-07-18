import SwiftUI
import UIKit

/// Centralized Savoro design tokens for the native SwiftUI MVP.
///
/// Values are adapted from `savoro-mvp/project/_ds/**` and intentionally stay
/// warm, premium, food-first, and non-clinical. Use semantic tokens first; use
/// scale tokens only when a semantic alias is not expressive enough.
enum SavoroColor {
    // MARK: - Warm sand neutral scale

    static let sand50 = Color(red: 0.988, green: 0.977, blue: 0.957)
    static let sand100 = Color(red: 0.966, green: 0.946, blue: 0.914)
    static let sand200 = Color(red: 0.915, green: 0.887, blue: 0.845)
    static let sand300 = Color(red: 0.834, green: 0.795, blue: 0.735)
    static let sand400 = Color(red: 0.676, green: 0.625, blue: 0.552)
    static let sand500 = Color(red: 0.525, green: 0.472, blue: 0.402)
    static let sand600 = Color(red: 0.417, green: 0.363, blue: 0.303)
    static let sand700 = Color(red: 0.315, green: 0.267, blue: 0.220)
    static let sand800 = Color(red: 0.223, green: 0.184, blue: 0.151)
    static let sand900 = Color(red: 0.139, green: 0.113, blue: 0.094)
    static let sand950 = Color(red: 0.090, green: 0.073, blue: 0.063)

    // MARK: - Brand/accent scale

    static let blush50 = Color(red: 0.995, green: 0.956, blue: 0.954)
    static let blush100 = Color(red: 0.987, green: 0.917, blue: 0.917)
    static let blush200 = Color(red: 0.965, green: 0.833, blue: 0.835)
    static let blush300 = Color(red: 0.934, green: 0.743, blue: 0.751)
    static let blush400 = Color(red: 0.877, green: 0.620, blue: 0.638)
    static let blush500 = Color(red: 0.789, green: 0.490, blue: 0.520)

    static let sage50 = Color(red: 0.948, green: 0.981, blue: 0.950)
    static let sage100 = Color(red: 0.899, green: 0.958, blue: 0.904)
    static let sage200 = Color(red: 0.791, green: 0.903, blue: 0.803)
    static let sage300 = Color(red: 0.658, green: 0.815, blue: 0.676)
    static let sage400 = Color(red: 0.477, green: 0.682, blue: 0.504)

    static let lavender100 = Color(red: 0.940, green: 0.917, blue: 0.986)
    static let lavender200 = Color(red: 0.864, green: 0.824, blue: 0.961)
    static let lavender300 = Color(red: 0.786, green: 0.722, blue: 0.925)

    // MARK: - Semantic surfaces/text

    /// Semantic colors preserve the original light palette while resolving to
    /// a warm sand-based palette in dark mode. Raw ramp values above remain
    /// fixed so they can still be used for deliberate, non-semantic artwork.
    static let page = adaptive(
        light: uiColor(0.988, 0.977, 0.957),
        dark: uiColor(0.090, 0.073, 0.063)
    )
    static let raised = adaptive(
        light: uiColor(0.966, 0.946, 0.914),
        dark: uiColor(0.139, 0.113, 0.094)
    )
    static let card = adaptive(
        light: uiColor(1, 1, 1, alpha: 0.55),
        dark: uiColor(0.139, 0.113, 0.094, alpha: 0.72)
    )
    static let cardStrong = adaptive(
        light: uiColor(1, 1, 1, alpha: 0.70),
        dark: uiColor(0.223, 0.184, 0.151, alpha: 0.86)
    )
    static let cardOverlay = adaptive(
        light: uiColor(1, 1, 1, alpha: 0.72),
        dark: uiColor(0.223, 0.184, 0.151, alpha: 0.86)
    )
    static let inverseSurface = adaptive(
        light: uiColor(0.139, 0.113, 0.094),
        dark: uiColor(0.966, 0.946, 0.914)
    )

    static let textStrong = adaptive(
        light: uiColor(0.139, 0.113, 0.094),
        dark: uiColor(0.988, 0.977, 0.957)
    )
    static let textBody = adaptive(
        light: uiColor(0.315, 0.267, 0.220),
        dark: uiColor(0.915, 0.887, 0.845)
    )
    static let textMuted = adaptive(
        light: uiColor(0.525, 0.472, 0.402),
        dark: uiColor(0.834, 0.795, 0.735)
    )
    static let textSubtle = adaptive(
        light: uiColor(0.676, 0.625, 0.552),
        dark: uiColor(0.676, 0.625, 0.552)
    )
    static let textInverse = adaptive(
        light: uiColor(0.988, 0.977, 0.957),
        dark: uiColor(0.139, 0.113, 0.094)
    )
    static let textOnAccent = adaptive(
        light: uiColor(0.139, 0.113, 0.094),
        dark: uiColor(0.090, 0.073, 0.063)
    )
    static let numericTextStrong = adaptive(
        light: uiColor(0, 0, 0),
        dark: uiColor(0.988, 0.977, 0.957)
    )
    static let fieldPlaceholder = adaptive(
        light: UIColor.placeholderText.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)),
        dark: uiColor(0.676, 0.625, 0.552)
    )

    static let accent = adaptive(
        light: uiColor(0.877, 0.620, 0.638),
        dark: uiColor(0.934, 0.743, 0.751)
    )
    static let accentSoft = adaptive(
        light: uiColor(0.987, 0.917, 0.917),
        dark: uiColor(0.306, 0.169, 0.188)
    )
    static let accentHighlight = adaptive(
        light: uiColor(0.965, 0.833, 0.835),
        dark: uiColor(0.420, 0.235, 0.263)
    )
    static let accentStrong = adaptive(
        light: uiColor(0.789, 0.490, 0.520),
        dark: uiColor(0.965, 0.833, 0.835)
    )
    static let positive = adaptive(
        light: uiColor(0.477, 0.682, 0.504),
        dark: uiColor(0.658, 0.815, 0.676)
    )
    static let positiveSoft = adaptive(
        light: uiColor(0.899, 0.958, 0.904),
        dark: uiColor(0.145, 0.247, 0.165)
    )
    static let positiveBorder = adaptive(
        light: uiColor(0.791, 0.903, 0.803),
        dark: uiColor(0.477, 0.682, 0.504)
    )
    static let lavenderSoft = adaptive(
        light: uiColor(0.940, 0.917, 0.986),
        dark: uiColor(0.247, 0.204, 0.337)
    )

    static let border = adaptive(
        light: uiColor(0.915, 0.887, 0.845),
        dark: uiColor(0.315, 0.267, 0.220)
    )
    static let borderStrong = adaptive(
        light: uiColor(0.834, 0.795, 0.735),
        dark: uiColor(0.417, 0.363, 0.303)
    )
    static let glassBorder = adaptive(
        light: uiColor(1, 1, 1, alpha: 0.50),
        dark: uiColor(0.417, 0.363, 0.303, alpha: 0.72)
    )
    static let focusRing = adaptive(
        light: uiColor(0.934, 0.743, 0.751),
        dark: uiColor(0.965, 0.833, 0.835)
    )
    static let decorativeOverlay = adaptive(
        light: uiColor(1, 1, 1, alpha: 0.34),
        dark: uiColor(0.966, 0.946, 0.914, alpha: 0.22)
    )

    // MARK: - Macro data colors

    /// Macro colors are deliberately distinct and higher contrast than the
    /// soft brand blush palette, so data remains readable and non-decorative.
    static let macroProtein = adaptive(
        light: uiColor(0.220, 0.575, 0.365),
        dark: uiColor(0.380, 0.750, 0.480)
    )
    static let macroCarbs = adaptive(
        light: uiColor(0.770, 0.480, 0.120),
        dark: uiColor(0.900, 0.620, 0.270)
    )
    static let macroFat = adaptive(
        light: uiColor(0.500, 0.365, 0.710),
        dark: uiColor(0.700, 0.560, 0.880)
    )
    static let macroCalories = adaptive(
        light: uiColor(0.223, 0.184, 0.151),
        dark: uiColor(0.915, 0.887, 0.845)
    )

    private static func adaptive(light: UIColor, dark: UIColor) -> Color {
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? dark : light
        })
    }

    private static func uiColor(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, alpha: CGFloat = 1) -> UIColor {
        UIColor(red: red, green: green, blue: blue, alpha: alpha)
    }

    // Backward-compatible aliases from the scaffold.
    static let warmSand = page
    static let blush = accent
    static let ink = textStrong
    static let protein = macroProtein
    static let carbs = macroCarbs
    static let fat = macroFat
}

enum SavoroTypography {
    static let fontDesign: Font.Design = .rounded

    static let displayLarge = Font.system(size: 36, weight: .black, design: fontDesign)
    static let display = Font.system(size: 30, weight: .black, design: fontDesign)
    static let title1 = Font.system(size: 24, weight: .bold, design: fontDesign)
    static let title2 = Font.system(size: 20, weight: .bold, design: fontDesign)
    static let headline = Font.system(size: 18, weight: .semibold, design: fontDesign)
    static let body = Font.system(size: 16, weight: .regular, design: fontDesign)
    static let bodyEmphasized = Font.system(size: 16, weight: .semibold, design: fontDesign)
    static let callout = Font.system(size: 14, weight: .regular, design: fontDesign)
    static let label = Font.system(size: 12, weight: .semibold, design: fontDesign)
    static let micro = Font.system(size: 10, weight: .semibold, design: fontDesign)
    static let stateSymbol = Font.system(size: 34, weight: .semibold)
    static let heroSymbol = Font.system(size: 96, weight: .semibold)

    static let numericBody = body.monospacedDigit()
    static let numericHeadline = headline.monospacedDigit()
    static let numericTitle = title1.monospacedDigit()
}

enum SavoroSpacing {
    static let avatarOverlap: CGFloat = -8
    static let none: CGFloat = 0
    static let hairline: CGFloat = 1
    static let compact: CGFloat = 2
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40
    static let huge: CGFloat = 48
    static let giant: CGFloat = 64
}

enum SavoroRadius {
    static let chip: CGFloat = 10
    static let card: CGFloat = 16
    static let overlayCard: CGFloat = 18
    static let glass: CGFloat = 20
    static let sheet: CGFloat = 28
    static let pill: CGFloat = 999
}

enum SavoroControlSize {
    static let minimumTapTarget: CGFloat = 44
}

enum SavoroShadow {
    static let none = ShadowToken(color: .clear, radius: 0, x: 0, y: 0)
    static let glass = ShadowToken(color: .black.opacity(0.05), radius: 24, x: 0, y: 4)
    static let glassLarge = ShadowToken(color: .black.opacity(0.08), radius: 40, x: 0, y: 8)
    static let floating = ShadowToken(color: .black.opacity(0.10), radius: 60, x: 0, y: 20)
    static let small = ShadowToken(color: .black.opacity(0.06), radius: 2, x: 0, y: 1)
}

struct ShadowToken {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

extension View {
    func savoroShadow(_ token: ShadowToken) -> some View {
        shadow(color: token.color, radius: token.radius, x: token.x, y: token.y)
    }
}
