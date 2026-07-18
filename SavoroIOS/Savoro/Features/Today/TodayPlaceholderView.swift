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
        case .addMeal: "Private mock session only."
        case .logRecipe: "Add a private in-memory mock log."
        case .createRecipe: "Draft a reusable recipe later."
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
            title: "\(title) is scaffolded",
            message: "Placeholder only — no food log was changed.",
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
        self.subtitle = "Last logged as \(entry.mealType.displayTitle.lowercased()) • private snapshot"
        self.macroSummary = entry.snapshot.rowMacroValues
        self.sourceLabel = entry.snapshot.sourceLabel ?? "Frozen log snapshot"
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

struct TodayPlaceholderView: View {
    var viewModel = TodaySummaryViewModel()
    var onQuickAction: (TodayQuickActionKind) -> Void = { _ in }
    var onLogAgain: (TodayRecentLogAgainItem) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                TodayHeaderView(viewModel: viewModel)
                TodayPrivacyCard(copy: viewModel.reassuranceText, supportCopy: viewModel.privacySupportText)
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

    var body: some View {
        SavoroCard(style: .glass) {
            HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                Image(systemName: "lock.shield.fill")
                    .foregroundStyle(SavoroColor.accent)
                    .font(.title3)
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
        .accessibilityElement(children: .combine)
    }
}

private struct TodayCalorieRingCard: View {
    let viewModel: TodaySummaryViewModel

    var body: some View {
        SavoroCard(style: .elevated) {
            HStack(alignment: .center, spacing: SavoroSpacing.lg) {
                SavoroMacroRing(
                    value: viewModel.calorieProgress.value,
                    goal: viewModel.calorieProgress.goal ?? 0,
                    label: "Calories today",
                    tint: SavoroColor.macroCalories
                )
                .frame(width: 132, height: 132)

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
                    SavoroTrustBadge(kind: .savedSnapshot, detail: "From frozen mock log data")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .accessibilityElement(children: .combine)
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

    var body: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text("Quick actions")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Fast private logging scaffolds. Mock session only — no backend persistence yet.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                }

                ForEach(actions) { action in
                    Button { onAction(action) } label: {
                        HStack(spacing: SavoroSpacing.sm) {
                            Image(systemName: action.systemImage)
                                .foregroundStyle(SavoroColor.accent)
                                .font(.title3)
                            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                                Text(action.title)
                                    .font(SavoroTypography.bodyEmphasized)
                                    .foregroundStyle(SavoroColor.textStrong)
                                Text(action.subtitle)
                                    .font(SavoroTypography.micro)
                                    .foregroundStyle(SavoroColor.textMuted)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(SavoroColor.textMuted)
                        }
                        .padding(SavoroSpacing.sm)
                        .background(SavoroColor.cardStrong)
                        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("today-quick-action-\(action.rawValue)")
                }
            }
        }
    }
}

private struct TodayRecentLogAgainRail: View {
    let items: [TodayRecentLogAgainItem]
    let onLogAgain: (TodayRecentLogAgainItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text("Recent & log again")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Text("Reusable frozen snapshots from your private mock log.")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: SavoroSpacing.md) {
                    ForEach(items) { item in
                        TodayRecentLogAgainCard(item: item, onLogAgain: { onLogAgain(item) })
                    }
                }
                .padding(.vertical, SavoroSpacing.xs)
            }
        }
    }
}

private struct TodayRecentLogAgainCard: View {
    let item: TodayRecentLogAgainItem
    let onLogAgain: () -> Void

    var body: some View {
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
                Button(item.actionTitle, action: onLogAgain)
                    .buttonStyle(.borderedProminent)
                    .tint(SavoroColor.accent)
            }
        }
        .frame(width: 260)
    }
}

private struct TodaySummaryCard: View {
    let viewModel: TodaySummaryViewModel

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

                HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.xs) {
                    Text("\(Int(viewModel.totals.calories))")
                        .font(SavoroTypography.numericTitle)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("cal logged")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                }

                FlowMacroPills(macros: viewModel.macroValues.filter { $0.kind != .calories })

                Text("Daily goals are used only for your private context.")
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
        }
        .accessibilityElement(children: .combine)
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
                Text("Frozen snapshots from today’s private mock log.")
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

    var body: some View {
        SavoroCard(style: .plain) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                HStack {
                    Text(section.title)
                        .font(SavoroTypography.bodyEmphasized)
                        .foregroundStyle(SavoroColor.textStrong)
                    Spacer()
                    SavoroChip(title: section.entryCountText, variant: section.isEmpty ? .neutral : .positive)
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
}

private struct TodayMealEmptyStateView: View {
    let section: TodayMealSectionViewModel

    var body: some View {
        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
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
        .padding(SavoroSpacing.sm)
        .background(SavoroColor.accentSoft)
        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
    }
}

private struct TodayMealEntryRow: View {
    let entry: FoodLogEntry

    var body: some View {
        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
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
                if let sourceLabel = entry.snapshot.sourceLabel {
                    SavoroTrustBadge(kind: .savedSnapshot, detail: sourceLabel)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(SavoroSpacing.sm)
        .background(SavoroColor.cardStrong)
        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
        .accessibilityIdentifier("today-log-entry-\(entry.id)")
    }
}

private struct FlowMacroPills: View {
    let macros: [SavoroMacroValue]

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: SavoroSpacing.xs) { pills }
            VStack(alignment: .leading, spacing: SavoroSpacing.xs) { pills }
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
        "\(quantity.formatted(.number.precision(.fractionLength(0...1)))) \(quantityUnit) • frozen nutrition snapshot"
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
                        sourceLabel: "Recipe v20260606",
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
