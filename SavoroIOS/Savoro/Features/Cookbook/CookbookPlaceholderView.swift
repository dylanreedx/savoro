import SwiftUI

enum CookbookLibrarySegment: String, CaseIterable, Identifiable, CustomStringConvertible {
    case mine
    case saved
    case drafts

    var id: Self { self }

    var description: String {
        switch self {
        case .mine: return "Mine"
        case .saved: return "Saved"
        case .drafts: return "Drafts"
        }
    }
}

struct CookbookLibraryItem: Identifiable, Equatable {
    enum Visibility: String, Equatable {
        case published
        case savedPublic
        case localDraft
    }

    enum BadgeKind: String, CaseIterable, Equatable, Identifiable {
        case saved
        case draft
        case forked

        var id: Self { self }

        var title: String {
            switch self {
            case .saved: return "Saved"
            case .draft: return "Draft"
            case .forked: return "Forked"
            }
        }

        var systemImage: String? {
            switch self {
            case .saved: return "bookmark.fill"
            case .draft: return "lock.fill"
            case .forked: return "arrow.triangle.branch"
            }
        }
    }

    let id: String
    let recipeId: String?
    let title: String
    let subtitle: String
    let badges: [BadgeKind]
    let systemImage: String
    let visibility: Visibility
    let updatedText: String
    let tags: [String]
    let isLocalOnly: Bool

    var destinationRoute: SavoroRoute? {
        guard let recipeId else { return nil }
        if visibility == .localDraft { return .recipeEditor(draftId: recipeId) }
        return .recipeDetail(id: recipeId)
    }

    var accessibilityHint: String {
        guard destinationRoute != nil else { return "Local mock item" }
        return visibility == .localDraft ? "Opens draft editor" : "Opens recipe details"
    }

    var visibleCopy: String {
        ([title, subtitle, updatedText, accessibilityHint] + badges.map(\.title) + tags).joined(separator: " ")
    }

    var searchableCopy: String { visibleCopy }
}

enum CookbookLibraryFilter: String, CaseIterable, Identifiable, CustomStringConvertible {
    case all
    case created
    case saved
    case drafts

    var id: Self { self }

    var description: String {
        switch self {
        case .all: return "All"
        case .created: return "Created"
        case .saved: return "Saved"
        case .drafts: return "Drafts"
        }
    }

    func includes(_ item: CookbookLibraryItem) -> Bool {
        switch self {
        case .all: return true
        case .created: return item.visibility == .published
        case .saved: return item.visibility == .savedPublic
        case .drafts: return item.visibility == .localDraft
        }
    }
}

struct CookbookLibrarySection: Equatable {
    let segment: CookbookLibrarySegment
    let title: String
    let subtitle: String
    let items: [CookbookLibraryItem]

    var emptyTitle: String { "Nothing here yet" }
    var emptyBody: String {
        switch segment {
        case .mine: return "Recipes you create or fork will appear here in this local mock library."
        case .saved: return "Saved public recipes will appear here for quick access on this device."
        case .drafts: return "Local drafts stay on this device in the mock app until you choose what to do next."
        }
    }

    var visibleCopy: String {
        ([title, subtitle, emptyTitle, emptyBody] + items.map(\.visibleCopy)).joined(separator: " ")
    }
}

struct CookbookEmptyState: Equatable {
    enum Kind: Equatable {
        case trueEmpty(CookbookLibrarySegment)
        case noResults(CookbookLibrarySegment)
    }

    let kind: Kind
    let title: String
    let body: String
    let systemImage: String
}

struct RootCookbookSaveCoordinator {
    static func save(recipeId: String, in store: CookbookMockLocalStore) -> SavoroToast {
        store.save(recipeId: recipeId)
        return SavoroToast(
            title: "Saved to local mock",
            message: "This recipe is saved locally for the demo only; nothing was published or shared.",
            style: .success
        )
    }
}

final class CookbookMockLocalStore: ObservableObject {
    @Published private(set) var savedRecipeIDs: Set<String>

    init(savedRecipeIDs: Set<String> = CookbookLibraryViewModel.defaultSavedRecipeIDs) {
        self.savedRecipeIDs = savedRecipeIDs
    }

    func save(recipeId: String) {
        savedRecipeIDs.insert(recipeId)
    }

