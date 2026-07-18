import SwiftUI

struct SavoroCard<Content: View>: View {
    enum Style { case plain, glass, elevated }

    private let style: Style
    private let content: Content

    init(style: Style = .glass, @ViewBuilder content: () -> Content) {
        self.style = style
        self.content = content()
    }

    var body: some View {
        content
            .padding(SavoroSpacing.md)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
            .savoroShadow(shadow)
    }

    private var background: Color {
        switch style {
        case .plain: SavoroColor.raised
        case .glass: SavoroColor.card
        case .elevated: SavoroColor.cardStrong
        }
    }

    private var borderColor: Color { style == .plain ? SavoroColor.border : SavoroColor.glassBorder }
    private var cornerRadius: CGFloat { style == .glass ? SavoroRadius.glass : SavoroRadius.card }
    private var shadow: ShadowToken { style == .elevated ? SavoroShadow.glassLarge : SavoroShadow.glass }
}

struct SavoroButton: View {
    enum Variant { case primary, secondary, ghost }

    private let title: String
    private let systemImage: String?
    private let variant: Variant
    private let isDisabled: Bool
    private let action: () -> Void

    init(_ title: String, systemImage: String? = nil, variant: Variant = .primary, isDisabled: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.variant = variant
        self.isDisabled = isDisabled
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: SavoroSpacing.xs) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
            }
            .font(SavoroTypography.bodyEmphasized)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, SavoroSpacing.lg)
            .padding(.vertical, SavoroSpacing.sm)
        }
        .buttonStyle(SavoroButtonStyle(variant: variant))
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.48 : 1)
    }
}

struct SavoroButtonStyle: ButtonStyle {
    let variant: SavoroButton.Variant
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    func makeBody(configuration: Configuration) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            styledLabel(configuration)
                .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                        .stroke(border, lineWidth: borderWidth)
                )
        } else {
            styledLabel(configuration)
                .clipShape(Capsule(style: .continuous))
                .overlay(Capsule(style: .continuous).stroke(border, lineWidth: borderWidth))
        }
    }

    private func styledLabel(_ configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foreground)
            .background(background(isPressed: configuration.isPressed))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }

    private var foreground: Color {
        switch variant {
        case .primary: SavoroColor.textOnAccent
        case .secondary, .ghost: SavoroColor.textStrong
        }
    }

    private func background(isPressed: Bool) -> Color {
        switch variant {
        case .primary: isPressed ? SavoroColor.accentStrong : SavoroColor.accent
        case .secondary: isPressed ? SavoroColor.accentHighlight : SavoroColor.accentSoft
        case .ghost: isPressed ? SavoroColor.raised : .clear
        }
    }

    private var border: Color {
        switch variant {
        case .primary: .clear
        case .secondary: SavoroColor.glassBorder
        case .ghost: SavoroColor.border
        }
    }

    private var borderWidth: CGFloat { variant == .primary ? 0 : 1 }
}

struct SavoroChip: View {
    enum Variant { case neutral, accent, positive }

    let title: String
    var systemImage: String?
    var variant: Variant = .neutral
    var isSelected = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.xxs) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .font(SavoroTypography.label)
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, SavoroSpacing.sm)
            .padding(.vertical, SavoroSpacing.xs)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(border, lineWidth: 1)
            )
        } else {
            HStack(spacing: SavoroSpacing.xxs) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
            }
            .font(SavoroTypography.label)
                .foregroundStyle(foreground)
                .padding(.horizontal, SavoroSpacing.sm)
                .padding(.vertical, SavoroSpacing.xs)
                .background(background)
                .clipShape(Capsule(style: .continuous))
                .overlay(Capsule(style: .continuous).stroke(border, lineWidth: 1))
        }
    }

    private var foreground: Color { isSelected ? SavoroColor.textStrong : SavoroColor.textBody }
    private var background: Color {
        if isSelected { return selectedBackground }
        switch variant {
        case .neutral: return SavoroColor.cardStrong
        case .accent: return SavoroColor.accentSoft
        case .positive: return SavoroColor.positiveSoft
        }
    }
    private var selectedBackground: Color { variant == .positive ? SavoroColor.positiveSoft : SavoroColor.accentSoft }
    private var border: Color { isSelected ? SavoroColor.focusRing : SavoroColor.border }
}

