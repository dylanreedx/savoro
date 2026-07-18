import SwiftUI

struct TodayMealSectionViewModel: Equatable, Identifiable {
    let mealType: MealType
    let entries: [FoodLogEntry]

    var id: MealType { mealType }
    var title: String { mealType.displayTitle }
    var accessibilityTitle: String { "\(title) meal" }
    var isEmpty: Bool { entries.isEmpty }
    var entryCountText: String { "\(entries.count) \(entries.count == 1 ? "entry" : "entries")" }
    var emptyTitle: String { "Nothing here yet" }
    var emptyBody: String { "When you log something for \(title.lowercased()), it will appear here privately." }
}

enum TodayQuickActionKind: String, CaseIterable, Equatable, Identifiable {
    case addMeal
    case logRecipe
    case createRecipe

    var id: String { rawValue }

    var title: String {
        switch self {
        case .addMeal: "Add meal"
        case .logRecipe: "Log recipe"
        case .createRecipe: "Create recipe"
        }
    }

    var subtitle: String {
        switch self {
        case .addMeal: "Choose something to log privately."
        case .logRecipe: "Add a recipe to your private day."
        case .createRecipe: "Draft a reusable recipe when you’re ready."
        }
    }

    var systemImage: String {
        switch self {
        case .addMeal: "plus.circle.fill"
        case .logRecipe: "fork.knife.circle.fill"
        case .createRecipe: "book.pages.fill"
        }
    }

    var toast: SavoroToast {
        SavoroToast(
            title: "\(title) is coming soon",
            message: "Your private food log is unchanged.",
            style: .info
        )
    }
}

struct TodayRecentLogAgainItem: Equatable, Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let macroSummary: [SavoroMacroValue]
    let sourceLabel: String
    let actionTitle: String = "Log again"

    init(entry: FoodLogEntry) {
        self.id = entry.recipeId ?? entry.foodId ?? entry.id
        self.title = entry.snapshot.displayName
        self.subtitle = "Last logged for \(entry.mealType.displayTitle.lowercased()) • private"
        self.macroSummary = entry.snapshot.rowMacroValues
        self.sourceLabel = entry.snapshot.userFacingSourceLabel
    }
}

struct TodaySummaryViewModel: Equatable {
    let displayName: String
    let dateText: String
    let reassuranceText: String
    let totals: MacroTotals
    let goals: MacroTotals
    let loggedMealCount: Int
    let mealSections: [TodayMealSectionViewModel]
    let quickActions: [TodayQuickActionKind]
    let recentLogAgainItems: [TodayRecentLogAgainItem]

    init(
        displayName: String = "Avery",
        dateText: String? = nil,
        reassuranceText: String = "Your food logs and goals are private by default.",
        dayLog: DayLog = .todayFixture,
        goals: MacroTotals = .todayFixtureGoal
    ) {
        self.displayName = displayName
        self.dateText = dateText ?? dayLog.displayDateText
        self.reassuranceText = reassuranceText
        self.totals = dayLog.totals
        self.goals = goals
        let entriesByMealType = Dictionary(grouping: dayLog.meals, by: \.mealType)
            .mapValues { mealLogs in mealLogs.flatMap(\.entries) }
        let sections = MealType.allCases.map { mealType in
            TodayMealSectionViewModel(
                mealType: mealType,
                entries: entriesByMealType[mealType] ?? []
            )
        }

        self.loggedMealCount = sections.filter { !$0.entries.isEmpty }.count
        self.mealSections = sections
        self.quickActions = TodayQuickActionKind.allCases
        self.recentLogAgainItems = dayLog.meals
            .flatMap(\.entries)
            .sorted { $0.createdAt > $1.createdAt }
            .map(TodayRecentLogAgainItem.init(entry:))
    }

    var greeting: String { "Hi, \(displayName)" }
    var isEmptyDay: Bool { mealSections.allSatisfy(\.isEmpty) }
    var summaryTitle: String { "Today so far" }
    var summarySubtitle: String {
        "\(loggedMealCount) logged \(loggedMealCount == 1 ? "meal" : "meals") — no pressure, just a helpful snapshot."
    }

