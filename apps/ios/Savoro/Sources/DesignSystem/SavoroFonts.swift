import SwiftUI
import UIKit

// MARK: - Savoro Design Tokens — Typography

enum SavoroFonts {

    // MARK: Font Weight Helpers

    static func regular(size: CGFloat) -> Font {
        .custom("PlusJakartaSans-Regular", size: size)
    }

    static func medium(size: CGFloat) -> Font {
        .custom("PlusJakartaSans-Medium", size: size)
    }

    static func semibold(size: CGFloat) -> Font {
        .custom("PlusJakartaSans-SemiBold", size: size)
    }

    static func bold(size: CGFloat) -> Font {
        .custom("PlusJakartaSans-Bold", size: size)
    }

    static func extrabold(size: CGFloat) -> Font {
        .custom("PlusJakartaSans-ExtraBold", size: size)
    }

    // MARK: Semantic Styles

    static let largeTitle  = extrabold(size: 34)
    static let title       = bold(size: 28)
    static let title2      = bold(size: 22)
    static let title3      = semibold(size: 20)
    static let headline    = semibold(size: 17)
    static let body        = regular(size: 17)
    static let callout     = medium(size: 16)
    static let subheadline = medium(size: 15)
    static let footnote    = regular(size: 13)
    static let caption     = regular(size: 12)
    static let caption2    = regular(size: 11)

    // MARK: UIFont Equivalents (for UIKit interop)

    static func uiRegular(size: CGFloat) -> UIFont {
        UIFont(name: "PlusJakartaSans-Regular", size: size) ?? .systemFont(ofSize: size)
    }

    static func uiMedium(size: CGFloat) -> UIFont {
        UIFont(name: "PlusJakartaSans-Medium", size: size) ?? .systemFont(ofSize: size, weight: .medium)
    }

    static func uiSemibold(size: CGFloat) -> UIFont {
        UIFont(name: "PlusJakartaSans-SemiBold", size: size) ?? .systemFont(ofSize: size, weight: .semibold)
    }

    static func uiBold(size: CGFloat) -> UIFont {
        UIFont(name: "PlusJakartaSans-Bold", size: size) ?? .systemFont(ofSize: size, weight: .bold)
    }

    static func uiExtrabold(size: CGFloat) -> UIFont {
        UIFont(name: "PlusJakartaSans-ExtraBold", size: size) ?? .systemFont(ofSize: size, weight: .heavy)
    }
}
