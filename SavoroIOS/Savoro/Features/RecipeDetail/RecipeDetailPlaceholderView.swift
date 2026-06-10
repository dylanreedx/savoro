import SwiftUI

struct RecipeDetailContentViewModel: Equatable {
    struct IngredientRow: Equatable, Identifiable {
        let id: String
        let title: String
        let amountText: String
        let sourceText: String?
    }

    struct InstructionRow: Equatable, Identifiable {
        let id: String
        let number: Int
        let body: String
    }

    let recipeId: String
    let currentVersionId: String
    let versionText: String
    let baseServings: Double
    let servingOptions: [Double]
    let selectedServings: Double
    let servingSelectorHelpText: String
    let macros: [SavoroMacroValue]
    let ingredients: [IngredientRow]
    let instructions: [InstructionRow]

    init(recipe: RecipeDetail, selectedServings: Double? = nil) {
        recipeId = recipe.summary.id
        currentVersionId = recipe.currentVersion.id
        versionText = "Recipe version \(recipe.currentVersion.versionNumber) · \(recipe.currentVersion.id)"
        baseServings = recipe.currentVersion.servings
        servingOptions = Self.options(around: recipe.currentVersion.servings)
        let requestedServings = selectedServings ?? recipe.currentVersion.servings
        self.selectedServings = Self.normalized(servings: requestedServings, fallback: recipe.currentVersion.servings)
        servingSelectorHelpText = "Preview shows macros for \(Self.format(self.selectedServings)) selected servings from this frozen version; the base recipe stays at \(Self.format(recipe.currentVersion.servings)) servings."
        let scaledMacros = recipe.currentVersion.perServingMacros.scaled(by: self.selectedServings)
        macros = [
            SavoroMacroValue(kind: .calories, value: scaledMacros.calories),
            SavoroMacroValue(kind: .protein, value: scaledMacros.proteinGrams),
            SavoroMacroValue(kind: .carbs, value: scaledMacros.carbsGrams),
            SavoroMacroValue(kind: .fat, value: scaledMacros.fatGrams)
        ]
        ingredients = recipe.ingredients
            .filter { $0.recipeVersionId == recipe.currentVersion.id }
            .sorted { $0.sortOrder < $1.sortOrder }
            .map { ingredient in
                IngredientRow(
                    id: ingredient.id,
                    title: ingredient.label.capitalized,
                    amountText: Self.ingredientAmountText(ingredient),
                    sourceText: ingredient.provenance?.displayName
                )
            }
        instructions = recipe.steps
            .filter { $0.recipeVersionId == recipe.currentVersion.id }
            .sorted { $0.sortOrder < $1.sortOrder }
            .enumerated()
            .map { index, step in
                InstructionRow(id: step.id, number: index + 1, body: step.body)
            }
    }

    var visibleCopy: String {
        ([versionText, servingSelectorHelpText] + macros.map(\.displayValue) + ingredients.flatMap { [$0.title, $0.amountText, $0.sourceText ?? ""] } + instructions.map(\.body))
            .joined(separator: " ")
    }

    func selectingServings(_ servings: Double, recipe: RecipeDetail) -> RecipeDetailContentViewModel {
        RecipeDetailContentViewModel(recipe: recipe, selectedServings: servings)
    }

    private static func options(around servings: Double) -> [Double] {
        Array(Set([1, 2, servings, 6, 8].filter { $0 > 0 })).sorted()
    }

    private static func normalized(servings: Double, fallback: Double) -> Double {
        guard servings.isFinite, servings > 0 else { return fallback }
        return servings
    }

    private static func ingredientAmountText(_ ingredient: Ingredient) -> String {
        let quantity = ingredient.quantity.map(format) ?? ""
        return [quantity, ingredient.unit, ingredient.note].compactMap { value in
            guard let value, !value.isEmpty else { return nil }
            return value
        }.joined(separator: " · ")
    }

    private static func format(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }
}

private extension MacroTotals {
    func scaled(by factor: Double) -> MacroTotals {
        try! MacroTotals(
            calories: calories * factor,
            proteinGrams: proteinGrams * factor,
            carbsGrams: carbsGrams * factor,
            fatGrams: fatGrams * factor,
            fiberGrams: fiberGrams.map { $0 * factor },
            sodiumMilligrams: sodiumMilligrams.map { $0 * factor }
        )
    }
}

enum RecipeDetailActionKind: String, CaseIterable, Equatable, Identifiable {
    case save
    case fork
    case log
    case share
    case edit

    var id: String { rawValue }

    var label: String {
        switch self {
        case .save: return "Save"
        case .fork: return "Fork"
        case .log: return "Log"
        case .share: return "Share"
        case .edit: return "Edit"
        }
    }

