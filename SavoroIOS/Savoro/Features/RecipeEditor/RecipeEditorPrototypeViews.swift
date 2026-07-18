import SwiftUI

/// Snapshot-only data states for the guided recipe-editor interaction prototypes.
/// These views are intentionally not connected to app navigation or publishing.
public enum EditorPrototypeContentState {
    case empty
    case populated
}

public enum EditorPrototypeSheetKind: String, Identifiable {
    case ingredients
    case steps

    public var id: String { rawValue }
}

enum EditorPrototypeSmartEntryEngine {
    static func ingredientLine(from draft: String, lineIndex: Int) -> String? {
        let parsed = RecipeEditorIngredientLineParser.parseLine(
            draft,
            lineIndex: lineIndex
        )
        return parsed.isValidForDraft ? parsed.displayText : nil
    }

    static func stepBody(from draft: String) -> String? {
        RecipeEditorInstructionParser
            .parse(draft)
            .first(where: { !$0.isPhaseHeader })?
            .body
    }
}

struct EditorPrototypeFixture {
    let title: String
    let servingsText: String
    let ingredientLines: [String]
    let stepLines: [String]

    static let empty = EditorPrototypeFixture(
        title: "",
        servingsText: "2",
        ingredientLines: [],
        stepLines: []
    )

    static let populated = EditorPrototypeFixture(
        title: "Lemony Herb Chicken",
        servingsText: "4",
        ingredientLines: [
            "500 g Chicken breast",
            "170 g Greek yogurt",
            "2 cups basmati rice",
            "1 cucumber",
            "1 cup cherry tomatoes",
            "2 tbsp olive oil",
            "1 lemon",
            "1 handful fresh parsley"
        ],
        stepLines: [
            "Season the chicken with lemon zest, herbs, and a pinch of salt.",
            "Cook the rice until tender, then fluff it with a fork.",
            "Sear the chicken until golden and cooked through.",
            "Stir the yogurt with lemon juice and chopped parsley.",
            "Fill each bowl with rice, vegetables, chicken, and yogurt sauce."
        ]
    )

    static func fixture(for state: EditorPrototypeContentState) -> Self {
        switch state {
        case .empty: .empty
        case .populated: .populated
        }
    }
}

/// Variant A: rendered rows stay in the editor while one smart composer builds each list.
public struct EditorPrototypeComposerView: View {
    /// Back, photo, title, description, yield, serving minus/plus, two composers,
    /// Save draft, and Save & publish in the empty default state.
    public static let defaultInteractiveControlCount = 11

    @State private var title: String
    @State private var servingsText: String
    @State private var ingredientLines: [String]
    @State private var stepLines: [String]
    @State private var ingredientDraft = ""
    @State private var stepDraft = ""

    public init(contentState: EditorPrototypeContentState = .empty) {
        let fixture = EditorPrototypeFixture.fixture(for: contentState)
        _title = State(initialValue: fixture.title)
        _servingsText = State(initialValue: fixture.servingsText)
        _ingredientLines = State(initialValue: fixture.ingredientLines)
        _stepLines = State(initialValue: fixture.stepLines)
    }

    public var body: some View {
        EditorPrototypeShell(
            title: $title,
            servingsText: $servingsText,
            initialScrollTarget: ingredientLines.isEmpty ? nil : .ingredientsAction
        ) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                EditorPrototypeSectionHeader(
                    title: "Ingredients",
                    supportingText: ingredientLines.isEmpty
                        ? "Start with the first ingredient."
                        : "Tap any ingredient for its details."
                )

                if !ingredientRows.isEmpty {
                    EditorPrototypeIngredientList(rows: ingredientRows)
                }

                EditorPrototypeComposerField(
                    text: $ingredientDraft,
                    prompt: "e.g. 2 cups flour",
                    accessibilityLabel: "Add an ingredient"
                ) {
                    addIngredient()
                }
                .id(EditorPrototypeScrollTarget.ingredientsAction)
            }

            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                EditorPrototypeSectionHeader(
                    title: "Steps",
                    supportingText: stepLines.isEmpty
                        ? "Your first step can be simple."
                        : "Each new step picks up the next number."
                )

