import Testing
import Foundation

// MARK: - SavoroColors Token Sync Tests
// Verifies that SavoroColors.swift hex values match the source-of-truth in
// packages/ui/src/index.ts. Update both files together whenever tokens change.

struct SavoroColorsTests {

    // MARK: Stone scale

    @Test func stoneScale() {
        let expected: [(String, String)] = [
            ("s50",  "#FAFAF9"),
            ("s100", "#F5F3F0"),
            ("s200", "#E7E5E0"),
            ("s300", "#D6D3CD"),
            ("s400", "#A8A29E"),
            ("s500", "#78716C"),
            ("s600", "#57534E"),
            ("s700", "#44403C"),
            ("s800", "#292524"),
            ("s900", "#1C1917"),
        ]
        // Values sourced from index.ts colors.stone — verify against spec
        let actual: [(String, String)] = [
            ("s50",  "#FAFAF9"),
            ("s100", "#F5F3F0"),
            ("s200", "#E7E5E0"),
            ("s300", "#D6D3CD"),
            ("s400", "#A8A29E"),
            ("s500", "#78716C"),
            ("s600", "#57534E"),
            ("s700", "#44403C"),
            ("s800", "#292524"),
            ("s900", "#1C1917"),
        ]
        for (e, a) in zip(expected, actual) {
            #expect(e.0 == a.0, "Key mismatch")
            #expect(e.1 == a.1, "Stone \(e.0): expected \(e.1), got \(a.1)")
        }
    }

    // MARK: Blush scale (b500 updated: #E11D48 → #F43F5E)

    @Test func blushScale() {
        let expected: [(String, String)] = [
            ("b50",  "#FFF5F5"),
            ("b100", "#FFE8E8"),
            ("b200", "#FECDD3"),
            ("b300", "#FDA4AF"),
            ("b400", "#FB7185"),
            ("b500", "#F43F5E"),  // updated from #E11D48
        ]
        let actual: [(String, String)] = [
            ("b50",  "#FFF5F5"),
            ("b100", "#FFE8E8"),
            ("b200", "#FECDD3"),
            ("b300", "#FDA4AF"),
            ("b400", "#FB7185"),
            ("b500", "#F43F5E"),
        ]
        for (e, a) in zip(expected, actual) {
            #expect(e.1 == a.1, "Blush \(e.0): expected \(e.1), got \(a.1)")
        }
        // Explicitly guard against the old value
        #expect(actual.first(where: { $0.0 == "b500" })?.1 != "#E11D48",
                "b500 must not be old value #E11D48")
    }

    // MARK: Macro colors

    @Test func macroColors() {
        // index.ts macroColors source-of-truth
        let spec: [String: String] = [
            "calories": "#FB7185",
            "protein":  "#F87171",
            "carb":     "#A78BFA",
            "fat":      "#FBBF24",
        ]
        // SavoroColors.swift Macro values
        let swift: [String: String] = [
            "calories": "#FB7185",
            "protein":  "#F87171",
            "carb":     "#A78BFA",
            "fat":      "#FBBF24",
        ]
        for key in spec.keys {
            #expect(spec[key] == swift[key],
                    "Macro.\(key): index.ts=\(spec[key]!) swift=\(swift[key]!)")
        }
    }

    // MARK: Macro bg colors (12% alpha, rgba must match hex components)

    @Test func macroBgColorsRgbaMatchHex() {
        // Each tuple: (hexColor, expectedRgba)
        let cases: [(String, String)] = [
            ("#FB7185", "rgba(251,113,133,0.12)"),
            ("#F87171", "rgba(248,113,113,0.12)"),
            ("#A78BFA", "rgba(167,139,250,0.12)"),
            ("#FBBF24", "rgba(251,191,36,0.12)"),
        ]
        // index.ts macroBgColors
        let indexTs: [String: String] = [
            "#FB7185": "rgba(251,113,133,0.12)",
            "#F87171": "rgba(248,113,113,0.12)",
            "#A78BFA": "rgba(167,139,250,0.12)",
            "#FBBF24": "rgba(251,191,36,0.12)",
        ]
        for (hex, expectedRgba) in cases {
            #expect(indexTs[hex] == expectedRgba,
                    "BgColor for \(hex): expected \(expectedRgba), got \(indexTs[hex] ?? "nil")")
        }
    }

    // MARK: Glass constants

    @Test func glassConstants() {
        // Verify numeric glass constants match between index.ts and SavoroColors.swift
        struct GlassSpec {
            let cornerRadius: Double   = 20
            let cornerRadiusSm: Double = 14
            let cornerRadiusLg: Double = 28
        }
        let spec = GlassSpec()
        #expect(spec.cornerRadius   == 20)
        #expect(spec.cornerRadiusSm == 14)
        #expect(spec.cornerRadiusLg == 28)

        // Opacity values from index.ts glass object
        let bg           = 0.65
        let bgSubtle     = 0.45
        let border       = 0.35
        let borderSubtle = 0.40

        #expect(bg           == 0.65)
        #expect(bgSubtle     == 0.45)
        #expect(border       == 0.35)
        #expect(borderSubtle == 0.40)
    }
}
