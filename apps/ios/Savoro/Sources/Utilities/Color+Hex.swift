import SwiftUI

extension Color {
    /// Initializes a `Color` from a hex string.
    /// Supports `#RRGGBB` and `#RRGGBBAA` formats. The `#` prefix is optional.
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&rgb)

        switch cleaned.count {
        case 6: // RRGGBB
            let r = Double((rgb >> 16) & 0xFF) / 255.0
            let g = Double((rgb >> 8) & 0xFF) / 255.0
            let b = Double(rgb & 0xFF) / 255.0
            self.init(red: r, green: g, blue: b)

        case 8: // RRGGBBAA
            let r = Double((rgb >> 24) & 0xFF) / 255.0
            let g = Double((rgb >> 16) & 0xFF) / 255.0
            let b = Double((rgb >> 8) & 0xFF) / 255.0
            let a = Double(rgb & 0xFF) / 255.0
            self.init(red: r, green: g, blue: b, opacity: a)

        default:
            self.init(red: 0, green: 0, blue: 0)
        }
    }
}