    func refreshViewModel(selectedSegment: CookbookLibrarySegment = .saved, searchText: String = "", selectedFilter: CookbookLibraryFilter = .all) -> CookbookLibraryViewModel {
        CookbookLibraryViewModel(selectedSegment: selectedSegment, searchText: searchText, selectedFilter: selectedFilter, savedRecipeIDs: savedRecipeIDs)
    }
}

struct CookbookLibraryViewModel: Equatable {
    let selectedSegment: CookbookLibrarySegment
    let searchText: String
    let selectedFilter: CookbookLibraryFilter
    let savedRecipeIDs: Set<String>
    let sections: [CookbookLibrarySection]

    init(selectedSegment: CookbookLibrarySegment = .mine, searchText: String = "", selectedFilter: CookbookLibraryFilter = .all, savedRecipeIDs: Set<String> = Self.defaultSavedRecipeIDs) {
        self.selectedSegment = selectedSegment
        self.searchText = searchText
        self.selectedFilter = selectedFilter
        self.savedRecipeIDs = savedRecipeIDs
        self.sections = Self.makeSections(savedRecipeIDs: savedRecipeIDs)
    }

    var selectedSection: CookbookLibrarySection {
        sections.first { $0.segment == selectedSegment } ?? sections[0]
    }

    var filteredItems: [CookbookLibraryItem] {
        let trimmedQuery = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        return selectedSection.items.filter { item in
            selectedFilter.includes(item) && (trimmedQuery.isEmpty || item.searchableCopy.localizedCaseInsensitiveContains(trimmedQuery))
        }
    }

    var emptyState: CookbookEmptyState? {
        guard filteredItems.isEmpty else { return nil }
        if selectedSection.items.isEmpty {
            return CookbookEmptyState(kind: .trueEmpty(selectedSegment), title: selectedSection.emptyTitle, body: selectedSection.emptyBody, systemImage: selectedSegment.emptySystemImage)
        }
        return CookbookEmptyState(kind: .noResults(selectedSegment), title: emptySearchTitle, body: emptySearchBody, systemImage: "magnifyingglass")
    }

    var searchPrompt: String { "Search this cookbook" }
    var filterShellTitle: String { "Filter" }
    var emptySearchTitle: String { "No recipes match" }
    var emptySearchBody: String { "Adjust the search or choose All for this segment. Search and filters only check local fixture items shown in the selected cookbook tab." }
    var createRecipeTitle: String { "Create recipe" }
    var createRecipeSubtitle: String { "Start a private draft in the recipe editor scaffold." }
    static var createRecipeRoute: SavoroRoute { .recipeEditor(draftId: nil) }

    var privacyNotice: String { "Drafts are private, local-only mock items. Public cookbook surfaces show recipe library details only, not personal health records." }
    var scaffoldNotice: String { "Cookbook uses fixture data only; search and filters run on local fixtures. Nothing is published or shared from this mock library." }
    var visibleCopy: String { [privacyNotice, scaffoldNotice, searchPrompt, filterShellTitle, emptySearchTitle, emptySearchBody, createRecipeTitle, createRecipeSubtitle, selectedSection.visibleCopy].joined(separator: " ") }

    func selecting(_ segment: CookbookLibrarySegment) -> CookbookLibraryViewModel {
        CookbookLibraryViewModel(selectedSegment: segment, searchText: searchText, selectedFilter: selectedFilter, savedRecipeIDs: savedRecipeIDs)
    }

    static let defaultSavedRecipeIDs: Set<String> = ["recipe_berry_oats", "recipe_citrus_fish_tacos"]

