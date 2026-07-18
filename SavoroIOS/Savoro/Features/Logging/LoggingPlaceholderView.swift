import SwiftUI

extension MealType: CustomStringConvertible {
    var description: String { displayTitle }

    var displayTitle: String {
        switch self {
        case .breakfast: "Breakfast"
        case .lunch: "Lunch"
        case .dinner: "Dinner"
        case .snack: "Snack"
        }
    }
}

struct LogRecipeSheetViewModel: Equatable {
    struct MacroPreview: Equatable, Identifiable {
        let kind: SavoroMacroKind
        let value: Double

        var id: SavoroMacroKind { kind }

        var savoroValue: SavoroMacroValue {
            SavoroMacroValue(kind: kind, value: value, goal: nil)
        }
    }

    let requestedRecipeId: String?
    let recipeId: String
    let recipeVersionId: String
    let title: String
    let creator: String
    let sourceLabel: String
    let servingRange: ClosedRange<Double>
    let servingStep: Double
    let selectedServings: Double
    let selectedMealType: MealType
    let selectedDate: Date
    let calendar: Calendar
    let locale: Locale
    let primaryButtonTitle: String
    let secondaryButtonTitle: String
    let scaffoldNotice: String
    let privacyCopy: String
    let provenanceTitle: String
    let provenanceDetail: String
    let perServingMacros: MacroTotals

    init(requestedRecipeId: String?, requestedRecipeVersionId: String? = nil, defaultMealType: MealType? = nil, defaultLogDate: Date = Date(), calendar: Calendar = Calendar(identifier: .gregorian)) {
        let mockRecipe = Self.mockRecipe(for: requestedRecipeId, requestedRecipeVersionId: requestedRecipeVersionId)
        self.requestedRecipeId = requestedRecipeId
        self.recipeId = mockRecipe.recipeId
        self.recipeVersionId = mockRecipe.recipeVersionId
        self.title = mockRecipe.title
        self.creator = mockRecipe.creator
        self.sourceLabel = mockRecipe.sourceLabel
        self.servingRange = 0.5...6
        self.servingStep = 0.5
        self.selectedServings = 1
        self.selectedMealType = defaultMealType ?? .lunch
        self.selectedDate = defaultLogDate
        self.calendar = calendar
        self.locale = Locale(identifier: "en_US_POSIX")
        self.primaryButtonTitle = "Log privately"
        self.secondaryButtonTitle = "Not now"
        self.scaffoldNotice = "You can change the serving, meal, or date before adding it."
        self.privacyCopy = "This entry stays in your private Today log and never appears on public surfaces."
        self.provenanceTitle = "Saved as you log it"
        self.provenanceDetail = "Savoro keeps the recipe and nutrition shown here with this entry."
        self.perServingMacros = mockRecipe.perServingMacros
    }

    private struct MockRecipe: Equatable {
        let recipeId: String
        let recipeVersionId: String
        let title: String
        let creator: String
        let sourceLabel: String
        let perServingMacros: MacroTotals
    }

    private static func mockRecipe(for requestedRecipeId: String?, requestedRecipeVersionId: String?) -> MockRecipe {
        let fallback = MockRecipe(
            recipeId: "recipe_shawarma_bowl",
            recipeVersionId: "recipe_version_20260606",
            title: "Chicken Shawarma Bowl",
            creator: "Avery Kitchen",
            sourceLabel: "Recipe you selected",
            perServingMacros: try! MacroTotals(calories: 520, proteinGrams: 42, carbsGrams: 48, fatGrams: 18, fiberGrams: 7, sodiumMilligrams: 780)
        )
        let recipes = [
            fallback,
            MockRecipe(
                recipeId: "rec_dev_bowl",
                recipeVersionId: "rcv_dev_bowl_v1",
                title: "Dev Burrito Bowl",
                creator: "Dev Alice",
                sourceLabel: "Local recipe",
                perServingMacros: try! MacroTotals(calories: 520, proteinGrams: 38, carbsGrams: 58, fatGrams: 18, fiberGrams: 9, sodiumMilligrams: 760)
            ),
            MockRecipe(
                recipeId: "recipe_lentil_soup",
                recipeVersionId: "recipe_version_lentil_20260604",
                title: "Lemony Lentil Soup",
                creator: "Maya Reed",
                sourceLabel: "Creator recipe",
                perServingMacros: try! MacroTotals(calories: 340, proteinGrams: 19, carbsGrams: 46, fatGrams: 9)
            ),
            MockRecipe(
                recipeId: "recipe_berry_oat_bowl",
                recipeVersionId: "recipe_version_oats_20260602",
                title: "Berry Oat Breakfast Bowl",
                creator: "You",
                sourceLabel: "Your recipe",
                perServingMacros: try! MacroTotals(calories: 410, proteinGrams: 24, carbsGrams: 58, fatGrams: 11)
            )
        ]
        if let requestedRecipeVersionId, let match = recipes.first(where: { $0.recipeVersionId == requestedRecipeVersionId }) { return match }
        if let requestedRecipeId, let match = recipes.first(where: { $0.recipeId == requestedRecipeId }) { return match }
        return fallback
    }