    var systemImage: String {
        switch self {
        case .save: return "bookmark"
        case .fork: return "arrow.triangle.branch"
        case .log: return "plus.circle.fill"
        case .share: return "square.and.arrow.up"
        case .edit: return "pencil"
        }
    }

    var accessibilityIdentifier: String { "recipe-detail-action-\(rawValue)" }
}

struct RecipeDetailActionBarViewModel: Equatable {
    let recipeId: String
    let currentVersionId: String
    let bottomContentPadding: CGFloat
    let scaffoldCopy: String
    let actions: [RecipeDetailActionKind]

    init(recipe: RecipeDetail, bottomContentPadding: CGFloat = 112) {
        recipeId = recipe.summary.id
        currentVersionId = recipe.currentVersion.id
        self.bottomContentPadding = bottomContentPadding
        let isOwner = recipe.summary.viewerState.isOwner
        let isPublic = recipe.summary.visibility == .public
        if isOwner {
            scaffoldCopy = isPublic
                ? "Owner mock state. Save updates the local mock on this device; Edit is placeholder copy only, and actions do not post, sync, or open external sharing."
                : "Private owner mock state. Save updates the local mock on this device; Share and Fork stay hidden until visibility is changed intentionally."
            actions = isPublic ? [.edit, .save, .log, .share] : [.edit, .save, .log]
        } else {
            scaffoldCopy = "Recipe actions use local mock routes only. Save updates the local mock on this device; Fork and Share do not post, sync, or open external sharing."
            actions = RecipeDetailActionKind.allCases.filter { action in
                switch action {
                case .save: return true
                case .fork: return recipe.summary.viewerState.canFork
                case .log: return recipe.summary.viewerState.canLog
                case .share: return isPublic
                case .edit: return false
                }
            }
        }
    }

    func route(for action: RecipeDetailActionKind) -> SavoroSheetRoute? {
        guard actions.contains(action) else { return nil }
        switch action {
        case .save, .edit: return nil
        case .fork: return .forkRemix(recipeId: recipeId)
        case .log: return .logRecipe(recipeId: recipeId, recipeVersionId: currentVersionId)
        case .share: return .shareRecipe(recipeId: recipeId)
        }
    }

    func toast(for action: RecipeDetailActionKind) -> SavoroToast? {
        guard actions.contains(action) else { return nil }
        switch action {
        case .save:
            return SavoroToast(title: "Saved to local mock", message: "This recipe is saved on this device for the demo only; no backend posting or sync was started.", style: .success)
        case .edit:
            return SavoroToast(title: "Owner edit placeholder", message: "This screen shows local owner-only copy; no editor, backend request, or visibility change was started.", style: .info)
        case .fork, .log, .share:
            return nil
        }
    }

    var visibleCopy: String {
        ([scaffoldCopy] + actions.map(\.label)).joined(separator: " ")
    }
}

struct ForkRemixConfirmationSheetModel: Equatable {
    let recipeId: String
    let sourceTitle: String
    let title: String = "Remix as a private copy"
    let subtitle: String
    let privacyCopy: String = "Your copy will start private and editable in this local mock app. You can make changes before choosing any visibility later."
    let sourceProtectionCopy: String = "The source recipe stays unchanged. This action does not republish, post, sync, or modify the original recipe."
    let localOnlyCopy: String = "For this MVP slice, Confirm records the remix choice locally only; SAV-78 will create the attributed private copy."
    let cancelLabel: String = "Cancel"
    let confirmLabel: String = "Confirm private copy"

    init(recipeId: String, sourceTitle: String = "this recipe") {
        self.recipeId = recipeId
        self.sourceTitle = sourceTitle
        subtitle = "Create your own version of \(sourceTitle)."
    }

    var visibleCopy: String {
        [title, subtitle, privacyCopy, sourceProtectionCopy, localOnlyCopy, cancelLabel, confirmLabel].joined(separator: " ")
    }

    var confirmationToast: SavoroToast {
        SavoroToast(
            title: "Remix choice noted locally",
            message: "Your private editable copy flow is confirmed for \(recipeId). No source recipe changes. No backend sync, post, or publish action started.",
            style: .success
        )
    }

    var routeMetadata: [String: String] {
        [
            "recipeId": recipeId,
            "sheetRoute": SavoroSheetRoute.forkRemix(recipeId: recipeId).id,
            "startsBackendRequest": "false",
            "mutatesSourceRecipe": "false",
            "createsPublicPost": "false"
        ]
    }
}

struct ForkRemixConfirmationSheetView: View {
    let model: ForkRemixConfirmationSheetModel
    let onConfirm: (ForkRemixConfirmationSheetModel) -> Void
    @Environment(\.dismiss) private var dismiss

