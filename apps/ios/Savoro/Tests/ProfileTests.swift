import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeUserGoal(
    calories: Int? = 2000,
    protein: Int? = 150,
    carb: Int? = 200,
    fat: Int? = 65,
    createdAt: String = "2024-03-15T10:00:00Z"
) -> UserGoal {
    UserGoal(
        id: "g1",
        userId: "u1",
        calories: calories,
        protein: protein,
        carb: carb,
        fat: fat,
        fiber: nil,
        startDate: "2024-03-15",
        endDate: nil,
        createdAt: createdAt,
        updatedAt: createdAt
    )
}

// MARK: - intensityOpacity Tests

@Suite("ProfileViewModel.intensityOpacity")
struct IntensityOpacityTests {

    @Test("count 0 returns 0.0")
    func count0() {
        #expect(ProfileViewModel.intensityOpacity(for: 0) == 0.0)
    }

    @Test("count 1 returns 0.15")
    func count1() {
        #expect(ProfileViewModel.intensityOpacity(for: 1) == 0.15)
    }

    @Test("count 2 returns 0.15")
    func count2() {
        #expect(ProfileViewModel.intensityOpacity(for: 2) == 0.15)
    }

    @Test("count 3 returns 0.40")
    func count3() {
        #expect(ProfileViewModel.intensityOpacity(for: 3) == 0.40)
    }

    @Test("count 5 returns 0.40")
    func count5() {
        #expect(ProfileViewModel.intensityOpacity(for: 5) == 0.40)
    }

    @Test("count 6 returns 1.0")
    func count6() {
        #expect(ProfileViewModel.intensityOpacity(for: 6) == 1.0)
    }

    @Test("count 100 returns 1.0")
    func count100() {
        #expect(ProfileViewModel.intensityOpacity(for: 100) == 1.0)
    }

    @Test("boundary between tier1 and tier2 — count 2 is tier1, count 3 is tier2")
    func boundaryTier1Tier2() {
        #expect(ProfileViewModel.intensityOpacity(for: 2) == 0.15)
        #expect(ProfileViewModel.intensityOpacity(for: 3) == 0.40)
    }

    @Test("boundary between tier2 and full — count 5 is tier2, count 6 is full")
    func boundaryTier2Full() {
        #expect(ProfileViewModel.intensityOpacity(for: 5) == 0.40)
        #expect(ProfileViewModel.intensityOpacity(for: 6) == 1.0)
    }
}

// MARK: - GoalDraft Encoding Tests

@Suite("GoalDraft encoding")
struct GoalDraftEncodingTests {

    private func encode(_ draft: GoalDraft) throws -> [String: Any] {
        let data = try JSONEncoder().encode(draft)
        let obj = try JSONSerialization.jsonObject(with: data)
        return obj as! [String: Any]
    }

    @Test("encodes all four macro fields")
    func encodesAllFields() throws {
        let draft = GoalDraft(calories: 2000, protein: 150, carb: 200, fat: 65)
        let json = try encode(draft)
        #expect(json["calories"] as? Int == 2000)
        #expect(json["protein"] as? Int == 150)
        #expect(json["carb"] as? Int == 200)
        #expect(json["fat"] as? Int == 65)
    }

    @Test("encodes zero values")
    func encodesZeroValues() throws {
        let draft = GoalDraft(calories: 0, protein: 0, carb: 0, fat: 0)
        let json = try encode(draft)
        #expect(json["calories"] as? Int == 0)
        #expect(json["protein"] as? Int == 0)
        #expect(json["carb"] as? Int == 0)
        #expect(json["fat"] as? Int == 0)
    }

    @Test("encodes large values without overflow")
    func encodesLargeValues() throws {
        let draft = GoalDraft(calories: 9999, protein: 999, carb: 999, fat: 999)
        let json = try encode(draft)
        #expect(json["calories"] as? Int == 9999)
    }

    @Test("uses camelCase keys (carb not carbohydrates)")
    func usesCamelCaseKeys() throws {
        let draft = GoalDraft(calories: 2000, protein: 150, carb: 200, fat: 65)
        let data = try JSONEncoder().encode(draft)
        let str = String(data: data, encoding: .utf8)!
        #expect(str.contains("\"carb\""))
        #expect(str.contains("\"calories\""))
        #expect(str.contains("\"protein\""))
        #expect(str.contains("\"fat\""))
    }

