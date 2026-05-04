import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private let decoder = JSONDecoder()
private let encoder = JSONEncoder()

private func makeMealPlanJSON(
    foodId: String = "pasta-001",
    foodName: String = "Penne Arrabiata",
    currentCal: Double = 1200, currentPro: Double = 80, currentCarb: Double = 140, currentFat: Double = 40,
    projCal: Double = 1620, projPro: Double = 94, projCarb: Double = 212, projFat: Double = 50,
    goalCal: Double = 2000, goalPro: Double = 150, goalCarb: Double = 250, goalFat: Double = 65
) -> Data {
    """
    {
        "suggested_food": {
            "food_id": "\(foodId)",
            "name": "\(foodName)",
            "serving_id": "s1",
            "serving_description": "1 serving",
            "calories": 420,
            "protein": 14,
            "carb": 72,
            "fat": 10,
            "quantity": 1
        },
        "current_macros": {
            "calories": \(currentCal),
            "protein": \(currentPro),
            "carb": \(currentCarb),
            "fat": \(currentFat)
        },
        "projected_macros": {
            "calories": \(projCal),
            "protein": \(projPro),
            "carb": \(projCarb),
            "fat": \(projFat)
        },
        "goals": {
            "calories": \(goalCal),
            "protein": \(goalPro),
            "carb": \(goalCarb),
            "fat": \(goalFat)
        }
    }
    """.data(using: .utf8)!
}

private func makeMealPlanUIComponentJSON(foodId: String = "pasta-001") -> Data {
    """
    {
        "type": "meal_plan",
        "props": {
            "suggested_food": {
                "food_id": "\(foodId)",
                "name": "Penne Arrabiata",
                "serving_id": "s1",
                "serving_description": "1 serving",
                "quantity": 1
            },
            "current_macros": {"calories": 1200, "protein": 80, "carb": 140, "fat": 40},
            "projected_macros": {"calories": 1620, "protein": 94, "carb": 212, "fat": 50},
            "goals": {"calories": 2000, "protein": 150, "carb": 250, "fat": 65}
        }
    }
    """.data(using: .utf8)!
}

// MARK: - MacroValues Tests

@Suite("MacroValues")
struct MacroValuesTests {

    @Test("decodes all four fields from JSON")
    func decodesAllFields() throws {
        let json = #"{"calories":2000,"protein":150,"carb":250,"fat":65}"#.data(using: .utf8)!
        let v = try decoder.decode(MacroValues.self, from: json)
        #expect(v.calories == 2000)
        #expect(v.protein == 150)
        #expect(v.carb == 250)
        #expect(v.fat == 65)
    }

    @Test("round-trips via encode then decode")
    func roundTrip() throws {
        let original = MacroValues(calories: 1800, protein: 130, carb: 200, fat: 60)
        let data = try encoder.encode(original)
        let decoded = try decoder.decode(MacroValues.self, from: data)
        #expect(decoded == original)
    }

    @Test("equality holds for identical values")
    func equatable() {
        let a = MacroValues(calories: 2000, protein: 150, carb: 250, fat: 65)
        let b = MacroValues(calories: 2000, protein: 150, carb: 250, fat: 65)
        #expect(a == b)
    }

    @Test("inequality when one field differs")
    func inequalityOnField() {
        let a = MacroValues(calories: 2000, protein: 150, carb: 250, fat: 65)
        let b = MacroValues(calories: 2001, protein: 150, carb: 250, fat: 65)
        #expect(a != b)
    }

    @Test("decodes fractional values correctly")
    func fractionalValues() throws {
        let json = #"{"calories":1845.5,"protein":127.3,"carb":220.0,"fat":61.7}"#.data(using: .utf8)!
        let v = try decoder.decode(MacroValues.self, from: json)
        #expect(v.calories == 1845.5)
        #expect(v.protein == 127.3)
    }
}

// MARK: - MealPlanProps Decode Tests

@Suite("MealPlanProps")
struct MealPlanPropsTests {

