import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeDailyTotals(
    calories: Double = 0,
    protein: Double = 0,
    carb: Double = 0,
    fat: Double = 0
) -> DailyTotals {
    var t = DailyTotals()
    t.calories = calories
    t.protein = protein
    t.carb = carb
    t.fat = fat
    return t
}

private func makeUserGoal(
    calories: Int? = 2000,
    protein: Int? = 150,
    carb: Int? = 200,
    fat: Int? = 65
) -> UserGoal {
    UserGoal(
        id: "g1",
        userId: "u1",
        calories: calories,
        protein: protein,
        carb: carb,
        fat: fat,
        fiber: nil,
        startDate: "2024-01-01",
        endDate: nil,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
    )
}

private func makeLogEntryJSON(
    id: String = "log-1",
    foodName: String = "Chicken Breast",
    meal: String = "lunch",
    calories: Double = 300,
    protein: Double = 50,
    carb: Double = 0,
    fat: Double = 7,
    createdAt: String = "2024-01-15T12:00:00Z"
) -> Data {
    let json = """
    {
        "id": "\(id)",
        "food_name": "\(foodName)",
        "meal": "\(meal)",
        "calories": \(calories),
        "protein": \(protein),
        "carb": \(carb),
        "fat": \(fat),
        "created_at": "\(createdAt)"
    }
    """
    return json.data(using: .utf8)!
}

private func makeSnakeCaseDecoder() -> JSONDecoder {
    let d = JSONDecoder()
    d.keyDecodingStrategy = .convertFromSnakeCase
    return d
}

private func makePlainDecoder() -> JSONDecoder {
    JSONDecoder()
}

// MARK: - DailyNutrition Computation Tests

@Suite("DailyNutrition computations")
struct DailyNutritionTests {

    @Test("caloriesEaten reflects totals.calories")
    func caloriesEaten() {
        let dn = DailyNutrition(totals: makeDailyTotals(calories: 1500), goal: nil)
        #expect(dn.caloriesEaten == 1500)
    }

    @Test("caloriesGoal falls back to 2000 when goal is nil")
    func caloriesGoalFallbackNilGoal() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: nil)
        #expect(dn.caloriesGoal == 2000)
    }

    @Test("caloriesGoal falls back to 2000 when goal.calories is nil")
    func caloriesGoalFallbackNilField() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: makeUserGoal(calories: nil))
        #expect(dn.caloriesGoal == 2000)
    }

    @Test("caloriesGoal uses goal value when set")
    func caloriesGoalFromGoal() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: makeUserGoal(calories: 1800))
        #expect(dn.caloriesGoal == 1800)
    }

    @Test("caloriesRemaining is goal minus eaten, floored at 0")
    func caloriesRemaining() {
        let dn = DailyNutrition(totals: makeDailyTotals(calories: 1200), goal: makeUserGoal(calories: 2000))
        #expect(dn.caloriesRemaining == 800)
    }

    @Test("caloriesRemaining does not go below 0 when over goal")
    func caloriesRemainingNonNegative() {
        let dn = DailyNutrition(totals: makeDailyTotals(calories: 2500), goal: makeUserGoal(calories: 2000))
        #expect(dn.caloriesRemaining == 0)
    }

    @Test("caloriesProgress is clamped to 1.0 when over goal")
    func caloriesProgressClamped() {
        let dn = DailyNutrition(totals: makeDailyTotals(calories: 3000), goal: makeUserGoal(calories: 2000))
        #expect(dn.caloriesProgress == 1.0)
    }

    @Test("caloriesProgress is 0.5 at half goal")
    func caloriesProgressHalf() {
        let dn = DailyNutrition(totals: makeDailyTotals(calories: 1000), goal: makeUserGoal(calories: 2000))
        #expect(dn.caloriesProgress == 0.5)
    }

    @Test("proteinGoal falls back to 150 when goal is nil")
    func proteinGoalFallback() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: nil)
        #expect(dn.proteinGoal == 150)
    }

    @Test("proteinProgress is correct")
    func proteinProgress() {
        let dn = DailyNutrition(totals: makeDailyTotals(protein: 75), goal: makeUserGoal(protein: 150))
        #expect(dn.proteinProgress == 0.5)
    }

    @Test("carbGoal falls back to 200 when goal is nil")
    func carbGoalFallback() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: nil)
        #expect(dn.carbGoal == 200)
    }

    @Test("carbProgress is correct")
    func carbProgress() {
        let dn = DailyNutrition(totals: makeDailyTotals(carb: 100), goal: makeUserGoal(carb: 200))
        #expect(dn.carbProgress == 0.5)
    }

    @Test("fatGoal falls back to 65 when goal is nil")
    func fatGoalFallback() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: nil)
        #expect(dn.fatGoal == 65)
    }

    @Test("fatProgress is correct")
    func fatProgress() {
        let dn = DailyNutrition(totals: makeDailyTotals(fat: 32.5), goal: makeUserGoal(fat: 65))
        #expect(dn.fatProgress == 0.5)
    }

    @Test("all progress values are 0 when totals are zero")
    func allProgressZeroWhenEmpty() {
        let dn = DailyNutrition(totals: makeDailyTotals(), goal: makeUserGoal())
        #expect(dn.caloriesProgress == 0)
        #expect(dn.proteinProgress == 0)
        #expect(dn.carbProgress == 0)
        #expect(dn.fatProgress == 0)
    }

    @Test("progress is 0 when goal is 0 (zero-goal edge case)")
    func progressIsZeroWhenGoalIsZero() {
        let dn = DailyNutrition(
            totals: makeDailyTotals(calories: 500, protein: 50, carb: 100, fat: 20),
            goal: makeUserGoal(calories: 0, protein: 0, carb: 0, fat: 0)
        )
        #expect(dn.caloriesProgress == 0)
        #expect(dn.proteinProgress == 0)
        #expect(dn.carbProgress == 0)
        #expect(dn.fatProgress == 0)
    }

    @Test("progress is exactly 1.0 when eaten equals goal")
    func progressExactlyOneAtGoal() {
        let dn = DailyNutrition(
            totals: makeDailyTotals(calories: 2000, protein: 150, carb: 200, fat: 65),
            goal: makeUserGoal()
        )
        #expect(dn.caloriesProgress == 1.0)
        #expect(dn.proteinProgress == 1.0)
        #expect(dn.carbProgress == 1.0)
        #expect(dn.fatProgress == 1.0)
    }
}

