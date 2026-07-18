import SwiftUI
import UIKit

enum SavoroTab: String, CaseIterable, Identifiable {
    case today
    case cookbook
    case discover
    case community
    case profile

    var id: Self { self }

    var title: String {
        switch self {
        case .today: return "Today"
        case .cookbook: return "Cookbook"
        case .discover: return "Discover"
        case .community: return "Community"
        case .profile: return "Profile"
        }
    }

    var systemImage: String {
        switch self {
        case .today: return "sun.max"
        case .cookbook: return "book.closed"
        case .discover: return "sparkles"
        case .community: return "person.2"
        case .profile: return "person.crop.circle"
        }
    }
}

private struct SavoroTabBarAccessibilityIdentifierBridge: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        installIdentifiers(from: view)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        installIdentifiers(from: uiView)
    }

    private func installIdentifiers(from view: UIView, attemptsRemaining: Int = 8) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            guard let tabBar = findTabBar(in: view.window) else {
                if attemptsRemaining > 0 {
                    installIdentifiers(from: view, attemptsRemaining: attemptsRemaining - 1)
                }
                return
            }

            let tabs = SavoroTab.allCases
            for (item, tab) in zip(tabBar.items ?? [], tabs) {
                item.accessibilityIdentifier = "tab-\(tab.rawValue)"
            }

            let controls = tabBar.subviews
                .compactMap { $0 as? UIControl }
                .filter { !$0.isHidden && $0.isUserInteractionEnabled }
                .sorted { $0.frame.minX < $1.frame.minX }
            guard controls.count >= tabs.count else {
                if attemptsRemaining > 0 {
                    installIdentifiers(from: view, attemptsRemaining: attemptsRemaining - 1)
                }
                return
            }
            for (control, tab) in zip(controls, tabs) {
                control.accessibilityIdentifier = "tab-\(tab.rawValue)"
            }
        }
    }

    private func findTabBar(in view: UIView?) -> UITabBar? {
        guard let view else { return nil }
        if let tabBar = view as? UITabBar { return tabBar }
        for subview in view.subviews {
            if let tabBar = findTabBar(in: subview) { return tabBar }
        }
        return nil
    }
}

enum SavoroSheetRoute: Hashable, Identifiable {
    case addMeal
    case logRecipe(recipeId: String?, recipeVersionId: String? = nil, mealType: MealType? = nil)
    case logPicker(mealType: MealType? = nil)
    case forkRemix(recipeId: String, sourceVersionId: String? = nil)
    case shareRecipe(recipeId: String)
    case publishVisibility(recipeId: String?)
    case communityShareSetup(recipeId: String?)
    case recipeActions(recipeId: String)

    var id: String {
        switch self {
        case .addMeal: return "add-meal"
        case let .logRecipe(recipeId, recipeVersionId, mealType):
            if let recipeVersionId {
                return "log-recipe:\(recipeId ?? "new"):\(recipeVersionId):\(mealType?.rawValue ?? "no-meal")"
            }
            return "log-recipe:\(recipeId ?? "new"):\(mealType?.rawValue ?? "no-meal")"
        case let .logPicker(mealType): return "log-picker:\(mealType?.rawValue ?? "no-meal")"
        case let .forkRemix(recipeId, sourceVersionId):
            if let sourceVersionId {
                return "fork-remix:\(recipeId):\(sourceVersionId)"
            }
            return "fork-remix:\(recipeId)"
        case let .shareRecipe(recipeId): return "share-recipe:\(recipeId)"
        case let .publishVisibility(recipeId): return "publish-visibility:\(recipeId ?? "new")"
        case let .communityShareSetup(recipeId): return "community-share-setup:\(recipeId ?? "new")"
        case let .recipeActions(recipeId): return "recipe-actions:\(recipeId)"
        }
    }

    var title: String {
        switch self {
        case .addMeal: return "Add Meal"
        case .logRecipe: return "Log Recipe"
        case .logPicker: return "Log Picker"
        case .forkRemix: return "Private remix"
        case .shareRecipe: return "Share Recipe"
        case .publishVisibility: return "Publish & Visibility"
        case .communityShareSetup: return "Community Setup"
        case .recipeActions: return "Recipe Actions"
        }
    }

