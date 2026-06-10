import Foundation

/// Domain models for recipe identity, exact recipe versions, and trust metadata.
///
/// These are intentionally model-only contracts for SAV-42. They do not include
/// persistence, UI state management, profile/social/community objects, or feature logic.
enum RecipeVisibility: String, Codable, CaseIterable, Equatable, Sendable {
    case `private`
    case unlisted
    case `public`
}

enum RecipeStatus: String, Codable, CaseIterable, Equatable, Sendable {
    case draft
    case published
    case archived
}

enum ProvenanceSourceType: String, Codable, CaseIterable, Equatable, Sendable {
    case usda
    case openFoodFacts = "open_food_facts"
    case user
    case recipe
    case manual
    case aiDraft = "ai_draft"
}

enum ProvenanceTrustLevel: String, Codable, CaseIterable, Equatable, Sendable {
    case verified
    case sourceAttributed = "source_attributed"
    case creatorProvided = "creator_provided"
    case mixed
    case incomplete
}

struct RecipeCreatorSummary: Codable, Equatable, Sendable {
    let userId: String
    let username: String
    let displayName: String
    let avatarUrl: URL?
}

struct RecipeViewerState: Codable, Equatable, Sendable {
    let isOwner: Bool
    let isSaved: Bool
    let canFork: Bool
    let canLog: Bool

    init(isOwner: Bool, isSaved: Bool, canFork: Bool, canLog: Bool) {
        self.isOwner = isOwner
        self.isSaved = isSaved
        self.canFork = canFork
        self.canLog = canLog
    }
}

struct ProvenanceAttribution: Codable, Equatable, Sendable {
    let sourceType: ProvenanceSourceType
    let sourceId: String?
    let sourceRevision: String?
    let displayName: String
    let url: URL?
    let isVerified: Bool
}

struct RecipeProvenance: Codable, Equatable, Sendable {
    let trustLevel: ProvenanceTrustLevel
    let summary: String
    let attributions: [ProvenanceAttribution]
}

struct RecipeSummary: Codable, Equatable, Sendable {
    let id: String
    let ownerUserId: String
    let slug: String
    let title: String
    let description: String?
    let imageUrl: URL?
    let visibility: RecipeVisibility
    let status: RecipeStatus
    let currentVersionId: String
    let forkedFromRecipeId: String?
    let forkedFromVersionId: String?
    let creator: RecipeCreatorSummary
    let perServingMacros: MacroTotals
    let tags: [String]
    let viewerState: RecipeViewerState
    let createdAt: Date
    let updatedAt: Date

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        ownerUserId = try container.decode(String.self, forKey: .ownerUserId)
        slug = try container.decode(String.self, forKey: .slug)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        imageUrl = try container.decodeIfPresent(URL.self, forKey: .imageUrl)
        visibility = try container.decode(RecipeVisibility.self, forKey: .visibility)
        status = try container.decode(RecipeStatus.self, forKey: .status)
        currentVersionId = try container.decode(String.self, forKey: .currentVersionId)
        forkedFromRecipeId = try container.decodeIfPresent(String.self, forKey: .forkedFromRecipeId)
        forkedFromVersionId = try container.decodeIfPresent(String.self, forKey: .forkedFromVersionId)
        creator = try container.decode(RecipeCreatorSummary.self, forKey: .creator)
        perServingMacros = try container.decode(MacroTotals.self, forKey: .perServingMacros)
        tags = try container.decode([String].self, forKey: .tags)
        viewerState = try container.decode(RecipeViewerState.self, forKey: .viewerState)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        try validate()
    }

    private func validate() throws {
        guard !currentVersionId.isEmpty else { throw RecipeValidationError.missingCurrentVersion }
        if status == .draft || status == .archived {
            guard visibility != .public else { throw RecipeValidationError.publicRecipeMustBePublished }
        }
    }
}

