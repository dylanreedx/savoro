import SwiftUI

struct DiscoverView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Discover")
                        .font(SavoroFonts.largeTitle)
                        .foregroundStyle(SavoroColors.textPrimary)
                        .padding(.horizontal, 20)
                        .padding(.top, 12)

                    Text("Coming soon.")
                        .font(SavoroFonts.callout)
                        .foregroundStyle(SavoroColors.textSecondary)
                        .padding(.horizontal, 20)
                }
                .padding(.bottom, 100)
            }
            .background(SavoroColors.canvas)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    DiscoverView()
}