    @Test("produces exactly four keys")
    func exactlyFourKeys() throws {
        let draft = GoalDraft(calories: 2000, protein: 150, carb: 200, fat: 65)
        let json = try encode(draft)
        #expect(json.count == 4)
    }
}

// MARK: - ProfileViewModel Edit Field Sync Tests

@Suite("ProfileViewModel edit field sync")
struct ProfileViewModelEditSyncTests {

    @MainActor
    private func makeVM() -> ProfileViewModel {
        ProfileViewModel()
    }

    @Test("startEditing syncs fields from goal with all values set")
    @MainActor func startEditingSyncsAllFields() {
        let vm = makeVM()
        vm.goal = makeUserGoal(calories: 1800, protein: 120, carb: 180, fat: 55)
        vm.startEditing()
        #expect(vm.editCalories == "1800")
        #expect(vm.editProtein == "120")
        #expect(vm.editCarb == "180")
        #expect(vm.editFat == "55")
    }

    @Test("syncEditFields falls back to defaults when goal fields are nil")
    @MainActor func syncEditFieldsNilFallbacks() {
        let vm = makeVM()
        vm.goal = makeUserGoal(calories: nil, protein: nil, carb: nil, fat: nil)
        vm.startEditing()
        #expect(vm.editCalories == "2000")
        #expect(vm.editProtein == "150")
        #expect(vm.editCarb == "200")
        #expect(vm.editFat == "65")
    }

    @Test("cancelEditing restores fields from goal")
    @MainActor func cancelEditingRestoresFields() {
        let vm = makeVM()
        vm.goal = makeUserGoal(calories: 2200, protein: 160, carb: 240, fat: 70)
        vm.startEditing()
        vm.editCalories = "9999"
        vm.editProtein = "9999"
        vm.cancelEditing()
        #expect(vm.editCalories == "2200")
        #expect(vm.editProtein == "160")
        #expect(vm.isEditing == false)
    }

    @Test("startEditing sets isEditing to true")
    @MainActor func startEditingFlipsFlag() {
        let vm = makeVM()
        vm.goal = makeUserGoal()
        vm.startEditing()
        #expect(vm.isEditing == true)
    }

    @Test("cancelEditing sets isEditing to false")
    @MainActor func cancelEditingFlipsFlag() {
        let vm = makeVM()
        vm.goal = makeUserGoal()
        vm.startEditing()
        vm.cancelEditing()
        #expect(vm.isEditing == false)
    }

    @Test("startEditing with nil goal still sets isEditing true")
    @MainActor func startEditingNilGoal() {
        let vm = makeVM()
        vm.goal = nil
        vm.startEditing()
        #expect(vm.isEditing == true)
    }
}

// MARK: - Member-Since Date Formatting Tests

@Suite("Member-since date formatting")
struct MemberSinceDateFormattingTests {

    // Mirror the formatting logic used in ProfileView (ISO8601 createdAt → display string)
    private func memberSince(from createdAt: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFormatter.date(from: createdAt) {
            let df = DateFormatter()
            df.dateFormat = "MMMM yyyy"
            df.locale = Locale(identifier: "en_US_POSIX")
            return df.string(from: date)
        }
        // Fallback: try without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: createdAt) {
            let df = DateFormatter()
            df.dateFormat = "MMMM yyyy"
            df.locale = Locale(identifier: "en_US_POSIX")
            return df.string(from: date)
        }
        return createdAt
    }

    @Test("formats January 2024")
    func formatsJanuary2024() {
        let result = memberSince(from: "2024-01-15T10:00:00Z")
        #expect(result == "January 2024")
    }

    @Test("formats March 2025")
    func formatsMarch2025() {
        let result = memberSince(from: "2025-03-01T00:00:00Z")
        #expect(result == "March 2025")
    }

    @Test("formats December 2023")
    func formatsDecember2023() {
        let result = memberSince(from: "2023-12-31T23:59:59Z")
        #expect(result == "December 2023")
    }

    @Test("passes through unparse-able string unchanged")
    func passthroughInvalidString() {
        let result = memberSince(from: "not-a-date")
        #expect(result == "not-a-date")
    }
}

// MARK: - ConsistencyGrid buildCells Logic Tests

@Suite("ConsistencyGrid buildCells logic")
struct ConsistencyGridBuildCellsTests {

    // Replicate buildCells logic inline so it is testable without SwiftUI.
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private func buildCells(today: Date = Date(), rows: Int = 7, columns: Int = 16) -> [String?] {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -111, to: today)!
        let startWeekday = calendar.component(.weekday, from: startDate)
        let mondayIndex = (startWeekday + 5) % 7