struct RecipeVersion: Codable, Equatable, Sendable {
    let id: String
    let recipeId: String
    let versionNumber: Int
    let title: String
    let description: String?
    let instructionsMarkdown: String
    let servings: Double
    let yieldAmount: Double?
    let yieldUnit: String?
    let prepTimeMinutes: Int?
    let cookTimeMinutes: Int?
    let perServingMacros: MacroTotals
    let createdByUserId: String
    let publishedAt: Date?
    let createdAt: Date

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        recipeId = try container.decode(String.self, forKey: .recipeId)
        versionNumber = try container.decode(Int.self, forKey: .versionNumber)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        instructionsMarkdown = try container.decode(String.self, forKey: .instructionsMarkdown)
        servings = try container.decode(Double.self, forKey: .servings)
        yieldAmount = try container.decodeIfPresent(Double.self, forKey: .yieldAmount)
        yieldUnit = try container.decodeIfPresent(String.self, forKey: .yieldUnit)
        prepTimeMinutes = try container.decodeIfPresent(Int.self, forKey: .prepTimeMinutes)
        cookTimeMinutes = try container.decodeIfPresent(Int.self, forKey: .cookTimeMinutes)
        perServingMacros = try container.decode(MacroTotals.self, forKey: .perServingMacros)
        createdByUserId = try container.decode(String.self, forKey: .createdByUserId)
        publishedAt = try container.decodeIfPresent(Date.self, forKey: .publishedAt)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        try validate()
    }

    private func validate() throws {
        guard versionNumber > 0 else { throw RecipeValidationError.invalidVersionNumber }
        guard servings.isFinite, servings > 0 else { throw RecipeValidationError.invalidServings }
        if let yieldAmount { guard yieldAmount.isFinite, yieldAmount > 0 else { throw RecipeValidationError.invalidYield } }
        for minutes in [prepTimeMinutes, cookTimeMinutes].compactMap({ $0 }) {
            guard minutes >= 0 else { throw RecipeValidationError.invalidTime }
        }
    }
}

struct Ingredient: Codable, Equatable, Sendable {
    let id: String
    let recipeVersionId: String
    let foodId: String?
    let servingId: String?
    let quantity: Double?
    let unit: String
    let label: String
    let note: String?
    let sortOrder: Int
    let provenance: ProvenanceAttribution?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        recipeVersionId = try container.decode(String.self, forKey: .recipeVersionId)
        foodId = try container.decodeIfPresent(String.self, forKey: .foodId)
        servingId = try container.decodeIfPresent(String.self, forKey: .servingId)
        quantity = try container.decodeIfPresent(Double.self, forKey: .quantity)
        unit = try container.decode(String.self, forKey: .unit)
        label = try container.decode(String.self, forKey: .label)
        note = try container.decodeIfPresent(String.self, forKey: .note)
        sortOrder = try container.decode(Int.self, forKey: .sortOrder)
        provenance = try container.decodeIfPresent(ProvenanceAttribution.self, forKey: .provenance)
        try validate()
    }

    private func validate() throws {
        if let quantity { guard quantity.isFinite, quantity > 0 else { throw RecipeValidationError.invalidIngredientQuantity } }
        guard sortOrder >= 0 else { throw RecipeValidationError.invalidSortOrder }
        guard !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw RecipeValidationError.emptyIngredientLabel }
    }
}

struct Step: Codable, Equatable, Sendable {
    let id: String
    let recipeVersionId: String
    let body: String
    let sortOrder: Int

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        recipeVersionId = try container.decode(String.self, forKey: .recipeVersionId)
        body = try container.decode(String.self, forKey: .body)
        sortOrder = try container.decode(Int.self, forKey: .sortOrder)
        try validate()
    }

    private func validate() throws {
        guard !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw RecipeValidationError.emptyStepBody }
        guard sortOrder >= 0 else { throw RecipeValidationError.invalidSortOrder }
    }
}

struct RecipeDetail: Codable, Equatable, Sendable {
    let summary: RecipeSummary
    let currentVersion: RecipeVersion
    let ingredients: [Ingredient]
    let steps: [Step]
    let provenance: RecipeProvenance

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        summary = try container.decode(RecipeSummary.self, forKey: .summary)
        currentVersion = try container.decode(RecipeVersion.self, forKey: .currentVersion)
        ingredients = try container.decode([Ingredient].self, forKey: .ingredients)
        steps = try container.decode([Step].self, forKey: .steps)
        provenance = try container.decode(RecipeProvenance.self, forKey: .provenance)
        try validate()
    }

    private func validate() throws {
        guard summary.id == currentVersion.recipeId else { throw RecipeValidationError.versionRecipeMismatch }
        guard summary.currentVersionId == currentVersion.id else { throw RecipeValidationError.currentVersionMismatch }
        guard summary.perServingMacros == currentVersion.perServingMacros else { throw RecipeValidationError.summaryMacroMismatch }
        guard ingredients.allSatisfy({ $0.recipeVersionId == currentVersion.id }) else { throw RecipeValidationError.ingredientVersionMismatch }
        guard steps.allSatisfy({ $0.recipeVersionId == currentVersion.id }) else { throw RecipeValidationError.stepVersionMismatch }
    }
}

enum RecipeValidationError: Error, Equatable {
    case missingCurrentVersion
    case publicRecipeMustBePublished
    case invalidVersionNumber
    case invalidServings
    case invalidYield
    case invalidTime
    case invalidIngredientQuantity
    case invalidSortOrder
    case emptyIngredientLabel
    case emptyStepBody
    case versionRecipeMismatch
    case currentVersionMismatch
    case summaryMacroMismatch
    case ingredientVersionMismatch
    case stepVersionMismatch
}
