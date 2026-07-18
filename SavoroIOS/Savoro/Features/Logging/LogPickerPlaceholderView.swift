import SwiftUI

struct LogPickerViewModel: Equatable {
    enum SectionKind: String, CaseIterable, Equatable, Identifiable {
        case recents
        case saved
        case mine
        case searchResults

        var id: String { rawValue }

        var title: String {
            switch self {
            case .recents: "Recent"
            case .saved: "Saved"
            case .mine: "Mine"
            case .searchResults: "Search results"
            }
        }

        var subtitle: String {
            switch self {
            case .recents: "Entries you’ve logged before, kept private."
            case .saved: "Recipes you saved for quicker logging later."
            case .mine: "Your reusable recipe drafts and published recipes."
            case .searchResults: "Matches from your recipes, saved ideas, and foods."
            }
        }
    }

    struct Item: Equatable, Identifiable {
        let id: String
        let title: String
        let subtitle: String
        let sectionKind: SectionKind
        let itemType: FoodLogItemType
        let recipeId: String?
        let recipeVersionId: String?
        let foodId: String?
        let sourceLabel: String
        let macros: MacroTotals
        let isPrivateContext: Bool

        var typeLabel: String { itemType == .recipe ? "Recipe" : "Food" }
        var typeSystemImage: String { itemType == .recipe ? "fork.knife.circle.fill" : "leaf.circle.fill" }
        var hasRecipeMetadata: Bool { recipeId != nil || recipeVersionId != nil }

        var searchableText: String {
            [title, subtitle, sourceLabel, typeLabel].joined(separator: " ").lowercased()
        }

        var macroValues: [SavoroMacroValue] {
            [
                SavoroMacroValue(kind: .calories, value: macros.calories, goal: nil),
                SavoroMacroValue(kind: .protein, value: macros.proteinGrams, goal: nil),
                SavoroMacroValue(kind: .carbs, value: macros.carbsGrams, goal: nil),
                SavoroMacroValue(kind: .fat, value: macros.fatGrams, goal: nil)
            ]
        }
    }

    struct Section: Equatable, Identifiable {
        let kind: SectionKind
        let items: [Item]
        var id: SectionKind { kind }
        var title: String { kind.title }
        var subtitle: String { kind.subtitle }
    }

    enum MockIssue: Equatable {
        case recoverableLocalSearch
    }

    enum ContentState: Equatable {
        case results
        case noResults(EmptyState)
        case recoverableError(EmptyState)
    }

    struct EmptyState: Equatable {
        let systemImage: String
        let title: String
        let message: String
        let primaryActionTitle: String
        let primaryActionMetadata: String
        let secondaryActionTitle: String?
        let secondaryActionMetadata: String?
    }

    let query: String
    let mealType: MealType?
    let sections: [Section]
    let mockIssue: MockIssue?
    let privacyCopy: String
    let scaffoldCopy: String

    init(query: String = "", mealType: MealType? = nil, sections: [Section]? = nil, mockIssue: MockIssue? = nil) {
        self.query = query
        self.mealType = mealType
        self.sections = sections ?? Self.defaultSections
        self.mockIssue = mockIssue
        self.privacyCopy = "Your logs, goals, and daily progress stay private. Choosing an item never shares it."
        self.scaffoldCopy = "Choose a recipe to review servings, meal, and date before adding it."
    }