    func updatingServings(_ servings: Double) -> Self {
        Self(base: self, selectedServings: clampedServings(servings), selectedMealType: selectedMealType, selectedDate: selectedDate)
    }

    func steppingServings(by delta: Double) -> Self {
        updatingServings(selectedServings + delta)
    }

    func updatingMealType(_ mealType: MealType) -> Self {
        Self(base: self, selectedServings: selectedServings, selectedMealType: mealType, selectedDate: selectedDate)
    }

    func updatingDate(byAddingDays days: Int) -> Self {
        let newDate = calendar.date(byAdding: .day, value: days, to: selectedDate) ?? selectedDate
        return Self(base: self, selectedServings: selectedServings, selectedMealType: selectedMealType, selectedDate: newDate)
    }

    private init(base: Self, selectedServings: Double, selectedMealType: MealType, selectedDate: Date) {
        self.requestedRecipeId = base.requestedRecipeId
        self.recipeId = base.recipeId
        self.recipeVersionId = base.recipeVersionId
        self.title = base.title
        self.creator = base.creator
        self.sourceLabel = base.sourceLabel
        self.servingRange = base.servingRange
        self.servingStep = base.servingStep
        self.selectedServings = selectedServings
        self.selectedMealType = selectedMealType
        self.selectedDate = selectedDate
        self.calendar = base.calendar
        self.locale = base.locale
        self.primaryButtonTitle = base.primaryButtonTitle
        self.secondaryButtonTitle = base.secondaryButtonTitle
        self.scaffoldNotice = base.scaffoldNotice
        self.privacyCopy = base.privacyCopy
        self.provenanceTitle = base.provenanceTitle
        self.provenanceDetail = base.provenanceDetail
        self.perServingMacros = base.perServingMacros
    }

    private func clampedServings(_ servings: Double) -> Double {
        let stepped = (servings / servingStep).rounded() * servingStep
        return min(max(stepped, servingRange.lowerBound), servingRange.upperBound)
    }

    var servingText: String {
        "\(selectedServings.formatted(.number.precision(.fractionLength(0...1)))) serving"
            + (selectedServings == 1 ? "" : "s")
    }

    var canDecreaseServings: Bool { selectedServings > servingRange.lowerBound }
    var canIncreaseServings: Bool { selectedServings < servingRange.upperBound }

    var mealTitle: String { "Meal: \(selectedMealType.displayTitle)" }

    var dateTitle: String {
        if calendar.isDateInToday(selectedDate) { return "Date: Today" }
        if calendar.isDateInYesterday(selectedDate) { return "Date: Yesterday" }
        if calendar.isDateInTomorrow(selectedDate) { return "Date: Tomorrow" }
        return "Date: \(selectedDate.formatted(.dateTime.month(.abbreviated).day().locale(locale)))"
    }

    var recipeIdentitySubtitle: String {
        "By \(creator) • \(sourceLabel)"
    }

    var versionCopy: String {
        "Savoro will keep the version you log."
    }

    var macroPreviewTitle: String {
        "Macro preview for \(servingText)"
    }

    var macroPreview: [MacroPreview] {
        [
            MacroPreview(kind: .calories, value: snapshotMacros.calories),
            MacroPreview(kind: .protein, value: snapshotMacros.proteinGrams),
            MacroPreview(kind: .carbs, value: snapshotMacros.carbsGrams),
            MacroPreview(kind: .fat, value: snapshotMacros.fatGrams)
        ]
    }

    var snapshotMacros: MacroTotals {
        try! MacroTotals(
            calories: perServingMacros.calories * selectedServings,
            proteinGrams: perServingMacros.proteinGrams * selectedServings,
            carbsGrams: perServingMacros.carbsGrams * selectedServings,
            fatGrams: perServingMacros.fatGrams * selectedServings,
            fiberGrams: perServingMacros.fiberGrams.map { $0 * selectedServings },
            sodiumMilligrams: perServingMacros.sodiumMilligrams.map { $0 * selectedServings }
        )
    }

    func logRequestPayload(userId: String = "user_1", now: Date = Date()) -> LogRecipeRequestPayload {
        LogRecipeRequestPayload(
            userId: userId,
            recipeId: recipeId,
            recipeVersionId: recipeVersionId,
            date: logDateString,
            mealType: selectedMealType,
            servings: selectedServings,
            snapshot: NutritionSnapshot(
                displayName: title,
                macros: snapshotMacros,
                sourceLabel: "The version you logged",
                capturedAt: now
            )
        )
    }