    init(model: ForkRemixConfirmationSheetModel, onConfirm: @escaping (ForkRemixConfirmationSheetModel) -> Void = { _ in }) {
        self.model = model
        self.onConfirm = onConfirm
    }

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
            SavoroCard(style: .elevated) {
                VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                    SavoroChip(title: "Private remix", systemImage: "arrow.triangle.branch", variant: .accent)
                    Text(model.title)
                        .font(SavoroTypography.title2)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text(model.subtitle)
                        .font(SavoroTypography.body)
                        .foregroundStyle(SavoroColor.textBody)
                }
            }

            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                confirmationRow(systemImage: "lock.fill", text: model.privacyCopy)
                confirmationRow(systemImage: "doc.on.doc", text: model.sourceProtectionCopy)
                confirmationRow(systemImage: "shippingbox", text: model.localOnlyCopy)
            }

            Spacer(minLength: SavoroSpacing.lg)

            VStack(spacing: SavoroSpacing.sm) {
                Button {
                    onConfirm(model)
                    dismiss()
                } label: {
                    Text(model.confirmLabel)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier("fork-remix-confirm-button")

                Button(model.cancelLabel) { dismiss() }
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                    .accessibilityIdentifier("fork-remix-cancel-button")
            }
        }
        .padding(SavoroSpacing.lg)
        .background(SavoroColor.page.ignoresSafeArea())
        .navigationTitle("Fork / Remix")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(model.cancelLabel) { dismiss() }
            }
        }
    }

    private func confirmationRow(systemImage: String, text: String) -> some View {
        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
            Image(systemName: systemImage)
                .foregroundStyle(SavoroColor.accentStrong)
                .frame(width: 24)
            Text(text)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
        }
        .accessibilityElement(children: .combine)
    }
}

struct RecipeDetailUnavailableViewModel: Equatable {
    enum Reason: Equatable { case privateRecipe, unauthorized }

    let reason: Reason
    let title: String
    let message: String
    let supportText: String
    let showsRecipeContent: Bool = false
    let showsSocialContext: Bool = false
    let availableActions: [RecipeDetailActionKind] = []

    init(reason: Reason) {
        self.reason = reason
        switch reason {
        case .privateRecipe:
            title = "This recipe is private"
            message = "Recipe details are visible only to the owner. Hidden ingredients, instructions, macros, and creator-only notes are not shown here."
            supportText = "Your personal nutrition details stay private, and no public recipe action is available in this mock state."
        case .unauthorized:
            title = "Recipe unavailable"
            message = "We can’t show this recipe from the local mock route. No recipe details or personal nutrition data are loaded."
            supportText = "Try another public recipe placeholder. Nothing was posted, shared, or changed."
        }
    }

    var visibleCopy: String { [title, message, supportText].joined(separator: " ") }
}

enum RecipeDetailAccessState: Equatable {
    case recipe(RecipeDetail)
    case unavailable(RecipeDetailUnavailableViewModel)

    var recipeIdForRouteSurface: String {
        switch self {
        case .recipe(let recipe): return recipe.summary.id
        case .unavailable: return "unavailable"
        }
    }

    static func from(recipe: RecipeDetail?, unauthorized: Bool = false) -> RecipeDetailAccessState {
        if unauthorized { return .unavailable(RecipeDetailUnavailableViewModel(reason: .unauthorized)) }
        guard let recipe else { return .unavailable(RecipeDetailUnavailableViewModel(reason: .privateRecipe)) }
        if recipe.summary.visibility == .private && !recipe.summary.viewerState.isOwner {
            return .unavailable(RecipeDetailUnavailableViewModel(reason: .privateRecipe))
        }
        return .recipe(recipe)
    }
}

struct RecipeDetailSocialContextViewModel: Equatable {
    struct CommunityContext: Equatable, Identifiable {
        let id: String
        let title: String
        let subtitle: String
        let note: String
    }

    struct FriendContext: Equatable {
        let avatarInitials: [String]
        let text: String
    }

    struct PublicNote: Equatable, Identifiable {
        let id: String
        let authorHandle: String
        let text: String
    }

    let recipeId: String
    let title: String
    let community: CommunityContext?
    let friendContext: FriendContext?
    let publicNotes: [PublicNote]
    let privacySupportText: String
    let exposedActionLabels: [String]

    init(recipe: RecipeDetail) {
        recipeId = recipe.summary.id
        if recipe.summary.visibility != .public {
            title = "Private recipe"
            community = nil
            friendContext = nil
            publicNotes = []
            privacySupportText = "Social context is hidden for private recipes. Your personal nutrition details stay private."
            exposedActionLabels = []
            return
        }
        title = "In the community"
        community = CommunityContext(
            id: "community_weeknight_protein",
            title: "Popular in Weeknight Protein",
            subtitle: "12,400 members",
            note: "Added as a public recipe idea by @\(recipe.summary.creator.username)."
        )
        friendContext = FriendContext(
            avatarInitials: ["AR", "JL", "NT"],
            text: "Saved by 3 friends for meal ideas"
        )
        publicNotes = [
            PublicNote(id: "note_garlic_sauce", authorHandle: "@alex", text: "Great with extra cucumber and a squeeze of lemon."),
            PublicNote(id: "note_prep", authorHandle: "@nora", text: "Works well as a make-ahead bowl for busy nights.")
        ]
        privacySupportText = "Only public recipe context is shown here. Your personal nutrition details stay private."
        exposedActionLabels = []
    }

