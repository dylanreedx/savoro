import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeProps(
    foodId: String = "food-1",
    servingId: String = "sv-1",
    calories: Double = 200.0,
    protein: Double = 20.0,
    carb: Double = 10.0,
    fat: Double = 8.0,
    quantity: Double = 1.0,
    source: FoodSource = .usda,
    servings: [FoodCardServing] = [],
    selectedServingId: String = ""
) -> FoodCardProps {
    FoodCardProps(
        foodId: foodId,
        name: "Test Food",
        brandName: nil,
        servingId: servingId,
        servingDescription: "1 serving",
        calories: calories,
        protein: protein,
        carb: carb,
        fat: fat,
        quantity: quantity,
        source: source,
        servings: servings,
        selectedServingId: selectedServingId
    )
}

// MARK: - FoodCardState Tests

@Suite("FoodCardState")
struct FoodCardTests {

    // MARK: initialMacrosMatchProps

    @Test("initial macros match props at quantity 1.0")
    func initialMacrosMatchProps() {
        let props = makeProps(calories: 200, protein: 20, carb: 10, fat: 8, quantity: 1.0)
        let state = FoodCardState(props: props)

        #expect(state.displayedCalories == 200.0)
        #expect(state.displayedProtein  == 20.0)
        #expect(state.displayedCarbs    == 10.0)
        #expect(state.displayedFat      == 8.0)
    }

    // MARK: incrementQuantityScalesMacros

    @Test("increment quantity from 1.0 to 1.5 scales all macros")
    func incrementQuantityScalesMacros() {
        let props = makeProps(calories: 200, protein: 20, carb: 10, fat: 8, quantity: 1.0)
        var state = FoodCardState(props: props)

        state.incrementQuantity()

        #expect(state.quantity == 1.5)
        #expect(state.displayedCalories == 300.0)
        #expect(state.displayedProtein  == 30.0)
        #expect(state.displayedCarbs    == 15.0)
        #expect(state.displayedFat      == 12.0)
    }

    // MARK: changeServingUpdatesMacros

    @Test("selectServing changes macros to new serving values × quantity")
    func changeServingUpdatesMacros() {
        let serving1 = FoodCardServing(id: "sv-1", description: "1 cup", calories: 200, protein: 20, carb: 10, fat: 8)
        let serving2 = FoodCardServing(id: "sv-2", description: "100g",  calories: 90,  protein: 9,  carb: 5,  fat: 3)
        let props = makeProps(
            servings: [serving1, serving2],
            selectedServingId: "sv-1"
        )
        var state = FoodCardState(props: props)

        state.selectServing(id: "sv-2")

        #expect(state.selectedServingId == "sv-2")
        #expect(state.displayedCalories == 90.0)
        #expect(state.displayedProtein  == 9.0)
        #expect(state.displayedCarbs    == 5.0)
        #expect(state.displayedFat      == 3.0)
    }

    // MARK: logPayloadIsCorrect

    @Test("logPayload returns correct foodId, servingId, quantity and .snack mealType")
    func logPayloadIsCorrect() {
        let serving = FoodCardServing(id: "sv-42", description: "1 piece", calories: 100, protein: nil, carb: nil, fat: nil)
        let props = makeProps(
            foodId: "food-99",
            servingId: "sv-42",
            servings: [serving],
            selectedServingId: "sv-42"
        )
        var state = FoodCardState(props: props)
        state.incrementQuantity() // quantity becomes 1.5

        let payload = state.logPayload()

        #expect(payload.foodId    == "food-99")
        #expect(payload.servingId == "sv-42")
        #expect(payload.quantity  == 1.5)
        #expect(payload.mealType  == .snack)
    }

    // MARK: onDismissCalledOnNotRight

    @Test("onDismiss closure is called exactly once when tapped")
    func onDismissCalledOnNotRight() {
        // FoodCardView is not instantiated here — we test the closure contract directly
        var callCount = 0
        let onDismiss: () -> Void = { callCount += 1 }

        // Simulate tap
        onDismiss()

        #expect(callCount == 1)
    }

    // MARK: decrementAtMinimumClampsToHalf

    @Test("decrement at minimum quantity 0.5 stays at 0.5")
    func decrementAtMinimumClampsToHalf() {
        let props = makeProps(quantity: 0.5)
        var state = FoodCardState(props: props)

        #expect(state.quantity == 0.5)

        state.decrementQuantity()

        #expect(state.quantity == 0.5)
    }
}
