import SwiftUI

public enum RecipeVisibilityOption: String, CaseIterable, Identifiable, Equatable {
    case keepPrivate
    case unlistedLink
    case publishToProfile
    case shareToCommunity

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .keepPrivate: return "Keep private"
        case .unlistedLink: return "Unlisted link"
        case .publishToProfile: return "Publish to profile"
        case .shareToCommunity: return "Share to community"
        }
    }

    public var subtitle: String {
        switch self {
        case .keepPrivate:
            return "Only you can open this recipe in the mock app."
        case .unlistedLink:
            return "Prepare a link-style state without adding it to profile or community surfaces."
        case .publishToProfile:
            return "Show recipe details on your public profile when publishing is implemented."
        case .shareToCommunity:
            return "Prepare this recipe for a future community selection step."
        }
    }

    public var systemImage: String {
        switch self {
        case .keepPrivate: return "lock.fill"
        case .unlistedLink: return "link"
        case .publishToProfile: return "person.crop.circle.badge.checkmark"
        case .shareToCommunity: return "person.3.fill"
        }
    }
}

public struct RecipeVisibilityOptionSheetModel: Equatable {
    public static let privacyNote = "Privacy note: private logs, goals, and nutrition logs are never shared by visibility changes. This MVP flow is local mock state only; no backend publish, profile update, community post, or public listing is created."

    public var selectedOption: RecipeVisibilityOption

    public init(selectedOption: RecipeVisibilityOption = .keepPrivate) {
        self.selectedOption = selectedOption
    }

    public var options: [RecipeVisibilityOption] { RecipeVisibilityOption.allCases }
    public var selectedStatusCopy: String { "Selected visibility: \(selectedOption.title). Local mock state only." }

    public var visibleCopy: String {
        ([Self.privacyNote, selectedStatusCopy] + options.flatMap { [$0.title, $0.subtitle] }).joined(separator: " ")
    }

    public mutating func select(_ option: RecipeVisibilityOption) {
        selectedOption = option
    }
}

public struct RecipeVisibilityOptionSheetDraftState: Equatable {
    public private(set) var committedOption: RecipeVisibilityOption
    public private(set) var pendingOption: RecipeVisibilityOption

    public init(committedOption: RecipeVisibilityOption = .keepPrivate) {
        self.committedOption = committedOption
        self.pendingOption = committedOption
    }

    public mutating func selectPending(_ option: RecipeVisibilityOption) {
        pendingOption = option
    }

    public mutating func cancel() {
        pendingOption = committedOption
    }

    public mutating func apply() -> RecipeVisibilityOption {
        committedOption = pendingOption
        return pendingOption
    }
}

public struct RecipeVisibilityMatrixState: Equatable {
    public static let localOnlyNotice = "Visibility changes are saved in local mock app-session state only. No backend publish, unpublish, public listing, profile update, community post, or social activity is created. Private logs, goals, nutrition logs, and body metrics are not included."

    public var option: RecipeVisibilityOption
    public var hasPersistedCommunitySetup: Bool

    public init(option: RecipeVisibilityOption = .keepPrivate, hasPersistedCommunitySetup: Bool = false) {
        self.option = option
        self.hasPersistedCommunitySetup = hasPersistedCommunitySetup
    }

    public var isPrivateOnly: Bool { option == .keepPrivate }
    public var hasMockLink: Bool { option == .unlistedLink }
    public var isSearchable: Bool { option == .publishToProfile }
    public var isDiscoverListed: Bool { false }
    public var isProfileListed: Bool { option == .publishToProfile }
    public var isCommunityListed: Bool { option == .shareToCommunity && hasPersistedCommunitySetup }
    public var requiresCommunitySetup: Bool { option == .shareToCommunity && !hasPersistedCommunitySetup }

    public var statusCopy: String {
        switch option {
        case .keepPrivate:
            return "Private visibility is active locally. This recipe is not profile-listed, community-listed, searchable, discoverable, or link-ready."
        case .unlistedLink:
            return "Unlisted link visibility is active locally. A mock link-style state is ready, but the recipe is not listed on profile, search, community, or Discover surfaces."
        case .publishToProfile:
            return "Publish to profile visibility is active locally. The recipe is marked for a mock public profile and search only, not Discover or community surfaces."
        case .shareToCommunity:
            if hasPersistedCommunitySetup {
                return "Share to community visibility is active locally with saved mock community setup. No backend post is created."
            }
            return "Share to community needs a saved mock community and optional caption before the recipe is treated as community-listed locally. No backend post is created."
        }
    }

    public var visibleCopy: String { [Self.localOnlyNotice, statusCopy].joined(separator: " ") }

    public mutating func change(to option: RecipeVisibilityOption, hasPersistedCommunitySetup: Bool) {
        self.option = option
        self.hasPersistedCommunitySetup = hasPersistedCommunitySetup
    }

    public mutating func unpublishToPrivate() {
        option = .keepPrivate
    }
}

public enum RecipeVisibilityViewerContext: String, CaseIterable, Equatable {
    case owner
    case publicViewer
    case followerViewer
    case directLinkViewer
    case communityViewer
}

public enum RecipeVisibilitySurfaceContext: String, CaseIterable, Equatable {
    case ownerLibrary
    case directLink
    case publicProfile
    case search
    case discover
    case community
}

public struct RecipeVisibilityMatrixFixture: Identifiable, Equatable {
    public let id: String
    public let title: String
    public let matrix: RecipeVisibilityMatrixState
    public let communitySetup: RecipeCommunityShareSetup?

    public init(id: String, title: String, matrix: RecipeVisibilityMatrixState, communitySetup: RecipeCommunityShareSetup? = nil) {
        self.id = id
        self.title = title
        self.matrix = matrix
        self.communitySetup = communitySetup
    }

    public func isVisible(on surface: RecipeVisibilitySurfaceContext, to viewer: RecipeVisibilityViewerContext) -> Bool {
        switch surface {
        case .ownerLibrary:
            return viewer == .owner
        case .directLink:
            return matrix.hasMockLink && viewer == .directLinkViewer
        case .publicProfile:
            return matrix.isProfileListed
        case .search:
            return matrix.isSearchable
        case .discover:
            return matrix.isDiscoverListed
        case .community:
            return matrix.isCommunityListed && viewer == .communityViewer
        }
    }

    public func publicSurfacePayload(on surface: RecipeVisibilitySurfaceContext, to viewer: RecipeVisibilityViewerContext) -> [String: String]? {
        guard surface != .ownerLibrary, isVisible(on: surface, to: viewer) else { return nil }
        var payload = [
            "recipeId": id,
            "title": title,
            "visibility": matrix.option.rawValue,
            "surface": surface.rawValue,
            "viewer": viewer.rawValue,
            "payloadDomain": "recipe-visibility-public-fixture"
        ]
        if surface == .community, let communitySetup {
            payload["communityId"] = communitySetup.selectedCommunityId
            payload["caption"] = communitySetup.captionPreview
        }
        return payload
    }