    var visibleCopy: String {
        ([title, community?.title, community?.subtitle, community?.note, friendContext?.text, privacySupportText].compactMap { $0 } + publicNotes.flatMap { [$0.authorHandle, $0.text] })
            .joined(separator: " ")
    }
}

struct RecipeDetailHeaderViewModel: Equatable {
    struct TrustBadge: Equatable {
        let title: String
        let detail: String
        let systemImage: String
    }

    let recipeId: String
    let title: String
    let tags: [String]
    let creatorHandle: String
    let creatorDisplayName: String
    let updatedText: String
    let description: String?
    let trustBadge: TrustBadge
    let heroGradient: [Color]

    init(recipe: RecipeDetail, now: Date = Date()) {
        recipeId = recipe.summary.id
        title = recipe.summary.title
        tags = Array(recipe.summary.tags.prefix(3))
        creatorHandle = "@\(recipe.summary.creator.username)"
        creatorDisplayName = recipe.summary.creator.displayName
        description = recipe.summary.description
        updatedText = Self.updatedText(from: recipe.summary.updatedAt, now: now)
        trustBadge = Self.trustBadge(from: recipe.provenance)
        heroGradient = [SavoroColor.blush200, SavoroColor.carbs.opacity(0.62), SavoroColor.accentSoft]
    }

    var visibleCopy: String {
        ([title] + tags + [creatorHandle, creatorDisplayName, updatedText, trustBadge.title, trustBadge.detail, description ?? ""])
            .joined(separator: " ")
    }

    private static func trustBadge(from provenance: RecipeProvenance) -> TrustBadge {
        let verifiedSourceNames = provenance.attributions
            .filter(\.isVerified)
            .map(\.displayName)

        switch provenance.trustLevel {
        case .verified:
            return TrustBadge(
                title: "Verified sources",
                detail: verifiedSourceNames.first ?? provenance.summary,
                systemImage: "checkmark.seal.fill"
            )
        case .sourceAttributed:
            return TrustBadge(
                title: "Source attributed",
                detail: provenance.attributions.first?.displayName ?? provenance.summary,
                systemImage: "link.circle.fill"
            )
        case .creatorProvided:
            return TrustBadge(
                title: "Creator provided",
                detail: provenance.attributions.first?.displayName ?? provenance.summary,
                systemImage: "person.crop.circle.badge.checkmark"
            )
        case .mixed:
            let verifiedDetail = verifiedSourceNames.first.map { "Includes \($0)" } ?? provenance.summary
            return TrustBadge(
                title: "Mixed sources",
                detail: verifiedDetail,
                systemImage: "checkmark.seal"
            )
        case .incomplete:
            return TrustBadge(
                title: "Needs source details",
                detail: provenance.summary,
                systemImage: "info.circle"
            )
        }
    }

    private static func updatedText(from date: Date, now: Date) -> String {
        let days = Calendar(identifier: .gregorian).dateComponents([.day], from: date, to: now).day ?? 0
        if days <= 0 { return "Updated today" }
        if days == 1 { return "Updated yesterday" }
        if days < 30 { return "Updated \(days) days ago" }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return "Updated \(formatter.string(from: date))"
    }
}

struct RecipeDetailPlaceholderView: View {
    let routedRecipeId: String
    private let accessState: RecipeDetailAccessState
    private let recipe: RecipeDetail?
    private let headerViewModel: RecipeDetailHeaderViewModel?
    private let socialContextViewModel: RecipeDetailSocialContextViewModel?
    private let actionBarViewModel: RecipeDetailActionBarViewModel?
    private let onActionRoute: (SavoroSheetRoute) -> Void
    private let onActionToast: (SavoroToast) -> Void
    private let onSaveRecipe: (String) -> Void
    @State private var selectedServings: Double

    init(
        recipe: RecipeDetail = .mockHeaderFixture,
        routedRecipeId: String? = nil,
        now: Date = RecipeDetail.mockHeaderNow,
        onActionRoute: @escaping (SavoroSheetRoute) -> Void = { _ in },
        onActionToast: @escaping (SavoroToast) -> Void = { _ in }
    ) {
        self.init(accessState: .from(recipe: recipe), routedRecipeId: routedRecipeId ?? recipe.summary.id, now: now, onActionRoute: onActionRoute, onActionToast: onActionToast, onSaveRecipe: { _ in })
    }