    var placeholderSubtitle: String {
        switch self {
        case .addMeal:
            return "Private meal logging preview. Nothing is saved beyond this app session."
        case .logRecipe:
            return "Recipe logging preview. Logs stay private for this app session only."
        case .logPicker:
            return "Picker preview with recents, saved recipes, your recipes, search results, and preserved meal context."
        case .forkRemix:
            return "Confirmation sheet for making a private editable remix. Confirm keeps the original unchanged, preserves attribution and source version, and publishes or shares nothing."
        case .shareRecipe:
            return "Sharing preview for recipe and community options. No external share, post, or publish action is performed."
        case .publishVisibility:
            return "Recipe visibility controls. Share to community continues to community and caption setup."
        case .communityShareSetup:
            return "Community selector and caption setup. No public listing or social activity is created."
        case .recipeActions:
            return "Recipe actions preview for Save, Log, Remix, Share, and Publish choices."
        }
    }
}

struct SavoroToast: Equatable, Identifiable {
    enum Style: String, CaseIterable {
        case info
        case success
        case warning
    }

    let id: UUID
    let title: String
    let message: String?
    let style: Style
    let duration: TimeInterval

    init(id: UUID = UUID(), title: String, message: String? = nil, style: Style = .info, duration: TimeInterval = 2.5) {
        self.id = id
        self.title = title
        self.message = message
        self.style = style
        self.duration = duration
    }

    static let scaffoldDemo = SavoroToast(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000039")!,
        title: "Savoro shell ready",
        message: "Toast messages are ready for app actions.",
        style: .info,
        duration: 2.5
    )
}

enum SavoroRoute: Hashable, Identifiable {
    case recipeDetail(id: String)
    case communityDetail(id: String)
    case publicProfile(userId: String)
    case recipeEditor(draftId: String?)

    var id: String {
        switch self {
        case let .recipeDetail(id): return "recipe-detail:\(id)"
        case let .communityDetail(id): return "community-detail:\(id)"
        case let .publicProfile(userId): return "public-profile:\(userId)"
        case let .recipeEditor(draftId): return "recipe-editor:\(draftId ?? "new")"
        }
    }

    var title: String {
        switch self {
        case .recipeDetail: return "Recipe Detail"
        case .communityDetail: return "Community Detail"
        case .publicProfile: return "Public Profile"
        case .recipeEditor: return "Recipe Editor"
        }
    }

    var placeholderSubtitle: String {
        switch self {
        case .recipeDetail:
            return "Recipe detail with macros, source details, saving, remixing, logging, and sharing options."
        case .communityDetail:
            return "Community space with public recipe shares, members, and invitations."
        case .publicProfile:
            return "Public profile with public recipes, collections, and social context."
        case .recipeEditor:
            return "Recipe editor for drafts, ingredients, macro preview, and publishing decisions."
        }
    }
}

struct SavoroTabNavigationState {
    private(set) var paths: [SavoroTab: [SavoroRoute]]

    init(paths: [SavoroTab: [SavoroRoute]] = [:]) {
        self.paths = SavoroTab.allCases.reduce(into: paths) { result, tab in
            result[tab, default: []]
        }
    }

    subscript(tab: SavoroTab) -> [SavoroRoute] {
        get { paths[tab, default: []] }
        set { paths[tab] = newValue }
    }
}

struct RootPlaceholderView: View {
    @StateObject private var cookbookLocalStore: CookbookMockLocalStore
    @StateObject private var recipeDraftStore: RecipeEditorDraftStore
    @StateObject private var communityShareStore: RecipeCommunityShareStore
    @StateObject private var visibilityChangeStore: RecipeVisibilityChangeStore

