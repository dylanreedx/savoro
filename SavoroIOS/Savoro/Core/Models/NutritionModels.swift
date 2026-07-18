import Foundation

/// Domain models for private nutrition/logging state.
///
/// These types intentionally use iOS domain names such as `proteinGrams` and a nested
/// `snapshot` object. They are not a promise that backend payloads must use the same
/// shape. If the API keeps the flatter architecture contract (`protein`, `carbs`,
/// `fat`, `displayName`, ...), map at the API boundary instead of changing these
/// frozen-log domain types silently.
public struct MacroTotals: Codable, Equatable, Sendable {
    public let calories: Double
    public let proteinGrams: Double
    public let carbsGrams: Double
    public let fatGrams: Double
    public let fiberGrams: Double?
    public let sodiumMilligrams: Double?

    public init(
        calories: Double,
        proteinGrams: Double,
        carbsGrams: Double,
        fatGrams: Double,
        fiberGrams: Double? = nil,
        sodiumMilligrams: Double? = nil
    ) throws {
        self.calories = calories
        self.proteinGrams = proteinGrams
        self.carbsGrams = carbsGrams
        self.fatGrams = fatGrams
        self.fiberGrams = fiberGrams
        self.sodiumMilligrams = sodiumMilligrams
        try validate()
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        calories = try container.decode(Double.self, forKey: .calories)
        proteinGrams = try container.decode(Double.self, forKey: .proteinGrams)
        carbsGrams = try container.decode(Double.self, forKey: .carbsGrams)
        fatGrams = try container.decode(Double.self, forKey: .fatGrams)
        fiberGrams = try container.decodeIfPresent(Double.self, forKey: .fiberGrams)
        sodiumMilligrams = try container.decodeIfPresent(Double.self, forKey: .sodiumMilligrams)
        try validate()
    }

    public static let zero = try! MacroTotals(calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0)

    public func adding(_ other: MacroTotals) -> MacroTotals {
        try! MacroTotals(
            calories: calories + other.calories,
            proteinGrams: proteinGrams + other.proteinGrams,
            carbsGrams: carbsGrams + other.carbsGrams,
            fatGrams: fatGrams + other.fatGrams,
            fiberGrams: MacroTotals.addOptional(fiberGrams, other.fiberGrams),
            sodiumMilligrams: MacroTotals.addOptional(sodiumMilligrams, other.sodiumMilligrams)
        )
    }

    private func validate() throws {
        for value in [calories, proteinGrams, carbsGrams, fatGrams] {
            guard value.isFinite, value >= 0 else { throw NutritionValidationError.invalidMacroValue }
        }
        for value in [fiberGrams, sodiumMilligrams].compactMap({ $0 }) {
            guard value.isFinite, value >= 0 else { throw NutritionValidationError.invalidMacroValue }
        }
    }

    private static func addOptional(_ lhs: Double?, _ rhs: Double?) -> Double? {
        guard lhs != nil || rhs != nil else { return nil }
        return (lhs ?? 0) + (rhs ?? 0)
    }
}

struct NutritionSnapshot: Codable, Equatable, Sendable {
    let displayName: String
    let macros: MacroTotals
    let sourceLabel: String?
    let capturedAt: Date

    init(displayName: String, macros: MacroTotals, sourceLabel: String? = nil, capturedAt: Date) {
        self.displayName = displayName
        self.macros = macros
        self.sourceLabel = sourceLabel
        self.capturedAt = capturedAt
    }

    var userFacingSourceLabel: String {
        guard let sourceLabel else { return "Saved exactly as logged" }
        let normalized = sourceLabel.lowercased()
        let implementationTerms = ["mock", "fixture", "frozen", "recipe_", "version_", "fork_", "user_"]
        let containsRawDatedVersion = normalized.range(of: #"\bv\d{6,}\b"#, options: .regularExpression) != nil
        if implementationTerms.contains(where: normalized.contains) || containsRawDatedVersion {
            return "The version you logged"
        }
        return sourceLabel
    }
}

enum MealType: String, Codable, CaseIterable, Equatable, Sendable {
    case breakfast
    case lunch
    case dinner
    case snack
}

enum FoodLogItemType: String, Codable, Equatable, Sendable {
    case food
    case recipe
}

enum FoodLogSourceType: String, Codable, Equatable, Sendable {
    case manual
    case search
    case barcode
    case recipe
    case aiDraft = "ai_draft"
}

enum PrivateDomain: String, Codable, Equatable, Sendable {
    case privateUserData = "private_user_data"
}

struct FoodLogEntry: Codable, Equatable, Sendable {
    let id: String
    let userId: String
    let date: String
    let mealType: MealType
    let itemType: FoodLogItemType
    let foodId: String?
    let servingId: String?
    let recipeId: String?
    let recipeVersionId: String?
    let quantity: Double
    let quantityUnit: String
    /// Frozen nutrition values captured when this log was created. Immutable `let`
    /// fields make accidental historical macro rewrites a type-level opt-out.
    let snapshot: NutritionSnapshot
    let sourceType: FoodLogSourceType
    let privacyDomain: PrivateDomain
    let createdAt: Date
    let updatedAt: Date

