import SwiftUI

// MARK: - ProjectedMacroBarView

private struct ProjectedMacroBarView: View {
    let label: String
    let current: Double
    let projected: Double
    let goal: Double
    let color: Color

    // Ratio clamped to [0, 1]; zero-goal guard returns 0
    var currentRatio: Double {
        guard goal > 0 else { return 0 }
        return min(current / goal, 1.0)
    }

    var projectedRatio: Double {
        guard goal > 0 else { return 0 }
        return min(projected / goal, 1.0)
    }

    var delta: Double { projected - current }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(SavoroFonts.caption)
                    .foregroundStyle(SavoroColors.textSecondary)
                Spacer()
                HStack(spacing: 4) {
                    Text(formatted(current))
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.textSecondary)
                    if delta != 0 {
                        Text(deltaFormatted)
                            .font(SavoroFonts.caption)
                            .foregroundStyle(delta > 0 ? color : SavoroColors.Stone.s400)
                    }
                    Text("/ \(formatted(goal))")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.Stone.s400)
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // Track
                    Capsule()
                        .fill(SavoroColors.Stone.s100)
                        .frame(height: 6)

                    // Projected fill (dimmer, behind)
                    Capsule()
                        .fill(color.opacity(0.3))
                        .frame(width: geo.size.width * projectedRatio, height: 6)

                    // Current fill (solid, in front)
                    Capsule()
                        .fill(color)
                        .frame(width: geo.size.width * currentRatio, height: 6)
                }
            }
            .frame(height: 6)
        }
    }

    private var deltaFormatted: String {
        delta > 0 ? "+\(formatted(delta))" : "-\(formatted(abs(delta)))"
    }

    private func formatted(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}

// MARK: - MealPlanView

struct MealPlanView: View {
    let props: MealPlanProps
    let onSelect: (String) -> Void

    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            headerSection
            macroChipsRow
            macroBarsSection
            actionButton
        }
        .padding(16)
        .glassCard()
        .opacity(appeared ? 1 : 0)
        .scaleEffect(appeared ? 1 : 0.94)
        .offset(y: appeared ? 0 : 8)
        .onAppear {
            withAnimation(AnimationPresets.spring) {
                appeared = true
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("If you eat \(props.suggestedFood.name) for dinner…")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text("Here's how your day looks")
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)
        }
    }

    // MARK: - Macro Chips

    private var macroChipsRow: some View {
        HStack(spacing: 8) {
            macroChip(
                label: "Cal",
                value: props.projectedMacros.calories,
                color: SavoroColors.rose
            )
            macroChip(
                label: "Pro",
                value: props.projectedMacros.protein,
                color: Color(hex: "#22C55E")
            )
            macroChip(
                label: "Carb",
                value: props.projectedMacros.carb,
                color: Color(hex: "#F59E0B")
            )
            macroChip(
                label: "Fat",
                value: props.projectedMacros.fat,
                color: Color(hex: "#3B82F6")
            )
        }
    }

    private func macroChip(label: String, value: Double, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(label)
                .font(SavoroFonts.caption2)
                .foregroundStyle(SavoroColors.textSecondary)
            Text(formatMacro(value))
                .font(SavoroFonts.subheadline)
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    // MARK: - Macro Bars

    private var macroBarsSection: some View {
        VStack(spacing: 10) {
            ProjectedMacroBarView(
                label: "Calories",
                current: props.currentMacros.calories,
                projected: props.projectedMacros.calories,
                goal: props.goals.calories,
                color: SavoroColors.rose
            )
            ProjectedMacroBarView(
                label: "Protein",
                current: props.currentMacros.protein,
                projected: props.projectedMacros.protein,
                goal: props.goals.protein,
                color: Color(hex: "#22C55E")
            )
            ProjectedMacroBarView(
                label: "Carbs",
                current: props.currentMacros.carb,
                projected: props.projectedMacros.carb,
                goal: props.goals.carb,
                color: Color(hex: "#F59E0B")
            )
            ProjectedMacroBarView(
                label: "Fat",
                current: props.currentMacros.fat,
                projected: props.projectedMacros.fat,
                goal: props.goals.fat,
                color: Color(hex: "#3B82F6")
            )
        }
    }

    // MARK: - Action Button

    private var actionButton: some View {
        Button {
            onSelect(props.suggestedFood.foodId)
        } label: {
            Text("Sounds good")
                .font(SavoroFonts.callout)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(SavoroColors.rose)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    // MARK: - Helpers

    private func formatMacro(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}

// MARK: - Preview

#Preview {
    let food = FoodCardProps(
        foodId: "pasta-001",
        name: "Penne Arrabiata",
        servingId: "s1",
        servingDescription: "1 serving (300g)",
        calories: 420,
        protein: 14,
        carb: 72,
        fat: 10
    )

    let props = MealPlanProps(
        suggestedFood: food,
        currentMacros: MacroValues(calories: 1200, protein: 80, carb: 140, fat: 40),
        projectedMacros: MacroValues(calories: 1620, protein: 94, carb: 212, fat: 50),
        goals: MacroValues(calories: 2000, protein: 150, carb: 250, fat: 65)
    )

    MealPlanView(props: props, onSelect: { _ in })
        .padding()
        .background(SavoroColors.canvas)
}
