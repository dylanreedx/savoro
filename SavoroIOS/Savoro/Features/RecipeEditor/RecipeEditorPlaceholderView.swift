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
            return "Only you can open this recipe."
        case .unlistedLink:
            return "Prepare private link access without adding it to profile or community surfaces."
        case .publishToProfile:
            return "Preview how this recipe would appear on your public profile."
        case .shareToCommunity:
            return "Prepare this recipe for a community selection step."
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
    public static let privacyNote = "Privacy note: private logs, goals, and nutrition logs are never shared by visibility changes. This preview stays on this device; no profile update, community post, or public listing is created."

    public var selectedOption: RecipeVisibilityOption

    public init(selectedOption: RecipeVisibilityOption = .keepPrivate) {
        self.selectedOption = selectedOption
    }

    public var options: [RecipeVisibilityOption] { RecipeVisibilityOption.allCases }
    public var selectedStatusCopy: String { "Selected visibility: \(selectedOption.title). Preview only." }

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
    public static let localOnlyNotice = "Visibility changes are saved for this app session only. No public listing, profile update, community post, or social activity is created. Private logs, goals, nutrition logs, and body metrics are not included."

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
            return "Unlisted link visibility is active locally. Link access is previewed, but the recipe is not listed on profile, search, community, or Discover surfaces."
        case .publishToProfile:
            return "Publish to profile visibility is active locally. The recipe is marked for profile and search preview only, not Discover or community surfaces."
        case .shareToCommunity:
            if hasPersistedCommunitySetup {
                return "Share to community visibility is active locally with a saved community choice. No community post is created."
            }
            return "Share to community needs a saved community and optional caption before the recipe is treated as community-listed locally. No community post is created."
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
            communitySetup: RecipeCommunityShareSetup(selectedCommunityId: "community_weeknight", caption: "Cozy dinner idea for the group.")
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
        [name, summary].joined(separator: " ")
    }
}

public struct RecipeCommunityShareSetup: Equatable {
    public static let localOnlyNotice = "Community share setup is saved for this app session only. It does not create a community post, public listing, profile update, or social activity. Private logs, goals, nutrition logs, and body metrics are not included."

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
        "Community setup saved locally for \(selectedCommunity?.name ?? "a community") with caption: \(captionPreview)"
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
    public var sourceRecipeId: String?
    public var sourceVersionId: String?

    public init(draftId: String? = nil, title: String = "", description: String = "", servingsText: String = "", yieldText: String = "", photoHook: RecipeEditorPhotoHook = .mockPlaceholder, photoStatus: RecipeEditorPhotoStatus = .idle, ingredients: [RecipeEditorIngredientRow] = [], instructions: [RecipeEditorInstructionStep] = [], sourceRecipeId: String? = nil, sourceVersionId: String? = nil) {
        self.draftId = draftId
        self.title = title
        self.description = description
        self.servingsText = servingsText
        self.yieldText = yieldText
        self.photoHook = photoHook
        self.photoStatus = photoStatus
        self.ingredients = ingredients
        self.instructions = Self.renumbered(instructions)
        self.sourceRecipeId = sourceRecipeId
        self.sourceVersionId = sourceVersionId
    }

    public static func newDraft() -> Self {
        RecipeEditorDraftForm(servingsText: "2")
    }

    public static func localDraft(id: String) -> Self {
        RecipeEditorDraftForm(draftId: id, title: "", description: "", servingsText: "2", yieldText: "")
    }

    static func remixDraft(from recipe: RecipeDetail) -> Self {
        let yieldText: String
        if let yieldAmount = recipe.currentVersion.yieldAmount, let yieldUnit = recipe.currentVersion.yieldUnit, !yieldUnit.isEmpty {
            yieldText = "\(Self.formatRecipeNumber(yieldAmount)) \(yieldUnit)"
        } else {
            yieldText = "\(Self.formatRecipeNumber(recipe.currentVersion.servings)) servings"
        }
        return RecipeEditorDraftForm(
            draftId: recipe.summary.id,
            title: recipe.currentVersion.title,
            description: recipe.currentVersion.description ?? recipe.summary.description ?? "",
            servingsText: Self.formatRecipeNumber(recipe.currentVersion.servings),
            yieldText: yieldText,
            ingredients: recipe.ingredients.sorted { $0.sortOrder < $1.sortOrder }.map { ingredient in
                RecipeEditorIngredientRow.freeText(
                    id: ingredient.id,
                    quantityText: ingredient.quantity.map(Self.formatRecipeNumber) ?? "",
                    unit: ingredient.unit,
                    name: ingredient.label
                )
            },
            instructions: recipe.steps.sorted { $0.sortOrder < $1.sortOrder }.map { step in
                RecipeEditorInstructionStep(id: step.id, order: step.sortOrder + 1, body: step.body)
            },
            sourceRecipeId: recipe.summary.forkedFromRecipeId,
            sourceVersionId: recipe.summary.forkedFromVersionId
        )
    }

    private static func formatRecipeNumber(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }

