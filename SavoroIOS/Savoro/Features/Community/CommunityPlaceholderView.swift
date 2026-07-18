import SwiftUI

struct CommunityPlaceholderView: View {
    static let subtitle = "Community is coming soon. Swap public recipe ideas with cooks you choose."
    static let highlights = [
        "Follow recipe conversations in communities you join.",
        "Invite friends and find ideas for meals you want to make.",
        "Only recipes and public profile details belong here; your private nutrition stays private."
    ]

    var body: some View {
        PlaceholderFeatureView(
            title: "Community",
            subtitle: Self.subtitle,
            foundationNotes: Self.highlights,
            accent: SavoroColor.fat
        )
        .accessibilityIdentifier("screen-community")
    }
}
