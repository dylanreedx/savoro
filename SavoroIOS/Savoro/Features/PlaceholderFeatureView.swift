import SwiftUI

struct PlaceholderFeatureView: View {
    static let statusCopy = "Coming soon"
    static let detailsHeading = "What to expect"
    static let footerCopy = "We’re putting the finishing touches on this space."

    let title: String
    let subtitle: String
    let foundationNotes: [String]
    var accent: Color = SavoroColor.blush

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(Self.statusCopy)
                        .font(.caption.weight(.semibold))
                        .textCase(.uppercase)
                        .foregroundStyle(accent)

                    Text(title)
                        .font(.largeTitle.bold())
                        .foregroundStyle(SavoroColor.ink)

                    Text(subtitle)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text(Self.detailsHeading)
                        .font(.headline)
                        .foregroundStyle(SavoroColor.ink)

                    ForEach(foundationNotes, id: \.self) { note in
                        HStack(alignment: .top, spacing: 10) {
                            Circle()
                                .fill(accent.opacity(0.22))
                                .frame(width: 8, height: 8)
                                .padding(.top, 6)

                            Text(note)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(SavoroColor.cardOverlay, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                Text(Self.footerCopy)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)
            }
            .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SavoroColor.warmSand)
        .navigationTitle(title)
    }
}