                if !stepRows.isEmpty {
                    EditorPrototypeStepList(rows: stepRows)
                }

                EditorPrototypeComposerField(
                    text: $stepDraft,
                    prompt: "Write the next step…",
                    accessibilityLabel: "Add the next step"
                ) {
                    addStep()
                }
            }
        }
        .accessibilityIdentifier("editor-prototype-composer")
    }

    private var ingredientRows: [RecipeEditorParsedIngredientLine] {
        RecipeEditorIngredientLineParser
            .parse(ingredientLines.joined(separator: "\n"))
            .filter(\.isIngredient)
    }

    private var stepRows: [RecipeEditorInstructionBlock] {
        RecipeEditorInstructionParser
            .parse(stepLines.joined(separator: "\n\n"))
            .filter { !$0.isPhaseHeader }
    }

    private func addIngredient() {
        guard let line = EditorPrototypeSmartEntryEngine.ingredientLine(
            from: ingredientDraft,
            lineIndex: ingredientLines.count
        ) else { return }
        ingredientLines.append(line)
        ingredientDraft = ""
    }

    private func addStep() {
        guard let step = EditorPrototypeSmartEntryEngine.stepBody(from: stepDraft) else { return }
        stepLines.append(step)
        stepDraft = ""
    }
}

/// Variant B: the editor remains a rendered overview and list building moves into one focused sheet.
public struct EditorPrototypeSheetBuildView: View {
    /// Back, photo, title, description, yield, serving minus/plus, two add buttons,
    /// Save draft, and Save & publish in the empty default state.
    public static let defaultInteractiveControlCount = 11

    @State private var title: String
    @State private var servingsText: String
    @State private var ingredientLines: [String]
    @State private var stepLines: [String]
    @State private var activeSheet: EditorPrototypeSheetKind?

    private let renderedSheet: EditorPrototypeSheetKind?

    public init(
        contentState: EditorPrototypeContentState = .empty,
        renderedSheet: EditorPrototypeSheetKind? = nil
    ) {
        let fixture = EditorPrototypeFixture.fixture(for: contentState)
        _title = State(initialValue: fixture.title)
        _servingsText = State(initialValue: fixture.servingsText)
        _ingredientLines = State(initialValue: fixture.ingredientLines)
        _stepLines = State(initialValue: fixture.stepLines)
        _activeSheet = State(initialValue: nil)
        self.renderedSheet = renderedSheet
    }

    public var body: some View {
        Group {
            if let renderedSheet {
                rapidEntrySheet(for: renderedSheet, onDone: {})
            } else {
                editorPage
                    .fullScreenCover(item: $activeSheet) { kind in
                        rapidEntrySheet(for: kind) {
                            activeSheet = nil
                        }
                    }
            }
        }
    }

    private var editorPage: some View {
        EditorPrototypeShell(
            title: $title,
            servingsText: $servingsText,
            initialScrollTarget: ingredientLines.isEmpty ? nil : .ingredientsAction
        ) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                EditorPrototypeSectionHeader(
                    title: "Ingredients",
                    supportingText: ingredientLines.isEmpty
                        ? "Add them together in one easy pass."
                        : "Tap any ingredient for its details."
                )

                if !ingredientRows.isEmpty {
                    EditorPrototypeIngredientList(rows: ingredientRows)
                }

                SavoroButton(
                    ingredientLines.isEmpty ? "Add ingredients" : "Add more ingredients",
                    systemImage: "plus",
                    variant: .secondary
                ) {
                    activeSheet = .ingredients
                }
                .id(EditorPrototypeScrollTarget.ingredientsAction)
                .accessibilityIdentifier("editor-prototype-sheet-add-ingredients")
            }

            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                EditorPrototypeSectionHeader(
                    title: "Steps",
                    supportingText: stepLines.isEmpty
                        ? "Build the method in one focused pass."
                        : "Everything stays numbered for you."
                )