    init() {
        _cookbookLocalStore = StateObject(wrappedValue: CookbookMockLocalStore())
        _recipeDraftStore = StateObject(wrappedValue: RecipeEditorDraftStore())
        _communityShareStore = StateObject(wrappedValue: RecipeCommunityShareStore())
        _visibilityChangeStore = StateObject(wrappedValue: RecipeVisibilityChangeStore())
    }

    init(cookbookLocalStore: CookbookMockLocalStore, recipeDraftStore: RecipeEditorDraftStore = RecipeEditorDraftStore(), communityShareStore: RecipeCommunityShareStore = RecipeCommunityShareStore(), visibilityChangeStore: RecipeVisibilityChangeStore = RecipeVisibilityChangeStore()) {
        _cookbookLocalStore = StateObject(wrappedValue: cookbookLocalStore)
        _recipeDraftStore = StateObject(wrappedValue: recipeDraftStore)
        _communityShareStore = StateObject(wrappedValue: communityShareStore)
        _visibilityChangeStore = StateObject(wrappedValue: visibilityChangeStore)
    }

    var body: some View {
        SavoroTabShellView(cookbookLocalStore: cookbookLocalStore, recipeDraftStore: recipeDraftStore, communityShareStore: communityShareStore, visibilityChangeStore: visibilityChangeStore)
    }
}

struct SavoroTabShellView: View {
    @ObservedObject private var cookbookLocalStore: CookbookMockLocalStore
    @ObservedObject private var recipeDraftStore: RecipeEditorDraftStore
    @ObservedObject private var communityShareStore: RecipeCommunityShareStore
    @ObservedObject private var visibilityChangeStore: RecipeVisibilityChangeStore
    @State private var selectedTab: SavoroTab = .today
    @State private var navigationState = SavoroTabNavigationState()
    @State private var activeSheet: SavoroSheetRoute?
    @State private var activeToast: SavoroToast?
    @State private var selectedVisibilityOption: RecipeVisibilityOption = .keepPrivate
    @State private var communityShareSetup = RecipeCommunityShareSetup()
    @State private var temporaryVisibilityDraftKey = RecipeEditorPlaceholderView.makeTemporaryDraftKey()
    @State private var dayLog: DayLog = .todayFixture
    private let apiClient: APIClient = MockAPIClient.localMockSuccessRoutes()

    init() {
        _cookbookLocalStore = ObservedObject(wrappedValue: CookbookMockLocalStore())
        _recipeDraftStore = ObservedObject(wrappedValue: RecipeEditorDraftStore())
        _communityShareStore = ObservedObject(wrappedValue: RecipeCommunityShareStore())
        _visibilityChangeStore = ObservedObject(wrappedValue: RecipeVisibilityChangeStore())
    }

    init(cookbookLocalStore: CookbookMockLocalStore, recipeDraftStore: RecipeEditorDraftStore = RecipeEditorDraftStore(), communityShareStore: RecipeCommunityShareStore = RecipeCommunityShareStore(), visibilityChangeStore: RecipeVisibilityChangeStore = RecipeVisibilityChangeStore()) {
        _cookbookLocalStore = ObservedObject(wrappedValue: cookbookLocalStore)
        _recipeDraftStore = ObservedObject(wrappedValue: recipeDraftStore)
        _communityShareStore = ObservedObject(wrappedValue: communityShareStore)
        _visibilityChangeStore = ObservedObject(wrappedValue: visibilityChangeStore)
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ForEach(SavoroTab.allCases) { tab in
                NavigationStack(path: pathBinding(for: tab)) {
                    placeholderView(for: tab)
                        .navigationDestination(for: SavoroRoute.self) { route in
                            destinationView(for: route)
                        }
                }
                .tabItem {
                    Label(tab.title, systemImage: tab.systemImage)
                        .accessibilityIdentifier("tab-\(tab.rawValue)")
                }
                .tag(tab)
            }
        }
        .tint(SavoroColor.accent)
        .toolbarBackground(SavoroColor.raised, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .background(SavoroTabBarAccessibilityIdentifierBridge().frame(width: 0, height: 0))
        .sheet(item: $activeSheet) { route in
            sheetView(for: route)
        }
        .savoroToast($activeToast)
    }