struct SavoroSegmentedControl<Option: Hashable & CustomStringConvertible>: View {
    let options: [Option]
    @Binding var selection: Option
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(spacing: SavoroSpacing.xs) {
                optionsContent(usesCapsule: false)
            }
            .padding(SavoroSpacing.xxs)
            .background(SavoroColor.raised)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(SavoroColor.border, lineWidth: 1)
            )
        } else {
            HStack(spacing: SavoroSpacing.xs) {
                optionsContent(usesCapsule: true)
            }
            .padding(SavoroSpacing.xxs)
            .background(SavoroColor.raised)
            .clipShape(Capsule(style: .continuous))
            .overlay(Capsule(style: .continuous).stroke(SavoroColor.border, lineWidth: 1))
        }
    }

    @ViewBuilder
    private func optionsContent(usesCapsule: Bool) -> some View {
        ForEach(options, id: \.self) { option in
            Button {
                selection = option
            } label: {
                Text(option.description)
                    .font(SavoroTypography.label)
                    .foregroundStyle(selection == option ? SavoroColor.textStrong : SavoroColor.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SavoroSpacing.xs)
                    .background(selection == option ? SavoroColor.cardStrong : .clear)
                    .clipShape(
                        usesCapsule
                            ? AnyShape(Capsule(style: .continuous))
                            : AnyShape(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous))
                    )
            }
            .buttonStyle(.plain)
        }
    }
}

struct SavoroSearchField: View {
    let placeholder: String
    @Binding var text: String
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(SavoroColor.textMuted)
                TextField(
                    placeholder,
                    text: $text,
                    prompt: Text(placeholder).foregroundStyle(SavoroColor.fieldPlaceholder),
                    axis: .vertical
                )
                .lineLimit(1...)
                .font(SavoroTypography.body)
                .foregroundStyle(SavoroColor.textStrong)
                .textInputAutocapitalization(.never)
                if !text.isEmpty {
                    Button { text = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(SavoroColor.textSubtle)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Clear search")
                }
            }
            .padding(.horizontal, SavoroSpacing.md)
            .padding(.vertical, SavoroSpacing.sm)
            .background(SavoroColor.cardStrong)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(SavoroColor.glassBorder, lineWidth: 1)
            )
        } else {
            HStack(spacing: SavoroSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(SavoroColor.textMuted)
                TextField(
                    placeholder,
                    text: $text,
                    prompt: Text(placeholder).foregroundStyle(SavoroColor.fieldPlaceholder)
                )
                    .font(SavoroTypography.body)
                    .foregroundStyle(SavoroColor.textStrong)
                    .textInputAutocapitalization(.never)
                if !text.isEmpty {
                    Button { text = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(SavoroColor.textSubtle)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Clear search")
                }
            }
            .padding(.horizontal, SavoroSpacing.md)
            .padding(.vertical, SavoroSpacing.sm)
            .background(SavoroColor.cardStrong)
            .clipShape(Capsule(style: .continuous))
            .overlay(Capsule(style: .continuous).stroke(SavoroColor.glassBorder, lineWidth: 1))
        }
    }
}

enum SavoroMacroKind: String, CaseIterable, Identifiable {
    case calories, protein, carbs, fat

    var id: String { rawValue }

    var label: String {
        switch self {
        case .calories: "Calories"
        case .protein: "Protein"
        case .carbs: "Carbs"
        case .fat: "Fat"
        }
    }

    var shortLabel: String {
        switch self {
        case .calories: "Cal"
        case .protein: "P"
        case .carbs: "C"
        case .fat: "F"
        }
    }

    var unit: String { self == .calories ? "cal" : "g" }

    var color: Color {
        switch self {
        case .calories: SavoroColor.macroCalories
        case .protein: SavoroColor.macroProtein
        case .carbs: SavoroColor.macroCarbs
        case .fat: SavoroColor.macroFat
        }
    }
}

struct SavoroMacroValue: Identifiable, Equatable {
    let kind: SavoroMacroKind
    let value: Double
    var goal: Double?

    var id: SavoroMacroKind { kind }
    var fractionComplete: Double {
        guard let goal, goal > 0 else { return 0 }
        return min(max(value / goal, 0), 1)
    }

    var formattedValue: String { value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value) }
    var displayValue: String { "\(formattedValue) \(kind.unit)" }
    var progressText: String { goal.map { "\(formattedValue) / \(Int($0)) \(kind.unit)" } ?? displayValue }
}