    init(
        recipe: RecipeDetail = .mockHeaderFixture,
        routedRecipeId: String? = nil,
        now: Date = RecipeDetail.mockHeaderNow,
        onActionRoute: @escaping (SavoroSheetRoute) -> Void = { _ in },
        onActionToast: @escaping (SavoroToast) -> Void = { _ in },
        onSaveRecipe: @escaping (String) -> Void
    ) {
        self.init(accessState: .from(recipe: recipe), routedRecipeId: routedRecipeId ?? recipe.summary.id, now: now, onActionRoute: onActionRoute, onActionToast: onActionToast, onSaveRecipe: onSaveRecipe)
    }

    init(
        accessState: RecipeDetailAccessState,
        routedRecipeId: String? = nil,
        now: Date = RecipeDetail.mockHeaderNow,
        onActionRoute: @escaping (SavoroSheetRoute) -> Void = { _ in },
        onActionToast: @escaping (SavoroToast) -> Void = { _ in },
        onSaveRecipe: @escaping (String) -> Void = { _ in }
    ) {
        self.routedRecipeId = routedRecipeId ?? accessState.recipeIdForRouteSurface
        self.accessState = accessState
        self.onActionRoute = onActionRoute
        self.onActionToast = onActionToast
        self.onSaveRecipe = onSaveRecipe
        switch accessState {
        case .recipe(let recipe):
            self.recipe = recipe
            headerViewModel = RecipeDetailHeaderViewModel(recipe: recipe, now: now)
            socialContextViewModel = RecipeDetailSocialContextViewModel(recipe: recipe)
            actionBarViewModel = RecipeDetailActionBarViewModel(recipe: recipe)
            _selectedServings = State(initialValue: recipe.currentVersion.servings)
        case .unavailable:
            recipe = nil
            headerViewModel = nil
            socialContextViewModel = nil
            actionBarViewModel = nil
            _selectedServings = State(initialValue: 1)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                switch accessState {
                case .recipe(let recipe):
                    if let headerViewModel, let socialContextViewModel {
                        routeContextCard
                            .padding(.horizontal, SavoroSpacing.md)
                        RecipeDetailHeaderView(viewModel: headerViewModel)
                        RecipeDetailContentSectionsView(
                            viewModel: RecipeDetailContentViewModel(recipe: recipe, selectedServings: selectedServings),
                            selectedServings: $selectedServings
                        )
                        .padding(.horizontal, SavoroSpacing.md)
                        if recipe.summary.visibility == .public {
                            RecipeDetailSocialContextBlock(viewModel: socialContextViewModel)
                                .padding(.horizontal, SavoroSpacing.md)
                        }
                    }
                case .unavailable(let viewModel):
                    RecipeDetailUnavailableStateView(viewModel: viewModel)
                        .padding(.horizontal, SavoroSpacing.md)
                        .padding(.top, SavoroSpacing.lg)
                }
            }
            .padding(.bottom, actionBarViewModel?.bottomContentPadding ?? SavoroSpacing.lg)
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            if let actionBarViewModel {
                RecipeDetailStickyActionBar(viewModel: actionBarViewModel, onSelect: handleAction)
            }
        }
        .navigationTitle("Recipe")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var routeContextCard: some View {
        SavoroCard(style: .glass) {
            Label("Opened recipe route: \(routedRecipeId)", systemImage: "link")
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
        }
        .accessibilityIdentifier("recipe-detail-route-id")
    }

    private func handleAction(_ action: RecipeDetailActionKind) {
        guard let actionBarViewModel else { return }
        if action == .save {
            onSaveRecipe(routedRecipeId)
        } else if let route = actionBarViewModel.route(for: action) {
            onActionRoute(route)
        } else if let toast = actionBarViewModel.toast(for: action) {
            onActionToast(toast)
        }
    }
}

struct RecipeDetailUnavailableStateView: View {
    let viewModel: RecipeDetailUnavailableViewModel

    var body: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                Image(systemName: viewModel.reason == .privateRecipe ? "lock.fill" : "exclamationmark.triangle.fill")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(SavoroColor.accentStrong)
                Text(viewModel.title)
                    .font(SavoroTypography.title2)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(viewModel.message)
                    .font(SavoroTypography.body)
                    .foregroundStyle(SavoroColor.textBody)
                Text(viewModel.supportText)
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
    }
}