    public var basicsValidationIssues: [ValidationIssue] {
        var issues: [ValidationIssue] = []
        if title.trimmedForRecipeEditor.isEmpty { issues.append(.titleRequired) }
        if servingsText.trimmedForRecipeEditor.isEmpty { issues.append(.servingsRequired) }
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

    public var publishPreviewCopy: String {
        if canMockPublishPublicly {
            return "Public publish preview is ready for this complete local draft. No social post or public listing is created."
        }
        return "Public publish preview needs a little more detail before it can continue. Review the recipe details below; nothing posts publicly."
    }

    public var mockPublicPublishResultCopy: String { publishPreviewCopy }

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

    public var showsMacroStrip: Bool {
        macroPreview.includedIngredientCount > 0
    }

    public var incompleteNutritionNotice: String? {
        hasIncompleteNutritionIngredients ? RecipeEditorIngredientRow.incompleteNutritionNotice : nil
    }

    public var privacyCopy: String {
        "This draft stays private while you edit. Photo selection is a preview only; no image upload, sharing, or publishing starts here."
    }

    public var isRemixDraft: Bool { sourceRecipeId != nil || sourceVersionId != nil }

    public var remixAttributionCopy: String? {
        isRemixDraft ? "Private remix · source version attached" : nil
    }

    public var draftContextCopy: String {
        if isRemixDraft {
            return "Private remix ready to edit. The original stays unchanged, source version note stays attached, and nothing was published or shared."
        }
        if draftId != nil {
            return "Private draft ready to edit. Save Draft keeps fields in this app session only; nothing was published or shared."
        }
        return "New private draft. Save Draft keeps fields in this app session only."
    }

    public static let headerContextCopy = "Build a private recipe draft with basics, ingredients, ordered instructions, and a macro preview. Save Draft keeps fields in this app session only. Public publish is a validation preview only."
    public static let instructionHelperCopy = "Write ordered cooking steps for this local form. Reordering updates step numbers in this form only. Draft saving is in-session only and publish remains a preview."
    public static let emptyInstructionsCopy = "No instructions yet. Add a step when you're ready; it stays in this local form only until you save this in-session draft."

    public var visibleCopy: String {
        let instructionStateCopy = instructions.isEmpty ? Self.emptyInstructionsCopy : ""
        return ([Self.headerContextCopy, privacyCopy, draftContextCopy, publishPreviewCopy, photoHook.title, photoHook.body, photoHook.actionTitle, photoStatus.message, title, description, servingsText, yieldText, incompleteNutritionNotice ?? "", macroPreview.statusText, macroPreview.totalSummaryText, macroPreview.perServingSummaryText, Self.instructionHelperCopy, instructionStateCopy] + ingredients.flatMap(\.visibleCopyParts) + instructions.flatMap(\.visibleCopyParts) + validationIssues.map(\.rawValue)).joined(separator: " ")
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
        return "Macro preview uses available ingredient nutrition details."
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
        case .freeText:
            return true
        case .mockFood(_, _, let macrosKnown):
            return !macrosKnown || RecipeEditorMacroCalculator.macros(for: self) == nil
        case .empty:
            return false
        }
    }

    public var displayName: String {
        let trimmed = name.trimmedForRecipeEditor
        return trimmed.isEmpty ? "Untitled ingredient" : trimmed
    }