                if !stepRows.isEmpty {
                    EditorPrototypeStepList(rows: stepRows)
                }

                SavoroButton(
                    stepLines.isEmpty ? "Add steps" : "Add more steps",
                    systemImage: "plus",
                    variant: .secondary
                ) {
                    activeSheet = .steps
                }
                .accessibilityIdentifier("editor-prototype-sheet-add-steps")
            }
        }
        .accessibilityIdentifier("editor-prototype-sheet-build")
    }

    private var ingredientRows: [RecipeEditorParsedIngredientLine] {
        RecipeEditorIngredientLineParser
            .parse(ingredientLines.joined(separator: "\n"))
            .filter(\.isIngredient)
    }

    private var stepRows: [RecipeEditorInstructionBlock] {
        RecipeEditorInstructionParser
            .parse(stepLines.joined(separator: "\n\n"))
            .filter { !$0.isPhaseHeader }
    }

    @ViewBuilder
    private func rapidEntrySheet(
        for kind: EditorPrototypeSheetKind,
        onDone: @escaping () -> Void
    ) -> some View {
        switch kind {
        case .ingredients:
            EditorPrototypeRapidIngredientSheet(
                ingredientLines: $ingredientLines,
                onDone: onDone
            )
        case .steps:
            EditorPrototypeRapidStepSheet(
                stepLines: $stepLines,
                onDone: onDone
            )
        }
    }
}

private enum EditorPrototypeScrollTarget: Hashable {
    case ingredientsAction
}

private struct EditorPrototypeShell<Content: View>: View {
    @Binding var title: String
    @Binding var servingsText: String

