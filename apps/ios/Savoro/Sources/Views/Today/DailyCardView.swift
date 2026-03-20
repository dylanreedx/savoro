import SwiftUI

struct DailyCardView: View {
    let nutrition: DailyNutrition

    var body: some View {
        VStack(spacing: 20) {
            // Calories ring + center text
            ZStack {
                // Background ring
                Circle()
                    .stroke(SavoroColors.Stone.s200, lineWidth: 10)
                    .frame(width: 140, height: 140)

                // Progress ring
                Circle()
                    .trim(from: 0, to: nutrition.caloriesProgress)
                    .stroke(
                        SavoroColors.Macro.calories,
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .frame(width: 140, height: 140)
                    .rotationEffect(.degrees(-90))
                    .animation(AnimationPresets.spring, value: nutrition.caloriesProgress)

                // Center text
                VStack(spacing: 2) {
                    Text("\(Int(nutrition.caloriesRemaining))")
                        .font(SavoroFonts.title2)
                        .foregroundStyle(SavoroColors.textPrimary)
                    Text("remaining")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.textSecondary)
                }
            }

            // Macro bars
            HStack(spacing: 16) {
                MacroBarView(
                    label: "Protein",
                    current: nutrition.proteinEaten,
                    goal: nutrition.proteinGoal,
                    color: SavoroColors.Macro.protein,
                    unit: "g"
                )
                MacroBarView(
                    label: "Carbs",
                    current: nutrition.carbEaten,
                    goal: nutrition.carbGoal,
                    color: SavoroColors.Macro.carb,
                    unit: "g"
                )
                MacroBarView(
                    label: "Fat",
                    current: nutrition.fatEaten,
                    goal: nutrition.fatGoal,
                    color: SavoroColors.Macro.fat,
                    unit: "g"
                )
            }
        }
        .padding(24)
        .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusLg)
    }
}

// MARK: - Macro Bar

private struct MacroBarView: View {
    let label: String
    let current: Double
    let goal: Double
    let color: Color
    let unit: String

    private var progress: Double {
        guard goal > 0 else { return 0 }
        return min(current / goal, 1.0)
    }

    var body: some View {
        VStack(spacing: 6) {
            Text(label)
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(color.opacity(0.15))
                    Capsule()
                        .fill(color)
                        .frame(width: geo.size.width * progress)
                        .animation(AnimationPresets.spring, value: progress)
                }
            }
            .frame(height: 6)

            Text("\(Int(current))/\(Int(goal))\(unit)")
                .font(SavoroFonts.caption2)
                .foregroundStyle(SavoroColors.textSecondary)
        }
    }
}

#Preview {
    DailyCardView(
        nutrition: DailyNutrition(
            totals: DailyTotals(
                calories: 1450,
                protein: 95,
                carb: 160,
                fat: 42,
                fiber: 18
            ),
            goal: nil
        )
    )
    .padding()
    .background(SavoroColors.canvas)
}
