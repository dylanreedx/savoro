import SwiftUI

struct DiscoverPlaceholderView: View {
    var body: some View {
        PlaceholderFeatureView(
            title: "Discover",
            subtitle: "Public recipe discovery scaffold for search, curated rails, creators, and community context.",
            foundationNotes: [
                "Keep recipe marketplace orientation visible without implementing feed data.",
                "Reserve chips/search for high-protein, meal-prep, quick, and other filters.",
                "Never imply private logs, goals, or adherence appear in discovery."
            ],
            accent: SavoroColor.carbs
        )
    }
}
