import SwiftUI
import Charts

struct WeeklyTrendsView: View {

    let calories: [Double]
    let protein: [Double]
    let carb: [Double]
    let fat: [Double]
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weekly Trends")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            if isLoading && calories.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else if calories.isEmpty {
                Text("No data yet")
                    .font(SavoroFonts.footnote)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 16) {
                    sparkline(data: protein, label: "Protein", color: SavoroColors.Macro.protein)
                    sparkline(data: carb, label: "Carbs", color: SavoroColors.Macro.carb)
                    sparkline(data: fat, label: "Fat", color: SavoroColors.Macro.fat)
                }
            }
        }
    }

    // MARK: - Sparkline

    @ViewBuilder
    private func sparkline(data: [Double], label: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(SavoroFonts.caption)
                    .foregroundStyle(SavoroColors.textSecondary)

                Spacer()

                if let last = data.last {
                    Text("\(Int(last))g")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(color)
                }
            }

            Chart {
                ForEach(Array(data.enumerated()), id: \.offset) { index, value in
                    AreaMark(
                        x: .value("Day", index),
                        y: .value("Amount", value)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [color.opacity(0.3), color.opacity(0.05)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Day", index),
                        y: .value("Amount", value)
                    )
                    .foregroundStyle(color)
                    .interpolationMethod(.catmullRom)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
            .frame(height: 40)
        }
    }
}