struct SavoroMacroPill: View {
    let macro: SavoroMacroValue
    var showsShortLabel = true
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.xs) {
                Circle().fill(macro.kind.color).frame(width: 7, height: 7)
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text(showsShortLabel ? macro.kind.shortLabel : macro.kind.label)
                        .font(SavoroTypography.micro)
                    Text(macro.displayValue)
                        .font(SavoroTypography.micro.monospacedDigit())
                }
            }
            .foregroundStyle(SavoroColor.textStrong)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, SavoroSpacing.sm)
            .padding(.vertical, SavoroSpacing.xs)
            .background(SavoroColor.cardStrong)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(SavoroColor.border, lineWidth: 1)
            )
            .accessibilityLabel("\(macro.kind.label), \(macro.displayValue)")
        } else {
            HStack(spacing: SavoroSpacing.xxs) {
                Circle().fill(macro.kind.color).frame(width: 7, height: 7)
                Text(showsShortLabel ? macro.kind.shortLabel : macro.kind.label)
                    .font(SavoroTypography.micro)
                Text(macro.displayValue)
                    .font(SavoroTypography.micro.monospacedDigit())
            }
            .foregroundStyle(SavoroColor.textStrong)
            .padding(.horizontal, SavoroSpacing.sm)
            .padding(.vertical, SavoroSpacing.xs)
            .background(SavoroColor.cardStrong)
            .clipShape(Capsule(style: .continuous))
            .overlay(Capsule(style: .continuous).stroke(SavoroColor.border, lineWidth: 1))
            .accessibilityLabel("\(macro.kind.label), \(macro.displayValue)")
        }
    }
}

struct SavoroMacroProgressBar: View {
    let macro: SavoroMacroValue
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                        Text(macro.kind.label).font(SavoroTypography.label)
                        Text(macro.progressText).font(SavoroTypography.micro.monospacedDigit())
                    }
                } else {
                    HStack {
                        Text(macro.kind.label).font(SavoroTypography.label)
                        Spacer()
                        Text(macro.progressText).font(SavoroTypography.micro.monospacedDigit())
                    }
                }
            }
            .foregroundStyle(SavoroColor.textBody)

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(SavoroColor.raised)
                    Capsule()
                        .fill(macro.kind.color)
                        .frame(width: proxy.size.width * macro.fractionComplete)
                }
            }
            .frame(height: 8)
        }
        .accessibilityElement(children: .combine)
    }
}

struct SavoroMacroStatBlock: View {
    let macro: SavoroMacroValue
    var caption: String = "per serving"

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            HStack(spacing: SavoroSpacing.xs) {
                Circle().fill(macro.kind.color).frame(width: 9, height: 9)
                Text(macro.kind.label).font(SavoroTypography.label)
            }
            Text(macro.displayValue)
                .font(SavoroTypography.numericHeadline)
                .foregroundStyle(SavoroColor.textStrong)
            Text(caption)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(SavoroSpacing.sm)
        .background(SavoroColor.cardStrong)
        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous).stroke(SavoroColor.border, lineWidth: 1))
    }
}

struct SavoroMacroRing: View {
    let value: Double
    let goal: Double
    var label = "Today so far"
    var tint = SavoroColor.accent

    private var fraction: Double { goal > 0 ? min(max(value / goal, 0), 1) : 0 }

    var body: some View {
        ZStack {
            Circle().stroke(SavoroColor.raised, lineWidth: 12)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(tint, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: SavoroSpacing.xxs) {
                Text("\(Int(value))")
                    .font(SavoroTypography.numericTitle)
                    .foregroundStyle(SavoroColor.numericTextStrong)
                Text("/ \(Int(goal)) cal").font(SavoroTypography.micro).foregroundStyle(SavoroColor.textMuted)
            }
        }
        .accessibilityLabel("\(label), \(Int(value)) of \(Int(goal)) calories")
    }
}

struct SavoroNutritionSnapshotCard: View {
    let title: String
    let subtitle: String
    let macros: [SavoroMacroValue]

    var body: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text(title).font(SavoroTypography.headline).foregroundStyle(SavoroColor.textStrong)
                    Text(subtitle).font(SavoroTypography.callout).foregroundStyle(SavoroColor.textMuted)
                }
                ForEach(macros) { SavoroMacroProgressBar(macro: $0) }
            }
        }
    }
}

enum SavoroTrustKind {
    case usdaVerified, openFoodFacts, labelVerified, creatorRecipe, savedSnapshot

    var title: String {
        switch self {
        case .usdaVerified: "USDA verified"
        case .openFoodFacts: "Open Food Facts"
        case .labelVerified: "Label verified"
        case .creatorRecipe: "Creator recipe"
        case .savedSnapshot: "Nutrition snapshot saved"
        }
    }