    var logDateString: String {
        Self.logDateFormatter.string(from: selectedDate)
    }

    private static let logDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

struct LoggingPlaceholderView: View {
    var body: some View {
        PlaceholderFeatureView(
            title: "Logging",
            subtitle: "Private food and recipe logging is coming soon.",
            foundationNotes: [
                "Choose a serving, meal, and date before you add an entry.",
                "Entries keep the nutrition shown when you log them.",
                "Your food log and daily nutrition stay private to you."
            ],
            accent: SavoroColor.protein
        )
    }
}

enum LogRecipeSubmissionStatus: Equatable {
    case idle
    case submitting
    case succeeded(String)
    case errored(String)

    var isSubmitting: Bool {
        if case .submitting = self { return true }
        return false
    }

    var controlsDisabled: Bool { isSubmitting }
    var canDismiss: Bool { !isSubmitting }
    var canEditInputs: Bool { !isSubmitting }
}

struct LogRecipeSheetView: View {
    @State private var viewModel: LogRecipeSheetViewModel
    @State private var submissionStatus: LogRecipeSubmissionStatus = .idle
    var onDismiss: () -> Void = {}
    var onConfirm: (LogRecipeSheetViewModel) async -> LogRecipeSubmissionStatus = { _ in .succeeded("Added to Today privately.") }

    init(
        viewModel: LogRecipeSheetViewModel,
        onDismiss: @escaping () -> Void = {},
        onConfirm: @escaping (LogRecipeSheetViewModel) async -> LogRecipeSubmissionStatus = { _ in .succeeded("Added to Today privately.") }
    ) {
        _viewModel = State(initialValue: viewModel)
        self.onDismiss = onDismiss
        self.onConfirm = onConfirm
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                LogRecipeIdentityCard(viewModel: viewModel)
                LogRecipeServingCard(viewModel: viewModel, canEditInputs: submissionStatus.canEditInputs) { viewModel = $0 }
                LogRecipeMealDateCard(viewModel: viewModel, canEditInputs: submissionStatus.canEditInputs) { viewModel = $0 }
                SavoroNutritionSnapshotCard(
                    title: viewModel.macroPreviewTitle,
                    subtitle: "Nutrition for the serving amount above. Your daily goals stay private.",
                    macros: viewModel.macroPreview.map(\.savoroValue)
                )
                LogRecipePrivacyCard(viewModel: viewModel)
                LogRecipeSubmissionStateCard(status: submissionStatus)
                LogRecipeActionCard(
                    viewModel: viewModel,
                    isSubmitting: submissionStatus.isSubmitting,
                    onConfirm: submit,
                    onDismiss: onDismiss
                )
            }
            .padding(SavoroSpacing.lg)
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("log-recipe-screen")
        .navigationTitle("Log Recipe")
        .navigationBarTitleDisplayMode(.inline)
        .interactiveDismissDisabled(!submissionStatus.canDismiss)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Close", action: onDismiss)
                    .disabled(!submissionStatus.canDismiss)
            }
        }
    }

    private func submit() {
        guard !submissionStatus.isSubmitting else { return }
        submissionStatus = .submitting
        Task {
            let result = await onConfirm(viewModel)
            await MainActor.run { submissionStatus = result }
        }
    }
}

private struct LogRecipeIdentityCard: View {
    let viewModel: LogRecipeSheetViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                SavoroChip(title: "Private recipe log", systemImage: "fork.knife.circle.fill", variant: .accent)
                Text(viewModel.title)
                    .font(SavoroTypography.title2)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(viewModel.recipeIdentitySubtitle)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
                SavoroPill(style: .positive) {
                    Group {
                        if dynamicTypeSize.isAccessibilitySize {
                            VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                                provenanceContent
                            }
                        } else {
                            HStack(spacing: SavoroSpacing.xs) {
                                provenanceContent
                            }
                        }
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var provenanceContent: some View {
        Image(systemName: "doc.text.magnifyingglass")
            .foregroundStyle(SavoroColor.positive)
        VStack(alignment: .leading, spacing: SavoroSpacing.hairline) {
            Text(viewModel.provenanceTitle)
                .font(SavoroTypography.label)
            Text(viewModel.provenanceDetail)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct LogRecipeServingCard: View {
    let viewModel: LogRecipeSheetViewModel
    let canEditInputs: Bool
    let onChange: (LogRecipeSheetViewModel) -> Void
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .plain) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                Text("Serving count")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(spacing: SavoroSpacing.sm) {
                            servingControls
                        }
                    } else {
                        HStack {
                            servingControls
                        }
                    }
                }
                Text("Choose 0.5–6 servings in half-serving steps. The nutrition above updates before anything is added.")
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
        }
    }

    @ViewBuilder
    private var servingControls: some View {
        SavoroButton(
            "−",
            variant: .secondary,
            isDisabled: !canEditInputs || !viewModel.canDecreaseServings,
            expandsHorizontally: false
        ) {
            onChange(viewModel.steppingServings(by: -viewModel.servingStep))
        }
        Text(viewModel.servingText)
            .font(SavoroTypography.numericHeadline.monospacedDigit())
            .foregroundStyle(SavoroColor.textStrong)
            .frame(maxWidth: .infinity)
        SavoroButton(
            "+",
            variant: .secondary,
            isDisabled: !canEditInputs || !viewModel.canIncreaseServings,
            expandsHorizontally: false
        ) {
            onChange(viewModel.steppingServings(by: viewModel.servingStep))
        }
    }
}

