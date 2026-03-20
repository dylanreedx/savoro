import SwiftUI

struct MealTimelineView: View {
    let entries: [LogEntry]

    var body: some View {
        if entries.isEmpty {
            emptyState
        } else {
            VStack(spacing: 12) {
                ForEach(entries) { entry in
                    MealTimelineCard(entry: entry)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Text("No meals logged yet")
                .font(SavoroFonts.callout)
                .foregroundStyle(SavoroColors.textSecondary)
            Text("Start tracking to see your meals here")
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.Stone.s400)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    }
}

// MARK: - Timeline Card

private struct MealTimelineCard: View {
    let entry: LogEntry

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private var timeLabel: String {
        // Try ISO8601 with fractional seconds first, then without
        let raw = entry.createdAt
        if let date = ISO8601DateFormatter().date(from: raw) {
            return Self.displayFormatter.string(from: date)
        }
        if let date = Self.timeFormatter.date(from: raw) {
            return Self.displayFormatter.string(from: date)
        }
        return ""
    }

    var body: some View {
        HStack(spacing: 14) {
            // Time + meal badge
            VStack(alignment: .leading, spacing: 4) {
                Text(timeLabel)
                    .font(SavoroFonts.caption)
                    .foregroundStyle(SavoroColors.textSecondary)
                Text(entry.meal.rawValue.capitalized)
                    .font(SavoroFonts.caption2)
                    .foregroundStyle(SavoroColors.Stone.s400)
            }
            .frame(width: 70, alignment: .leading)

            // Divider line
            Rectangle()
                .fill(SavoroColors.Stone.s200)
                .frame(width: 1)
                .frame(maxHeight: .infinity)

            // Meal info
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.foodName)
                    .font(SavoroFonts.subheadline)
                    .foregroundStyle(SavoroColors.textPrimary)
                    .lineLimit(1)

                HStack {
                    MacroLineView(
                        protein: entry.protein,
                        carb: entry.carb,
                        fat: entry.fat
                    )

                    Spacer()

                    Text("\(Int(entry.calories)) cal")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.Macro.calories)
                }
            }
        }
        .padding(14)
        .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusSm, variant: .subtle)
    }
}

#Preview {
    MealTimelineView(entries: [
        LogEntry(
            id: "1",
            foodName: "Greek Yogurt with Granola",
            meal: .breakfast,
            calories: 320,
            protein: 24,
            carb: 38,
            fat: 8,
            createdAt: "2026-03-20T08:30:00"
        ),
        LogEntry(
            id: "2",
            foodName: "Grilled Chicken Salad",
            meal: .lunch,
            calories: 480,
            protein: 42,
            carb: 22,
            fat: 18,
            createdAt: "2026-03-20T12:15:00"
        ),
    ])
    .padding()
    .background(SavoroColors.canvas)
}
