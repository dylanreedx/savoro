import SwiftUI

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

    static let page = sand50
    static let raised = sand100
    static let card = Color.white.opacity(0.55)
    static let cardStrong = Color.white.opacity(0.70)
    static let inverseSurface = sand900

    static let textStrong = sand900
    static let textBody = sand700
    static let textMuted = sand500
    static let textSubtle = sand400
    static let textInverse = sand50
    static let textOnAccent = sand900

    static let accent = blush400
    static let accentSoft = blush100
    static let accentStrong = blush500
    static let positive = sage400
    static let positiveSoft = sage100

    static let border = sand200
    static let borderStrong = sand300
    static let glassBorder = Color.white.opacity(0.50)
    static let focusRing = blush300

    // MARK: - Macro data colors

    /// Macro colors are deliberately distinct and higher contrast than the
    /// soft brand blush palette, so data remains readable and non-decorative.
    static let macroProtein = Color(red: 0.220, green: 0.575, blue: 0.365)
    static let macroCarbs = Color(red: 0.770, green: 0.480, blue: 0.120)
    static let macroFat = Color(red: 0.500, green: 0.365, blue: 0.710)
    static let macroCalories = sand800

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

    static let numericBody = body.monospacedDigit()
    static let numericHeadline = headline.monospacedDigit()
    static let numericTitle = title1.monospacedDigit()
}

enum SavoroSpacing {
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
    static let glass: CGFloat = 20
    static let sheet: CGFloat = 28
    static let pill: CGFloat = 999
}

enum SavoroShadow {
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