    var macroValues: [SavoroMacroValue] {
        [
            SavoroMacroValue(kind: .calories, value: totals.calories, goal: goals.calories),
            SavoroMacroValue(kind: .protein, value: totals.proteinGrams, goal: goals.proteinGrams),
            SavoroMacroValue(kind: .carbs, value: totals.carbsGrams, goal: goals.carbsGrams),
            SavoroMacroValue(kind: .fat, value: totals.fatGrams, goal: goals.fatGrams)
        ]
    }

    var calorieProgress: SavoroMacroValue {
        SavoroMacroValue(kind: .calories, value: totals.calories, goal: goals.calories)
    }

    var macroProgressValues: [SavoroMacroValue] {
        macroValues.filter { $0.kind != .calories }
    }

    var calorieProgressFraction: Double {
        guard goals.calories > 0 else { return 0 }
        return totals.calories / goals.calories
    }

    var calorieSupportText: String {
        switch calorieProgressFraction {
        case ..<0.75:
            return "Still flexible — use this as context, not a score."
        case ..<1.0:
            return "Close to your daily target and still flexible."
        default:
            return "A little past your target today — your next choice can still be gentle."
        }
    }

    var macroProgressSubtitle: String {
        "Protein, carbs, and fat against your private daily goals."
    }

    var privacySupportText: String {
        "Recipes can be shared later; your daily progress stays private."
    }
}

struct TodayLoadingStateView: View {
    var body: some View {
        VStack {
            Spacer()
            SavoroCard(style: .elevated) {
                VStack(spacing: SavoroSpacing.md) {
                    ProgressView()
                        .tint(SavoroColor.accent)
                    Text("Gathering your day")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Your private log will be ready in a moment.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
            }
            .accessibilityIdentifier("today-loading-state")
            Spacer()
        }
        .padding(SavoroSpacing.lg)
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("screen-today")
        .navigationTitle("Today")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TodayErrorStateView: View {
    static let title = "Your day needs a moment"
    static let message = "We couldn’t load your day right now. Your private log is safe. Try again when you’re ready."

    let onRetry: () -> Void

    var body: some View {
        VStack {
            Spacer()
            SavoroCard(style: .elevated) {
                VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                    Image(systemName: "arrow.clockwise.heart.fill")
                        .font(.title2)
                        .foregroundStyle(SavoroColor.accent)
                    Text(Self.title)
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text(Self.message)
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                    SavoroButton("Try again", systemImage: "arrow.clockwise", action: onRetry)
                        .accessibilityIdentifier("today-retry-button")
                }
            }
            .accessibilityIdentifier("today-error-state")
            Spacer()
        }
        .padding(SavoroSpacing.lg)
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("screen-today")
        .navigationTitle("Today")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TodayPlaceholderView: View {
    var viewModel = TodaySummaryViewModel()
    var onQuickAction: (TodayQuickActionKind) -> Void = { _ in }
    var onLogAgain: (TodayRecentLogAgainItem) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                TodayHeaderView(viewModel: viewModel)
                TodayPrivacyCard(copy: viewModel.reassuranceText, supportCopy: viewModel.privacySupportText)
                if viewModel.isEmptyDay {
                    TodayEmptyDayCard()
                }
                TodayCalorieRingCard(viewModel: viewModel)
                TodayMacroProgressCard(viewModel: viewModel)
                TodayQuickActionsCard(actions: viewModel.quickActions, onAction: onQuickAction)
                TodayRecentLogAgainRail(items: viewModel.recentLogAgainItems, onLogAgain: onLogAgain)
                TodaySummaryCard(viewModel: viewModel)
                TodayMealSectionsCard(sections: viewModel.mealSections)
            }
            .padding(SavoroSpacing.lg)
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("screen-today")
        .navigationTitle("Today")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct TodayHeaderView: View {
    let viewModel: TodaySummaryViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            SavoroChip(title: viewModel.dateText, systemImage: "calendar", variant: .accent)
            Text(viewModel.greeting)
                .font(SavoroTypography.display)
                .foregroundStyle(SavoroColor.textStrong)
            Text("A calm check-in for what you’ve logged today.")
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

private struct TodayPrivacyCard: View {
    let copy: String
    let supportCopy: String
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .glass) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        privacyIcon
                        privacyCopy
                    }
                } else {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        privacyIcon
                        privacyCopy
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var privacyIcon: some View {
        Image(systemName: "lock.shield.fill")
            .foregroundStyle(SavoroColor.accent)
            .font(.title3)
    }

    private var privacyCopy: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text("Private nutrition space")
                .font(SavoroTypography.headline)
                .foregroundStyle(SavoroColor.textStrong)
            Text(copy)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
            Text(supportCopy)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
        }
    }
}

private struct TodayEmptyDayCard: View {
    var body: some View {
        SavoroCard(style: .glass) {
            HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                Image(systemName: "sunrise.fill")
                    .font(.title2)
                    .foregroundStyle(SavoroColor.accent)
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text("A fresh day")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Nothing has been logged yet. Add something whenever it feels useful; it stays private.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                }
            }
        }
        .accessibilityIdentifier("today-empty-day-state")
    }
}