    private static func makeSections(savedRecipeIDs: Set<String>) -> [CookbookLibrarySection] {
        let savedCatalog = [
            CookbookLibraryItem(id: "saved_oats", recipeId: "recipe_berry_oats", title: "Berry Oat Breakfast Bowl", subtitle: "Saved public recipe · Maya Reed", badges: [.saved], systemImage: "bookmark.fill", visibility: .savedPublic, updatedText: "Saved today", tags: ["breakfast", "fiber"], isLocalOnly: false),
            CookbookLibraryItem(id: "saved_tacos", recipeId: "recipe_citrus_fish_tacos", title: "Citrus Fish Tacos", subtitle: "Saved public recipe · Savoro Kitchen", badges: [.saved], systemImage: "bookmark.fill", visibility: .savedPublic, updatedText: "Saved Monday", tags: ["weeknight", "fresh"], isLocalOnly: false),
            CookbookLibraryItem(id: "saved_shawarma", recipeId: "recipe_shawarma_bowl", title: "Chicken Shawarma Bowl", subtitle: "Saved public recipe · Maya Reed", badges: [.saved], systemImage: "bookmark.fill", visibility: .savedPublic, updatedText: "Saved on this device", tags: ["high-protein", "meal prep"], isLocalOnly: false)
        ]

        return [
            CookbookLibrarySection(
                segment: .mine,
                title: "My recipes",
                subtitle: "Recipes you created or forked in the mock cookbook.",
                items: [
                    CookbookLibraryItem(id: "mine_shawarma", recipeId: "recipe_shawarma_bowl", title: "Chicken Shawarma Bowl", subtitle: "Published recipe · 4 servings", badges: [], systemImage: "person.crop.circle", visibility: .published, updatedText: "Updated yesterday", tags: ["high-protein", "meal prep"], isLocalOnly: false),
                    CookbookLibraryItem(id: "mine_lentil", recipeId: "recipe_lentil_soup", title: "Lemony Lentil Soup", subtitle: "Forked recipe · 6 servings", badges: [.forked], systemImage: "arrow.triangle.branch", visibility: .published, updatedText: "Updated this week", tags: ["cozy", "batch cook"], isLocalOnly: false)
                ]
            ),
            CookbookLibrarySection(
                segment: .saved,
                title: "Saved recipes",
                subtitle: "Public recipes saved locally for meal ideas.",
                items: savedCatalog.filter { item in item.recipeId.map(savedRecipeIDs.contains) ?? false }
            ),
            CookbookLibrarySection(
                segment: .drafts,
                title: "Drafts",
                subtitle: "Private recipes kept local in this mock app.",
                items: [
                    CookbookLibraryItem(id: "draft_green_curry", recipeId: "draft_green_curry", title: "Green Curry Notes", subtitle: "Private local draft · not published", badges: [.draft], systemImage: "lock.doc", visibility: .localDraft, updatedText: "Edited today", tags: ["private", "recipe notes"], isLocalOnly: true),
                    CookbookLibraryItem(id: "draft_snack_box", recipeId: "draft_snack_box", title: "Snack Box Template", subtitle: "Private local draft · not shared", badges: [.draft], systemImage: "lock.doc", visibility: .localDraft, updatedText: "Edited yesterday", tags: ["private", "template"], isLocalOnly: true)
                ]
            )
        ]
    }
}

private extension CookbookLibrarySegment {
    var emptySystemImage: String {
        switch self {
        case .mine: return "book.closed"
        case .saved: return "bookmark"
        case .drafts: return "lock.doc"
        }
    }
}

struct CookbookPlaceholderView: View {
    @State private var selectedSegment: CookbookLibrarySegment
    @State private var searchText = ""
    @State private var selectedFilter: CookbookLibraryFilter = .all
    @ObservedObject private var localStore: CookbookMockLocalStore
    private let onOpenRoute: (SavoroRoute) -> Void

    init(selectedSegment: CookbookLibrarySegment = .mine, localStore: CookbookMockLocalStore = CookbookMockLocalStore(), onOpenRoute: @escaping (SavoroRoute) -> Void = { _ in }) {
        _selectedSegment = State(initialValue: selectedSegment)
        _localStore = ObservedObject(wrappedValue: localStore)
        self.onOpenRoute = onOpenRoute
    }

    func renderedViewModel() -> CookbookLibraryViewModel {
        localStore.refreshViewModel(selectedSegment: selectedSegment, searchText: searchText, selectedFilter: selectedFilter)
    }