    var title: String { "Log picker" }
    var searchPlaceholder: String { "Search foods or recipes" }
    var mealContextTitle: String { mealType.map { "Meal context: \($0.displayTitle)" } ?? "No meal preset selected" }
    var normalizedQuery: String { query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
    var showsDefaultSections: Bool { normalizedQuery.isEmpty }
    var visibleSections: [Section] {
        if contentState != .results { return [] }
        if showsDefaultSections { return sections }
        return [Section(kind: .searchResults, items: searchResults)]
    }

    var contentState: ContentState {
        if mockIssue == .recoverableLocalSearch { return .recoverableError(Self.recoverableErrorState) }
        if !showsDefaultSections && searchResults.isEmpty { return .noResults(noResultsState) }
        return .results
    }

    var noResultsState: EmptyState {
        EmptyState(
            systemImage: "magnifyingglass",
            title: "No matches yet",
            message: "We could not find a food or recipe for “\(query.trimmingCharacters(in: .whitespacesAndNewlines))”. Try a saved recipe name or clear search to browse quick picks.",
            primaryActionTitle: "Clear search",
            primaryActionMetadata: "clear-local-search-query",
            secondaryActionTitle: nil,
            secondaryActionMetadata: nil
        )
    }

    static let recoverableErrorState = EmptyState(
        systemImage: "exclamationmark.triangle.fill",
        title: "Search needs a refresh",
        message: "We couldn’t refresh these choices. Your private Today log is unchanged.",
        primaryActionTitle: "Try again",
        primaryActionMetadata: "retry-local-mock-search",
        secondaryActionTitle: "Clear search",
        secondaryActionMetadata: "clear-local-search-query"
    )
    var allItems: [Item] { sections.flatMap(\.items) }
    var searchResults: [Item] {
        guard !normalizedQuery.isEmpty else { return [] }
        return allItems
            .filter { $0.searchableText.contains(normalizedQuery) }
            .sorted { lhs, rhs in
                if lhs.itemType != rhs.itemType { return lhs.itemType == .recipe }
                return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
            }
            .map { item in
                Item(
                    id: "search_\(item.id)",
                    title: item.title,
                    subtitle: item.subtitle,
                    sectionKind: .searchResults,
                    itemType: item.itemType,
                    recipeId: item.recipeId,
                    recipeVersionId: item.recipeVersionId,
                    foodId: item.foodId,
                    sourceLabel: item.sourceLabel,
                    macros: item.macros,
                    isPrivateContext: item.isPrivateContext
                )
            }
    }

    static let liveTodaySections: [Section] = [
        Section(kind: .recents, items: [
            Item(
                id: "live_dev_bowl",
                title: "Dev Burrito Bowl",
                subtitle: "Local recipe • ready to log privately",
                sectionKind: .recents,
                itemType: .recipe,
                recipeId: "rec_dev_bowl",
                recipeVersionId: "rcv_dev_bowl_v1",
                foodId: nil,
                sourceLabel: "Local recipe",
                macros: try! MacroTotals(calories: 520, proteinGrams: 38, carbsGrams: 58, fatGrams: 18),
                isPrivateContext: false
            ),
            Item(
                id: "live_manual_yogurt",
                title: "Greek yogurt, 2%",
                subtitle: "Manual food • ready to log privately",
                sectionKind: .recents,
                itemType: .food,
                recipeId: nil,
                recipeVersionId: nil,
                foodId: nil,
                sourceLabel: "Manual entry",
                macros: try! MacroTotals(calories: 150, proteinGrams: 20, carbsGrams: 8, fatGrams: 4),
                isPrivateContext: true
            )
        ])
    ]

    static let defaultSections: [Section] = [
        Section(kind: .recents, items: [
            Item(
                id: "recent_shawarma_bowl",
                title: "Chicken Shawarma Bowl",
                subtitle: "Last logged privately for lunch • saved as logged",
                sectionKind: .recents,
                itemType: .recipe,
                recipeId: "recipe_shawarma_bowl",
                recipeVersionId: "recipe_version_20260606",
                foodId: nil,
                sourceLabel: "The recipe you logged",
                macros: try! MacroTotals(calories: 520, proteinGrams: 42, carbsGrams: 48, fatGrams: 18),
                isPrivateContext: true
            ),
            Item(
                id: "recent_greek_yogurt",
                title: "Greek Yogurt",
                subtitle: "Recent private entry • one cup",
                sectionKind: .recents,
                itemType: .food,
                recipeId: nil,
                recipeVersionId: nil,
                foodId: "food_greek_yogurt",
                sourceLabel: "USDA FoodData Central",
                macros: try! MacroTotals(calories: 150, proteinGrams: 20, carbsGrams: 8, fatGrams: 4),
                isPrivateContext: true
            )
        ]),
        Section(kind: .saved, items: [
            Item(
                id: "saved_lentil_soup",
                title: "Lemony Lentil Soup",
                subtitle: "Saved creator recipe • ready to log",
                sectionKind: .saved,
                itemType: .recipe,
                recipeId: "recipe_lentil_soup",
                recipeVersionId: "recipe_version_lentil_20260604",
                foodId: nil,
                sourceLabel: "Creator recipe",
                macros: try! MacroTotals(calories: 340, proteinGrams: 19, carbsGrams: 46, fatGrams: 9),
                isPrivateContext: false
            )
        ]),
        Section(kind: .mine, items: [
            Item(
                id: "mine_oat_bowl",
                title: "Berry Oat Breakfast Bowl",
                subtitle: "Your recipe • ready to log",
                sectionKind: .mine,
                itemType: .recipe,
                recipeId: "recipe_berry_oat_bowl",
                recipeVersionId: "recipe_version_oats_20260602",
                foodId: nil,
                sourceLabel: "Your recipe",
                macros: try! MacroTotals(calories: 410, proteinGrams: 24, carbsGrams: 58, fatGrams: 11),
                isPrivateContext: false
            )
        ])
    ]
}

struct LogPickerPlaceholderView: View {
    @State private var query: String
    @State private var mockIssue: LogPickerViewModel.MockIssue?
    let mealType: MealType?
    let sections: [LogPickerViewModel.Section]?
    var onSelect: (LogPickerViewModel.Item, MealType?) -> Void = { _, _ in }
    var onDismiss: () -> Void = {}

