import SwiftUI

/// Lightweight, component-scoped gallery for reviewing Savoro design tokens and
/// reusable primitives. This is intentionally not wired into app navigation.
struct SavoroDesignSystemGallery: View {
    @State private var segment = GallerySegment.components
    @State private var searchText = "oats"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.xl) {
                galleryHeader
                colorTokenSection
                cardsButtonsChipsSection
                macroNutritionSection
                trustAvatarSection
            }
            .padding(SavoroSpacing.lg)
        }
        .background(SavoroColor.page.ignoresSafeArea())
    }

    private var galleryHeader: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            Text("Savoro design-system gallery")
                .font(SavoroTypography.title1)
                .foregroundStyle(SavoroColor.textStrong)
            Text("Scaffold-only preview for tokens and reusable primitives; not a feature screen or visual parity claim.")
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
        }
        .accessibilityElement(children: .combine)
    }

    private var colorTokenSection: some View {
        GallerySection(title: "Colors and tokens", subtitle: "Warm sand, blush, sage, macro colors, spacing, radius, shadows.") {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: SavoroSpacing.sm)], spacing: SavoroSpacing.sm) {
                ForEach(Self.colorSwatches) { swatch in
                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous)
                            .fill(swatch.color)
                            .frame(height: 52)
                            .overlay(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous).stroke(SavoroColor.border, lineWidth: 1))
                        Text(swatch.name)
                            .font(SavoroTypography.micro)
                            .foregroundStyle(SavoroColor.textBody)
                    }
                }
            }

            HStack(spacing: SavoroSpacing.sm) {
                TokenPill(label: "Spacing md", value: "16")
                TokenPill(label: "Card radius", value: "16")
                TokenPill(label: "Glass shadow", value: "y 4")
            }
        }
    }

    private var cardsButtonsChipsSection: some View {
        GallerySection(title: "Cards, buttons, chips, segmented, search", subtitle: "Common controls used by recipe, logging, and social surfaces.") {
            SavoroSearchField(placeholder: "Search recipes", text: $searchText)
            SavoroSegmentedControl(options: GallerySegment.allCases, selection: $segment)

            SavoroCard(style: .glass) {
                VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                    Text("Reusable recipe card shell")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Scaffold copy for inspecting card elevation, borders, text hierarchy, and actions.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                    HStack { SavoroChip(title: "high-protein", variant: .positive); SavoroChip(title: "meal prep", isSelected: true); SavoroChip(title: "creator", variant: .accent) }
                    HStack { SavoroButton("Save", variant: .secondary) {}; SavoroButton("Log", systemImage: "plus", variant: .primary) {} }
                    SavoroButton("Make your version", systemImage: "arrow.triangle.branch", variant: .ghost) {}
                }
            }
        }
    }

    private var macroNutritionSection: some View {
        GallerySection(title: "Macro and nutrition primitives", subtitle: "Nutrition objects stay readable and non-shaming.") {
            HStack { ForEach(Self.sampleMacros) { SavoroMacroPill(macro: $0) } }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: SavoroSpacing.sm)], spacing: SavoroSpacing.sm) {
                ForEach(Self.sampleMacros) { SavoroMacroStatBlock(macro: $0) }
            }
            SavoroMacroRing(value: 1_420, goal: 2_200)
                .frame(width: 144, height: 144)
            SavoroNutritionSnapshotCard(title: "Today so far", subtitle: "Still flexible — logs stay private.", macros: Self.sampleMacros)
        }
    }

    private var trustAvatarSection: some View {
        GallerySection(title: "Trust and avatar primitives", subtitle: "Light provenance and friendly social identity without noisy gamification.") {
            FlowStack(spacing: SavoroSpacing.sm) {
                SavoroTrustBadge(kind: .usdaVerified, detail: "Source attributed")
                SavoroTrustBadge(kind: .labelVerified, detail: "Package label")
                SavoroTrustBadge(kind: .creatorRecipe)
                SavoroTrustBadge(kind: .savedSnapshot, detail: "Private copy")
            }
            HStack(spacing: SavoroSpacing.md) {
                SavoroAvatar(name: "Maya Reed", size: 40)
                SavoroAvatar(name: "Jordan Kim", size: 48)
                SavoroAvatar(name: "Savoro Kitchen", size: 56)
            }
        }
    }

    static let sampleMacros = [
        SavoroMacroValue(kind: .calories, value: 520, goal: 2_200),
        SavoroMacroValue(kind: .protein, value: 42, goal: 160),
        SavoroMacroValue(kind: .carbs, value: 48, goal: 220),
        SavoroMacroValue(kind: .fat, value: 18, goal: 70)
    ]

    static let colorSwatches = [
        ColorSwatch(name: "page", color: SavoroColor.page),
        ColorSwatch(name: "raised", color: SavoroColor.raised),
        ColorSwatch(name: "accent", color: SavoroColor.accent),
        ColorSwatch(name: "accent soft", color: SavoroColor.accentSoft),
        ColorSwatch(name: "positive", color: SavoroColor.positive),
        ColorSwatch(name: "protein", color: SavoroColor.macroProtein),
        ColorSwatch(name: "carbs", color: SavoroColor.macroCarbs),
        ColorSwatch(name: "fat", color: SavoroColor.macroFat)
    ]
}

private enum GallerySegment: String, CaseIterable, CustomStringConvertible {
    case tokens = "Tokens"
    case components = "Components"
    case nutrition = "Nutrition"

    var description: String { rawValue }
}

struct ColorSwatch: Identifiable {
    let name: String
    let color: Color
    var id: String { name }
}

private struct GallerySection<Content: View>: View {
    let title: String
    let subtitle: String
    let content: Content

    init(title: String, subtitle: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text(title).font(SavoroTypography.headline).foregroundStyle(SavoroColor.textStrong)
                    Text(subtitle).font(SavoroTypography.callout).foregroundStyle(SavoroColor.textMuted)
                }
                content
            }
        }
    }
}

private struct TokenPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(SavoroTypography.micro).foregroundStyle(SavoroColor.textMuted)
            Text(value).font(SavoroTypography.label).foregroundStyle(SavoroColor.textStrong)
        }
        .padding(SavoroSpacing.sm)
        .background(SavoroColor.cardStrong)
        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous).stroke(SavoroColor.border, lineWidth: 1))
    }
}

private struct FlowStack<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    init(spacing: CGFloat, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: spacing) { content }
            VStack(alignment: .leading, spacing: spacing) { content }
        }
    }
}

#Preview("Design-system gallery") {
    SavoroDesignSystemGallery()
}
