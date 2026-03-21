import SwiftUI

// MARK: - GenerativeUIRenderer

/// Renders a UIComponent returned from the AI into the appropriate SwiftUI view.
struct GenerativeUIRenderer: View {
    let component: UIComponent
    let onLog: (String, String, Double, MealType) -> Void
    let onDismiss: () -> Void

    var body: some View {
        switch component.props {
        case .foodCard(let props):
            FoodCardView(props: props, onLog: onLog, onDismiss: onDismiss)

        case .macroSummary, .confirmButton, .foodList,
             .quickLogChips, .dailySnapshot, .recipeCard, .unknown:
            // Other component types rendered by their own views (future work)
            EmptyView()
        }
    }
}
