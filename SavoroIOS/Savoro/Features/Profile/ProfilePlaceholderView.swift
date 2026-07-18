import SwiftUI

struct ProfilePlaceholderView: View {
    static let subtitle = "More Profile features are coming soon. Make Savoro yours and choose what you share."
    static let highlights = [
        "Showcase recipes you publish and collections you curate.",
        "Connect with cooks whose public recipes inspire you.",
        "Manage your account, sharing choices, and privacy settings."
    ]

    var body: some View {
        PlaceholderFeatureView(
            title: "Profile",
            subtitle: Self.subtitle,
            foundationNotes: Self.highlights,
            accent: SavoroColor.blush
        )
        .accessibilityIdentifier("screen-profile")
    }
}