    public static let fixtures: [Self] = [
        RecipeVisibilityMatrixFixture(id: "recipe_private_owner_only", title: "Private pantry soup", matrix: RecipeVisibilityMatrixState(option: .keepPrivate)),
        RecipeVisibilityMatrixFixture(id: "recipe_unlisted_link_only", title: "Unlisted picnic salad", matrix: RecipeVisibilityMatrixState(option: .unlistedLink)),
        RecipeVisibilityMatrixFixture(id: "recipe_public_profile", title: "Public weeknight pasta", matrix: RecipeVisibilityMatrixState(option: .publishToProfile)),
        RecipeVisibilityMatrixFixture(
            id: "recipe_community_saved_setup",
            title: "Community lentil skillet",
            matrix: RecipeVisibilityMatrixState(option: .shareToCommunity, hasPersistedCommunitySetup: true),
            communitySetup: RecipeCommunityShareSetup(selectedCommunityId: "community_weeknight", caption: "Cozy dinner idea for the mock group.")
        ),
        RecipeVisibilityMatrixFixture(
            id: "recipe_community_needs_setup",
            title: "Community draft noodles",
            matrix: RecipeVisibilityMatrixState(option: .shareToCommunity, hasPersistedCommunitySetup: false),
            communitySetup: nil
        )
    ]
}

final class RecipeVisibilityChangeStore: ObservableObject {
    @Published private(set) var visibilityByDraftKey: [String: RecipeVisibilityOption]

    init(visibilityByDraftKey: [String: RecipeVisibilityOption] = [:]) {
        self.visibilityByDraftKey = visibilityByDraftKey
    }

    func loadVisibility(draftKey: String) -> RecipeVisibilityOption {
        visibilityByDraftKey[draftKey] ?? .keepPrivate
    }

    func saveVisibility(_ option: RecipeVisibilityOption, draftKey: String) {
        visibilityByDraftKey[draftKey] = option
    }

    func unpublishToPrivate(draftKey: String) {
        visibilityByDraftKey[draftKey] = .keepPrivate
    }

    func moveVisibility(from oldDraftKey: String, to newDraftKey: String) {
        guard oldDraftKey != newDraftKey, let option = visibilityByDraftKey.removeValue(forKey: oldDraftKey) else { return }
        visibilityByDraftKey[newDraftKey] = option
    }
}

public struct RecipeCommunityChoice: Identifiable, Equatable {
    public let id: String
    public let name: String
    public let summary: String
    public let metadata: [String: String]

    public init(id: String, name: String, summary: String, metadata: [String: String]) {
        self.id = id
        self.name = name
        self.summary = summary
        self.metadata = metadata
    }

    public static let mockChoices: [Self] = [
        RecipeCommunityChoice(id: "community_weeknight", name: "Weeknight cooks", summary: "Public recipe ideas for low-lift dinners.", metadata: ["mode": "mock-local-fixture", "privacyDomain": "public-community-metadata", "startsBackendPost": "false"]),
        RecipeCommunityChoice(id: "community_meal_prep", name: "Meal prep ideas", summary: "Public planning inspiration from shared recipes.", metadata: ["mode": "mock-local-fixture", "privacyDomain": "public-community-metadata", "startsBackendPost": "false"]),
        RecipeCommunityChoice(id: "community_family", name: "Family table", summary: "Public family-friendly recipe conversation.", metadata: ["mode": "mock-local-fixture", "privacyDomain": "public-community-metadata", "startsBackendPost": "false"])
    ]

    public var visibleCopy: String {
        ([name, summary] + metadata.map { "\($0.key): \($0.value)" }).joined(separator: " ")
    }
}

public struct RecipeCommunityShareSetup: Equatable {
    public static let localOnlyNotice = "Community share setup is saved in local mock app-session state only. It does not create a backend community post, public listing, profile update, or social activity. Private logs, goals, nutrition logs, and body metrics are not included."

    public var selectedCommunityId: String
    public var caption: String

    public init(selectedCommunityId: String = RecipeCommunityChoice.mockChoices[0].id, caption: String = "") {
        self.selectedCommunityId = selectedCommunityId
        self.caption = caption
    }

    public var selectedCommunity: RecipeCommunityChoice? {
        RecipeCommunityChoice.mockChoices.first { $0.id == selectedCommunityId }
    }

    public var captionPreview: String {
        let trimmed = caption.trimmedForRecipeEditor
        return trimmed.isEmpty ? "No caption added." : trimmed
    }

    public var statusCopy: String {
        "Community setup saved locally for \(selectedCommunity?.name ?? "a mock community") with caption: \(captionPreview)"
    }

    public var visibleCopy: String {
        ([Self.localOnlyNotice, statusCopy] + RecipeCommunityChoice.mockChoices.map(\.visibleCopy)).joined(separator: " ")
    }
}

final class RecipeCommunityShareStore: ObservableObject {
    @Published private(set) var setupsByDraftKey: [String: RecipeCommunityShareSetup]

    init(setupsByDraftKey: [String: RecipeCommunityShareSetup] = [:]) {
        self.setupsByDraftKey = setupsByDraftKey
    }

    func loadSetup(draftKey: String) -> RecipeCommunityShareSetup {
        setupsByDraftKey[draftKey] ?? RecipeCommunityShareSetup()
    }

    func saveSetup(_ setup: RecipeCommunityShareSetup, draftKey: String) {
        setupsByDraftKey[draftKey] = setup
    }

    func hasSetup(draftKey: String) -> Bool {
        setupsByDraftKey[draftKey] != nil
    }

    func moveSetup(from oldDraftKey: String, to newDraftKey: String) {
        guard oldDraftKey != newDraftKey, let setup = setupsByDraftKey.removeValue(forKey: oldDraftKey) else { return }
        setupsByDraftKey[newDraftKey] = setup
    }
}

public struct RecipeEditorDraftForm: Equatable {
    public enum ValidationIssue: String, CaseIterable, Equatable {
        case titleRequired = "Add a recipe title."
        case servingsRequired = "Add how many servings this recipe makes."
        case yieldRequired = "Add a yield note, such as 6 bowls or 12 muffins."
        case ingredientRequired = "Add at least one ingredient with a name and quantity."
        case instructionRequired = "Add at least one instruction step."
    }

    public var draftId: String?
    public var title: String
    public var description: String
    public var servingsText: String
    public var yieldText: String
    public var photoHook: RecipeEditorPhotoHook
    public var photoStatus: RecipeEditorPhotoStatus
    public var ingredients: [RecipeEditorIngredientRow]
    public var instructions: [RecipeEditorInstructionStep]

    public init(draftId: String? = nil, title: String = "", description: String = "", servingsText: String = "", yieldText: String = "", photoHook: RecipeEditorPhotoHook = .mockPlaceholder, photoStatus: RecipeEditorPhotoStatus = .idle, ingredients: [RecipeEditorIngredientRow] = [], instructions: [RecipeEditorInstructionStep] = []) {
        self.draftId = draftId
        self.title = title
        self.description = description
        self.servingsText = servingsText
        self.yieldText = yieldText
        self.photoHook = photoHook
        self.photoStatus = photoStatus
        self.ingredients = ingredients
        self.instructions = Self.renumbered(instructions)
    }

    public static func newDraft() -> Self { RecipeEditorDraftForm() }

    public static func localDraft(id: String) -> Self {
        RecipeEditorDraftForm(draftId: id, title: "", description: "", servingsText: "", yieldText: "")
    }

    public var basicsValidationIssues: [ValidationIssue] {
        var issues: [ValidationIssue] = []
        if title.trimmedForRecipeEditor.isEmpty { issues.append(.titleRequired) }
        if servingsText.trimmedForRecipeEditor.isEmpty { issues.append(.servingsRequired) }
        if yieldText.trimmedForRecipeEditor.isEmpty { issues.append(.yieldRequired) }
        return issues
    }