private struct TodayCalorieRingCard: View {
    let viewModel: TodaySummaryViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .elevated) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                        calorieRing
                            .frame(maxWidth: .infinity)
                            .frame(height: 180)
                        calorieDetails
                    }
                } else {
                    HStack(alignment: .center, spacing: SavoroSpacing.lg) {
                        calorieRing
                            .frame(width: 132, height: 132)
                        calorieDetails
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var calorieRing: some View {
        SavoroMacroRing(
            value: viewModel.calorieProgress.value,
            goal: viewModel.calorieProgress.goal ?? 0,
            label: "Calories today",
            tint: SavoroColor.macroCalories
        )
    }

    private var calorieDetails: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            Text("Calories today")
                .font(SavoroTypography.headline)
                .foregroundStyle(SavoroColor.textStrong)
            Text(viewModel.calorieProgress.progressText)
                .font(SavoroTypography.numericHeadline.monospacedDigit())
                .foregroundStyle(SavoroColor.textStrong)
            Text(viewModel.calorieSupportText)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
            SavoroTrustBadge(kind: .savedSnapshot, detail: "Private to your day")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct TodayMacroProgressCard: View {
    let viewModel: TodaySummaryViewModel

    var body: some View {
        SavoroNutritionSnapshotCard(
            title: "Macro progress",
            subtitle: viewModel.macroProgressSubtitle,
            macros: viewModel.macroProgressValues
        )
        .accessibilityElement(children: .combine)
    }
}

private struct TodayQuickActionsCard: View {
    let actions: [TodayQuickActionKind]
    let onAction: (TodayQuickActionKind) -> Void
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text("Quick actions")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Add to your day in a few taps. Your food log stays private.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                }

                ForEach(actions) { action in
                    Button { onAction(action) } label: {
                        SavoroCard(style: .strong, insets: .compact) {
                            Group {
                                if dynamicTypeSize.isAccessibilitySize {
                                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                                        quickActionIcon(action)
                                        quickActionCopy(action)
                                        Image(systemName: "chevron.right")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(SavoroColor.textMuted)
                                    }
                                } else {
                                    HStack(spacing: SavoroSpacing.sm) {
                                        quickActionIcon(action)
                                        quickActionCopy(action)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(SavoroColor.textMuted)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("today-quick-action-\(action.rawValue)")
                }
            }
        }
    }

    private func quickActionIcon(_ action: TodayQuickActionKind) -> some View {
        Image(systemName: action.systemImage)
            .foregroundStyle(SavoroColor.accent)
            .font(.title3)
    }

    private func quickActionCopy(_ action: TodayQuickActionKind) -> some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(action.title)
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textStrong)
            Text(action.subtitle)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
        }
    }
}

private struct TodayRecentLogAgainRail: View {
    let items: [TodayRecentLogAgainItem]
    let onLogAgain: (TodayRecentLogAgainItem) -> Void
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text("Recent & log again")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Text("Your recent private entries, ready when you want them.")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
            }

            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                    recentCards
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: SavoroSpacing.md) {
                        recentCards
                    }
                    .padding(.vertical, SavoroSpacing.xs)
                }
            }
        }
    }

    @ViewBuilder
    private var recentCards: some View {
        ForEach(items) { item in
            TodayRecentLogAgainCard(item: item, onLogAgain: { onLogAgain(item) })
        }
    }
}

