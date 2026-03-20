import SwiftUI

struct ConsistencyGridView: View {

    let consistencyMap: [String: Int]
    let isLoading: Bool

    private let columns = 16
    private let rows = 7
    private let spacing: CGFloat = 3
    private let cornerRadius: CGFloat = 3

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let todayString: String = {
        dateFormatter.string(from: Date())
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Consistency")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            if isLoading && consistencyMap.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                gridContent
            }
        }
    }

    // MARK: - Grid

    private var gridContent: some View {
        let cells = buildCells()

        return GeometryReader { geo in
            let totalSpacing = spacing * CGFloat(columns - 1)
            let cellSize = (geo.size.width - totalSpacing) / CGFloat(columns)

            LazyVGrid(
                columns: Array(repeating: GridItem(.fixed(cellSize), spacing: spacing), count: columns),
                spacing: spacing
            ) {
                ForEach(Array(cells.enumerated()), id: \.offset) { _, cell in
                    if let dateStr = cell {
                        let count = consistencyMap[dateStr] ?? 0
                        let opacity = ProfileViewModel.intensityOpacity(for: count)
                        let isToday = dateStr == Self.todayString

                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(opacity > 0
                                  ? SavoroColors.rose.opacity(opacity)
                                  : SavoroColors.Stone.s100)
                            .aspectRatio(1, contentMode: .fit)
                            .overlay(
                                isToday
                                ? RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                    .stroke(SavoroColors.rose, lineWidth: 1.5)
                                : nil
                            )
                    } else {
                        Color.clear
                            .aspectRatio(1, contentMode: .fit)
                    }
                }
            }
        }
        .frame(height: gridHeight)
    }

    private var gridHeight: CGFloat {
        // Estimate: assume ~20pt cells with spacing
        let cellEstimate: CGFloat = 18
        return (cellEstimate + spacing) * CGFloat(rows) - spacing
    }

    // MARK: - Cell Layout (column-major, Monday-aligned)

    /// Builds a flat array of optional date strings in column-major order
    /// (read top-to-bottom, then left-to-right) so LazyVGrid renders correctly
    /// since LazyVGrid fills row-major. We transpose to get column-major display.
    private func buildCells() -> [String?] {
        let calendar = Calendar.current
        let today = Date()

        // Start date is 111 days ago
        let startDate = calendar.date(byAdding: .day, value: -111, to: today)!

        // Find the weekday of startDate (Monday = 2 in Gregorian)
        let startWeekday = calendar.component(.weekday, from: startDate)
        // Convert to Monday=0 index
        let mondayIndex = (startWeekday + 5) % 7 // Sun=6, Mon=0, Tue=1, ...

        // Build date array with nil padding at the start for alignment
        var allDates: [String?] = Array(repeating: nil, count: mondayIndex)
        for i in 0..<112 {
            let date = calendar.date(byAdding: .day, value: i, to: startDate)!
            allDates.append(Self.dateFormatter.string(from: date))
        }

        // Pad end to fill complete columns
        let totalNeeded = rows * columns
        while allDates.count < totalNeeded {
            allDates.append(nil)
        }

        // allDates is column-major (each chunk of 7 = one column).
        // LazyVGrid fills row-major, so we need to transpose.
        var transposed: [String?] = Array(repeating: nil, count: totalNeeded)
        for col in 0..<columns {
            for row in 0..<rows {
                let sourceIndex = col * rows + row
                let targetIndex = row * columns + col
                if sourceIndex < allDates.count {
                    transposed[targetIndex] = allDates[sourceIndex]
                }
            }
        }

        return transposed
    }
}