    public var validationIssues: [ValidationIssue] { publicPublishValidationIssues }

    public var publicPublishValidationIssues: [ValidationIssue] {
        var issues = basicsValidationIssues
        if !ingredients.contains(where: \.isValidForDraft) { issues.append(.ingredientRequired) }
        if !instructions.contains(where: { !$0.body.trimmedForRecipeEditor.isEmpty }) { issues.append(.instructionRequired) }
        return issues
    }

    public var isValidDraftSlice: Bool { basicsValidationIssues.isEmpty }
    public var canMockPublishPublicly: Bool { publicPublishValidationIssues.isEmpty }

    public var mockPublicPublishResultCopy: String {
        if canMockPublishPublicly {
            return "Public publish preview is ready for this complete local draft. This is mock-only; no backend, social post, or public listing is created."
        }
        return "Public publish preview needs a little more detail before it can continue. Review the recipe details below; this mock app does not post publicly."
    }

    public mutating func addIngredient(_ ingredient: RecipeEditorIngredientRow = .empty()) {
        ingredients.append(ingredient)
    }

    public mutating func addMockFood(_ food: RecipeEditorMockFoodSearchResult) {
        ingredients.append(.fromMockFood(food))
    }

    public mutating func addFreeTextIngredient(named name: String) {
        ingredients.append(.freeText(name: name))
    }

    public mutating func removeIngredient(id: String) {
        ingredients.removeAll { $0.id == id }
    }

    public mutating func addInstruction(body: String = "") {
        instructions.append(RecipeEditorInstructionStep(order: instructions.count + 1, body: body))
        instructions = Self.renumbered(instructions)
    }

    public mutating func removeInstruction(id: String) {
        instructions.removeAll { $0.id == id }
        instructions = Self.renumbered(instructions)
    }

    public mutating func moveInstruction(id: String, to targetIndex: Int) {
        guard let currentIndex = instructions.firstIndex(where: { $0.id == id }) else { return }
        let step = instructions.remove(at: currentIndex)
        let boundedIndex = max(0, min(targetIndex, instructions.count))
        instructions.insert(step, at: boundedIndex)
        instructions = Self.renumbered(instructions)
    }

    public mutating func moveInstructionUp(id: String) {
        guard let currentIndex = instructions.firstIndex(where: { $0.id == id }), currentIndex > 0 else { return }
        moveInstruction(id: id, to: currentIndex - 1)
    }

    public mutating func moveInstructionDown(id: String) {
        guard let currentIndex = instructions.firstIndex(where: { $0.id == id }), currentIndex < instructions.count - 1 else { return }
        moveInstruction(id: id, to: currentIndex + 1)
    }

    public var persistedInstructionOrder: [(id: String, order: Int, body: String)] {
        instructions.map { ($0.id, $0.order, $0.body) }
    }

    private static func renumbered(_ steps: [RecipeEditorInstructionStep]) -> [RecipeEditorInstructionStep] {
        steps.enumerated().map { index, step in
            var updated = step
            updated.order = index + 1
            return updated
        }
    }

    public var macroPreview: RecipeEditorMacroPreview {
        RecipeEditorMacroCalculator.preview(for: self)
    }

    public var hasIncompleteNutritionIngredients: Bool {
        macroPreview.isPartial
    }

    public var incompleteNutritionNotice: String? {
        hasIncompleteNutritionIngredients ? RecipeEditorIngredientRow.incompleteNutritionNotice : nil
    }

    public var privacyCopy: String {
        "This draft stays local in the mock app. Photo selection is a scaffold only; no image upload, backend sync, or real publishing starts here."
    }

    public var draftContextCopy: String {
        if let draftId {
            return "Mock draft \(draftId) opened from the local in-session draft store."
        }
        return "New local scaffold draft. Save Draft keeps fields in this app session only."
    }

    public static let headerContextCopy = "Build a local recipe draft with basics, ingredients, ordered instructions, and a macro preview. Save Draft keeps fields in this app session only. Public publish is a mock validation preview."
    public static let instructionHelperCopy = "Write ordered cooking steps for this local form. Reordering updates step numbers in this form only. Draft saving is in-session only and publish remains a mock preview."
    public static let emptyInstructionsCopy = "No instructions yet. Add a step when you're ready; it stays in this local form only until you save this in-session draft."

    public var visibleCopy: String {
        let instructionStateCopy = instructions.isEmpty ? Self.emptyInstructionsCopy : ""
        return ([Self.headerContextCopy, privacyCopy, draftContextCopy, mockPublicPublishResultCopy, photoHook.title, photoHook.body, photoHook.actionTitle, photoStatus.message, title, description, servingsText, yieldText, incompleteNutritionNotice ?? "", macroPreview.statusText, macroPreview.totalSummaryText, macroPreview.perServingSummaryText, Self.instructionHelperCopy, instructionStateCopy] + ingredients.flatMap(\.visibleCopyParts) + instructions.flatMap(\.visibleCopyParts) + validationIssues.map(\.rawValue)).joined(separator: " ")
    }
}

public struct RecipeEditorInstructionStep: Identifiable, Equatable {
    public var id: String
    public var order: Int
    public var body: String

    public init(id: String = UUID().uuidString, order: Int, body: String = "") {
        self.id = id
        self.order = order
        self.body = body
    }

    public var displayNumber: String { "Step \(order)" }
    public var instructionFieldAccessibilityLabel: String { "Instruction step \(order)" }
    public var moveUpAccessibilityLabel: String { "Move step \(order) up" }
    public var moveDownAccessibilityLabel: String { "Move step \(order) down" }
    public var removeAccessibilityLabel: String { "Remove step \(order)" }
    public var moveUpAccessibilityHint: String { order == 1 ? "First step cannot move up." : "Moves this local form step earlier." }
    public func moveDownAccessibilityHint(totalSteps: Int) -> String {
        order == totalSteps ? "Last step cannot move down." : "Moves this local form step later."
    }
    public var visibleCopyParts: [String] { [displayNumber, instructionFieldAccessibilityLabel, moveUpAccessibilityLabel, moveDownAccessibilityLabel, removeAccessibilityLabel, body] }
}

public struct RecipeEditorMacroPreview: Equatable {
    public let totalMacros: MacroTotals
    public let perServingMacros: MacroTotals
    public let servings: Double?
    public let includedIngredientCount: Int
    public let partialIngredientCount: Int

    public var needsServings: Bool { servings == nil && includedIngredientCount > 0 }
    public var isPartial: Bool { partialIngredientCount > 0 || needsServings }

    public var statusText: String {
        if needsServings { return "Partial macro preview: add valid servings to show per-serving macros." }
        if isPartial { return "Partial macro preview: ingredients without computable local nutrition are not included." }
        return "Macro preview uses local mock ingredient metadata."
    }

    public var totalSummaryText: String { "Total: \(Self.format(totalMacros.calories)) cal · \(Self.format(totalMacros.proteinGrams))g protein · \(Self.format(totalMacros.carbsGrams))g carbs · \(Self.format(totalMacros.fatGrams))g fat" }
    public var perServingSummaryText: String {
        guard servings != nil else { return "Per-serving macros need a valid servings value." }
        return "Per serving: \(Self.format(perServingMacros.calories)) cal · \(Self.format(perServingMacros.proteinGrams))g protein · \(Self.format(perServingMacros.carbsGrams))g carbs · \(Self.format(perServingMacros.fatGrams))g fat"
    }

