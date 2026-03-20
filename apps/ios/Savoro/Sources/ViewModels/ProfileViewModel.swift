import Foundation
import Observation

@MainActor
@Observable
final class ProfileViewModel {

    // MARK: State

    var goal: UserGoal?
    var isEditing = false
    var isLoadingGoal = false
    var isSavingGoal = false
    var error: String?

    // Editable goal fields
    var editCalories = ""
    var editProtein = ""
    var editCarb = ""
    var editFat = ""

    // Consistency grid: date string (yyyy-MM-dd) → entry count
    var consistencyMap: [String: Int] = [:]
    var isLoadingConsistency = false

    // Weekly trends: 7-point arrays per macro
    var weeklyCalories: [Double] = []
    var weeklyProtein: [Double] = []
    var weeklyCarb: [Double] = []
    var weeklyFat: [Double] = []
    var isLoadingTrends = false

    // MARK: Dependencies

    private let goalService = GoalService()
    private let logService = LogService()

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    // MARK: Load All

    func loadAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchGoal() }
            group.addTask { await self.fetchConsistencyData() }
            group.addTask { await self.fetchWeeklyTrends() }
        }
    }

    // MARK: Goal

    func fetchGoal() async {
        isLoadingGoal = true
        do {
            let fetched = try await goalService.fetchCurrent()
            goal = fetched
            syncEditFields(from: fetched)
        } catch {
            // Goal might not exist yet — that's okay
            goal = nil
        }
        isLoadingGoal = false
    }

    func startEditing() {
        if let goal {
            syncEditFields(from: goal)
        }
        isEditing = true
    }

    func cancelEditing() {
        isEditing = false
        if let goal {
            syncEditFields(from: goal)
        }
    }

    func saveGoal() async {
        isSavingGoal = true
        error = nil

        let draft = GoalDraft(
            calories: Int(editCalories) ?? 2000,
            protein: Int(editProtein) ?? 150,
            carb: Int(editCarb) ?? 200,
            fat: Int(editFat) ?? 65
        )

        do {
            let saved = try await goalService.saveGoal(draft)
            goal = saved
            isEditing = false
        } catch {
            self.error = "Failed to save goals."
        }

        isSavingGoal = false
    }

    // MARK: Consistency Grid

    func fetchConsistencyData() async {
        isLoadingConsistency = true

        let calendar = Calendar.current
        let today = Date()
        let startDate = calendar.date(byAdding: .day, value: -111, to: today)!

        // Generate all 112 date strings
        var dates: [String] = []
        for i in 0..<112 {
            let date = calendar.date(byAdding: .day, value: i, to: startDate)!
            dates.append(Self.dateFormatter.string(from: date))
        }

        // Fetch entry counts concurrently with bounded concurrency
        var map: [String: Int] = [:]

        await withTaskGroup(of: (String, Int).self) { group in
            for dateStr in dates {
                group.addTask {
                    do {
                        let entries = try await self.logService.fetchEntries(date: dateStr)
                        return (dateStr, entries.count)
                    } catch {
                        return (dateStr, 0)
                    }
                }
            }

            for await (dateStr, count) in group {
                map[dateStr] = count
            }
        }

        consistencyMap = map
        isLoadingConsistency = false
    }

    // MARK: Weekly Trends

    func fetchWeeklyTrends() async {
        isLoadingTrends = true

        let calendar = Calendar.current
        let today = Date()

        var cals: [Double] = []
        var pros: [Double] = []
        var carbs: [Double] = []
        var fats: [Double] = []

        // Pre-compute date strings on the main actor
        var dateStrings: [String] = []
        for i in 0..<7 {
            let offset = -(6 - i)
            let date = calendar.date(byAdding: .day, value: offset, to: today)!
            dateStrings.append(Self.dateFormatter.string(from: date))
        }

        // Fetch 7 most recent days in parallel
        await withTaskGroup(of: (Int, DailyTotals?).self) { group in
            for i in 0..<7 {
                let dateStr = dateStrings[i]
                group.addTask {
                    do {
                        let response = try await self.logService.fetchDailyTotals(date: dateStr)
                        return (i, response.totals)
                    } catch {
                        return (i, nil)
                    }
                }
            }

            // Collect into ordered array
            var results: [(Int, DailyTotals?)] = []
            for await result in group {
                results.append(result)
            }
            results.sort { $0.0 < $1.0 }

            for (_, totals) in results {
                cals.append(totals?.calories ?? 0)
                pros.append(totals?.protein ?? 0)
                carbs.append(totals?.carb ?? 0)
                fats.append(totals?.fat ?? 0)
            }
        }

        weeklyCalories = cals
        weeklyProtein = pros
        weeklyCarb = carbs
        weeklyFat = fats
        isLoadingTrends = false
    }

    // MARK: Helpers

    /// Intensity level for the consistency grid.
    static func intensityOpacity(for count: Int) -> Double {
        switch count {
        case 0:     return 0.0
        case 1...2: return 0.15
        case 3...5: return 0.40
        default:    return 1.0
        }
    }

    private func syncEditFields(from goal: UserGoal) {
        editCalories = "\(goal.calories ?? 2000)"
        editProtein = "\(goal.protein ?? 150)"
        editCarb = "\(goal.carb ?? 200)"
        editFat = "\(goal.fat ?? 65)"
    }
}