private struct TodayRecentLogAgainCard: View {
    let item: TodayRecentLogAgainItem
    let onLogAgain: () -> Void
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            card
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            card
                .frame(width: 260)
        }
    }

    private var card: some View {
        SavoroCard(style: .plain) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                SavoroChip(title: item.sourceLabel, systemImage: "lock.fill", variant: .neutral)
                Text(item.title)
                    .font(SavoroTypography.bodyEmphasized)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(item.subtitle)
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
                FlowMacroPills(macros: Array(item.macroSummary.prefix(3)))
                SavoroButton(
                    item.actionTitle,
                    expandsHorizontally: false,
                    action: onLogAgain
                )
            }
        }
    }
}

private struct TodaySummaryCard: View {
    let viewModel: TodaySummaryViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text(viewModel.summaryTitle)
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text(viewModel.summarySubtitle)
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                }

                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                            calorieSummary
                        }
                    } else {
                        HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.xs) {
                            calorieSummary
                        }
                    }
                }

                FlowMacroPills(macros: viewModel.macroValues.filter { $0.kind != .calories })

                Text("Daily goals are used only for your private context.")
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("today-day-summary")
        .accessibilityValue("\(Int(viewModel.totals.calories)) calories logged")
    }

    @ViewBuilder
    private var calorieSummary: some View {
        Text("\(Int(viewModel.totals.calories))")
            .font(SavoroTypography.numericTitle)
            .foregroundStyle(SavoroColor.textStrong)
        Text("cal logged")
            .font(SavoroTypography.callout)
            .foregroundStyle(SavoroColor.textMuted)
    }
}

private struct TodayMealSectionsCard: View {
    let sections: [TodayMealSectionViewModel]

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.md) {
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text("Meal sections")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Text("Your entries for today, kept private.")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
            }

            ForEach(sections) { section in
                TodayMealSectionView(section: section)
            }
        }
    }
}

private struct TodayMealSectionView: View {
    let section: TodayMealSectionViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .plain) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                            mealSectionHeading
                        }
                    } else {
                        HStack {
                            mealSectionHeading
                        }
                    }
                }

                if section.isEmpty {
                    TodayMealEmptyStateView(section: section)
                } else {
                    VStack(spacing: SavoroSpacing.sm) {
                        ForEach(section.entries, id: \.id) { entry in
                            TodayMealEntryRow(entry: entry)
                        }
                    }
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(section.accessibilityTitle)
    }

    @ViewBuilder
    private var mealSectionHeading: some View {
        Text(section.title)
            .font(SavoroTypography.bodyEmphasized)
            .foregroundStyle(SavoroColor.textStrong)
        if !dynamicTypeSize.isAccessibilitySize {
            Spacer()
        }
        SavoroChip(title: section.entryCountText, variant: section.isEmpty ? .neutral : .positive)
    }
}

private struct TodayMealEmptyStateView: View {
    let section: TodayMealSectionViewModel
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .accent, insets: .compact) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        emptyStateContent
                    }
                } else {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        emptyStateContent
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var emptyStateContent: some View {
        Image(systemName: "sun.max.fill")
            .foregroundStyle(SavoroColor.accent)
        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(section.emptyTitle)
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textStrong)
            Text(section.emptyBody)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
        }
    }
}

private struct TodayMealEntryRow: View {
    let entry: FoodLogEntry
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .strong, insets: .compact) {
            Group {
                if dynamicTypeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        entryContent
                    }
                } else {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        entryContent
                        Spacer(minLength: 0)
                    }
                }
            }
        }
        .accessibilityIdentifier("today-log-entry-\(entry.id)")
    }

    @ViewBuilder
    private var entryContent: some View {
        Image(systemName: entry.itemType == .recipe ? "fork.knife.circle.fill" : "leaf.circle.fill")
            .foregroundStyle(SavoroColor.accent)
            .font(.title3)

        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
            Text(entry.snapshot.displayName)
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textStrong)
            Text(entry.quantityText)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
            FlowMacroPills(macros: entry.snapshot.rowMacroValues)
            SavoroTrustBadge(kind: .savedSnapshot, detail: entry.snapshot.userFacingSourceLabel)
        }
    }
}