    private static func format(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }
}

public enum RecipeEditorMacroCalculator {
    public static func preview(for form: RecipeEditorDraftForm) -> RecipeEditorMacroPreview {
        let servings = positiveNumber(from: form.servingsText)
        var total = MacroTotals.zero
        var included = 0
        var partial = 0

        for ingredient in form.ingredients {
            if let macros = macros(for: ingredient) {
                guard let updatedTotal = total.addingIfValid(macros) else {
                    partial += 1
                    continue
                }
                total = updatedTotal
                included += 1
            } else if ingredient.hasAnyUserEnteredContent {
                partial += 1
            }
        }

        let perServing: MacroTotals
        if let servings, let divided = total.dividedIfValid(by: servings) {
            perServing = divided
        } else {
            perServing = .zero
        }
        return RecipeEditorMacroPreview(totalMacros: total, perServingMacros: perServing, servings: servings, includedIngredientCount: included, partialIngredientCount: partial)
    }

    public static func macros(for ingredient: RecipeEditorIngredientRow) -> MacroTotals? {
        guard case .mockFood(let foodId, _, true) = ingredient.source,
              let metadata = RecipeEditorMockFoodNutritionMetadata.fixtureByFoodId[foodId],
              let quantity = positiveNumber(from: ingredient.quantityText),
              let grams = grams(for: quantity, unit: ingredient.unit) else { return nil }
        return metadata.macros.scaledIfValid(by: grams / metadata.referenceGrams)
    }

    static func positiveNumber(from text: String) -> Double? {
        let normalized = text.trimmedForRecipeEditor.replacingOccurrences(of: ",", with: ".")
        guard let value = Double(normalized), value.isFinite, value > 0 else { return nil }
        return value
    }

    static func grams(for quantity: Double, unit: String) -> Double? {
        switch unit.trimmedForRecipeEditor.lowercased() {
        case "g", "gram", "grams": return quantity
        case "kg", "kilogram", "kilograms": return quantity * 1000
        case "oz", "ounce", "ounces": return quantity * 28.3495
        default: return nil
        }
    }
}

struct RecipeEditorMockFoodNutritionMetadata: Equatable {
    let foodId: String
    let referenceGrams: Double
    let macros: MacroTotals

    static let fixtures: [Self] = [
        RecipeEditorMockFoodNutritionMetadata(foodId: "mock_food_chicken", referenceGrams: 100, macros: try! MacroTotals(calories: 165, proteinGrams: 31, carbsGrams: 0, fatGrams: 3.6)),
        RecipeEditorMockFoodNutritionMetadata(foodId: "mock_food_yogurt", referenceGrams: 170, macros: try! MacroTotals(calories: 100, proteinGrams: 17, carbsGrams: 6, fatGrams: 0.7))
    ]

    static let fixtureByFoodId: [String: Self] = Dictionary(uniqueKeysWithValues: fixtures.map { ($0.foodId, $0) })
}

private extension MacroTotals {
    func scaledIfValid(by multiplier: Double) -> MacroTotals? {
        MacroTotals.validated(calories: calories * multiplier, proteinGrams: proteinGrams * multiplier, carbsGrams: carbsGrams * multiplier, fatGrams: fatGrams * multiplier)
    }

    func addingIfValid(_ other: MacroTotals) -> MacroTotals? {
        MacroTotals.validated(calories: calories + other.calories, proteinGrams: proteinGrams + other.proteinGrams, carbsGrams: carbsGrams + other.carbsGrams, fatGrams: fatGrams + other.fatGrams)
    }

    func dividedIfValid(by divisor: Double) -> MacroTotals? {
        MacroTotals.validated(calories: calories / divisor, proteinGrams: proteinGrams / divisor, carbsGrams: carbsGrams / divisor, fatGrams: fatGrams / divisor)
    }

    static func validated(calories: Double, proteinGrams: Double, carbsGrams: Double, fatGrams: Double) -> MacroTotals? {
        try? MacroTotals(calories: calories, proteinGrams: proteinGrams, carbsGrams: carbsGrams, fatGrams: fatGrams)
    }
}

public struct RecipeEditorIngredientRow: Identifiable, Equatable {
    public enum Source: Equatable {
        case empty
        case mockFood(foodId: String, sourceLabel: String, macrosKnown: Bool)
        case freeText
    }

    public var id: String
    private var storedQuantityText: String
    private var storedUnit: String
    private var storedName: String
    public var quantityText: String {
        get { storedQuantityText }
        set {
            storedQuantityText = newValue
            markEditedEmptyRowAsFreeText()
        }
    }
    public var unit: String {
        get { storedUnit }
        set {
            storedUnit = newValue
            markEditedEmptyRowAsFreeText()
        }
    }
    public var name: String {
        get { storedName }
        set {
            storedName = newValue
            markEditedEmptyRowAsFreeText()
        }
    }
    public var source: Source

    public init(id: String = UUID().uuidString, quantityText: String = "", unit: String = "", name: String = "", source: Source = .empty) {
        self.id = id
        self.storedQuantityText = quantityText
        self.storedUnit = unit
        self.storedName = name
        self.source = source
        markEditedEmptyRowAsFreeText()
    }

    public static func empty(id: String = UUID().uuidString) -> Self {
        RecipeEditorIngredientRow(id: id)
    }

    public static func freeText(id: String = UUID().uuidString, quantityText: String = "", unit: String = "", name: String) -> Self {
        RecipeEditorIngredientRow(id: id, quantityText: quantityText, unit: unit, name: name, source: .freeText)
    }

    public static func fromMockFood(_ food: RecipeEditorMockFoodSearchResult, id: String = UUID().uuidString) -> Self {
        RecipeEditorIngredientRow(id: id, quantityText: food.defaultQuantityText, unit: food.defaultUnit, name: food.name, source: .mockFood(foodId: food.foodId, sourceLabel: food.sourceLabel, macrosKnown: food.macrosKnown))
    }

    public var isNameValid: Bool { !name.trimmedForRecipeEditor.isEmpty }
    public var isQuantityValid: Bool { !quantityText.trimmedForRecipeEditor.isEmpty }
    public var isValidForDraft: Bool { isNameValid && isQuantityValid }
    public var hasAnyUserEnteredContent: Bool {
        !quantityText.trimmedForRecipeEditor.isEmpty || !unit.trimmedForRecipeEditor.isEmpty || !name.trimmedForRecipeEditor.isEmpty
    }

    public var hasIncompleteNutrition: Bool {
        switch source {
        case .freeText: return true
        case .mockFood(_, _, let macrosKnown): return !macrosKnown
        case .empty: return false
        }
    }

    public var nutritionStatusText: String {
        switch source {
        case .freeText:
            return Self.incompleteNutritionNotice
        case .mockFood(_, _, true):
            if RecipeEditorMacroCalculator.macros(for: self) != nil {
                return "Nutrition is seeded from local mock food metadata."
            }
            return Self.nonComputableMockNutritionNotice
        case .mockFood(_, _, false):
            return Self.incompleteNutritionNotice
        case .empty:
            return "Add a custom ingredient or choose a local mock food to preview nutrition status."
        }
    }