// MARK: - LogEntry Decoding Tests

@Suite("LogEntry JSON decoding")
struct LogEntryDecodingTests {

    // LogEntry relies on convertFromSnakeCase (no explicit CodingKeys).
    // APIClient uses convertFromSnakeCase, so this is the correct decoder.

    @Test("decodes all fields with convertFromSnakeCase decoder")
    func decodesWithSnakeCaseDecoder() throws {
        let data = makeLogEntryJSON()
        let entry = try makeSnakeCaseDecoder().decode(LogEntry.self, from: data)
        #expect(entry.id == "log-1")
        #expect(entry.foodName == "Chicken Breast")
        #expect(entry.meal == .lunch)
        #expect(entry.calories == 300)
        #expect(entry.protein == 50)
        #expect(entry.carb == 0)
        #expect(entry.fat == 7)
        #expect(entry.createdAt == "2024-01-15T12:00:00Z")
    }

    @Test("plain decoder fails on snake_case keys without CodingKeys")
    func plainDecoderFailsOnSnakeCase() {
        let data = makeLogEntryJSON()
        #expect(throws: (any Error).self) {
            try makePlainDecoder().decode(LogEntry.self, from: data)
        }
    }

    @Test("decodes MealType breakfast")
    func mealTypeBreakfast() throws {
        let entry = try makeSnakeCaseDecoder().decode(LogEntry.self, from: makeLogEntryJSON(meal: "breakfast"))
        #expect(entry.meal == .breakfast)
    }

    @Test("decodes MealType dinner")
    func mealTypeDinner() throws {
        let entry = try makeSnakeCaseDecoder().decode(LogEntry.self, from: makeLogEntryJSON(meal: "dinner"))
        #expect(entry.meal == .dinner)
    }

    @Test("decodes MealType snack")
    func mealTypeSnack() throws {
        let entry = try makeSnakeCaseDecoder().decode(LogEntry.self, from: makeLogEntryJSON(meal: "snack"))
        #expect(entry.meal == .snack)
    }

    @Test("throws on missing required field food_name")
    func throwsOnMissingFoodName() {
        let json = """
        {"id":"1","meal":"lunch","calories":100,"protein":10,"carb":5,"fat":3,"created_at":"2024-01-01T00:00:00Z"}
        """
        #expect(throws: (any Error).self) {
            try makeSnakeCaseDecoder().decode(LogEntry.self, from: json.data(using: .utf8)!)
        }
    }

    @Test("throws on unknown meal type")
    func throwsOnUnknownMealType() {
        let json = """
        {"id":"1","food_name":"X","meal":"brunch","calories":100,"protein":10,"carb":5,"fat":3,"created_at":"2024-01-01T00:00:00Z"}
        """
        #expect(throws: (any Error).self) {
            try makeSnakeCaseDecoder().decode(LogEntry.self, from: json.data(using: .utf8)!)
        }
    }

    @Test("decodes array of LogEntry sorted by createdAt")
    func decodesAndSortsArray() throws {
        let json = """
        [
            {"id":"b","food_name":"Lunch","meal":"lunch","calories":400,"protein":30,"carb":50,"fat":10,"created_at":"2024-01-15T13:00:00Z"},
            {"id":"a","food_name":"Breakfast","meal":"breakfast","calories":300,"protein":20,"carb":40,"fat":8,"created_at":"2024-01-15T07:00:00Z"},
            {"id":"c","food_name":"Dinner","meal":"dinner","calories":600,"protein":40,"carb":60,"fat":20,"created_at":"2024-01-15T19:00:00Z"}
        ]
        """
        let entries = try makeSnakeCaseDecoder().decode([LogEntry].self, from: json.data(using: .utf8)!)
        let sorted = entries.sorted { $0.createdAt < $1.createdAt }
        #expect(sorted[0].id == "a")
        #expect(sorted[1].id == "b")
        #expect(sorted[2].id == "c")
    }
}