    private func pathBinding(for tab: SavoroTab) -> Binding<[SavoroRoute]> {
        Binding(
            get: { navigationState[tab] },
            set: { navigationState[tab] = $0 }
        )
    }

    private func handleTodayQuickAction(_ action: TodayQuickActionKind) {
        switch action {
        case .addMeal:
            activeSheet = .logPicker(mealType: .breakfast)
        case .logRecipe:
            activeSheet = .logPicker()
        case .createRecipe:
            activeToast = action.toast
        }
    }

    private func handleLogPickerSelection(_ item: LogPickerViewModel.Item, mealType: MealType?) {
        switch item.itemType {
        case .recipe:
            activeSheet = .logRecipe(recipeId: item.recipeId, recipeVersionId: item.recipeVersionId, mealType: mealType)
        case .food:
            activeToast = SavoroToast(
                title: "Food handoff ready",
                message: "\(item.title) was not added to Today. Recipe logging can continue with the selected meal preset.",
                style: .info
            )
        }
    }

    private func handleTodayLogAgain(_ item: TodayRecentLogAgainItem) {
        activeToast = SavoroToast(
            title: "Log again ready",
            message: "\(item.title) was not added to your private log.",
            style: .info
        )
    }

    @ViewBuilder
    private func placeholderView(for tab: SavoroTab) -> some View {
        switch tab {
        case .today:
            TodayPlaceholderView(
                viewModel: TodaySummaryViewModel(dayLog: dayLog),
                onQuickAction: handleTodayQuickAction,
                onLogAgain: handleTodayLogAgain
            )
        case .cookbook:
            CookbookPlaceholderView(localStore: cookbookLocalStore) { route in
                navigationState[.cookbook].append(route)
            }
        case .discover:
            DiscoverPlaceholderView()
        case .community:
            CommunityPlaceholderView()
        case .profile:
            ProfilePlaceholderView()
        }
    }

    @ViewBuilder
    private func sheetView(for route: SavoroSheetRoute) -> some View {
        switch route {
        case let .logRecipe(recipeId, recipeVersionId, mealType):
            NavigationStack {
                LogRecipeSheetView(
                    viewModel: LogRecipeSheetViewModel(requestedRecipeId: recipeId, requestedRecipeVersionId: recipeVersionId, defaultMealType: mealType, defaultLogDate: dayLog.logDate),
                    onDismiss: { activeSheet = nil },
                    onConfirm: handleLogRecipe
                )
            }
        case let .logPicker(mealType):
            NavigationStack {
                LogPickerPlaceholderView(
                    mealType: mealType,
                    onSelect: handleLogPickerSelection,
                    onDismiss: { activeSheet = nil }
                )
            }
        case let .publishVisibility(recipeId):
            let draftKey = visibilityDraftKey(for: recipeId)
            let visibilityBinding = Binding(
                get: { visibilityChangeStore.loadVisibility(draftKey: draftKey) },
                set: { option in
                    selectedVisibilityOption = option
                    visibilityChangeStore.saveVisibility(option, draftKey: draftKey)
                }
            )
            RecipeVisibilityOptionSheetView(selectedOption: visibilityBinding) { option in
                selectedVisibilityOption = option
                visibilityChangeStore.saveVisibility(option, draftKey: draftKey)
                if option == .shareToCommunity && !communityShareStore.hasSetup(draftKey: draftKey) {
                    activeToast = SavoroToast(
                        title: "Choose a community",
                        message: "Share to community continues to community and caption setup; nothing posts publicly.",
                        style: .info
                    )
                    DispatchQueue.main.async { activeSheet = .communityShareSetup(recipeId: recipeId) }
                } else {
                    activeToast = SavoroToast(
                        title: option == .keepPrivate ? "Visibility reverted to private" : "Visibility noted locally",
                        message: RecipeVisibilityMatrixState(option: option, hasPersistedCommunitySetup: communityShareStore.hasSetup(draftKey: draftKey)).statusCopy,
                        style: .info
                    )
                    activeSheet = nil
                }
            }
        case let .communityShareSetup(recipeId):
            let draftKey = visibilityDraftKey(for: recipeId)
            let setupBinding = Binding(
                get: { communityShareStore.loadSetup(draftKey: draftKey) },
                set: { setup in
                    communityShareSetup = setup
                    communityShareStore.saveSetup(setup, draftKey: draftKey)
                }
            )
            RecipeCommunityShareSetupSheetView(shareSetup: setupBinding) { setup in
                communityShareStore.saveSetup(setup, draftKey: draftKey)
                visibilityChangeStore.saveVisibility(.shareToCommunity, draftKey: draftKey)
                activeToast = SavoroToast(
                    title: "Community setup saved locally",
                    message: "\(setup.selectedCommunity?.name ?? "Community") and caption are saved for this app session only; no community post is created.",
                    style: .success
                )
                activeSheet = nil
            }
        case let .forkRemix(recipeId, sourceVersionId):
            NavigationStack {
                ForkRemixConfirmationSheetView(model: ForkRemixConfirmationSheetModel(recipeId: recipeId, sourceVersionId: sourceVersionId), onConfirm: handleForkRecipe)
            }
        case .addMeal, .shareRecipe, .recipeActions:
            SavoroPlaceholderSheetView(route: route)
        }
    }