    @State private var description = ""
    @State private var isDescriptionExpanded = false
    @State private var isYieldExpanded = false
    @State private var yieldText = ""
    @State private var photoWasChosen = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.dismiss) private var dismiss

    private let initialScrollTarget: EditorPrototypeScrollTarget?
    private let content: Content

    init(
        title: Binding<String>,
        servingsText: Binding<String>,
        initialScrollTarget: EditorPrototypeScrollTarget? = nil,
        @ViewBuilder content: () -> Content
    ) {
        _title = title
        _servingsText = servingsText
        self.initialScrollTarget = initialScrollTarget
        self.content = content()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                navigationHeader
                photoDropZone
                titleForm
                servingsCard
                content
            }
            .padding(SavoroSpacing.lg)
            .padding(.top, SavoroSpacing.xxxl)
        }
        .defaultScrollAnchor(
            initialScrollTarget == nil
                ? .top
                : UnitPoint(x: 0.5, y: 0.65)
        )
        .ignoresSafeArea(edges: .top)
        .scrollDismissesKeyboard(.interactively)
        .background(SavoroColor.page.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .bottom, spacing: SavoroSpacing.none) {
            bottomBar
        }
    }

    private var navigationHeader: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(SavoroTypography.bodyEmphasized)
                    .foregroundStyle(SavoroColor.textStrong)
                    .frame(
                        width: SavoroControlSize.minimumTapTarget,
                        height: SavoroControlSize.minimumTapTarget
                    )
                    .background(SavoroColor.cardStrong)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Back")

            Text("New recipe")
                .font(SavoroTypography.display)
                .foregroundStyle(SavoroColor.textStrong)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var photoDropZone: some View {
        Button {
            photoWasChosen = true
        } label: {
            VStack(spacing: SavoroSpacing.sm) {
                Image(systemName: photoWasChosen ? "checkmark.circle.fill" : "photo")
                    .font(SavoroTypography.title1)
                    .foregroundStyle(photoWasChosen ? SavoroColor.accentStrong : SavoroColor.textSubtle)
                Text(photoWasChosen ? "Photo choices are coming soon" : "Add a photo (optional)")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(height: SavoroControlSize.photoDropZoneHeight)
            .background(SavoroColor.raised)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.glass, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.glass, style: .continuous)
                    .stroke(
                        SavoroColor.borderStrong,
                        style: StrokeStyle(
                            lineWidth: SavoroSpacing.hairline,
                            dash: [SavoroSpacing.xxs, SavoroSpacing.xxs]
                        )
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Add a photo")
        .accessibilityHint("Choose a photo for this recipe.")
    }

    private var titleForm: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            EditorPrototypeEyebrow("Title")
            TextField(
                "Recipe title",
                text: $title,
                prompt: Text("e.g. Spicy Tofu Rice Bowl")
                    .foregroundStyle(SavoroColor.fieldPlaceholder)
            )
            .textInputAutocapitalization(.words)
            .editorPrototypeField()
            .accessibilityLabel("Recipe title")

            if isDescriptionExpanded {
                HStack {
                    EditorPrototypeEyebrow("Description")
                    Spacer()
                    SavoroButton(
                        "Hide",
                        variant: .text,
                        expandsHorizontally: false,
                        size: .compact
                    ) {
                        isDescriptionExpanded = false
                    }
                }
                TextField(
                    "Description",
                    text: $description,
                    prompt: Text("What makes this recipe yours?")
                        .foregroundStyle(SavoroColor.fieldPlaceholder),
                    axis: .vertical
                )
                .lineLimit(2...4)
                .editorPrototypeField(isMultiline: true)
                .accessibilityLabel("Short description")
            } else {
                SavoroButton(
                    "Add description",
                    systemImage: "plus",
                    variant: .text,
                    expandsHorizontally: false,
                    size: .compact
                ) {
                    isDescriptionExpanded = true
                }
            }
        }
    }

    private var servingsCard: some View {
        SavoroCard(style: .strong) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            servingsLabel
                            servingsStepper
                        }
                    } else {
                        HStack(spacing: SavoroSpacing.md) {
                            servingsLabel
                            Spacer()
                            servingsStepper
                        }
                    }
                }

                if isYieldExpanded {
                    TextField(
                        "Yield",
                        text: $yieldText,
                        prompt: Text("e.g. 6 bowls")
                            .foregroundStyle(SavoroColor.fieldPlaceholder)
                    )
                    .editorPrototypeField()
                    .accessibilityLabel("Yield, optional")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var servingsLabel: some View {
        HStack(spacing: SavoroSpacing.compact) {
            Text("Servings")
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textStrong)
            SavoroButton(
                yieldText.isEmpty ? "(yield)" : "(\(yieldText))",
                variant: .text,
                expandsHorizontally: false,
                size: .compact
            ) {
                isYieldExpanded.toggle()
            }
        }
    }

    private var servingsStepper: some View {
        HStack(spacing: SavoroSpacing.sm) {
            servingButton(systemImage: "minus", isDisabled: currentServings <= 1) {
                adjustServings(by: -1)
            }
            .accessibilityLabel("Decrease servings")

            Text(formatRecipeNumber(currentServings))
                .font(SavoroTypography.numericHeadline)
                .foregroundStyle(SavoroColor.textStrong)
                .frame(minWidth: SavoroSpacing.xl)
                .accessibilityElement()
                .accessibilityLabel("Servings")
                .accessibilityValue(formatRecipeNumber(currentServings))

            servingButton(systemImage: "plus") {
                adjustServings(by: 1)
            }
            .accessibilityLabel("Increase servings")
        }
    }

    private func servingButton(
        systemImage: String,
        isDisabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textStrong)
                .frame(
                    width: SavoroControlSize.minimumTapTarget,
                    height: SavoroControlSize.minimumTapTarget
                )
                .background(SavoroColor.cardStrong)
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(SavoroColor.border, lineWidth: SavoroSpacing.hairline)
                )
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.48 : 1)
    }

    private var bottomBar: some View {
        HStack(spacing: SavoroSpacing.sm) {
            SavoroButton("Save draft", variant: .soft) {}
                .savoroShadow(SavoroShadow.small)
            SavoroButton("Save & publish", variant: .ink) {}
        }
        .padding(.horizontal, SavoroSpacing.lg)
        .padding(.vertical, SavoroSpacing.sm)
        .background(SavoroColor.raised.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) {
            Divider().overlay(SavoroColor.glassBorder)
        }
    }

    private var currentServings: Double {
        RecipeEditorMacroCalculator.positiveNumber(from: servingsText) ?? 2
    }

    private func adjustServings(by amount: Double) {
        servingsText = formatRecipeNumber(max(1, currentServings + amount))
    }

    private func formatRecipeNumber(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }
}