    init(
        mealType: MealType? = nil,
        initialQuery: String = "",
        mockIssue: LogPickerViewModel.MockIssue? = nil,
        sections: [LogPickerViewModel.Section]? = nil,
        onSelect: @escaping (LogPickerViewModel.Item, MealType?) -> Void = { _, _ in },
        onDismiss: @escaping () -> Void = {}
    ) {
        self.mealType = mealType
        self.sections = sections
        self.onSelect = onSelect
        self.onDismiss = onDismiss
        _query = State(initialValue: initialQuery)
        _mockIssue = State(initialValue: mockIssue)
    }

    private var viewModel: LogPickerViewModel {
        LogPickerViewModel(query: query, mealType: mealType, sections: sections, mockIssue: mockIssue)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                header
                SavoroSearchField(placeholder: viewModel.searchPlaceholder, text: $query)
                switch viewModel.contentState {
                case .results:
                    ForEach(viewModel.visibleSections) { section in
                        LogPickerSectionView(section: section, mealType: mealType, onSelect: onSelect)
                    }
                case .noResults(let state):
                    LogPickerStateCard(state: state, primaryAction: clearSearch)
                case .recoverableError(let state):
                    LogPickerStateCard(state: state, primaryAction: retrySearch, secondaryAction: clearSearch)
                }
            }
            .padding(SavoroSpacing.lg)
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("log-picker-screen")
        .navigationTitle(viewModel.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close", action: onDismiss) } }
    }

    private func clearSearch() {
        query = ""
        mockIssue = nil
    }

    private func retrySearch() {
        mockIssue = nil
    }

    private var header: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                SavoroChip(title: viewModel.mealContextTitle, systemImage: "fork.knife", variant: .accent)
                Text("Quick picks for logging")
                    .font(SavoroTypography.title2)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(viewModel.privacyCopy)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                Text(viewModel.scaffoldCopy)
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
        }
    }
}