    private func visibilityDraftKey(for recipeId: String?) -> String {
        recipeId ?? temporaryVisibilityDraftKey
    }

    @MainActor
    private func handleForkRecipe(_ model: ForkRemixConfirmationSheetModel) async {
        do {
            let result = try await RootRecipeForkCoordinator.createPrivateCopy(model: model, apiClient: apiClient)
            cookbookLocalStore.addForkedDraft(result.recipe)
            recipeDraftStore.seedRemixDraft(from: result.recipe)
            activeToast = result.toast
            activeSheet = nil
            selectedTab = .cookbook
            navigationState[.cookbook].append(result.route)
        } catch {
            activeToast = model.forkErrorToast
            activeSheet = nil
        }
    }

    @MainActor
    private func handleLogRecipe(_ viewModel: LogRecipeSheetViewModel) async -> LogRecipeSubmissionStatus {
        let payload = viewModel.logRequestPayload()
        do {
            let response = try await apiClient.send(LogRecipeRequest(payload: payload))
            if let responseDayLog = response.dayLog {
                dayLog = responseDayLog
            } else if dayLog.date == payload.date {
                dayLog = try dayLog.addingEntry(response.entry)
            } else {
                dayLog = try DayLog(userId: payload.userId, date: payload.date, meals: [try MealLog(mealType: payload.mealType, entries: [response.entry])])
            }
            activeToast = SavoroToast(
                title: "Added to Today privately",
                message: "Frozen recipe snapshot added for this app session only.",
                style: .success
            )
            activeSheet = nil
            return .succeeded("Frozen recipe snapshot added for this app session only.")
        } catch {
            activeToast = SavoroToast(
                title: "Log was not added",
                message: "Today is unchanged. Please try again.",
                style: .warning
            )
            return .errored("Today is unchanged. Please try again.")
        }
    }

    private func placeholderAccent(for route: SavoroRoute) -> Color {
        switch route {
        case .communityDetail: return SavoroColor.fat
        case .publicProfile: return SavoroColor.blush
        case .recipeDetail: return SavoroColor.carbs
        case .recipeEditor: return SavoroColor.fat
        }
    }

    private func handleRecipeDetailSave(recipeId: String) {
        activeToast = RootCookbookSaveCoordinator.save(recipeId: recipeId, in: cookbookLocalStore)
    }