private struct EditorPrototypeSectionHeader: View {
    let title: String
    let supportingText: String

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(title)
                .font(SavoroTypography.title2)
                .foregroundStyle(SavoroColor.textStrong)
            Text(supportingText)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct EditorPrototypeEmptyListRow: View {
    let systemImage: String
    let title: String

    var body: some View {
        SavoroCard(style: .plain, insets: .compact) {
            HStack(spacing: SavoroSpacing.sm) {
                Image(systemName: systemImage)
                    .font(SavoroTypography.bodyEmphasized)
                    .foregroundStyle(SavoroColor.accentStrong)
                    .frame(
                        width: SavoroControlSize.minimumTapTarget,
                        height: SavoroControlSize.minimumTapTarget
                    )
                    .background(SavoroColor.accentSoft)
                    .clipShape(Circle())
                Text(title)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

private struct EditorPrototypeIngredientList: View {
    let rows: [RecipeEditorParsedIngredientLine]

    var body: some View {
        VStack(spacing: SavoroSpacing.xs) {
            ForEach(rows) { row in
                Button {} label: {
                    EditorPrototypeIngredientRow(row: row)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(
                    row.isNutritionLinked
                        ? "\(row.name), \(quantitySummary(for: row)), nutrition linked"
                        : "\(row.name), \(quantitySummary(for: row))"
                )
                .accessibilityHint("Opens ingredient details.")
            }
        }
    }

    private func quantitySummary(for row: RecipeEditorParsedIngredientLine) -> String {
        let summary = [row.quantityText, row.unit]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return summary.isEmpty ? "As needed" : summary
    }
}

private struct EditorPrototypeIngredientRow: View {
    let row: RecipeEditorParsedIngredientLine
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .plain, insets: .compact) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        ingredientText
                        HStack(spacing: SavoroSpacing.xs) {
                            nutritionDot
                            Text("Ingredient details")
                                .font(SavoroTypography.micro)
                                .foregroundStyle(SavoroColor.textMuted)
                        }
                    }
                } else {
                    HStack(spacing: SavoroSpacing.sm) {
                        ingredientText
                        Spacer(minLength: SavoroSpacing.sm)
                        nutritionDot
                        Image(systemName: "chevron.right")
                            .font(SavoroTypography.micro)
                            .foregroundStyle(SavoroColor.textSubtle)
                    }
                }
            }
            .frame(maxWidth: .infinity, minHeight: SavoroControlSize.minimumTapTarget, alignment: .leading)
            .contentShape(Rectangle())
        }
    }

    private var ingredientText: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.compact) {
            Text(row.name)
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textStrong)
                .multilineTextAlignment(.leading)
            Text(quantitySummary)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var nutritionDot: some View {
        Circle()
            .fill(row.isNutritionLinked ? SavoroColor.positive : SavoroColor.borderStrong)
            .frame(width: SavoroSpacing.xs, height: SavoroSpacing.xs)
            .overlay(
                Circle().stroke(SavoroColor.cardStrong, lineWidth: SavoroSpacing.compact)
            )
            .accessibilityHidden(true)
    }

    private var quantitySummary: String {
        let summary = [row.quantityText, row.unit]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return summary.isEmpty ? "As needed" : summary
    }
}

