import SwiftUI

struct CommunityPlaceholderView: View {
    var body: some View {
        PlaceholderFeatureView(
            title: "Community",
            subtitle: "Recipe-first social scaffold for joined communities, invitations, and friend/community activity.",
            foundationNotes: [
                "Orient around community recipe feeds rather than a general social network.",
                "Reserve space for invitations, joined communities, and recipe-only activity.",
                "Explicitly avoid public food logs, calorie totals, goals, or streak-style data."
            ],
            accent: SavoroColor.fat
        )
    }
}