struct RecipeDetailStickyActionBar: View {
    let viewModel: RecipeDetailActionBarViewModel
    let onSelect: (RecipeDetailActionKind) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            HStack(spacing: SavoroSpacing.xs) {
                ForEach(viewModel.actions) { action in
                    Button { onSelect(action) } label: {
                        VStack(spacing: 4) {
                            Image(systemName: action.systemImage)
                            Text(action.label)
                        }
                        .font(SavoroTypography.label)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, SavoroSpacing.sm)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(action == .log ? SavoroColor.textOnAccent : SavoroColor.accentStrong)
                    .background(action == .log ? SavoroColor.accent : SavoroColor.accentSoft)
                    .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous))
                    .accessibilityIdentifier(action.accessibilityIdentifier)
                }
            }
            Text(viewModel.scaffoldCopy)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
                .lineLimit(2)
        }
        .padding(.horizontal, SavoroSpacing.md)
        .padding(.top, SavoroSpacing.sm)
        .padding(.bottom, SavoroSpacing.xs)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Divider().foregroundStyle(SavoroColor.border) }
        .accessibilityElement(children: .contain)
    }
}

struct RecipeDetailHeaderView: View {
    let viewModel: RecipeDetailHeaderViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.md) {
            hero
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                creatorAndTrustRow
                if let description = viewModel.description {
                    Text(description)
                        .font(SavoroTypography.body)
                        .foregroundStyle(SavoroColor.textBody)
                        .lineSpacing(3)
                }
            }
            .padding(.horizontal, SavoroSpacing.md)
        }
        .accessibilityElement(children: .contain)
    }

    private var hero: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(colors: viewModel.heroGradient, startPoint: .topLeading, endPoint: .bottomTrailing)
                .overlay(alignment: .topTrailing) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 96, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.34))
                        .padding(SavoroSpacing.xl)
                }
                .overlay(
                    LinearGradient(colors: [.clear, SavoroColor.page.opacity(0.94)], startPoint: .center, endPoint: .bottom)
                )

            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                HStack(spacing: SavoroSpacing.xs) {
                    ForEach(viewModel.tags, id: \.self) { tag in
                        SavoroChip(title: tag, variant: .neutral)
                    }
                }
                Text(viewModel.title)
                    .font(SavoroTypography.display)
                    .foregroundStyle(SavoroColor.textStrong)
                    .lineLimit(3)
                    .minimumScaleFactor(0.82)
            }
            .padding(SavoroSpacing.md)
        }
        .frame(minHeight: 318)
        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.glass, style: .continuous))
        .padding(.horizontal, SavoroSpacing.md)
        .padding(.top, SavoroSpacing.sm)
    }

    private var creatorAndTrustRow: some View {
        HStack(alignment: .center, spacing: SavoroSpacing.sm) {
            ZStack {
                Circle().fill(SavoroColor.accentSoft)
                Text(String(viewModel.creatorDisplayName.prefix(1)))
                    .font(SavoroTypography.title2)
                    .foregroundStyle(SavoroColor.accentStrong)
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text(viewModel.creatorHandle)
                    .font(SavoroTypography.bodyEmphasized)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(viewModel.updatedText)
                    .font(SavoroTypography.label)
                    .foregroundStyle(SavoroColor.textMuted)
            }

            Spacer(minLength: SavoroSpacing.xs)

            TrustBadgeView(badge: viewModel.trustBadge)
        }
    }
}

struct RecipeDetailContentSectionsView: View {
    let viewModel: RecipeDetailContentViewModel
    @Binding var selectedServings: Double

    var body: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
            macroSummary
            ingredients
            instructions
        }
    }

    private var macroSummary: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                        Text("Macros")
                            .font(SavoroTypography.title2)
                            .foregroundStyle(SavoroColor.textStrong)
                        Text(viewModel.versionText)
                            .font(SavoroTypography.micro)
                            .foregroundStyle(SavoroColor.textMuted)
                    }
                    Spacer()
                    Text("Selected servings preview")
                        .font(SavoroTypography.label)
                        .foregroundStyle(SavoroColor.accentStrong)
                }

                HStack(spacing: SavoroSpacing.sm) {
                    ForEach(viewModel.macros) { macro in
                        SavoroMacroStatBlock(macro: macro, caption: "selected servings")
                    }
                }

                VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                    Text("Servings")
                        .font(SavoroTypography.bodyEmphasized)
                        .foregroundStyle(SavoroColor.textStrong)
                    SavoroSegmentedControl(options: viewModel.servingOptions.map(ServingOption.init), selection: servingSelection)
                    Text(viewModel.servingSelectorHelpText)
                        .font(SavoroTypography.micro)
                        .foregroundStyle(SavoroColor.textMuted)
                }
            }
        }
    }

    private var servingSelection: Binding<ServingOption> {
        Binding(
            get: { ServingOption(value: selectedServings) },
            set: { selectedServings = $0.value }
        )
    }

    private var ingredients: some View {
        RecipeDetailListSection(title: "Ingredients", subtitle: "Current version ingredients") {
            VStack(spacing: 0) {
                ForEach(viewModel.ingredients) { ingredient in
                    HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.sm) {
                        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                            Text(ingredient.title)
                                .font(SavoroTypography.bodyEmphasized)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text(ingredient.amountText)
                                .font(SavoroTypography.label)
                                .foregroundStyle(SavoroColor.textMuted)
                        }
                        Spacer()
                        if let sourceText = ingredient.sourceText {
                            Text(sourceText)
                                .font(SavoroTypography.micro)
                                .foregroundStyle(SavoroColor.textSubtle)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                    .padding(.vertical, SavoroSpacing.sm)
                    Divider().foregroundStyle(SavoroColor.border)
                }
            }
        }
    }

    private var instructions: some View {
        RecipeDetailListSection(title: "Instructions", subtitle: "Steps for this version") {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                ForEach(viewModel.instructions) { step in
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        Text("\(step.number)")
                            .font(SavoroTypography.label.monospacedDigit())
                            .foregroundStyle(SavoroColor.accentStrong)
                            .frame(width: 28, height: 28)
                            .background(SavoroColor.accentSoft)
                            .clipShape(Circle())
                        Text(step.body)
                            .font(SavoroTypography.body)
                            .foregroundStyle(SavoroColor.textBody)
                            .lineSpacing(3)
                    }
                }
            }
        }
    }
}