private struct EditorPrototypeStepList: View {
    let rows: [RecipeEditorInstructionBlock]

    var body: some View {
        VStack(spacing: SavoroSpacing.xs) {
            ForEach(rows) { row in
                SavoroCard(style: .plain, insets: .compact) {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        Text(row.displayNumber ?? "")
                            .font(SavoroTypography.numericHeadline)
                            .foregroundStyle(SavoroColor.textOnAccent)
                            .frame(
                                width: SavoroControlSize.minimumTapTarget,
                                height: SavoroControlSize.minimumTapTarget
                            )
                            .background(SavoroColor.accent)
                            .clipShape(Circle())
                            .accessibilityHidden(true)
                        Text(row.body)
                            .font(SavoroTypography.callout)
                            .foregroundStyle(SavoroColor.textBody)
                            .frame(maxWidth: .infinity, minHeight: SavoroControlSize.minimumTapTarget, alignment: .leading)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(row.accessibilityLabel)
            }
        }
    }
}

private struct EditorPrototypeComposerField: View {
    @Binding var text: String
    let prompt: String
    let accessibilityLabel: String
    let onSubmit: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        SavoroCard(style: .accent, insets: .compact) {
            HStack(spacing: SavoroSpacing.sm) {
                Image(systemName: "plus.circle.fill")
                    .font(SavoroTypography.title1)
                    .foregroundStyle(SavoroColor.accentStrong)
                    .accessibilityHidden(true)
                TextField(
                    prompt,
                    text: $text,
                    prompt: Text(prompt).foregroundStyle(SavoroColor.fieldPlaceholder)
                )
                .font(SavoroTypography.body)
                .foregroundStyle(SavoroColor.textStrong)
                .submitLabel(.next)
                .focused($isFocused)
                .onSubmit {
                    onSubmit()
                    isFocused = true
                }
                .accessibilityLabel(accessibilityLabel)
            }
            .padding(.horizontal, SavoroSpacing.xs)
            .frame(minHeight: SavoroControlSize.minimumTapTarget)
        }
    }
}

private struct EditorPrototypeRapidIngredientSheet: View {
    @Binding var ingredientLines: [String]
    let onDone: () -> Void

    @State private var draft = ""
    @FocusState private var isComposerFocused: Bool

    var body: some View {
        VStack(spacing: SavoroSpacing.none) {
            EditorPrototypeRapidSheetHeader(
                eyebrow: "Ingredients",
                title: "Add ingredients",
                supportingText: "Add one, press next, and keep going.",
                onDone: onDone
            )

            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    EditorPrototypeComposerField(
                        text: $draft,
                        prompt: "e.g. 2 cups flour",
                        accessibilityLabel: "Add an ingredient"
                    ) {
                        addIngredient()
                    }
                    .focused($isComposerFocused)

                    if ingredientRows.isEmpty {
                        EditorPrototypeEmptyListRow(
                            systemImage: "sparkles",
                            title: "The next ingredient lands here"
                        )
                    } else {
                        HStack {
                            EditorPrototypeEyebrow("In this recipe")
                            Spacer()
                            Text("\(ingredientRows.count)")
                                .font(SavoroTypography.numericBody)
                                .foregroundStyle(SavoroColor.textMuted)
                        }
                        EditorPrototypeIngredientList(rows: ingredientRows)
                    }
                }
                .padding(SavoroSpacing.lg)
            }
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("editor-prototype-sheet-ingredients-open")
        .onAppear {
            isComposerFocused = true
        }
    }

    private var ingredientRows: [RecipeEditorParsedIngredientLine] {
        RecipeEditorIngredientLineParser
            .parse(ingredientLines.joined(separator: "\n"))
            .filter(\.isIngredient)
    }

    private func addIngredient() {
        guard let line = EditorPrototypeSmartEntryEngine.ingredientLine(
            from: draft,
            lineIndex: ingredientLines.count
        ) else { return }
        ingredientLines.append(line)
        draft = ""
        isComposerFocused = true
    }
}