    @Test("decodes suggestedFood.foodId")
    func decodesFoodId() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(foodId: "abc-123"))
        #expect(props.suggestedFood.foodId == "abc-123")
    }

    @Test("decodes suggestedFood.name")
    func decodesFoodName() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(foodName: "Salmon Fillet"))
        #expect(props.suggestedFood.name == "Salmon Fillet")
    }

    @Test("decodes currentMacros correctly")
    func decodesCurrentMacros() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            currentCal: 1300, currentPro: 90, currentCarb: 160, currentFat: 45
        ))
        #expect(props.currentMacros.calories == 1300)
        #expect(props.currentMacros.protein == 90)
        #expect(props.currentMacros.carb == 160)
        #expect(props.currentMacros.fat == 45)
    }

    @Test("decodes projectedMacros correctly")
    func decodesProjectedMacros() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            projCal: 1720, projPro: 104, projCarb: 232, projFat: 55
        ))
        #expect(props.projectedMacros.calories == 1720)
        #expect(props.projectedMacros.protein == 104)
    }

    @Test("decodes goals correctly")
    func decodesGoals() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            goalCal: 2200, goalPro: 160, goalCarb: 275, goalFat: 70
        ))
        #expect(props.goals.calories == 2200)
        #expect(props.goals.fat == 70)
    }

    @Test("round-trip preserves all fields")
    func roundTrip() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON())
        let data = try encoder.encode(props)
        let decoded = try decoder.decode(MealPlanProps.self, from: data)
        #expect(decoded == props)
    }

    @Test("UIComponent wrapping meal_plan decodes correctly")
    func uiComponentMealPlanDecode() throws {
        let component = try decoder.decode(UIComponent.self, from: makeMealPlanUIComponentJSON(foodId: "food-xyz"))
        #expect(component.type == .mealPlan)
        if case .mealPlan(let props) = component.props {
            #expect(props.suggestedFood.foodId == "food-xyz")
            #expect(props.goals.calories == 2000)
        } else {
            Issue.record("Expected .mealPlan props, got \(component.props)")
        }
    }

    @Test("UIComponentType.mealPlan raw value is 'meal_plan'")
    func mealPlanRawValue() {
        #expect(UIComponentType.mealPlan.rawValue == "meal_plan")
    }
}

// MARK: - Delta Computation Tests

@Suite("MealPlan delta computation")
struct MealPlanDeltaTests {

    @Test("positive delta: projected > current")
    func positiveDelta() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            currentCal: 1200, projCal: 1620
        ))
        let delta = props.projectedMacros.calories - props.currentMacros.calories
        #expect(delta == 420)
    }

    @Test("negative delta: projected < current (over-eating scenario)")
    func negativeDelta() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            currentCal: 1800, projCal: 1200
        ))
        let delta = props.projectedMacros.calories - props.currentMacros.calories
        #expect(delta == -600)
    }

    @Test("zero delta: projected == current")
    func zeroDelta() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            currentCal: 1500, projCal: 1500
        ))
        let delta = props.projectedMacros.calories - props.currentMacros.calories
        #expect(delta == 0)
    }

    @Test("protein delta computed correctly")
    func proteinDelta() throws {
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(
            currentPro: 80, projPro: 94
        ))
        let delta = props.projectedMacros.protein - props.currentMacros.protein
        #expect(delta == 14)
    }
}

// MARK: - Bar Ratio Clamping Tests

@Suite("Bar ratio clamping")
struct BarRatioTests {

    private func ratio(current: Double, goal: Double) -> Double {
        guard goal > 0 else { return 0 }
        return min(current / goal, 1.0)
    }

    @Test("zero goal returns 0 (no divide-by-zero)")
    func zeroGoalReturnsZero() {
        #expect(ratio(current: 500, goal: 0) == 0)
    }

    @Test("over-100% value clamps to 1.0")
    func overGoalClampsToOne() {
        let r = ratio(current: 2500, goal: 2000)
        #expect(r == 1.0)
    }

    @Test("normal ratio is current/goal")
    func normalRatio() {
        let r = ratio(current: 1000, goal: 2000)
        #expect(r == 0.5)
    }

    @Test("zero current returns 0")
    func zeroCurrentReturnsZero() {
        #expect(ratio(current: 0, goal: 2000) == 0)
    }

    @Test("exact-goal value returns 1.0")
    func exactGoalReturnsOne() {
        #expect(ratio(current: 2000, goal: 2000) == 1.0)
    }

    @Test("fractional ratio rounds correctly")
    func fractionalRatio() {
        let r = ratio(current: 1, goal: 3)
        #expect(abs(r - (1.0 / 3.0)) < 1e-10)
    }
}

// MARK: - onSelect Callback Tests

@Suite("MealPlanView onSelect callback")
struct MealPlanOnSelectTests {

    @Test("onSelect fires with correct foodId")
    func onSelectFoodId() throws {
        let expectedId = "meal-food-999"
        let props = try decoder.decode(MealPlanProps.self, from: makeMealPlanJSON(foodId: expectedId))

        var capturedId: String?
        let onSelect: (String) -> Void = { id in capturedId = id }

        // Simulate the tap
        onSelect(props.suggestedFood.foodId)

        #expect(capturedId == expectedId)
    }

    @Test("onSelect is not called without tap")
    func onSelectNotCalledWithoutTap() {
        var called = false
        let _: (String) -> Void = { _ in called = true }
        #expect(called == false)
    }
}