    init(
        id: String,
        userId: String,
        date: String,
        mealType: MealType,
        itemType: FoodLogItemType,
        foodId: String? = nil,
        servingId: String? = nil,
        recipeId: String? = nil,
        recipeVersionId: String? = nil,
        quantity: Double,
        quantityUnit: String,
        snapshot: NutritionSnapshot,
        sourceType: FoodLogSourceType,
        privacyDomain: PrivateDomain = .privateUserData,
        createdAt: Date,
        updatedAt: Date
    ) throws {
        self.id = id
        self.userId = userId
        self.date = date
        self.mealType = mealType
        self.itemType = itemType
        self.foodId = foodId
        self.servingId = servingId
        self.recipeId = recipeId
        self.recipeVersionId = recipeVersionId
        self.quantity = quantity
        self.quantityUnit = quantityUnit
        self.snapshot = snapshot
        self.sourceType = sourceType
        self.privacyDomain = privacyDomain
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        try validate()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        date = try container.decode(String.self, forKey: .date)
        mealType = try container.decode(MealType.self, forKey: .mealType)
        itemType = try container.decode(FoodLogItemType.self, forKey: .itemType)
        foodId = try container.decodeIfPresent(String.self, forKey: .foodId)
        servingId = try container.decodeIfPresent(String.self, forKey: .servingId)
        recipeId = try container.decodeIfPresent(String.self, forKey: .recipeId)
        recipeVersionId = try container.decodeIfPresent(String.self, forKey: .recipeVersionId)
        quantity = try container.decode(Double.self, forKey: .quantity)
        quantityUnit = try container.decode(String.self, forKey: .quantityUnit)
        snapshot = try container.decode(NutritionSnapshot.self, forKey: .snapshot)
        sourceType = try container.decode(FoodLogSourceType.self, forKey: .sourceType)
        privacyDomain = try container.decodeIfPresent(PrivateDomain.self, forKey: .privacyDomain) ?? .privateUserData
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        try validate()
    }

    private func validate() throws {
        guard quantity.isFinite, quantity > 0 else { throw NutritionValidationError.quantityMustBePositive }
        switch itemType {
        case .food:
            guard foodId != nil, recipeId == nil, recipeVersionId == nil else {
                throw NutritionValidationError.invalidFoodReference
            }
        case .recipe:
            guard recipeId != nil, recipeVersionId != nil, foodId == nil, servingId == nil else {
                throw NutritionValidationError.invalidRecipeReference
            }
        }
    }
}

typealias FoodLogEntryValidationError = NutritionValidationError

enum NutritionValidationError: Error, Equatable {
    case invalidMacroValue
    case quantityMustBePositive
    case invalidFoodReference
    case invalidRecipeReference
    case mealEntryMismatch
    case dayEntryMismatch
    case invalidGoalDateRange
}

struct MealLog: Codable, Equatable, Sendable {
    let mealType: MealType
    let entries: [FoodLogEntry]

    init(mealType: MealType, entries: [FoodLogEntry]) throws {
        self.mealType = mealType
        self.entries = entries
        try validate()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        mealType = try container.decode(MealType.self, forKey: .mealType)
        entries = try container.decode([FoodLogEntry].self, forKey: .entries)
        try validate()
    }

    var totals: MacroTotals {
        entries.reduce(.zero) { $0.adding($1.snapshot.macros) }
    }

    private func validate() throws {
        guard entries.allSatisfy({ $0.mealType == mealType }) else { throw NutritionValidationError.mealEntryMismatch }
    }
}

struct DayLog: Codable, Equatable, Sendable {
    let userId: String
    let date: String
    let meals: [MealLog]
    let privacyDomain: PrivateDomain

    init(userId: String, date: String, meals: [MealLog], privacyDomain: PrivateDomain = .privateUserData) throws {
        self.userId = userId
        self.date = date
        self.meals = meals
        self.privacyDomain = privacyDomain
        try validate()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        userId = try container.decode(String.self, forKey: .userId)
        date = try container.decode(String.self, forKey: .date)
        meals = try container.decode([MealLog].self, forKey: .meals)
        privacyDomain = try container.decodeIfPresent(PrivateDomain.self, forKey: .privacyDomain) ?? .privateUserData
        try validate()
    }

    var totals: MacroTotals {
        meals.reduce(.zero) { $0.adding($1.totals) }
    }

    func addingEntry(_ entry: FoodLogEntry) throws -> DayLog {
        var updatedMeals = meals
        if let index = updatedMeals.firstIndex(where: { $0.mealType == entry.mealType }) {
            let existing = updatedMeals[index]
            updatedMeals[index] = try MealLog(mealType: existing.mealType, entries: existing.entries + [entry])
        } else {
            updatedMeals.append(try MealLog(mealType: entry.mealType, entries: [entry]))
        }
        return try DayLog(userId: userId, date: date, meals: updatedMeals, privacyDomain: privacyDomain)
    }

    private func validate() throws {
        for entry in meals.flatMap(\.entries) {
            guard entry.userId == userId, entry.date == date else { throw NutritionValidationError.dayEntryMismatch }
        }
    }
}

struct Goal: Codable, Equatable, Sendable {
    let id: String
    let userId: String
    let dailyTargets: MacroTotals
    let startDate: String
    let endDate: String?
    let privacyDomain: PrivateDomain
    let createdAt: Date
    let updatedAt: Date

    init(
        id: String,
        userId: String,
        dailyTargets: MacroTotals,
        startDate: String,
        endDate: String? = nil,
        privacyDomain: PrivateDomain = .privateUserData,
        createdAt: Date,
        updatedAt: Date
    ) throws {
        self.id = id
        self.userId = userId
        self.dailyTargets = dailyTargets
        self.startDate = startDate
        self.endDate = endDate
        self.privacyDomain = privacyDomain
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        try validate()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        dailyTargets = try container.decode(MacroTotals.self, forKey: .dailyTargets)
        startDate = try container.decode(String.self, forKey: .startDate)
        endDate = try container.decodeIfPresent(String.self, forKey: .endDate)
        privacyDomain = try container.decodeIfPresent(PrivateDomain.self, forKey: .privacyDomain) ?? .privateUserData
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        try validate()
    }

    private func validate() throws {
        if let endDate {
            guard endDate >= startDate else { throw NutritionValidationError.invalidGoalDateRange }
        }
    }
}
