import SwiftUI

/// Inline colored macro summary: P 32g  C 45g  F 12g
struct MacroLineView: View {
    let protein: Double
    let carb: Double
    let fat: Double

    var body: some View {
        HStack(spacing: 10) {
            macroPill("P", value: protein, color: SavoroColors.Macro.protein)
            macroPill("C", value: carb, color: SavoroColors.Macro.carb)
            macroPill("F", value: fat, color: SavoroColors.Macro.fat)
        }
    }

    private func macroPill(_ letter: String, value: Double, color: Color) -> some View {
        HStack(spacing: 3) {
            Text(letter)
                .font(SavoroFonts.caption2)
                .foregroundStyle(color)
            Text("\(Int(value))g")
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)
        }
    }
}

#Preview {
    MacroLineView(protein: 32, carb: 45, fat: 12)
        .padding()
        .background(SavoroColors.canvas)
}
