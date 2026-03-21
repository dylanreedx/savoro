import Testing
import Foundation
@testable import Savoro

@Suite("RecipeTag")
struct RecipeTagTests {

    @Test("has exactly 10 predefined cases")
    func caseCount() {
        #expect(RecipeTag.allCases.count == 10)
    }

    @Test("raw values are kebab-case")
    func rawValues() {
        let expected: [RecipeTag: String] = [
            .highProtein: "high-protein",
            .lowCarb:     "low-carb",
            .quick:       "quick",
            .vegan:       "vegan",
            .mealPrep:    "meal-prep",
            .breakfast:   "breakfast",
            .lunch:       "lunch",
            .dinner:      "dinner",
            .snack:       "snack",
            .dessert:     "dessert"
        ]
        for (tag, raw) in expected {
            #expect(tag.rawValue == raw)
        }
    }

    @Test("displayName is non-empty for all cases")
    func displayNames() {
        for tag in RecipeTag.allCases {
            #expect(!tag.displayName.isEmpty)
        }
    }

    @Test("icon is non-empty for all cases")
    func icons() {
        for tag in RecipeTag.allCases {
            #expect(!tag.icon.isEmpty)
        }
    }

    @Test("init from raw value returns correct tag")
    func initFromRawValue() {
        #expect(RecipeTag(rawValue: "high-protein") == .highProtein)
        #expect(RecipeTag(rawValue: "meal-prep") == .mealPrep)
        #expect(RecipeTag(rawValue: "unknown") == nil)
    }

    @Test("encodes to raw value string")
    func encodes() throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(RecipeTag.vegan)
        let str = String(data: data, encoding: .utf8)
        #expect(str == "\"vegan\"")
    }

    @Test("decodes from raw value string")
    func decodes() throws {
        let decoder = JSONDecoder()
        let data = "\"high-protein\"".data(using: .utf8)!
        let tag = try decoder.decode(RecipeTag.self, from: data)
        #expect(tag == .highProtein)
    }

    @Test("round-trips through Codable")
    func codableRoundTrip() throws {
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        for tag in RecipeTag.allCases {
            let data = try encoder.encode(tag)
            let decoded = try decoder.decode(RecipeTag.self, from: data)
            #expect(decoded == tag)
        }
    }

    @Test("array of tags round-trips through Codable")
    func arrayRoundTrip() throws {
        let tags: [RecipeTag] = [.breakfast, .highProtein, .vegan]
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        let data = try encoder.encode(tags)
        let decoded = try decoder.decode([RecipeTag].self, from: data)
        #expect(decoded == tags)
    }
}