    public static let incompleteNutritionNotice = "Nutrition details are incomplete because this ingredient has no local nutrition metadata. It is excluded from the partial macro preview."
    public static let nonComputableMockNutritionNotice = "This local mock food is not included in the partial macro preview until quantity and unit are supported."

    private mutating func markEditedEmptyRowAsFreeText() {
        guard case .empty = source else { return }
        if !quantityText.trimmedForRecipeEditor.isEmpty || !unit.trimmedForRecipeEditor.isEmpty || !name.trimmedForRecipeEditor.isEmpty {
            source = .freeText
        }
    }

    public var visibleCopyParts: [String] {
        [quantityText, unit, name, nutritionStatusText]
    }
}

public struct RecipeEditorMockFoodSearchResult: Identifiable, Equatable {
    public var id: String { foodId }
    public let foodId: String
    public let name: String
    public let defaultQuantityText: String
    public let defaultUnit: String
    public let sourceLabel: String
    public let macrosKnown: Bool
    public let metadata: [String: String]

    public static let fixtureResults: [Self] = [
        RecipeEditorMockFoodSearchResult(foodId: "mock_food_chicken", name: "Chicken breast", defaultQuantityText: "100", defaultUnit: "g", sourceLabel: "Local mock food", macrosKnown: true, metadata: ["mode": "mock-local-fixture", "startsBackendSearch": "false"]),
        RecipeEditorMockFoodSearchResult(foodId: "mock_food_yogurt", name: "Greek yogurt", defaultQuantityText: "170", defaultUnit: "g", sourceLabel: "Local mock food", macrosKnown: true, metadata: ["mode": "mock-local-fixture", "startsBackendSearch": "false"])
    ]

    public static func search(_ query: String) -> [Self] {
        let trimmed = query.trimmedForRecipeEditor
        guard !trimmed.isEmpty else { return fixtureResults }
        return fixtureResults.filter { $0.name.localizedCaseInsensitiveContains(trimmed) }
    }
}

public enum RecipeEditorPhotoStatus: Equatable {
    case idle
    case mockPlaceholderSelected(message: String)

    public var message: String {
        switch self {
        case .idle:
            return "Photo placeholder has not been invoked."
        case .mockPlaceholderSelected(let message):
            return message
        }
    }
}

public struct RecipeEditorPhotoCommand: Equatable {
    public let identifier: String
    public let startsBackendUpload: Bool
    public let storesPrivateImage: Bool
    public let feedbackMessage: String

    public static let mockLocalPlaceholder = RecipeEditorPhotoCommand(
        identifier: "mock-local-photo-placeholder",
        startsBackendUpload: false,
        storesPrivateImage: false,
        feedbackMessage: "Photo placeholder noted locally. Picker, upload, and storage are not active in this mock slice."
    )

    public func invoke() -> RecipeEditorPhotoStatus {
        .mockPlaceholderSelected(message: feedbackMessage)
    }
}

public struct RecipeEditorPhotoHook: Equatable {
    public let title: String
    public let body: String
    public let actionTitle: String
    public let systemImage: String
    public let mockUploadMetadata: [String: String]

    public static let mockPlaceholder = RecipeEditorPhotoHook(
        title: "Recipe photo",
        body: "Add photo is wired as a local placeholder for a future picker. Nothing is uploaded from this mock editor.",
        actionTitle: "Add photo placeholder",
        systemImage: "photo.badge.plus",
        mockUploadMetadata: [
            "mode": "mock-local-placeholder",
            "startsBackendUpload": "false",
            "storesPrivateImage": "false"
        ]
    )
}

final class RecipeEditorDraftStore: ObservableObject {
    @Published private(set) var draftsById: [String: RecipeEditorDraftForm]
    private var nextDraftNumber: Int

    init(drafts: [String: RecipeEditorDraftForm] = [:]) {
        self.draftsById = drafts
        self.nextDraftNumber = drafts.count + 1
    }

    func loadDraft(id: String) -> RecipeEditorDraftForm {
        draftsById[id] ?? RecipeEditorDraftForm.localDraft(id: id)
    }

    @discardableResult
    func saveDraft(_ form: RecipeEditorDraftForm) -> RecipeEditorDraftForm {
        var saved = form
        if saved.draftId == nil {
            saved.draftId = "local_draft_\(nextDraftNumber)"
            nextDraftNumber += 1
        }
        draftsById[saved.draftId!] = saved
        return saved
    }
}

public struct RecipeEditorPlaceholderView: View {
    @State private var form: RecipeEditorDraftForm
    @ObservedObject private var draftStore: RecipeEditorDraftStore
    @ObservedObject private var communityShareStore: RecipeCommunityShareStore
    @ObservedObject private var visibilityChangeStore: RecipeVisibilityChangeStore
    @State private var actionStatusCopy: String?
    @State private var selectedVisibilityOption: RecipeVisibilityOption
    @State private var communityShareSetup: RecipeCommunityShareSetup
    @State private var isShowingVisibilityOptions = false
    @State private var isShowingCommunityShareSetup = false
    private let temporaryDraftKey: String
    private let photoCommand: RecipeEditorPhotoCommand
    private let onPhotoHookInvoked: (RecipeEditorPhotoCommand) -> RecipeEditorPhotoStatus

    init(draftId: String? = nil, draftStore: RecipeEditorDraftStore = RecipeEditorDraftStore(), communityShareStore: RecipeCommunityShareStore = RecipeCommunityShareStore(), visibilityChangeStore: RecipeVisibilityChangeStore = RecipeVisibilityChangeStore(), photoCommand: RecipeEditorPhotoCommand = .mockLocalPlaceholder, onPhotoHookInvoked: @escaping (RecipeEditorPhotoCommand) -> RecipeEditorPhotoStatus = { $0.invoke() }) {
        let loadedForm = draftId.map(draftStore.loadDraft(id:)) ?? .newDraft()
        let temporaryDraftKey = Self.makeTemporaryDraftKey()
        let draftKey = Self.visibilityDraftKey(for: loadedForm, temporaryDraftKey: temporaryDraftKey)
        _form = State(initialValue: loadedForm)
        _selectedVisibilityOption = State(initialValue: visibilityChangeStore.loadVisibility(draftKey: draftKey))
        _communityShareSetup = State(initialValue: communityShareStore.loadSetup(draftKey: draftKey))
        self.temporaryDraftKey = temporaryDraftKey
        self.draftStore = draftStore
        self.communityShareStore = communityShareStore
        self.visibilityChangeStore = visibilityChangeStore
        self.photoCommand = photoCommand
        self.onPhotoHookInvoked = onPhotoHookInvoked
    }

