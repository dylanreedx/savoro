import SwiftUI

struct PlaceholderFeatureView: View {
    static let statusCopy = "Coming soon"
    static let detailsHeading = "What to expect"
    static let footerCopy = "We’re putting the finishing touches on this space."

    let title: String
    let subtitle: String
    let foundationNotes: [String]
    var accent: Color = SavoroColor.blush
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            accessibilityBody
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
        } else {
            standardBody
                .navigationTitle(title)
        }
    }

    private var accessibilityBody: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                    Text(Self.statusCopy)
                        .font(.caption.weight(.semibold))
                        .textCase(.uppercase)
                        .foregroundStyle(accent)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(title)
                        .font(.largeTitle.bold())
                        .foregroundStyle(SavoroColor.ink)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(subtitle)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                SavoroCard(style: .overlay) {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        Text(Self.detailsHeading)
                            .font(.headline)
                            .foregroundStyle(SavoroColor.ink)
                            .fixedSize(horizontal: false, vertical: true)

                        ForEach(foundationNotes, id: \.self) { note in
                            VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                                Circle()
                                    .fill(accent.opacity(0.22))
                                    .frame(width: SavoroSpacing.xs, height: SavoroSpacing.xs)

                                Text(note)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Text(Self.footerCopy)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, SavoroSpacing.xxs)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(SavoroSpacing.lg)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SavoroColor.warmSand)
    }

    private var standardBody: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
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

                SavoroCard(style: .overlay) {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        Text(Self.detailsHeading)
                            .font(.headline)
                            .foregroundStyle(SavoroColor.ink)

                        ForEach(foundationNotes, id: \.self) { note in
                            HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                                Circle()
                                    .fill(accent.opacity(0.22))
                                    .frame(width: SavoroSpacing.xs, height: SavoroSpacing.xs)
                                    .padding(.top, SavoroSpacing.xs)

                                Text(note)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Text(Self.footerCopy)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, SavoroSpacing.xxs)
            }
            .padding(SavoroSpacing.lg)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SavoroColor.warmSand)
    }
}
