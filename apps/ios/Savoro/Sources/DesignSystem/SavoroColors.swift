import SwiftUI

// MARK: - Savoro Design Tokens — Colors

enum SavoroColors {

    // MARK: Canvas

    static let canvas = Color(hex: "#FAFAF9")

    // MARK: Accent

    static let rose = Color(hex: "#FB7185")

    // MARK: Text

    static let textPrimary = Color(hex: "#1C1917")
    static let textSecondary = Color(hex: "#78716C")

    // MARK: - Stone (warm neutrals)

    enum Stone {
        static let s50  = Color(hex: "#FAFAF9")
        static let s100 = Color(hex: "#F5F3F0")
        static let s200 = Color(hex: "#E7E5E0")
        static let s300 = Color(hex: "#D6D3CD")
        static let s400 = Color(hex: "#A8A29E")
        static let s500 = Color(hex: "#78716C")
        static let s600 = Color(hex: "#57534E")
        static let s700 = Color(hex: "#44403C")
        static let s800 = Color(hex: "#292524")
        static let s900 = Color(hex: "#1C1917")
    }

    // MARK: - Blush (rose scale from UI package)

    enum Blush {
        static let b50  = Color(hex: "#FFF5F5")
        static let b100 = Color(hex: "#FFE8E8")
        static let b200 = Color(hex: "#FECDD3")
        static let b300 = Color(hex: "#FDA4AF")
        static let b400 = Color(hex: "#FB7185")
        static let b500 = Color(hex: "#E11D48")
    }

    // MARK: - Macro (nutritional accent colors)

    enum Macro {
        static let calories = Color(hex: "#FB7185")   // rose
        static let protein  = Color(hex: "#F87171")   // coral-red
        static let carb     = Color(hex: "#A78BFA")   // lavender
        static let fat      = Color(hex: "#FBBF24")   // warm gold

        // Background-weight variants (12% opacity) for subtle fills
        static let caloriesBg = Color(hex: "#FB7185").opacity(0.12)
        static let proteinBg  = Color(hex: "#F87171").opacity(0.12)
        static let carbBg     = Color(hex: "#A78BFA").opacity(0.12)
        static let fatBg      = Color(hex: "#FBBF24").opacity(0.12)
    }

    // MARK: - Glass (frosted surface tokens)

    enum Glass {
        static let bg             = Color.white.opacity(0.65)
        static let bgSubtle       = Color.white.opacity(0.45)
        static let border         = Color.white.opacity(0.35)
        static let borderSubtle   = Color(hex: "#E7E5E0").opacity(0.40)

        static let cornerRadius: CGFloat   = 20
        static let cornerRadiusSm: CGFloat = 14
        static let cornerRadiusLg: CGFloat = 28

        static let shadowColor    = Color(hex: "#1C1917").opacity(0.04)
        static let shadowRadius: CGFloat = 30
        static let shadowY: CGFloat      = 8
    }
}