private struct LogPickerStateCard: View {
    let state: LogPickerViewModel.EmptyState
    let primaryAction: () -> Void
    var secondaryAction: (() -> Void)? = nil
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            stateContent
                        }
                    } else {
                        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                            stateContent
                        }
                    }
                }
                SavoroButton(state.primaryActionTitle, systemImage: "arrow.counterclockwise", variant: .primary, action: primaryAction)
                    .accessibilityIdentifier(state.primaryActionMetadata)
                if let secondaryAction, let title = state.secondaryActionTitle, let metadata = state.secondaryActionMetadata {
                    SavoroButton(title, systemImage: "xmark", variant: .secondary, action: secondaryAction)
                        .accessibilityIdentifier(metadata)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var stateContent: some View {
        Image(systemName: state.systemImage)
            .font(.title2)
            .foregroundStyle(SavoroColor.accent)
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(state.title)
                .font(SavoroTypography.headline)
                .foregroundStyle(SavoroColor.textStrong)
            Text(state.message)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
        }
    }
}

private struct LogPickerSectionView: View {
    let section: LogPickerViewModel.Section
    let mealType: MealType?
    let onSelect: (LogPickerViewModel.Item, MealType?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text(section.title).font(SavoroTypography.headline).foregroundStyle(SavoroColor.textStrong)
                Text(section.subtitle).font(SavoroTypography.callout).foregroundStyle(SavoroColor.textMuted)
            }

            ForEach(section.items) { item in
                LogPickerItemRow(item: item, mealType: mealType, onSelect: onSelect)
            }
        }
    }
}

private struct LogPickerItemRow: View {
    let item: LogPickerViewModel.Item
    let mealType: MealType?
    let onSelect: (LogPickerViewModel.Item, MealType?) -> Void
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        Button { onSelect(item, mealType) } label: {
            SavoroCard(style: .plain) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            itemHeader
                        }
                    } else {
                        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                            itemHeader
                        }
                    }
                }
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                            macroPills
                        }
                    } else {
                        HStack(spacing: SavoroSpacing.xs) {
                            macroPills
                        }
                    }
                }
                Text(selectionCopy)
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
        }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("log-picker-item-\(item.id)")
    }

    @ViewBuilder
    private var itemHeader: some View {
        Image(systemName: item.typeSystemImage)
            .foregroundStyle(item.itemType == .recipe ? SavoroColor.accent : SavoroColor.positive)
            .font(.title3)
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(item.title).font(SavoroTypography.bodyEmphasized).foregroundStyle(SavoroColor.textStrong)
            Text(item.subtitle).font(SavoroTypography.micro).foregroundStyle(SavoroColor.textMuted)
        }
        if !dynamicTypeSize.isAccessibilitySize {
            Spacer(minLength: 0)
        }
        VStack(alignment: dynamicTypeSize.isAccessibilitySize ? .leading : .trailing, spacing: SavoroSpacing.xxs) {
            SavoroChip(title: item.typeLabel, variant: item.itemType == .recipe ? .accent : .positive)
            SavoroChip(title: item.sourceLabel, variant: item.isPrivateContext ? .neutral : .positive)
        }
    }

    @ViewBuilder
    private var macroPills: some View {
        ForEach(item.macroValues.prefix(3)) { macro in
            SavoroMacroPill(macro: macro, showsShortLabel: true)
        }
    }

    private var selectionCopy: String {
        switch item.itemType {
        case .recipe:
            return mealType.map { "Opens Log Recipe with \($0.displayTitle) preselected. Today changes only after confirmation." } ?? "Opens Log Recipe. Today changes only after confirmation."
        case .food:
            if item.foodId != nil {
                return mealType.map { "Food logging is coming soon. Your \($0.displayTitle) choice is remembered, and Today is unchanged." } ?? "Food logging is coming soon; Today is unchanged."
            }
            return mealType.map { "Adds this food privately to \($0.displayTitle)." } ?? "Adds this food privately to your day."
        }
    }
}

#Preview("Log picker") {
    NavigationStack { LogPickerPlaceholderView(mealType: .lunch) }
}