    public var amountSummaryText: String {
        [quantityText.trimmedForRecipeEditor, unit.trimmedForRecipeEditor]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    public var editorRowSummaryText: String {
        var parts: [String] = []
        if !amountSummaryText.isEmpty { parts.append(amountSummaryText) }
        if let macros = RecipeEditorMacroCalculator.macros(for: self) {
            parts.append("\(Self.formatRecipeNumber(macros.calories)) cal")
        }
        return parts.isEmpty ? "Add amount" : parts.joined(separator: " · ")
    }

    public var nutritionStatusText: String {
        switch source {
        case .freeText:
            return Self.incompleteNutritionNotice
        case .mockFood(_, _, true):
            if RecipeEditorMacroCalculator.macros(for: self) != nil {
                return "Nutrition is seeded from available food details."
            }
            return Self.nonComputableMockNutritionNotice
        case .mockFood(_, _, false):
            return Self.incompleteNutritionNotice
        case .empty:
            return "Add a custom ingredient or choose a suggested food to preview nutrition status."
        }
    }

    public static let incompleteNutritionNotice = "Nutrition details aren’t available for this ingredient, so it isn’t included in the partial macro preview."
    public static let nonComputableMockNutritionNotice = "This food is not included in the partial macro preview until quantity and unit are supported."

    private static func formatRecipeNumber(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }

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
        RecipeEditorMockFoodSearchResult(foodId: "mock_food_chicken", name: "Chicken breast", defaultQuantityText: "100", defaultUnit: "g", sourceLabel: "Suggested food", macrosKnown: true, metadata: ["mode": "mock-local-fixture", "startsBackendSearch": "false"]),
        RecipeEditorMockFoodSearchResult(foodId: "mock_food_yogurt", name: "Greek yogurt", defaultQuantityText: "170", defaultUnit: "g", sourceLabel: "Suggested food", macrosKnown: true, metadata: ["mode": "mock-local-fixture", "startsBackendSearch": "false"])
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
            return "No photo selected yet."
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
        feedbackMessage: "Photo choices are coming soon. Your recipe draft remains private."
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
        body: "Photos stay private while you shape this recipe. Nothing is uploaded from this editor.",
        actionTitle: "Add photo",
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
    func seedRemixDraft(from recipe: RecipeDetail) -> RecipeEditorDraftForm {
        saveDraft(.remixDraft(from: recipe))
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

private struct RecipeEditorIngredientSelection: Identifiable {
    let id: String
}

public struct RecipeEditorPlaceholderView: View {
    @State private var form: RecipeEditorDraftForm
    @ObservedObject private var draftStore: RecipeEditorDraftStore
    @ObservedObject private var communityShareStore: RecipeCommunityShareStore
    @ObservedObject private var visibilityChangeStore: RecipeVisibilityChangeStore
    @State private var actionStatusCopy: String?
    @State private var selectedVisibilityOption: RecipeVisibilityOption
    @State private var communityShareSetup: RecipeCommunityShareSetup
    @State private var isDescriptionExpanded: Bool
    @State private var isYieldExpanded: Bool
    @State private var isShowingIngredientPicker = false
    @State private var editingIngredient: RecipeEditorIngredientSelection?
    @State private var isShowingMacroDetails = false
    @State private var isShowingRemixDetails = false
    @State private var isShowingPublishSheet = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.dismiss) private var dismiss
    private let temporaryDraftKey: String
    private let photoCommand: RecipeEditorPhotoCommand
    private let onPhotoHookInvoked: (RecipeEditorPhotoCommand) -> RecipeEditorPhotoStatus

    init(
        draftId: String? = nil,
        draftStore: RecipeEditorDraftStore = RecipeEditorDraftStore(),
        communityShareStore: RecipeCommunityShareStore = RecipeCommunityShareStore(),
        visibilityChangeStore: RecipeVisibilityChangeStore = RecipeVisibilityChangeStore(),
        photoCommand: RecipeEditorPhotoCommand = .mockLocalPlaceholder,
        onPhotoHookInvoked: @escaping (RecipeEditorPhotoCommand) -> RecipeEditorPhotoStatus = { $0.invoke() }
    ) {
        let loadedForm = draftId.map(draftStore.loadDraft(id:)) ?? .newDraft()
        let temporaryDraftKey = Self.makeTemporaryDraftKey()
        let draftKey = Self.visibilityDraftKey(for: loadedForm, temporaryDraftKey: temporaryDraftKey)
        _form = State(initialValue: loadedForm)
        _selectedVisibilityOption = State(initialValue: visibilityChangeStore.loadVisibility(draftKey: draftKey))
        _communityShareSetup = State(initialValue: communityShareStore.loadSetup(draftKey: draftKey))
        _isDescriptionExpanded = State(initialValue: !loadedForm.description.trimmedForRecipeEditor.isEmpty)
        _isYieldExpanded = State(initialValue: !loadedForm.yieldText.trimmedForRecipeEditor.isEmpty)
        self.temporaryDraftKey = temporaryDraftKey
        self.draftStore = draftStore
        self.communityShareStore = communityShareStore
        self.visibilityChangeStore = visibilityChangeStore
        self.photoCommand = photoCommand
        self.onPhotoHookInvoked = onPhotoHookInvoked
    }

    init(
        form: RecipeEditorDraftForm,
        draftStore: RecipeEditorDraftStore = RecipeEditorDraftStore(),
        communityShareStore: RecipeCommunityShareStore = RecipeCommunityShareStore(),
        visibilityChangeStore: RecipeVisibilityChangeStore = RecipeVisibilityChangeStore(),
        photoCommand: RecipeEditorPhotoCommand = .mockLocalPlaceholder,
        onPhotoHookInvoked: @escaping (RecipeEditorPhotoCommand) -> RecipeEditorPhotoStatus = { $0.invoke() }
    ) {
        let temporaryDraftKey = Self.makeTemporaryDraftKey()
        let draftKey = Self.visibilityDraftKey(for: form, temporaryDraftKey: temporaryDraftKey)
        _form = State(initialValue: form)
        _selectedVisibilityOption = State(initialValue: visibilityChangeStore.loadVisibility(draftKey: draftKey))
        _communityShareSetup = State(initialValue: communityShareStore.loadSetup(draftKey: draftKey))
        _isDescriptionExpanded = State(initialValue: !form.description.trimmedForRecipeEditor.isEmpty)
        _isYieldExpanded = State(initialValue: !form.yieldText.trimmedForRecipeEditor.isEmpty)
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
                editorNavigationHeader
                if let attribution = form.remixAttributionCopy {
                    remixAttributionBanner(attribution)
                }
                photoDropZone
                titleForm
                servingsCard
                if form.showsMacroStrip {
                    macroStrip
                }
                ingredientsSection
                stepsSection
            }
            .padding(SavoroSpacing.lg)
            .padding(.top, SavoroSpacing.xxxl)
        }
        .ignoresSafeArea(edges: .top)
        .background(SavoroColor.page.ignoresSafeArea())
        .accessibilityIdentifier("recipe-editor-screen")
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .bottom, spacing: SavoroSpacing.none) {
            bottomBar
        }
        .overlay(alignment: .bottom) {
            if let actionStatusCopy {
                SavoroCard(style: .toast, insets: .compact) {
                    Label(actionStatusCopy, systemImage: "checkmark.circle.fill")
                        .font(SavoroTypography.callout)
                        .foregroundStyle(SavoroColor.textStrong)
                }
                .padding(.horizontal, SavoroSpacing.lg)
                .padding(.bottom, SavoroControlSize.minimumTapTarget + SavoroSpacing.xxxl)
                .accessibilityIdentifier("recipe-editor-draft-action-status")
            }
        }
        .sheet(isPresented: $isShowingIngredientPicker) {
            RecipeEditorIngredientPickerSheetView(
                onAddFood: { food in
                    form.addMockFood(food)
                },
                onAddFreeText: { ingredient in
                    form.addIngredient(ingredient)
                }
            )
        }
        .sheet(item: $editingIngredient) { selection in
            RecipeEditorIngredientEditSheetView(ingredient: ingredientBinding(for: selection.id))
        }
        .sheet(isPresented: $isShowingMacroDetails) {
            RecipeEditorMacroDetailSheetView(preview: form.macroPreview)
        }
        .sheet(isPresented: $isShowingRemixDetails) {
            RecipeEditorRemixDetailSheetView(detailCopy: form.draftContextCopy)
        }
        .sheet(isPresented: $isShowingPublishSheet) {
            RecipeEditorPublishSheetView(
                form: form,
                selectedVisibilityOption: $selectedVisibilityOption,
                communityShareSetup: $communityShareSetup,
                hasCommunitySetup: communityShareStore.hasSetup(draftKey: currentDraftKey),
                onApplyVisibility: applyVisibilityChange,
                onSaveCommunitySetup: saveCommunityShareSetup
            )
        }
    }

    private var editorNavigationHeader: some View {
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

            Text(form.draftId == nil ? "New recipe" : "Edit recipe")
                .font(SavoroTypography.display)
                .foregroundStyle(SavoroColor.textStrong)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func remixAttributionBanner(_ attribution: String) -> some View {
        Button { isShowingRemixDetails = true } label: {
            SavoroCard(style: .accent, insets: .compact) {
                HStack(spacing: SavoroSpacing.xs) {
                    Image(systemName: "arrow.triangle.branch")
                        .foregroundStyle(SavoroColor.accentStrong)
                    Text(attribution)
                        .font(SavoroTypography.label)
                        .foregroundStyle(SavoroColor.textStrong)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(SavoroTypography.micro)
                        .foregroundStyle(SavoroColor.textMuted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("recipe-editor-draft-context")
        .accessibilityHint("Shows remix source details.")
    }

    private var photoDropZone: some View {
        Button {
            form.photoStatus = onPhotoHookInvoked(photoCommand)
        } label: {
            VStack(spacing: SavoroSpacing.sm) {
                Image(systemName: form.photoStatus == .idle ? "photo" : "checkmark.circle.fill")
                    .font(SavoroTypography.title1)
                    .foregroundStyle(form.photoStatus == .idle ? SavoroColor.textSubtle : SavoroColor.accentStrong)
                Text(form.photoStatus == .idle ? "Add a photo (optional)" : "Photo choices are coming soon")
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
        .accessibilityLabel(form.photoHook.actionTitle)
        .accessibilityHint("Choose a photo for this recipe.")
        .accessibilityIdentifier("recipe-editor-photo-drop-zone")
    }

    private var titleForm: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            recipeEditorEyebrow("Title")
            TextField(
                "Recipe title",
                text: $form.title,
                prompt: Text("e.g. Spicy Tofu Rice Bowl").foregroundStyle(SavoroColor.fieldPlaceholder)
            )
            .textInputAutocapitalization(.words)
            .recipeEditorField()
            .accessibilityLabel("Recipe title")
            .accessibilityIdentifier("recipe-editor-field-recipe-title")

            if isDescriptionExpanded {
                HStack {
                    recipeEditorEyebrow("Description")
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
                    text: $form.description,
                    prompt: Text("What makes this recipe yours?").foregroundStyle(SavoroColor.fieldPlaceholder),
                    axis: .vertical
                )
                .lineLimit(2...4)
                .recipeEditorField(isMultiline: true)
                .accessibilityLabel("Short description")
                .accessibilityIdentifier("recipe-editor-field-short-description")
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
                .accessibilityIdentifier("recipe-editor-add-description")
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
                        text: $form.yieldText,
                        prompt: Text("e.g. 6 bowls").foregroundStyle(SavoroColor.fieldPlaceholder)
                    )
                    .recipeEditorField()
                    .accessibilityLabel("Yield, optional")
                    .accessibilityIdentifier("recipe-editor-field-yield")
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
                form.yieldText.trimmedForRecipeEditor.isEmpty ? "(yield)" : "(\(form.yieldText))",
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
            servingsStepButton(
                systemImage: "minus",
                isDisabled: currentServings <= 1
            ) {
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
                .accessibilityIdentifier("recipe-editor-serving-count")

            servingsStepButton(systemImage: "plus") {
                adjustServings(by: 1)
            }
            .accessibilityLabel("Increase servings")
        }
    }

    private func servingsStepButton(
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

    private var macroStrip: some View {
        Button { isShowingMacroDetails = true } label: {
            RecipeEditorMacroStrip(preview: form.macroPreview)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("recipe-editor-macro-preview")
        .accessibilityHint(form.macroPreview.isPartial ? "Shows which nutrition details are still missing." : "Shows recipe nutrition details.")
    }

    private var ingredientsSection: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            Text("Ingredients")
                .font(SavoroTypography.title2)
                .foregroundStyle(SavoroColor.textStrong)

            ForEach(form.ingredients) { ingredient in
                ingredientRow(ingredient)
                Divider().overlay(SavoroColor.border)
            }

            SavoroButton(
                "Add ingredient",
                systemImage: "plus",
                variant: .text,
                expandsHorizontally: false
            ) {
                isShowingIngredientPicker = true
            }
            .accessibilityIdentifier("recipe-editor-add-ingredient")
        }
    }

    private func ingredientRow(_ ingredient: RecipeEditorIngredientRow) -> some View {
        HStack(spacing: SavoroSpacing.xs) {
            Button {
                editingIngredient = RecipeEditorIngredientSelection(id: ingredient.id)
            } label: {
                VStack(alignment: .leading, spacing: SavoroSpacing.compact) {
                    Text(ingredient.displayName)
                        .font(SavoroTypography.bodyEmphasized)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text(ingredient.editorRowSummaryText)
                        .font(SavoroTypography.callout.monospacedDigit())
                        .foregroundStyle(SavoroColor.textMuted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(ingredient.displayName), \(ingredient.editorRowSummaryText)")
            .accessibilityHint("Edit ingredient details.")

            if ingredient.hasIncompleteNutrition {
                Circle()
                    .fill(SavoroColor.accentStrong)
                    .frame(width: SavoroSpacing.xxs, height: SavoroSpacing.xxs)
                    .accessibilityLabel("Nutrition details are partial")
            }

            SavoroButton(
                "×",
                variant: .text,
                expandsHorizontally: false,
                size: .compact
            ) {
                form.removeIngredient(id: ingredient.id)
            }
            .frame(width: SavoroControlSize.minimumTapTarget)
            .accessibilityLabel("Remove \(ingredient.displayName)")
        }
        .padding(.vertical, SavoroSpacing.xs)
        .accessibilityIdentifier("recipe-editor-ingredient-\(ingredient.id)")
    }

    private var stepsSection: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
            Text("Steps")
                .font(SavoroTypography.title2)
                .foregroundStyle(SavoroColor.textStrong)

            ForEach($form.instructions) { $step in
                instructionRow($step)
            }

            SavoroButton(
                "Add step",
                systemImage: "plus",
                variant: .text,
                expandsHorizontally: false
            ) {
                form.addInstruction()
            }
            .accessibilityIdentifier("recipe-editor-add-step")
        }
    }

    @ViewBuilder
    private func instructionRow(_ step: Binding<RecipeEditorInstructionStep>) -> some View {
        let stepValue = step.wrappedValue
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                HStack {
                    stepNumber(stepValue.order)
                    Spacer()
                    instructionMenu(stepValue)
                }
                instructionField(step)
            }
            .padding(.vertical, SavoroSpacing.xs)
            .accessibilityIdentifier("recipe-editor-instruction-step-\(stepValue.order)")
        } else {
            HStack(alignment: .top, spacing: SavoroSpacing.xs) {
                stepNumber(stepValue.order)
                instructionField(step)
                instructionMenu(stepValue)
            }
            .padding(.vertical, SavoroSpacing.xs)
            .accessibilityIdentifier("recipe-editor-instruction-step-\(stepValue.order)")
        }
    }

    private func stepNumber(_ order: Int) -> some View {
        Text("\(order)")
            .font(SavoroTypography.label.monospacedDigit())
            .foregroundStyle(SavoroColor.textStrong)
            .frame(
                width: SavoroControlSize.minimumTapTarget,
                height: SavoroControlSize.minimumTapTarget
            )
            .background(SavoroColor.accentSoft)
            .clipShape(Circle())
            .accessibilityHidden(true)
    }

    private func instructionField(_ step: Binding<RecipeEditorInstructionStep>) -> some View {
        TextField(
            "Add a step",
            text: step.body,
            prompt: Text("Add a step").foregroundStyle(SavoroColor.fieldPlaceholder),
            axis: .vertical
        )
        .lineLimit(1...4)
        .recipeEditorField(isMultiline: true)
        .accessibilityLabel(step.wrappedValue.instructionFieldAccessibilityLabel)
    }

    private func instructionMenu(_ step: RecipeEditorInstructionStep) -> some View {
        Menu {
            Button("Move earlier", systemImage: "arrow.up") {
                form.moveInstructionUp(id: step.id)
            }
            .disabled(step.order == 1)
            Button("Move later", systemImage: "arrow.down") {
                form.moveInstructionDown(id: step.id)
            }
            .disabled(step.order == form.instructions.count)
            Button("Delete step", systemImage: "trash", role: .destructive) {
                form.removeInstruction(id: step.id)
            }
        } label: {
            Image(systemName: "ellipsis")
                .font(SavoroTypography.bodyEmphasized)
                .foregroundStyle(SavoroColor.textMuted)
                .frame(
                    width: SavoroControlSize.minimumTapTarget,
                    height: SavoroControlSize.minimumTapTarget
                )
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Options for step \(step.order)")
    }

    private var bottomBar: some View {
        HStack(spacing: SavoroSpacing.sm) {
            SavoroButton("Save draft", variant: .soft) {
                saveDraft()
            }
            .savoroShadow(SavoroShadow.small)
            .accessibilityHint("Saves this recipe so you can keep editing.")
            SavoroButton("Save & publish", variant: .ink) {
                isShowingPublishSheet = true
            }
            .accessibilityIdentifier("recipe-editor-save-and-publish")
            .accessibilityHint("Opens publish options.")
        }
        .padding(.horizontal, SavoroSpacing.lg)
        .padding(.vertical, SavoroSpacing.sm)
        .background(SavoroColor.raised.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) {
            Divider().overlay(SavoroColor.glassBorder)
        }
    }

    private var currentServings: Double {
        RecipeEditorMacroCalculator.positiveNumber(from: form.servingsText) ?? 2
    }

    private func adjustServings(by amount: Double) {
        form.servingsText = formatRecipeNumber(max(1, currentServings + amount))
    }

    private func formatRecipeNumber(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }

    private func ingredientBinding(for id: String) -> Binding<RecipeEditorIngredientRow> {
        Binding(
            get: {
                form.ingredients.first { $0.id == id } ?? .empty(id: id)
            },
            set: { updatedIngredient in
                guard let index = form.ingredients.firstIndex(where: { $0.id == id }) else { return }
                form.ingredients[index] = updatedIngredient
            }
        )
    }

    private var currentDraftKey: String {
        Self.visibilityDraftKey(for: form, temporaryDraftKey: temporaryDraftKey)
    }

    private func saveDraft() {
        let previousKey = currentDraftKey
        form = draftStore.saveDraft(form)
        let savedKey = currentDraftKey
        communityShareStore.moveSetup(from: previousKey, to: savedKey)
        visibilityChangeStore.moveVisibility(from: previousKey, to: savedKey)
        actionStatusCopy = "Draft saved"
    }

    private func applyVisibilityChange(_ option: RecipeVisibilityOption) {
        selectedVisibilityOption = option
        visibilityChangeStore.saveVisibility(option, draftKey: currentDraftKey)
    }

    private func saveCommunityShareSetup(_ setup: RecipeCommunityShareSetup) {
        communityShareSetup = setup
        selectedVisibilityOption = .shareToCommunity
        communityShareStore.saveSetup(setup, draftKey: currentDraftKey)
        visibilityChangeStore.saveVisibility(.shareToCommunity, draftKey: currentDraftKey)
    }

    static func makeTemporaryDraftKey() -> String {
        "new-recipe-draft-\(UUID().uuidString)"
    }

    static func visibilityDraftKey(for form: RecipeEditorDraftForm, temporaryDraftKey: String) -> String {
        form.draftId ?? temporaryDraftKey
    }
}

private struct RecipeEditorMacroStrip: View {
    let preview: RecipeEditorMacroPreview
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        SavoroCard(style: .accent) {
            VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                HStack(spacing: SavoroSpacing.xs) {
                    Text("Live · per serving")
                        .font(SavoroTypography.micro)
                        .foregroundStyle(SavoroColor.accentStrong)
                        .textCase(.uppercase)
                    Spacer()
                    if preview.isPartial {
                        HStack(spacing: SavoroSpacing.xxs) {
                            Circle()
                                .fill(SavoroColor.accentStrong)
                                .frame(width: SavoroSpacing.xxs, height: SavoroSpacing.xxs)
                            Text("Partial")
                                .font(SavoroTypography.micro)
                                .foregroundStyle(SavoroColor.textMuted)
                        }
                    }
                }

                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            calories
                            macroDots
                        }
                    } else {
                        HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.xs) {
                            calories
                            Spacer()
                            macroDots
                        }
                    }
                }

                RecipeEditorMacroStackedBar(macros: preview.perServingMacros)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(preview.perServingSummaryText)
        .accessibilityValue(preview.isPartial ? "Partial nutrition details" : "Nutrition details available")
    }

    private var calories: some View {
        HStack(alignment: .firstTextBaseline, spacing: SavoroSpacing.xxs) {
            Text(preview.servings == nil ? "—" : format(preview.perServingMacros.calories))
                .font(SavoroTypography.display)
                .foregroundStyle(SavoroColor.textStrong)
                .monospacedDigit()
            Text("cal")
                .font(SavoroTypography.callout)
                .foregroundStyle(SavoroColor.textMuted)
        }
    }

    private var macroDots: some View {
        HStack(spacing: SavoroSpacing.sm) {
            macroDot(kind: .protein, value: preview.perServingMacros.proteinGrams)
            macroDot(kind: .carbs, value: preview.perServingMacros.carbsGrams)
            macroDot(kind: .fat, value: preview.perServingMacros.fatGrams)
        }
    }

    private func macroDot(kind: SavoroMacroKind, value: Double) -> some View {
        HStack(spacing: SavoroSpacing.xxs) {
            Circle()
                .fill(kind.color)
                .frame(
                    width: SavoroSpacing.xs - SavoroSpacing.compact,
                    height: SavoroSpacing.xs - SavoroSpacing.compact
                )
            Text("\(kind.shortLabel) \(format(value))g")
                .font(SavoroTypography.micro.monospacedDigit())
                .foregroundStyle(SavoroColor.textMuted)
        }
    }

    private func format(_ value: Double) -> String {
        value.rounded() == value ? String(Int(value)) : String(format: "%.1f", value)
    }
}

private struct RecipeEditorMacroStackedBar: View {
    let macros: MacroTotals

    private var weightedValues: [Double] {
        [macros.proteinGrams * 4, macros.carbsGrams * 4, macros.fatGrams * 9]
    }

    private var total: Double {
        weightedValues.reduce(0, +)
    }

    var body: some View {
        GeometryReader { proxy in
            HStack(spacing: SavoroSpacing.none) {
                Rectangle()
                    .fill(SavoroColor.macroProtein)
                    .frame(width: segmentWidth(weightedValues[0], in: proxy.size.width))
                Rectangle()
                    .fill(SavoroColor.macroCarbs)
                    .frame(width: segmentWidth(weightedValues[1], in: proxy.size.width))
                Rectangle()
                    .fill(SavoroColor.macroFat)
            }
        }
        .frame(height: SavoroSpacing.xs)
        .background(SavoroColor.raised)
        .clipShape(Capsule(style: .continuous))
        .accessibilityHidden(true)
    }

    private func segmentWidth(_ value: Double, in availableWidth: CGFloat) -> CGFloat {
        guard total > 0 else { return 0 }
        return availableWidth * CGFloat(value / total)
    }
}

private struct RecipeEditorIngredientPickerSheetView: View {
    let onAddFood: (RecipeEditorMockFoodSearchResult) -> Void
    let onAddFreeText: (RecipeEditorIngredientRow) -> Void
    @State private var query = ""
    @State private var isAddingFreeText = false
    @State private var freeTextIngredient = RecipeEditorIngredientRow.freeText(name: "")
    @Environment(\.dismiss) private var dismiss

    private var suggestions: [RecipeEditorMockFoodSearchResult] {
        RecipeEditorMockFoodSearchResult.search(query)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    if isAddingFreeText {
                        freeTextForm
                    } else {
                        SavoroSearchField(placeholder: "Search foods or type your own", text: $query)
                        if !suggestions.isEmpty {
                            VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                                Text("Suggestions")
                                    .font(SavoroTypography.title2)
                                    .foregroundStyle(SavoroColor.textStrong)
                                ForEach(suggestions) { food in
                                    Button {
                                        onAddFood(food)
                                        dismiss()
                                    } label: {
                                        SavoroCard(style: .strong, insets: .compact) {
                                            HStack(spacing: SavoroSpacing.sm) {
                                                VStack(alignment: .leading, spacing: SavoroSpacing.compact) {
                                                    Text(food.name)
                                                        .font(SavoroTypography.bodyEmphasized)
                                                        .foregroundStyle(SavoroColor.textStrong)
                                                    Text("\(food.defaultQuantityText) \(food.defaultUnit)")
                                                        .font(SavoroTypography.callout.monospacedDigit())
                                                        .foregroundStyle(SavoroColor.textMuted)
                                                }
                                                Spacer()
                                                Image(systemName: "plus.circle.fill")
                                                    .foregroundStyle(SavoroColor.accentStrong)
                                            }
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        SavoroButton(
                            query.trimmedForRecipeEditor.isEmpty ? "Type your own" : "Add \"\(query)\" as free text",
                            systemImage: "square.and.pencil",
                            variant: .secondary
                        ) {
                            freeTextIngredient.name = query
                            isAddingFreeText = true
                        }
                    }
                }
                .padding(SavoroSpacing.lg)
            }
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Add ingredient")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private var freeTextForm: some View {
        VStack(alignment: .leading, spacing: SavoroSpacing.md) {
            recipeEditorEyebrow("Ingredient")
            TextField(
                "Ingredient name",
                text: $freeTextIngredient.name,
                prompt: Text("Ingredient name").foregroundStyle(SavoroColor.fieldPlaceholder)
            )
            .recipeEditorField()
            recipeEditorEyebrow("Amount")
            HStack(spacing: SavoroSpacing.sm) {
                TextField(
                    "Quantity",
                    text: $freeTextIngredient.quantityText,
                    prompt: Text("Qty").foregroundStyle(SavoroColor.fieldPlaceholder)
                )
                .keyboardType(.decimalPad)
                .recipeEditorField()
                TextField(
                    "Unit",
                    text: $freeTextIngredient.unit,
                    prompt: Text("Unit").foregroundStyle(SavoroColor.fieldPlaceholder)
                )
                .recipeEditorField()
            }
            SavoroButton(
                "Add ingredient",
                variant: .ink,
                isDisabled: freeTextIngredient.name.trimmedForRecipeEditor.isEmpty
            ) {
                onAddFreeText(freeTextIngredient)
                dismiss()
            }
        }
    }
}

private struct RecipeEditorIngredientEditSheetView: View {
    @Binding var ingredient: RecipeEditorIngredientRow
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        recipeEditorEyebrow("Ingredient")
                        TextField(
                            "Ingredient name",
                            text: $ingredient.name,
                            prompt: Text("Ingredient name").foregroundStyle(SavoroColor.fieldPlaceholder)
                        )
                        .recipeEditorField()
                    }

                    VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                        recipeEditorEyebrow("Amount")
                        HStack(spacing: SavoroSpacing.sm) {
                            TextField(
                                "Quantity",
                                text: $ingredient.quantityText,
                                prompt: Text("Qty").foregroundStyle(SavoroColor.fieldPlaceholder)
                            )
                            .keyboardType(.decimalPad)
                            .recipeEditorField()
                            TextField(
                                "Unit",
                                text: $ingredient.unit,
                                prompt: Text("Unit").foregroundStyle(SavoroColor.fieldPlaceholder)
                            )
                            .recipeEditorField()
                        }
                    }

                    if ingredient.hasIncompleteNutrition {
                        SavoroCard(style: .accent) {
                            Label(ingredient.nutritionStatusText, systemImage: "info.circle")
                                .font(SavoroTypography.callout)
                                .foregroundStyle(SavoroColor.textBody)
                        }
                    }
                }
                .padding(SavoroSpacing.lg)
            }
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Edit ingredient")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private struct RecipeEditorMacroDetailSheetView: View {
    let preview: RecipeEditorMacroPreview
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    SavoroCard(style: .accent) {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            Text(preview.isPartial ? "Some details are still missing" : "Nutrition details")
                                .font(SavoroTypography.title2)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text(preview.statusText)
                                .font(SavoroTypography.callout)
                                .foregroundStyle(SavoroColor.textBody)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    Text(preview.totalSummaryText)
                        .font(SavoroTypography.bodyEmphasized)
                        .foregroundStyle(SavoroColor.textStrong)
                    Text(preview.perServingSummaryText)
                        .font(SavoroTypography.body)
                        .foregroundStyle(SavoroColor.textBody)
                }
                .padding(SavoroSpacing.lg)
            }
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Nutrition")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private struct RecipeEditorRemixDetailSheetView: View {
    let detailCopy: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                SavoroCard(style: .accent) {
                    Label("Remix source attached", systemImage: "arrow.triangle.branch")
                        .font(SavoroTypography.headline)
                        .foregroundStyle(SavoroColor.textStrong)
                }
                Text(detailCopy)
                    .font(SavoroTypography.body)
                    .foregroundStyle(SavoroColor.textBody)
                Spacer()
            }
            .padding(SavoroSpacing.lg)
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Remix details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private struct RecipeEditorPublishSheetView: View {
    let form: RecipeEditorDraftForm
    @Binding var selectedVisibilityOption: RecipeVisibilityOption
    @Binding var communityShareSetup: RecipeCommunityShareSetup
    let hasCommunitySetup: Bool
    let onApplyVisibility: (RecipeVisibilityOption) -> Void
    let onSaveCommunitySetup: (RecipeCommunityShareSetup) -> Void
    @State private var isShowingVisibilityOptions = false
    @State private var isShowingCommunityShareSetup = false
    @State private var publishStatusCopy: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SavoroSpacing.lg) {
                    if !form.publicPublishValidationIssues.isEmpty {
                        SavoroCard(style: .plain) {
                            VStack(alignment: .leading, spacing: SavoroSpacing.xs) {
                                Text("A few details to add")
                                    .font(SavoroTypography.headline)
                                    .foregroundStyle(SavoroColor.textStrong)
                                ForEach(form.publicPublishValidationIssues, id: \.self) { issue in
                                    Label(issue.rawValue, systemImage: "circle.fill")
                                        .font(SavoroTypography.callout)
                                        .foregroundStyle(SavoroColor.textBody)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    Button { isShowingVisibilityOptions = true } label: {
                        SavoroCard(style: .strong) {
                            HStack(spacing: SavoroSpacing.sm) {
                                Image(systemName: selectedVisibilityOption.systemImage)
                                    .foregroundStyle(SavoroColor.accentStrong)
                                VStack(alignment: .leading, spacing: SavoroSpacing.compact) {
                                    Text("Visibility")
                                        .font(SavoroTypography.label)
                                        .foregroundStyle(SavoroColor.textMuted)
                                    Text(selectedVisibilityOption.title)
                                        .font(SavoroTypography.bodyEmphasized)
                                        .foregroundStyle(SavoroColor.textStrong)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(SavoroColor.textMuted)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Choose who can see this recipe.")

                    if selectedVisibilityOption == .shareToCommunity {
                        SavoroButton(
                            hasCommunitySetup ? "Edit community" : "Choose community",
                            systemImage: "person.3",
                            variant: .secondary
                        ) {
                            isShowingCommunityShareSetup = true
                        }
                    }

                    SavoroButton("Preview publish", variant: .ink) {
                        publishStatusCopy = form.publishPreviewCopy
                    }

                    if let publishStatusCopy {
                        Text(publishStatusCopy)
                            .font(SavoroTypography.callout)
                            .foregroundStyle(SavoroColor.textBody)
                            .accessibilityIdentifier("recipe-editor-publish-status")
                    }
                }
                .padding(SavoroSpacing.lg)
            }
            .background(SavoroColor.page.ignoresSafeArea())
            .navigationTitle("Save & publish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .sheet(isPresented: $isShowingVisibilityOptions) {
            RecipeVisibilityOptionSheetView(selectedOption: $selectedVisibilityOption) { option in
                selectedVisibilityOption = option
                onApplyVisibility(option)
            }
        }
        .sheet(isPresented: $isShowingCommunityShareSetup) {
            RecipeCommunityShareSetupSheetView(shareSetup: $communityShareSetup) { setup in
                communityShareSetup = setup
                onSaveCommunitySetup(setup)
            }
        }
    }
}

private struct RecipeEditorFieldChrome: ViewModifier {
    let isMultiline: Bool

    func body(content: Content) -> some View {
        content
            .font(SavoroTypography.body)
            .foregroundStyle(SavoroColor.textStrong)
            .padding(.horizontal, SavoroSpacing.md)
            .padding(.vertical, isMultiline ? SavoroSpacing.sm : SavoroSpacing.xs)
            .frame(
                minHeight: SavoroControlSize.minimumTapTarget + SavoroSpacing.xs,
                alignment: isMultiline ? .topLeading : .leading
            )
            .background(SavoroColor.cardStrong)
            .clipShape(RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SavoroRadius.card, style: .continuous)
                    .stroke(SavoroColor.border, lineWidth: SavoroSpacing.hairline)
            )
    }
}

private extension View {
    func recipeEditorField(isMultiline: Bool = false) -> some View {
        modifier(RecipeEditorFieldChrome(isMultiline: isMultiline))
    }
}

private func recipeEditorEyebrow(_ title: String) -> some View {
    Text(title.uppercased())
        .font(SavoroTypography.micro)
        .foregroundStyle(SavoroColor.textMuted)
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
                            SavoroChip(title: "Privacy first", systemImage: "eye", variant: .accent)
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
                                SavoroCard(style: .selection(isSelected: pendingSelection == option)) {
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
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityElement(children: .ignore)
                            .accessibilityIdentifier("recipe-visibility-option-\(option.rawValue)")
                            .accessibilityLabel("\(option.title). \(option.subtitle)")
                            .accessibilityValue(pendingSelection == option ? "Selected" : "Not selected")
                            .accessibilityHint("Sets the pending visibility choice. Use Apply to save it or Close to discard it.")
                        }
                    }

                    Text("Selected visibility: \(pendingSelection.title). This choice stays pending until you apply it.")
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
                            SavoroChip(title: "Private setup", systemImage: "person.3", variant: .accent)
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
                        Text("Choose a community")
                            .font(SavoroTypography.headline)
                            .foregroundStyle(SavoroColor.textStrong)
                        ForEach(choices) { community in
                            Button { pendingSetup.selectedCommunityId = community.id } label: {
                                SavoroCard(style: .selection(isSelected: pendingSetup.selectedCommunityId == community.id)) {
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
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityElement(children: .ignore)
                            .accessibilityIdentifier("recipe-community-share-option-\(community.id)")
                            .accessibilityLabel("\(community.name). \(community.summary)")
                            .accessibilityValue(pendingSetup.selectedCommunityId == community.id ? "Selected" : "Not selected")
                            .accessibilityHint("Sets the pending community choice. Use Save setup to keep it for this app session.")
                        }
                    }

                    SavoroCard(style: .glass) {
                        VStack(alignment: .leading, spacing: SavoroSpacing.sm) {
                            Text("Caption")
                                .font(SavoroTypography.headline)
                                .foregroundStyle(SavoroColor.textStrong)
                            Text("Add an optional recipe caption. It stays private until you choose to publish.")
                                .font(SavoroTypography.callout)
                                .foregroundStyle(SavoroColor.textBody)
                            TextField(
                                "Add an optional caption",
                                text: $pendingSetup.caption,
                                prompt: Text("Add an optional caption").foregroundStyle(SavoroColor.fieldPlaceholder),
                                axis: .vertical
                            )
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