private struct ServingOption: Hashable, CustomStringConvertible {
    let value: Double
    var description: String { value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value) }
}

struct RecipeDetailSocialContextBlock: View {
    let viewModel: RecipeDetailSocialContextViewModel

    var body: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text(viewModel.title)
                        .font(SavoroTypography.title2)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Recipe-focused context from friends and public communities")
                        .font(SavoroTypography.micro)
                        .foregroundStyle(SavoroColor.textMuted)
                }

                if let community = viewModel.community {
                    HStack(alignment: .center, spacing: SavoroSpacing.sm) {
                        RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                            .fill(LinearGradient(colors: [SavoroColor.accentSoft, SavoroColor.blush200], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 42, height: 42)
                            .overlay(Image(systemName: "person.3.fill").foregroundStyle(SavoroColor.accentStrong))
                        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                            Text(community.title)
                                .font(SavoroTypography.bodyEmphasized)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text(community.subtitle)
                                .font(SavoroTypography.label)
                                .foregroundStyle(SavoroColor.textMuted)
                            Text(community.note)
                                .font(SavoroTypography.micro)
                                .foregroundStyle(SavoroColor.textSubtle)
                        }
                    }
                }

                if let friendContext = viewModel.friendContext {
                    HStack(spacing: SavoroSpacing.sm) {
                        HStack(spacing: -8) {
                            ForEach(friendContext.avatarInitials, id: \.self) { initials in
                                Text(initials)
                                    .font(SavoroTypography.micro)
                                    .foregroundStyle(SavoroColor.accentStrong)
                                    .frame(width: 28, height: 28)
                                    .background(SavoroColor.accentSoft)
                                    .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous))
                                    .overlay(RoundedRectangle(cornerRadius: SavoroRadius.chip, style: .continuous).stroke(SavoroColor.cardStrong, lineWidth: 2))
                            }
                        }
                        Text(friendContext.text)
                            .font(SavoroTypography.body)
                            .foregroundStyle(SavoroColor.textBody)
                    }
                }

                VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                    ForEach(viewModel.publicNotes) { note in
                        VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                            Text(note.authorHandle)
                                .font(SavoroTypography.label)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text(note.text)
                                .font(SavoroTypography.body)
                                .foregroundStyle(SavoroColor.textBody)
                        }
                        .padding(.top, SavoroSpacing.xs)
                    }
                }

                Text(viewModel.privacySupportText)
                    .font(SavoroTypography.micro)
                    .foregroundStyle(SavoroColor.textMuted)
                    .padding(.top, SavoroSpacing.xs)
            }
        }
        .accessibilityElement(children: .contain)
    }
}

struct RecipeDetailListSection<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                    Text(title)
                        .font(SavoroTypography.title2)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text(subtitle)
                        .font(SavoroTypography.micro)
                        .foregroundStyle(SavoroColor.textMuted)
                }
                content
            }
        }
    }
}

struct TrustBadgeView: View {
    let badge: RecipeDetailHeaderViewModel.TrustBadge

