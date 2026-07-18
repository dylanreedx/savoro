import SwiftUI

struct DiscoverPlaceholderView: View {
    static let subtitle = "Discover is coming soon. Explore public recipes from creators and communities."
    static let highlights = [
        "Search for recipes that fit the moment.",
        "Browse curated ideas for quick meals, meal prep, and more.",
        "Find creators and communities through the recipes they share."
    ]

    var body: some View {
        PlaceholderFeatureView(
            title: "Discover",
            subtitle: Self.subtitle,
            foundationNotes: Self.highlights,
            accent: SavoroColor.carbs
        )
        .accessibilityIdentifier("screen-discover")
    }
}