private struct FlowMacroPills: View {
    let macros: [SavoroMacroValue]
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @ViewBuilder
    var body: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: SavoroSpacing.xs) { pills }
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: SavoroSpacing.xs) { pills }
                VStack(alignment: .leading, spacing: SavoroSpacing.xs) { pills }
            }
        }
    }

    @ViewBuilder
    private var pills: some View {
        ForEach(macros) { macro in
            SavoroMacroPill(macro: .init(kind: macro.kind, value: macro.value, goal: nil), showsShortLabel: false)
        }
    }
}

private extension FoodLogEntry {
    var quantityText: String {
        "\(quantity.formatted(.number.precision(.fractionLength(0...1)))) \(quantityUnit) • saved as logged"
    }
}

private extension NutritionSnapshot {
    var rowMacroValues: [SavoroMacroValue] {
        [
            SavoroMacroValue(kind: .calories, value: macros.calories, goal: nil),
            SavoroMacroValue(kind: .protein, value: macros.proteinGrams, goal: nil),
            SavoroMacroValue(kind: .carbs, value: macros.carbsGrams, goal: nil),
            SavoroMacroValue(kind: .fat, value: macros.fatGrams, goal: nil)
        ]
    }
}

extension DayLog {
    var logDate: Date {
        Self.logDateFormatter.date(from: date) ?? Date()
    }

    var displayDateText: String {
        Self.displayDateFormatter.string(from: logDate)
    }

    private static let logDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let displayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter
    }()

    static let todayFixture: DayLog = try! DayLog(
        userId: "user_1",
        date: "2026-06-06",
        meals: [
            try! MealLog(mealType: .lunch, entries: [
                try! FoodLogEntry(
                    id: "log_recipe_1",
                    userId: "user_1",
                    date: "2026-06-06",
                    mealType: .lunch,
                    itemType: .recipe,
                    recipeId: "recipe_shawarma_bowl",
                    recipeVersionId: "recipe_version_20260606",
                    quantity: 1,
                    quantityUnit: "serving",
                    snapshot: NutritionSnapshot(
                        displayName: "Chicken Shawarma Bowl",
                        macros: try! MacroTotals(calories: 520, proteinGrams: 42, carbsGrams: 48, fatGrams: 18, fiberGrams: 7, sodiumMilligrams: 780),
                        sourceLabel: "The version you logged",
                        capturedAt: ISO8601DateFormatter().date(from: "2026-06-06T12:30:00Z")!
                    ),
                    sourceType: .recipe,
                    createdAt: ISO8601DateFormatter().date(from: "2026-06-06T12:30:00Z")!,
                    updatedAt: ISO8601DateFormatter().date(from: "2026-06-06T12:30:00Z")!
                )
            ]),
            try! MealLog(mealType: .snack, entries: [
                try! FoodLogEntry(
                    id: "log_food_1",
                    userId: "user_1",
                    date: "2026-06-06",
                    mealType: .snack,
                    itemType: .food,
                    foodId: "food_greek_yogurt",
                    servingId: "serving_single_cup",
                    quantity: 1,
                    quantityUnit: "cup",
                    snapshot: NutritionSnapshot(
                        displayName: "Greek Yogurt",
                        macros: try! MacroTotals(calories: 150, proteinGrams: 20, carbsGrams: 8, fatGrams: 4),
                        sourceLabel: "USDA FoodData Central",
                        capturedAt: ISO8601DateFormatter().date(from: "2026-06-06T15:00:00Z")!
                    ),
                    sourceType: .search,
                    createdAt: ISO8601DateFormatter().date(from: "2026-06-06T15:00:00Z")!,
                    updatedAt: ISO8601DateFormatter().date(from: "2026-06-06T15:00:00Z")!
                )
            ])
        ]
    )
}

extension MacroTotals {
    static let todayFixtureGoal = try! MacroTotals(calories: 2200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70)
}

#Preview("Today summary") {
    NavigationStack {
        TodayPlaceholderView()
    }
}