    init(form: RecipeEditorDraftForm, draftStore: RecipeEditorDraftStore = RecipeEditorDraftStore(), communityShareStore: RecipeCommunityShareStore = RecipeCommunityShareStore(), visibilityChangeStore: RecipeVisibilityChangeStore = RecipeVisibilityChangeStore(), photoCommand: RecipeEditorPhotoCommand = .mockLocalPlaceholder, onPhotoHookInvoked: @escaping (RecipeEditorPhotoCommand) -> RecipeEditorPhotoStatus = { $0.invoke() }) {
        let temporaryDraftKey = Self.makeTemporaryDraftKey()
        let draftKey = Self.visibilityDraftKey(for: form, temporaryDraftKey: temporaryDraftKey)
        _form = State(initialValue: form)
        _selectedVisibilityOption = State(initialValue: visibilityChangeStore.loadVisibility(draftKey: draftKey))
        _communityShareSetup = State(initialValue: communityShareStore.loadSetup(draftKey: draftKey))
        self.temporaryDraftKey = temporaryDraftKey
        self.draftStore = draftStore
        self.communityShareStore = communityShareStore
        self.visibilityChangeStore = visibilityChangeStore
        self.photoCommand = photoCommand
        self.onPhotoHookInvoked = onPhotoHookInvoked
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                header
                photoPlaceholder
                basicsForm
                ingredientsForm
                instructionsForm
                visibilityOptions
                draftActions
                validationSummary
                noticeCard
            }
            .padding(SavoroSpacing.lg)
        }
        .background(SavoroColor.page.ignoresSafeArea())
        .navigationTitle(form.draftId == nil ? "New recipe" : "Edit draft")
        .sheet(isPresented: $isShowingVisibilityOptions) {
            RecipeVisibilityOptionSheetView(selectedOption: $selectedVisibilityOption) { option in
                applyVisibilityChange(option)
                isShowingVisibilityOptions = false
                if option == .shareToCommunity && !communityShareStore.hasSetup(draftKey: currentDraftKey) {
                    actionStatusCopy = "Share to community selected locally. Choose a mock community and optional caption next; no backend post starts."
                    DispatchQueue.main.async { isShowingCommunityShareSetup = true }
                } else {
                    actionStatusCopy = currentVisibilityMatrix.statusCopy
                }
            }
        }
        .sheet(isPresented: $isShowingCommunityShareSetup) {
            RecipeCommunityShareSetupSheetView(shareSetup: $communityShareSetup) { setup in
                saveCommunityShareSetup(setup)
                isShowingCommunityShareSetup = false
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            SavoroChip(title: "Private draft", systemImage: "lock.fill", variant: .accent)
            Text("Recipe editor")
                .font(SavoroTypography.display)
                .foregroundStyle(SavoroColor.textStrong)
            Text(RecipeEditorDraftForm.headerContextCopy)
                .font(SavoroTypography.body)
                .foregroundStyle(SavoroColor.textBody)
            Text(form.draftContextCopy)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
        }
    }

    private var photoPlaceholder: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Image(systemName: form.photoHook.systemImage)
                    .font(.largeTitle)
                    .foregroundStyle(SavoroColor.accent)
                Text(form.photoHook.title)
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(form.photoHook.body)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                SavoroButton(form.photoHook.actionTitle, systemImage: "photo", variant: .secondary) {
                    form.photoStatus = onPhotoHookInvoked(photoCommand)
                }
                .accessibilityHint("Mock-only photo seam. No upload starts.")
                if form.photoStatus != .idle {
                    Label(form.photoStatus.message, systemImage: "checkmark.circle")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                        .accessibilityIdentifier("recipe-editor-photo-status")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var basicsForm: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                Text("Basics")
                    .font(SavoroTypography.title2)
                    .foregroundStyle(SavoroColor.textStrong)
                labeledTextField(label: "Recipe title", text: $form.title, isRequired: true)
                labeledTextField(label: "Short description", text: $form.description, axis: .vertical)
                    .lineLimit(3, reservesSpace: true)
                HStack(alignment: .top, spacing: SavoroSpacing.md) {
                    labeledTextField(label: "Servings", text: $form.servingsText, isRequired: true)
                        .keyboardType(.numberPad)
                    labeledTextField(label: "Yield", text: $form.yieldText, isRequired: true)
                }
            }
        }
    }

    private var ingredientsForm: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                HStack {
                    Text("Ingredients")
                        .font(SavoroTypography.title2)
                        .foregroundStyle(SavoroColor.textStrong)
                    Spacer()
                    SavoroButton("Add row", systemImage: "plus", variant: .secondary) {
                        form.addIngredient()
                    }
                }
                Text("Add foods from local mock results or type a free-text ingredient. Known mock foods update the macro preview as quantity, unit, or servings change.")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)

                macroPreviewCard

                HStack(spacing: SavoroSpacing.sm) {
                    ForEach(RecipeEditorMockFoodSearchResult.fixtureResults) { food in
                        Button(food.name) { form.addMockFood(food) }
                            .buttonStyle(.bordered)
                            .accessibilityHint("Adds a local mock food result; no backend search starts.")
                    }
                }

                SavoroButton("Add free-text ingredient", systemImage: "square.and.pencil", variant: .secondary) {
                    form.addFreeTextIngredient(named: "Free-text ingredient")
                }
                .accessibilityHint("Free-text ingredients show an incomplete nutrition notice.")

                if let notice = form.incompleteNutritionNotice {
                    Label(notice, systemImage: "info.circle")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                        .accessibilityIdentifier("recipe-editor-incomplete-nutrition-notice")
                }

                ForEach($form.ingredients) { $ingredient in
                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                            TextField("Qty", text: $ingredient.quantityText)
                                .textFieldStyle(.roundedBorder)
                            TextField("Unit", text: $ingredient.unit)
                                .textFieldStyle(.roundedBorder)
                            TextField("Ingredient name", text: $ingredient.name)
                                .textFieldStyle(.roundedBorder)
                        }
                        HStack {
                            Label(ingredient.nutritionStatusText, systemImage: ingredient.hasIncompleteNutrition ? "info.circle" : "checkmark.circle")
                                .font(SavoroTypography.callout)
                                .foregroundStyle(SavoroColor.textBody)
                            Spacer()
                            Button("Remove") { form.removeIngredient(id: ingredient.id) }
                                .buttonStyle(.borderless)
                        }
                    }
                    .padding(.vertical, SavoroSpacing.xs)
                }
            }
        }
    }

    private var instructionsForm: some View {
        SavoroCard(style: .glass) {
            VStack(alignment: .leading, spacing: SavoroSpacing.md) {
                HStack {
                    Text("Instructions")
                        .font(SavoroTypography.title2)
                        .foregroundStyle(SavoroColor.textStrong)
                    Spacer()
                    SavoroButton("Add step", systemImage: "plus", variant: .secondary) {
                        form.addInstruction()
                    }
                }
                Text(RecipeEditorDraftForm.instructionHelperCopy)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)

                if form.instructions.isEmpty {
                    Label(RecipeEditorDraftForm.emptyInstructionsCopy, systemImage: "list.number")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                        .accessibilityIdentifier("recipe-editor-instructions-empty-state")
                }

                ForEach($form.instructions) { $step in
                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        Text(step.displayNumber)
                            .font(SavoroTypography.label)
                            .foregroundStyle(SavoroColor.textBody)
                        TextField("Instruction step", text: $step.body, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...4)
                            .accessibilityLabel(step.instructionFieldAccessibilityLabel)
                        HStack(spacing: SavoroSpacing.sm) {
                            Button("Move up") { form.moveInstructionUp(id: step.id) }
                                .buttonStyle(.borderless)
                                .disabled(step.order == 1)
                                .accessibilityLabel(step.moveUpAccessibilityLabel)
                                .accessibilityHint(step.moveUpAccessibilityHint)
                            Button("Move down") { form.moveInstructionDown(id: step.id) }
                                .buttonStyle(.borderless)
                                .disabled(step.order == form.instructions.count)
                                .accessibilityLabel(step.moveDownAccessibilityLabel)
                                .accessibilityHint(step.moveDownAccessibilityHint(totalSteps: form.instructions.count))
                            Spacer()
                            Button("Remove") { form.removeInstruction(id: step.id) }
                                .buttonStyle(.borderless)
                                .accessibilityLabel(step.removeAccessibilityLabel)
                                .accessibilityHint("Removes this step from the local form only.")
                        }
                    }
                    .padding(.vertical, SavoroSpacing.xs)
                    .accessibilityIdentifier("recipe-editor-instruction-step-\(step.order)")
                }
            }
        }
    }

    private var macroPreviewCard: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            Label(form.macroPreview.statusText, systemImage: form.macroPreview.isPartial ? "info.circle" : "sum")
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
            Text(form.macroPreview.totalSummaryText)
                .font(SavoroTypography.headline)
                .foregroundStyle(SavoroColor.textStrong)
            Text(form.macroPreview.perServingSummaryText)
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
        }
        .accessibilityIdentifier("recipe-editor-macro-preview")
    }

    private var visibilityOptions: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Text("Visibility")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Text(RecipeVisibilityMatrixState.localOnlyNotice)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                    .accessibilityIdentifier("recipe-visibility-privacy-note")
                Label("Current: \(selectedVisibilityOption.title)", systemImage: selectedVisibilityOption.systemImage)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                Text(currentVisibilityMatrix.statusCopy)
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                    .accessibilityIdentifier("recipe-visibility-matrix-status")
                if selectedVisibilityOption == .shareToCommunity {
                    if communityShareStore.hasSetup(draftKey: currentDraftKey) {
                        Text("Mock community saved locally: \(communityShareSetup.selectedCommunity?.name ?? "Choose a community")")
                            .font(SavoroTypography.callout)
                            .foregroundStyle(SavoroColor.textBody)
                            .accessibilityIdentifier("recipe-community-share-selected-community")
                        Text("Caption: \(communityShareSetup.captionPreview)")
                            .font(SavoroTypography.callout)
                            .foregroundStyle(SavoroColor.textBody)
                            .accessibilityIdentifier("recipe-community-share-caption-preview")
                    } else {
                        Text("No mock community setup saved yet. Choose a community and optional caption before this is treated as community-listed locally.")
                            .font(SavoroTypography.callout)
                            .foregroundStyle(SavoroColor.textBody)
                            .accessibilityIdentifier("recipe-community-share-setup-needed")
                    }
                    Text(RecipeCommunityShareSetup.localOnlyNotice)
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                    SavoroButton("Edit community setup", systemImage: "person.3", variant: .secondary) {
                        isShowingCommunityShareSetup = true
                    }
                    .accessibilityHint("Opens local mock community and caption setup. No backend community post starts.")
                }
                HStack(spacing: SavoroSpacing.sm) {
                    SavoroButton("Change visibility", systemImage: "eye", variant: .secondary) {
                        isShowingVisibilityOptions = true
                    }
                    .accessibilityHint("Opens local mock visibility options. No publish, backend request, or community post starts.")
                    if selectedVisibilityOption != .keepPrivate {
                        SavoroButton("Revert to private", systemImage: "lock", variant: .secondary) {
                            revertVisibilityToPrivate()
                        }
                        .accessibilityHint("Unpublishes this local mock visibility state back to private. No backend unpublish request starts.")
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var draftActions: some View {
        SavoroCard(style: .elevated) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                Text("Draft actions")
                    .font(SavoroTypography.headline)
                    .foregroundStyle(SavoroColor.textStrong)
                Text("Save Draft records this form in a local in-session mock store. Publish is only a validation preview and does not create a public listing.")
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                HStack(spacing: SavoroSpacing.sm) {
                    SavoroButton("Save Draft", systemImage: "tray.and.arrow.down", variant: .primary) {
                        saveDraft()
                    }
                    .accessibilityLabel("Save Draft")
                    .accessibilityHint("Saves this recipe draft to the local in-session mock store only. No backend sync or public publish starts.")
                    SavoroButton("Preview public publish", systemImage: "checklist", variant: .secondary) {
                        previewPublicPublish()
                    }
                    .accessibilityLabel("Preview public publish")
                    .accessibilityHint("Checks required recipe details for a mock public publish preview. Nothing is posted or listed publicly.")
                }
                if let actionStatusCopy {
                    Label(actionStatusCopy, systemImage: form.canMockPublishPublicly ? "checkmark.circle" : "info.circle")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                        .accessibilityIdentifier("recipe-editor-draft-action-status")
                        .accessibilityLabel("Draft action status: \(actionStatusCopy)")
                        .accessibilityHint("Describes the result of the most recent draft action.")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var currentDraftKey: String {
        Self.visibilityDraftKey(for: form, temporaryDraftKey: temporaryDraftKey)
    }

    private var currentVisibilityMatrix: RecipeVisibilityMatrixState {
        RecipeVisibilityMatrixState(
            option: selectedVisibilityOption,
            hasPersistedCommunitySetup: communityShareStore.hasSetup(draftKey: currentDraftKey)
        )
    }

    private func saveDraft() {
        let previousKey = currentDraftKey
        form = draftStore.saveDraft(form)
        let savedKey = currentDraftKey
        communityShareStore.moveSetup(from: previousKey, to: savedKey)
        visibilityChangeStore.moveVisibility(from: previousKey, to: savedKey)
        actionStatusCopy = "Draft saved locally for this app session only; no backend sync or public publish started."
    }

    private func applyVisibilityChange(_ option: RecipeVisibilityOption) {
        selectedVisibilityOption = option
        visibilityChangeStore.saveVisibility(option, draftKey: currentDraftKey)
    }

    private func revertVisibilityToPrivate() {
        selectedVisibilityOption = .keepPrivate
        visibilityChangeStore.unpublishToPrivate(draftKey: currentDraftKey)
        actionStatusCopy = "Visibility reverted to private in local mock state. The recipe is not profile-listed, community-listed, discoverable, or link-ready; no backend unpublish request starts."
    }

    private func saveCommunityShareSetup(_ setup: RecipeCommunityShareSetup) {
        communityShareSetup = setup
        selectedVisibilityOption = .shareToCommunity
        communityShareStore.saveSetup(setup, draftKey: currentDraftKey)
        visibilityChangeStore.saveVisibility(.shareToCommunity, draftKey: currentDraftKey)
        actionStatusCopy = setup.statusCopy + ". This is mock-only; no backend community post is created."
    }

    static func makeTemporaryDraftKey() -> String {
        "new-recipe-draft-\(UUID().uuidString)"
    }

    static func visibilityDraftKey(for form: RecipeEditorDraftForm, temporaryDraftKey: String) -> String {
        form.draftId ?? temporaryDraftKey
    }

    private func previewPublicPublish() {
        actionStatusCopy = form.mockPublicPublishResultCopy
    }

    private func labeledTextField(label: String, text: Binding<String>, isRequired: Bool = false, axis: Axis = .horizontal) -> some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            Text(isRequired ? "\(label) required" : label)
                .font(SavoroTypography.label)
                .foregroundStyle(SavoroColor.textBody)
            TextField(label, text: text, axis: axis)
                .textFieldStyle(.roundedBorder)
                .accessibilityLabel(isRequired ? "\(label), required" : label)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var validationSummary: some View {
        if !form.validationIssues.isEmpty {
            SavoroCard(style: .plain) {
                VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                    Text("Public publish validation")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text("Complete these fields before previewing a public recipe. This is local mock validation only; nothing is posted.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textBody)
                    ForEach(form.validationIssues, id: \.self) { issue in
                        Label(issue.rawValue, systemImage: "info.circle")
                    }
                    .font(SavoroTypography.callout)
                    .foregroundStyle(SavoroColor.textBody)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var noticeCard: some View {
        SavoroCard(style: .glass) {
            Label(form.privacyCopy, systemImage: "shippingbox")
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textBody)
        }
    }
}

struct RecipeVisibilityOptionSheetView: View {
    @Binding private var selectedOption: RecipeVisibilityOption
    @State private var pendingSelection: RecipeVisibilityOption
    let onApply: (RecipeVisibilityOption) -> Void
    @Environment(\.dismiss) private var dismiss

    init(selectedOption: Binding<RecipeVisibilityOption>, onApply: @escaping (RecipeVisibilityOption) -> Void = { _ in }) {
        _selectedOption = selectedOption
        _pendingSelection = State(initialValue: selectedOption.wrappedValue)
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    SavoroCard(style: .elevated) {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            SavoroChip(title: "Local mock", systemImage: "eye", variant: .accent)
                            Text("Recipe visibility")
                                .font(SavoroTypography.title2)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text(RecipeVisibilityOptionSheetModel.privacyNote)
                                .font(SavoroTypography.body)
                                .foregroundStyle(SavoroColor.textBody)
                                .accessibilityIdentifier("recipe-visibility-sheet-privacy-note")
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    VStack(spacing: SavoroSpacing.sm) {
                        ForEach(RecipeVisibilityOption.allCases) { option in
                            Button { pendingSelection = option } label: {
                                HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                                    Image(systemName: option.systemImage)
                                        .foregroundStyle(SavoroColor.accentStrong)
                                        .frame(width: 24)
                                    VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                                        Text(option.title)
                                            .font(SavoroTypography.bodyEmphasized)
                                            .foregroundStyle(SavoroColor.textStrong)
                                        Text(option.subtitle)
                                            .font(SavoroTypography.callout)
                                            .foregroundStyle(SavoroColor.textBody)
                                    }
                                    Spacer()
                                    if pendingSelection == option {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(SavoroColor.positive)
                                    }
                                }
                                .padding(SavoroSpacing.md)
                                .background(SavoroColor.cardStrong)
                                .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                                        .stroke(pendingSelection == option ? SavoroColor.accent : SavoroColor.glassBorder, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .accessibilityElement(children: .ignore)
                            .accessibilityIdentifier("recipe-visibility-option-\(option.rawValue)")
                            .accessibilityLabel("\(option.title). \(option.subtitle)")
                            .accessibilityValue(pendingSelection == option ? "Selected" : "Not selected")
                            .accessibilityHint("Sets the pending local mock visibility choice. Use Apply to save it or Close to discard it.")
                        }
                    }

                    Text("Selected visibility: \(pendingSelection.title). This selection stays pending until you apply it for the current mock flow.")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                        .accessibilityIdentifier("recipe-visibility-selected-status")
                }
                .padding(SavoroSpacing.lg)
            }
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Visibility")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        onApply(pendingSelection)
                        dismiss()
                    }
                }
            }
        }
    }
}

struct RecipeCommunityShareSetupSheetView: View {
    @Binding private var shareSetup: RecipeCommunityShareSetup
    @State private var pendingSetup: RecipeCommunityShareSetup
    let choices: [RecipeCommunityChoice]
    let onApply: (RecipeCommunityShareSetup) -> Void
    @Environment(\.dismiss) private var dismiss

    init(shareSetup: Binding<RecipeCommunityShareSetup>, choices: [RecipeCommunityChoice] = RecipeCommunityChoice.mockChoices, onApply: @escaping (RecipeCommunityShareSetup) -> Void = { _ in }) {
        _shareSetup = shareSetup
        _pendingSetup = State(initialValue: shareSetup.wrappedValue)
        self.choices = choices
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    SavoroCard(style: .elevated) {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            SavoroChip(title: "Local mock", systemImage: "person.3", variant: .accent)
                            Text("Community share setup")
                                .font(SavoroTypography.title2)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text(RecipeCommunityShareSetup.localOnlyNotice)
                                .font(SavoroTypography.body)
                                .foregroundStyle(SavoroColor.textBody)
                                .accessibilityIdentifier("recipe-community-share-local-only-notice")
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                        Text("Choose a mock community")
                            .font(SavoroTypography.headline)
                            .foregroundStyle(SavoroColor.textStrong)
                        ForEach(choices) { community in
                            Button { pendingSetup.selectedCommunityId = community.id } label: {
                                HStack(alignment: .top, spacing: SavoroSpacing.sm) {
                                    Image(systemName: "person.3.fill")
                                        .foregroundStyle(SavoroColor.accentStrong)
                                        .frame(width: 24)
                                    VStack(alignment: .leading, spacing: SavoroSpacing.xxs) {
                                        Text(community.name)
                                            .font(SavoroTypography.bodyEmphasized)
                                            .foregroundStyle(SavoroColor.textStrong)
                                        Text(community.summary)
                                            .font(SavoroTypography.callout)
                                            .foregroundStyle(SavoroColor.textBody)
                                    }
                                    Spacer()
                                    if pendingSetup.selectedCommunityId == community.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(SavoroColor.positive)
                                    }
                                }
                                .padding(SavoroSpacing.md)
                                .background(SavoroColor.cardStrong)
                                .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                                        .stroke(pendingSetup.selectedCommunityId == community.id ? SavoroColor.accent : SavoroColor.glassBorder, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .accessibilityElement(children: .ignore)
                            .accessibilityIdentifier("recipe-community-share-option-\(community.id)")
                            .accessibilityLabel("\(community.name). \(community.summary)")
                            .accessibilityValue(pendingSetup.selectedCommunityId == community.id ? "Selected" : "Not selected")
                            .accessibilityHint("Sets the pending local mock community choice. Use Save setup to keep it for this app session.")
                        }
                    }

                    SavoroCard(style: .glass) {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            Text("Caption")
                                .font(SavoroTypography.headline)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text("Optional public-facing recipe caption for this mock setup. It stays local and is not posted.")
                                .font(SavoroTypography.callout)
                                .foregroundStyle(SavoroColor.textBody)
                            TextField("Add an optional caption", text: $pendingSetup.caption, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(3...5)
                                .accessibilityLabel("Community share caption")
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Text("Selected community: \(pendingSetup.selectedCommunity?.name ?? "None"). Caption: \(pendingSetup.captionPreview)")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textMuted)
                        .accessibilityIdentifier("recipe-community-share-selected-status")
                }
                .padding(SavoroSpacing.lg)
            }
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Community setup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save setup") {
                        shareSetup = pendingSetup
                        onApply(pendingSetup)
                        dismiss()
                    }
                }
            }
        }
    }
}

private extension String {
    var trimmedForRecipeEditor: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

#Preview("Recipe editor") {
    NavigationStack { RecipeEditorPlaceholderView() }
}