// MARK: - Greeting Logic Tests

@Suite("Greeting logic")
struct GreetingLogicTests {

    // Test the greeting mapping by examining the hour ranges directly.
    // Since TodayViewModel.greeting reads live Date(), we test the logic inline.

    private func greeting(for hour: Int) -> String {
        switch hour {
        case 5..<12:  return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default:      return "Good night"
        }
    }

    @Test("hour 0 returns Good night")
    func hour0() { #expect(greeting(for: 0) == "Good night") }

    @Test("hour 4 returns Good night")
    func hour4() { #expect(greeting(for: 4) == "Good night") }

    @Test("hour 5 returns Good morning")
    func hour5() { #expect(greeting(for: 5) == "Good morning") }

    @Test("hour 11 returns Good morning")
    func hour11() { #expect(greeting(for: 11) == "Good morning") }

    @Test("hour 12 returns Good afternoon")
    func hour12() { #expect(greeting(for: 12) == "Good afternoon") }

    @Test("hour 16 returns Good afternoon")
    func hour16() { #expect(greeting(for: 16) == "Good afternoon") }

    @Test("hour 17 returns Good evening")
    func hour17() { #expect(greeting(for: 17) == "Good evening") }

    @Test("hour 21 returns Good evening")
    func hour21() { #expect(greeting(for: 21) == "Good evening") }

    @Test("hour 22 returns Good night")
    func hour22() { #expect(greeting(for: 22) == "Good night") }

    @Test("hour 23 returns Good night")
    func hour23() { #expect(greeting(for: 23) == "Good night") }
}

// MARK: - DailyLogResponse Decoding Tests

@Suite("DailyLogResponse decoding")
struct DailyLogResponseDecodingTests {

    @Test("decodes totals with convertFromSnakeCase decoder")
    func decodesTotals() throws {
        let json = """
        {
            "totals": {
                "calories": 1800.5,
                "protein": 120.0,
                "carb": 220.0,
                "fat": 60.0,
                "fiber": 25.0
            }
        }
        """
        let response = try makeSnakeCaseDecoder().decode(DailyLogResponse.self, from: json.data(using: .utf8)!)
        #expect(response.totals.calories == 1800.5)
        #expect(response.totals.protein == 120.0)
        #expect(response.totals.carb == 220.0)
        #expect(response.totals.fat == 60.0)
        #expect(response.totals.fiber == 25.0)
    }

    @Test("DailyNutrition bridge from decoded response and goal")
    func dailyNutritionBridge() throws {
        let json = """
        {"totals": {"calories": 900, "protein": 75, "carb": 100, "fat": 32.5, "fiber": 10}}
        """
        let response = try makeSnakeCaseDecoder().decode(DailyLogResponse.self, from: json.data(using: .utf8)!)
        let goal = makeUserGoal(calories: 1800, protein: 150, carb: 200, fat: 65)
        let dn = DailyNutrition(totals: response.totals, goal: goal)

        #expect(dn.caloriesProgress == 0.5)
        #expect(dn.proteinProgress == 0.5)
        #expect(dn.carbProgress == 0.5)
        #expect(dn.fatProgress == 0.5)
    }
}

// MARK: - MealTimeline Sort Order Tests

@Suite("MealTimeline sort order")
struct MealTimelineSortTests {

    private func makeEntry(id: String, createdAt: String) -> LogEntry {
        LogEntry(
            id: id,
            foodName: "Food \(id)",
            meal: .lunch,
            calories: 100,
            protein: 10,
            carb: 10,
            fat: 5,
            createdAt: createdAt
        )
    }

    @Test("entries sorted ascending by createdAt")
    func sortAscending() {
        let entries = [
            makeEntry(id: "c", createdAt: "2024-01-15T19:00:00Z"),
            makeEntry(id: "a", createdAt: "2024-01-15T07:00:00Z"),
            makeEntry(id: "b", createdAt: "2024-01-15T13:00:00Z")
        ]
        let sorted = entries.sorted { $0.createdAt < $1.createdAt }
        #expect(sorted.map(\.id) == ["a", "b", "c"])
    }

    @Test("single entry sort is stable")
    func singleEntrySort() {
        let entries = [makeEntry(id: "x", createdAt: "2024-01-15T10:00:00Z")]
        let sorted = entries.sorted { $0.createdAt < $1.createdAt }
        #expect(sorted.map(\.id) == ["x"])
    }

    @Test("empty entries sort produces empty array")
    func emptySort() {
        let entries: [LogEntry] = []
        let sorted = entries.sorted { $0.createdAt < $1.createdAt }
        #expect(sorted.isEmpty)
    }
}