    var body: some View {
        HStack(spacing: SavoroSpacing.xs) {
            Image(systemName: badge.systemImage)
                .foregroundStyle(SavoroColor.positive)
            VStack(alignment: .leading, spacing: 1) {
                Text(badge.title)
                    .font(SavoroTypography.label)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(badge.detail)
                    .font(SavoroTypography.label)
                    .foregroundStyle(SavoroColor.textMuted)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, SavoroSpacing.sm)
        .padding(.vertical, SavoroSpacing.xs)
        .background(SavoroColor.cardStrong)
        .clipShape(Capsule(style: .continuous))
        .overlay(Capsule(style: .continuous).stroke(SavoroColor.glassBorder, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

extension RecipeDetail {
    static let mockHeaderNow: Date = ISO8601DateFormatter().date(from: "2026-06-08T12:00:00Z")!

    static let mockHeaderFixture: RecipeDetail = {
        let json = """
        {
          "summary": {
            "id": "recipe_shawarma_bowl",
            "ownerUserId": "user_maya",
            "slug": "chicken-shawarma-bowl",
            "title": "Chicken Shawarma Bowl",
            "description": "Warm shawarma-spiced chicken, rice, cucumber salad, and garlic yogurt sauce.",
            "imageUrl": "https://example.test/images/shawarma.jpg",
            "visibility": "public",
            "status": "published",
            "currentVersionId": "recipe_version_20260606",
            "forkedFromRecipeId": null,
            "forkedFromVersionId": null,
            "creator": { "userId": "user_maya", "username": "maya", "displayName": "Maya Reed", "avatarUrl": "https://example.test/avatars/maya.jpg" },
            "perServingMacros": { "calories": 520, "proteinGrams": 42, "carbsGrams": 48, "fatGrams": 18, "fiberGrams": 7, "sodiumMilligrams": 720 },
            "tags": ["high-protein", "meal-prep", "weeknight"],
            "viewerState": { "isOwner": false, "isSaved": true, "canFork": true, "canLog": true },
            "createdAt": "2026-06-06T12:00:00Z",
            "updatedAt": "2026-06-06T12:30:00Z"
          },
          "currentVersion": {
            "id": "recipe_version_20260606",
            "recipeId": "recipe_shawarma_bowl",
            "versionNumber": 1,
            "title": "Chicken Shawarma Bowl",
            "description": "Warm shawarma-spiced chicken, rice, cucumber salad, and garlic yogurt sauce.",
            "instructionsMarkdown": "Season chicken. Cook rice. Assemble with salad and sauce.",
            "servings": 4,
            "yieldAmount": 4,
            "yieldUnit": "bowls",
            "prepTimeMinutes": 15,
            "cookTimeMinutes": 25,
            "perServingMacros": { "calories": 520, "proteinGrams": 42, "carbsGrams": 48, "fatGrams": 18, "fiberGrams": 7, "sodiumMilligrams": 720 },
            "createdByUserId": "user_maya",
            "publishedAt": "2026-06-06T12:30:00Z",
            "createdAt": "2026-06-06T12:00:00Z"
          },
          "ingredients": [
            {
              "id": "ingredient_chicken",
              "recipeVersionId": "recipe_version_20260606",
              "foodId": "food_usda_chicken_breast",
              "servingId": "serving_100g",
              "quantity": 600,
              "unit": "g",
              "label": "chicken breast",
              "note": "boneless skinless",
              "sortOrder": 0,
              "provenance": { "sourceType": "usda", "sourceId": "171077", "sourceRevision": "fdc-2026-04", "displayName": "USDA FoodData Central", "url": "https://fdc.nal.usda.gov/", "isVerified": true }
            },
            {
              "id": "ingredient_rice",
              "recipeVersionId": "recipe_version_20260606",
              "quantity": 2,
              "unit": "cups",
              "label": "cooked rice",
              "note": "warm",
              "sortOrder": 1,
              "provenance": { "sourceType": "user", "displayName": "Creator provided", "isVerified": false }
            },
            {
              "id": "ingredient_sauce",
              "recipeVersionId": "recipe_version_20260606",
              "quantity": 1,
              "unit": "to taste",
              "label": "garlic yogurt sauce",
              "note": "for serving",
              "sortOrder": 2,
              "provenance": { "sourceType": "user", "displayName": "Creator provided", "isVerified": false }
            }
          ],
          "steps": [
            { "id": "step_1", "recipeVersionId": "recipe_version_20260606", "body": "Season chicken and cook until browned and done.", "sortOrder": 0 },
            { "id": "step_2", "recipeVersionId": "recipe_version_20260606", "body": "Cook rice and toss cucumber salad while the chicken rests.", "sortOrder": 1 },
            { "id": "step_3", "recipeVersionId": "recipe_version_20260606", "body": "Assemble bowls with rice, chicken, cucumber salad, and garlic yogurt sauce.", "sortOrder": 2 }
          ],
          "provenance": {
            "trustLevel": "mixed",
            "summary": "Macros combine USDA-linked chicken data with creator-provided ingredients.",
            "attributions": [
              { "sourceType": "usda", "sourceId": "171077", "sourceRevision": "fdc-2026-04", "displayName": "USDA FoodData Central", "url": "https://fdc.nal.usda.gov/", "isVerified": true },
              { "sourceType": "user", "displayName": "Maya Reed", "isVerified": false }
            ]
          }
        }
        """
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try! decoder.decode(RecipeDetail.self, from: Data(json.utf8))
    }()
}

struct RecipeDetailPlaceholderView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack { RecipeDetailPlaceholderView() }
    }
}
