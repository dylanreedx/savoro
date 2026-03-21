import Foundation

// MARK: - FoodCardState

/// Extracted interaction state for FoodCardView.
/// Plain struct — no SwiftUI dependency — making all interaction logic unit-testable.
struct FoodCardState {
    let foodId: String
    let servings: [FoodCardServing]

    /// Fallback macros from FoodCardProps (legacy / empty servings path)
    let fallbackCalories: Double?
    let fallbackProtein: Double?
    let fallbackCarb: Double?
    let fallbackFat: Double?

    private(set) var selectedServingId: String
    private(set) var quantity: Double

    static let quantityStep: Double = 0.5
    static let quantityMin: Double = 0.5

    // MARK: - Init

    init(props: FoodCardProps) {
        foodId = props.foodId
        servings = props.servings
        fallbackCalories = props.calories
        fallbackProtein = props.protein
        fallbackCarb = props.carb
        fallbackFat = props.fat

        selectedServingId = props.selectedServingId.isEmpty
            ? (props.servings.first?.id ?? props.servingId)
            : props.selectedServingId

        quantity = props.quantity > 0 ? props.quantity : 1.0
    }

    // MARK: - Computed

    var selectedServing: FoodCardServing? {
        servings.first { $0.id == selectedServingId } ?? servings.first
    }

    var displayedCalories: Double {
        (selectedServing?.calories ?? fallbackCalories ?? 0) * quantity
    }

    var displayedProtein: Double {
        (selectedServing?.protein ?? fallbackProtein ?? 0) * quantity
    }

    var displayedCarbs: Double {
        (selectedServing?.carb ?? fallbackCarb ?? 0) * quantity
    }

    var displayedFat: Double {
        (selectedServing?.fat ?? fallbackFat ?? 0) * quantity
    }

    // MARK: - Mutating methods

    mutating func incrementQuantity() {
        quantity += Self.quantityStep
    }

    mutating func decrementQuantity() {
        quantity = max(Self.quantityMin, quantity - Self.quantityStep)
    }

    mutating func selectServing(id: String) {
        selectedServingId = id
    }

    // MARK: - Log payload

    /// Returns the tuple needed by the onLog callback.
    /// MealType is hardcoded to .snack — known limitation, tracked for follow-up.
    func logPayload(mealType: MealType = .snack) -> (foodId: String, servingId: String, quantity: Double, mealType: MealType) {
        (foodId: foodId, servingId: selectedServingId, quantity: quantity, mealType: mealType)
    }
}