private struct LogRecipeMealDateCard: View {
    let viewModel: LogRecipeSheetViewModel
    let canEditInputs: Bool
    let onChange: (LogRecipeSheetViewModel) -> Void
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .plain) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                Text("Meal & date")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                SavoroSegmentedControl(options: MealType.allCases, selection: Binding(
                    get: { viewModel.selectedMealType },
                    set: { onChange(viewModel.updatingMealType($0)) }
                ))
                .disabled(!canEditInputs)
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            dateControls
                        }
                    } else {
                        HStack(spacing: SavoroSpacing.sm) {
                            dateControls
                        }
                    }
                }
                Text("Choose where this belongs in your day. Nothing is added until you confirm.")
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
        }
    }

    @ViewBuilder
    private var dateControls: some View {
        SavoroButton(
            "Previous day",
            variant: .secondary,
            isDisabled: !canEditInputs,
            expandsHorizontally: false
        ) {
            onChange(viewModel.updatingDate(byAddingDays: -1))
        }
        SavoroChip(title: viewModel.dateTitle, systemImage: "calendar", variant: .neutral)
            .frame(maxWidth: .infinity)
        SavoroButton(
            "Next day",
            variant: .secondary,
            isDisabled: !canEditInputs,
            expandsHorizontally: false
        ) {
            onChange(viewModel.updatingDate(byAddingDays: 1))
        }
    }
}

private struct LogRecipePrivacyCard: View {
    let viewModel: LogRecipeSheetViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .glass) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        privacyContent
                    }
                } else {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        privacyContent
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var privacyContent: some View {
        Image(systemName: "lock.shield.fill")
            .foregroundStyle(SavoroColor.accent)
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text("Private by default")
                .font(SavoroTypography.headline)
                .foregroundStyle(SavoroColor.textStrong)
            Text(viewModel.privacyCopy)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
            Text(viewModel.scaffoldNotice)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
        }
    }
}

private struct LogRecipeSubmissionStateCard: View {
    let status: LogRecipeSubmissionStatus
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        Group {
            switch status {
            case .idle:
                EmptyView()
            case .submitting:
                stateRow(icon: "hourglass", title: "Adding privately…", detail: "Keeping this version with your private Today entry.")
            case .succeeded(let message):
                stateRow(icon: "checkmark.circle.fill", title: "Added privately", detail: message)
            case .errored(let message):
                stateRow(icon: "exclamationmark.triangle.fill", title: "Could not add this entry", detail: message)
            }
        }
    }

    private func stateRow(icon: String, title: String, detail: String) -> some View {
        SavoroCard(style: .glass) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        stateContent(icon: icon, title: title, detail: detail)
                    }
                } else {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        stateContent(icon: icon, title: title, detail: detail)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func stateContent(icon: String, title: String, detail: String) -> some View {
        Image(systemName: icon).foregroundStyle(SavoroColor.accent)
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(title).font(SavoroTypography.bodyEmphasized).foregroundStyle(SavoroColor.textStrong)
            Text(detail).font(SavoroTypography.callout).foregroundStyle(SavoroColor.textBody)
        }
    }
}

private struct LogRecipeActionCard: View {
    let viewModel: LogRecipeSheetViewModel
    let isSubmitting: Bool
    let onConfirm: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: SavoroSpacing.sm) {
            SavoroButton(isSubmitting ? "Adding privately…" : viewModel.primaryButtonTitle, systemImage: "lock.fill", variant: .primary, action: onConfirm)
                .disabled(isSubmitting)
                .accessibilityIdentifier("log-recipe-confirm-button")
            SavoroButton(viewModel.secondaryButtonTitle, systemImage: "xmark", variant: .secondary, action: onDismiss)
                .disabled(isSubmitting)
                .accessibilityIdentifier("log-recipe-cancel-button")
        }
    }
}

#Preview("Log recipe sheet") {
    NavigationStack {
        LogRecipeSheetView(viewModel: LogRecipeSheetViewModel(requestedRecipeId: nil))
    }
}