    var body: some View {
        let viewModel = renderedViewModel()

        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                header(viewModel: viewModel)
                SavoroSegmentedControl(options: CookbookLibrarySegment.allCases, selection: $selectedSegment)
                searchFilterShell(viewModel: viewModel)
                noticeCard(viewModel: viewModel)
                sectionView(viewModel.selectedSection, items: viewModel.filteredItems, emptyState: viewModel.emptyState)
            }
            .padding(SavoroSpacing.lg)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    onOpenRoute(CookbookLibraryViewModel.createRecipeRoute)
                } label: {
                    Label(viewModel.createRecipeTitle, systemImage: "plus")
                }
                .accessibilityHint(viewModel.createRecipeSubtitle)
            }
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .navigationTitle("Cookbook")
    }

    static let cardGridColumns: [GridItem] = [
        GridItem(.flexible(), spacing: SavoroSpacing.md),
        GridItem(.flexible(), spacing: SavoroSpacing.md)
    ]

    private func header(viewModel: CookbookLibraryViewModel) -> some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            SavoroChip(title: "Library", systemImage: "book.closed", variant: .accent)
            Text("Cookbook")
                .font(SavoroTypography.display)
                .foregroundStyle(SavoroColor.textStrong)
            Text("Browse your recipes, saved public ideas, and private local drafts.")
                .font(SavoroTypography.body)
                .foregroundStyle(SavoroColor.textBody)
            Button {
                onOpenRoute(CookbookLibraryViewModel.createRecipeRoute)
            } label: {
                Label(viewModel.createRecipeTitle, systemImage: "plus.circle.fill")
            }
            .buttonStyle(.borderedProminent)
            Text(viewModel.createRecipeSubtitle)
                .font(SavoroTypography.micro)
                .foregroundStyle(SavoroColor.textMuted)
        }
    }

    private func searchFilterShell(viewModel: CookbookLibraryViewModel) -> some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
            TextField(viewModel.searchPrompt, text: $searchText)
                .textFieldStyle(.roundedBorder)
                .accessibilityLabel(viewModel.searchPrompt)
            Picker(viewModel.filterShellTitle, selection: $selectedFilter) {
                ForEach(CookbookLibraryFilter.allCases) { filter in
                    Text(filter.description).tag(filter)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private func noticeCard(viewModel: CookbookLibraryViewModel) -> some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Label(viewModel.privacyNotice, systemImage: "lock.shield")
                Label(viewModel.scaffoldNotice, systemImage: "shippingbox")
            }
            .font(SavoroTypography.callout)
            .foregroundStyle(SavoroColor.textBody)
        }
    }

    private func sectionView(_ section: CookbookLibrarySection, items: [CookbookLibraryItem], emptyState: CookbookEmptyState?) -> some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.md) {
            VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                Text(section.title).font(SavoroTypography.title2).foregroundStyle(SavoroColor.textStrong)
                Text(section.subtitle).font(SavoroTypography.callout).foregroundStyle(SavoroColor.textMuted)
            }

            if let emptyState {
                SavoroCard(style: .glass) {
                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        Image(systemName: emptyState.systemImage)
                            .font(.title3)
                            .foregroundStyle(SavoroColor.accent)
                        Text(emptyState.title).font(SavoroTypography.headline).foregroundStyle(SavoroColor.textStrong)
                        Text(emptyState.body).font(SavoroTypography.callout).foregroundStyle(SavoroColor.textBody)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                LazyVGrid(columns: Self.cardGridColumns, spacing: SavoroSpacing.md) {
                    ForEach(items) { item in
                        cookbookItemCard(item)
                    }
                }
            }
        }
    }

    private func cookbookItemCard(_ item: CookbookLibraryItem) -> some View {
        Button {
            if let route = item.destinationRoute { onOpenRoute(route) }
        } label: {
            SavoroCard(style: item.isLocalOnly ? .elevated : .glass) {
                VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                    HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                        Image(systemName: item.systemImage)
                            .foregroundStyle(item.isLocalOnly ? SavoroColor.accent : SavoroColor.protein)
                            .font(.title3)
                        Spacer()
                    }
                    Text(item.title)
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(item.subtitle)
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    HStack(spacing: SavoroSpacing.xs) {
                        ForEach(item.badges) { badge in
                            SavoroChip(title: badge.title, systemImage: badge.systemImage, variant: badge == .draft ? .accent : .neutral)
                        }
                    }
                    Text(item.updatedText).font(SavoroTypography.micro).foregroundStyle(SavoroColor.textMuted)
                    HStack(spacing: SavoroSpacing.xs) {
                        ForEach(item.tags, id: \.self) { tag in
                            SavoroChip(title: tag, variant: item.isLocalOnly ? .accent : .neutral)
                        }
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 190, alignment: .topLeading)
            }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityHint(item.accessibilityHint)
    }
}

#Preview("Cookbook library") {
    NavigationStack { CookbookPlaceholderView() }
}