private struct EditorPrototypeRapidStepSheet: View {
    @Binding var stepLines: [String]
    let onDone: () -> Void

    @State private var draft = ""
    @FocusState private var isComposerFocused: Bool

    var body: some View {
        VStack(spacing: SavoroSpacing.none) {
            EditorPrototypeRapidSheetHeader(
                eyebrow: "Steps",
                title: "Add steps",
                supportingText: "Press next and the following number is ready.",
                onDone: onDone
            )

            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    EditorPrototypeComposerField(
                        text: $draft,
                        prompt: "Write the next step…",
                        accessibilityLabel: "Add the next step"
                    ) {
                        addStep()
                    }
                    .focused($isComposerFocused)

                    if stepRows.isEmpty {
                        EditorPrototypeEmptyListRow(
                            systemImage: "sparkles",
                            title: "The next step lands here"
                        )
                    } else {
                        HStack {
                            EditorPrototypeEyebrow("In this recipe")
                            Spacer()
                            Text("\(stepRows.count)")
                                .font(SavoroTypography.numericBody)
                                .foregroundStyle(SavoroColor.textMuted)
                        }
                        EditorPrototypeStepList(rows: stepRows)
                    }
                }
                .padding(SavoroSpacing.lg)
            }
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .onAppear {
            isComposerFocused = true
        }
    }

    private var stepRows: [RecipeEditorInstructionBlock] {
        RecipeEditorInstructionParser
            .parse(stepLines.joined(separator: "\n\n"))
            .filter { !$0.isPhaseHeader }
    }

    private func addStep() {
        guard let step = EditorPrototypeSmartEntryEngine.stepBody(from: draft) else { return }
        stepLines.append(step)
        draft = ""
        isComposerFocused = true
    }
}

private struct EditorPrototypeRapidSheetHeader: View {
    let eyebrow: String
    let title: String
    let supportingText: String
    let onDone: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: SavoroSpacing.md) {
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                EditorPrototypeEyebrow(eyebrow)
                Text(title)
                    .font(SavoroTypography.title1)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(supportingText)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
            }
            Spacer(minLength: SavoroSpacing.sm)
            SavoroButton(
                "Done",
                variant: .soft,
                expandsHorizontally: false,
                size: .compact,
                action: onDone
            )
        }
        .padding(.horizontal, SavoroSpacing.lg)
        .padding(.top, SavoroSpacing.xl)
        .padding(.bottom, SavoroSpacing.md)
        .background(SavoroColor.raised)
        .overlay(alignment: .bottom) {
            Divider().overlay(SavoroColor.glassBorder)
        }
    }
}

private struct EditorPrototypeEyebrow: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text.uppercased())
            .font(SavoroTypography.label)
            .tracking(SavoroSpacing.hairline)
            .foregroundStyle(SavoroColor.textMuted)
    }
}

private struct EditorPrototypeFieldChrome: ViewModifier {
    let isMultiline: Bool

    func body(content: Content) -> some View {
        content
            .font(SavoroTypography.body)
            .foregroundStyle(SavoroColor.textStrong)
            .padding(.horizontal, SavoroSpacing.md)
            .padding(.vertical, SavoroSpacing.sm)
            .frame(minHeight: isMultiline ? SavoroControlSize.minimumTapTarget + SavoroSpacing.lg : SavoroControlSize.minimumTapTarget)
            .background(SavoroColor.cardStrong)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(SavoroColor.border, lineWidth: SavoroSpacing.hairline)
            )
    }
}

private extension View {
    func editorPrototypeField(isMultiline: Bool = false) -> some View {
        modifier(EditorPrototypeFieldChrome(isMultiline: isMultiline))
    }
}