    var systemImage: String {
        switch self {
        case .usdaVerified, .labelVerified: "checkmark.seal.fill"
        case .openFoodFacts: "leaf.fill"
        case .creatorRecipe: "person.crop.circle.badge.checkmark"
        case .savedSnapshot: "lock.doc.fill"
        }
    }
}

struct SavoroTrustBadge: View {
    let kind: SavoroTrustKind
    var detail: String?
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                Image(systemName: kind.systemImage)
                    .foregroundStyle(SavoroColor.positive)
                VStack(alignment: .leading, spacing: 1) {
                    Text(kind.title).font(SavoroTypography.label)
                    if let detail {
                        Text(detail)
                            .font(SavoroTypography.micro)
                            .foregroundStyle(SavoroColor.textMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .foregroundStyle(SavoroColor.textBody)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, SavoroSpacing.sm)
            .padding(.vertical, SavoroSpacing.xs)
            .background(SavoroColor.positiveSoft)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(SavoroColor.positiveBorder, lineWidth: 1)
            )
            .accessibilityElement(children: .combine)
        } else {
            HStack(spacing: SavoroSpacing.xs) {
                Image(systemName: kind.systemImage)
                    .foregroundStyle(SavoroColor.positive)
                VStack(alignment: .leading, spacing: 1) {
                    Text(kind.title).font(SavoroTypography.label)
                    if let detail {
                        Text(detail).font(SavoroTypography.micro).foregroundStyle(SavoroColor.textMuted)
                    }
                }
            }
            .foregroundStyle(SavoroColor.textBody)
            .padding(.horizontal, SavoroSpacing.sm)
            .padding(.vertical, SavoroSpacing.xs)
            .background(SavoroColor.positiveSoft)
            .clipShape(Capsule(style: .continuous))
            .overlay(Capsule(style: .continuous).stroke(SavoroColor.positiveBorder, lineWidth: 1))
            .accessibilityElement(children: .combine)
        }
    }
}

struct SavoroAvatar: View {
    let name: String
    var imageURL: URL?
    var size: CGFloat = 40

    private var initials: String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap(\.first)
        return letters.isEmpty ? "?" : String(letters).uppercased()
    }

    var body: some View {
        ZStack {
            Circle().fill(LinearGradient(colors: [SavoroColor.accentSoft, SavoroColor.lavenderSoft], startPoint: .topLeading, endPoint: .bottomTrailing))
            if let imageURL {
                AsyncImage(url: imageURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Text(initials).font(SavoroTypography.label).foregroundStyle(SavoroColor.textStrong)
                }
            } else {
                Text(initials).font(SavoroTypography.label).foregroundStyle(SavoroColor.textStrong)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(SavoroColor.glassBorder, lineWidth: 1))
        .accessibilityLabel(name)
    }
}

#Preview("Savoro primitives") {
    @Previewable @State var segment = "Saved"
    @Previewable @State var search = "oats"

    VStack(spacing: SavoroSpacing.md) {
        SavoroSearchField(placeholder: "Search recipes", text: $search)
        SavoroSegmentedControl(options: ["Mine", "Saved", "Drafts"], selection: $segment)
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                HStack {
                    SavoroAvatar(name: "Maya Reed", size: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Chicken Shawarma Bowl").font(SavoroTypography.headline).foregroundStyle(SavoroColor.textStrong)
                        Text("Published by @maya").font(SavoroTypography.callout).foregroundStyle(SavoroColor.textMuted)
                    }
                }
                HStack { SavoroMacroPill(macro: .init(kind: .calories, value: 520)); SavoroMacroPill(macro: .init(kind: .protein, value: 42)) }
                SavoroTrustBadge(kind: .creatorRecipe, detail: "Macros per serving")
                HStack { SavoroChip(title: "high-protein", variant: .positive); SavoroChip(title: "meal prep", isSelected: true) }
                HStack { SavoroButton("Save", variant: .secondary) {}; SavoroButton("Log", variant: .primary) {} }
            }
        }
        SavoroNutritionSnapshotCard(
            title: "Today so far",
            subtitle: "Still flexible — your logs stay private.",
            macros: [
                .init(kind: .calories, value: 1420, goal: 2200),
                .init(kind: .protein, value: 112, goal: 160),
                .init(kind: .carbs, value: 145, goal: 220),
                .init(kind: .fat, value: 48, goal: 70)
            ]
        )
        SavoroButton("Make your version", systemImage: "arrow.triangle.branch", variant: .ghost) {}
    }
    .padding()
    .background(SavoroColor.page)
}