        var allDates: [String?] = Array(repeating: nil, count: mondayIndex)
        for i in 0..<112 {
            let date = calendar.date(byAdding: .day, value: i, to: startDate)!
            allDates.append(Self.dateFormatter.string(from: date))
        }

        let totalNeeded = rows * columns
        while allDates.count < totalNeeded {
            allDates.append(nil)
        }

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

    @Test("output count is exactly rows × columns")
    func outputCountIsRowsTimesColumns() {
        let cells = buildCells()
        #expect(cells.count == 7 * 16)
    }

    @Test("contains exactly 112 non-nil date strings")
    func contains112Dates() {
        let cells = buildCells()
        let nonNilCount = cells.compactMap { $0 }.count
        #expect(nonNilCount == 112)
    }

    @Test("startDate is 111 days before today")
    func startDateIs111DaysAgo() {
        let today = Date()
        let calendar = Calendar.current
        let expected = calendar.date(byAdding: .day, value: -111, to: today)!
        let expectedStr = DateFormatter().apply {
            $0.dateFormat = "yyyy-MM-dd"
            $0.locale = Locale(identifier: "en_US_POSIX")
        }.string(from: expected)
        let cells = buildCells(today: today)
        let nonNilCells = cells.compactMap { $0 }
        #expect(nonNilCells.first == expectedStr)
    }

    @Test("last non-nil date is today")
    func lastNonNilDateIsToday() {
        let today = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        let todayStr = formatter.string(from: today)
        let cells = buildCells(today: today)
        let nonNilCells = cells.compactMap { $0 }
        #expect(nonNilCells.last == todayStr)
    }

    @Test("Monday-aligned start: nil padding count is 0 when startDate is Monday")
    func mondayStartNoPadding() {
        // Find a known Monday: 2024-01-01 (Monday)
        let cal = Calendar.current
        var comps = DateComponents()
        comps.year = 2024
        comps.month = 1
        comps.day = 1
        let monday = cal.date(from: comps)! // 2024-01-01 is a Monday
        // today = monday + 111 days so startDate == monday
        let today = cal.date(byAdding: .day, value: 111, to: monday)!
        let cells = buildCells(today: today)
        // The first cell should be a date string (no nil prefix)
        #expect(cells[0] != nil)
    }

    @Test("Monday-aligned start: nil padding count is 1 when startDate is Tuesday")
    func tuesdayStartOnePadding() {
        // 2024-01-02 is a Tuesday
        let cal = Calendar.current
        var comps = DateComponents()
        comps.year = 2024
        comps.month = 1
        comps.day = 2
        let tuesday = cal.date(from: comps)!
        let today = cal.date(byAdding: .day, value: 111, to: tuesday)!
        let cells = buildCells(today: today)
        // First cell (row 0, col 0) should be nil (Monday slot before Tuesday)
        #expect(cells[0] == nil)
        // Second cell (row 1, col 0) should be the Tuesday date
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        #expect(cells[1] == formatter.string(from: tuesday))
    }

    @Test("mondayIndex formula: Sunday maps to 6")
    func sundayMapsTo6() {
        // Sunday = weekday 1 in Gregorian => (1 + 5) % 7 = 6
        let mondayIndex = (1 + 5) % 7
        #expect(mondayIndex == 6)
    }

    @Test("mondayIndex formula: Monday maps to 0")
    func mondayMapsTo0() {
        // Monday = weekday 2 in Gregorian => (2 + 5) % 7 = 0
        let mondayIndex = (2 + 5) % 7
        #expect(mondayIndex == 0)
    }

    @Test("mondayIndex formula: Saturday maps to 5")
    func saturdayMapsTo5() {
        // Saturday = weekday 7 in Gregorian => (7 + 5) % 7 = 5
        let mondayIndex = (7 + 5) % 7
        #expect(mondayIndex == 5)
    }

    @Test("dates are in chronological order in the non-nil sequence")
    func datesAreChronological() {
        let cells = buildCells()
        let nonNilCells = cells.compactMap { $0 }
        for i in 1..<nonNilCells.count {
            #expect(nonNilCells[i] > nonNilCells[i - 1])
        }
    }
}

// MARK: - DateFormatter extension used in tests

private extension DateFormatter {
    @discardableResult
    func apply(_ configure: (DateFormatter) -> Void) -> DateFormatter {
        configure(self)
        return self
    }
}