    @ViewBuilder
    private func destinationView(for route: SavoroRoute) -> some View {
        switch route {
        case let .recipeDetail(id):
            RecipeDetailPlaceholderView(
                routedRecipeId: id,
                onActionRoute: { activeSheet = $0 },
                onActionToast: { activeToast = $0 },
                onSaveRecipe: handleRecipeDetailSave
            )
        case let .recipeEditor(draftId):
            RecipeEditorPlaceholderView(draftId: draftId, draftStore: recipeDraftStore, communityShareStore: communityShareStore, visibilityChangeStore: visibilityChangeStore)
        case .communityDetail, .publicProfile:
            PlaceholderFeatureView(
                title: route.title,
                subtitle: route.placeholderSubtitle,
                foundationNotes: [
                    "Each tab can open this destination independently.",
                    "No public sharing or posting starts from this preview.",
                    "Keep private nutrition logs, goals, daily progress, and body metrics out of public surfaces."
                ],
                accent: placeholderAccent(for: route)
            )
        }
    }
}

struct RootRecipeForkResult: Equatable {
    let recipe: RecipeDetail
    let toast: SavoroToast
    let route: SavoroRoute
}

struct RootRecipeForkCoordinator {
    static func createPrivateCopy(model: ForkRemixConfirmationSheetModel, apiClient: APIClient) async throws -> RootRecipeForkResult {
        let response = try await apiClient.send(ForkRecipeRequest(recipeId: model.recipeId))
        return RootRecipeForkResult(
            recipe: response.recipe,
            toast: model.successToast(forkedRecipe: response.recipe),
            route: .recipeEditor(draftId: response.recipe.summary.id)
        )
    }
}

struct SavoroPlaceholderSheetView: View {
    let route: SavoroSheetRoute
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                SavoroCard(style: .elevated) {
                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        SavoroChip(title: "App sheet", systemImage: "rectangle.portrait.bottomhalf.inset.filled", variant: .accent)
                        Text(route.title)
                            .font(SavoroTypography.title2)
                            .foregroundStyle(SavoroColor.textStrong)
                        Text(route.placeholderSubtitle)
                            .font(SavoroTypography.body)
                            .foregroundStyle(SavoroColor.textBody)
                    }
                }

                Text("This sheet keeps preview actions contained while protecting private recipe and nutrition data.")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textMuted)

                Spacer()
            }
            .padding(SavoroSpacing.lg)
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle(route.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct SavoroToastHost: ViewModifier {
    @Binding var toast: SavoroToast?

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let toast {
                toastView(toast)
                    .padding(.horizontal, SavoroSpacing.md)
                    .padding(.top, SavoroSpacing.md)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await Task.sleep(nanoseconds: UInt64(toast.duration * 1_000_000_000))
                        guard !Task.isCancelled else { return }
                        await MainActor.run {
                            if self.toast?.id == toast.id {
                                withAnimation(.easeOut(duration: 0.2)) { self.toast = nil }
                            }
                        }
                    }
            }
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.86), value: toast?.id)
    }

    private func toastView(_ toast: SavoroToast) -> some View {
        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
            Image(systemName: systemImage(for: toast.style))
                .foregroundStyle(accent(for: toast.style))
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text(toast.title)
                    .font(SavoroTypography.bodyEmphasized)
                    .foregroundStyle(SavoroColor.textStrong)
                if let message = toast.message {
                    Text(message)
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(SavoroSpacing.md)
        .background(SavoroColor.cardStrong)
        .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                .stroke(SavoroColor.glassBorder, lineWidth: 1)
        )
        .savoroShadow(SavoroShadow.glass)
        .accessibilityElement(children: .combine)
    }

    private func systemImage(for style: SavoroToast.Style) -> String {
        switch style {
        case .info: return "info.circle.fill"
        case .success: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        }
    }

    private func accent(for style: SavoroToast.Style) -> Color {
        switch style {
        case .info: return SavoroColor.accent
        case .success: return SavoroColor.positive
        case .warning: return SavoroColor.carbs
        }
    }
}

extension View {
    func savoroToast(_ toast: Binding<SavoroToast?>) -> some View {
        modifier(SavoroToastHost(toast: toast))
    }
}

struct RootPlaceholderView_Previews: PreviewProvider {
    static var previews: some View {
        RootPlaceholderView()
    }
}
