import Foundation

struct LogRecipeRequestPayload: Codable, Equatable, Sendable {
    let userId: String
    let recipeId: String
    let recipeVersionId: String
    let date: String
    let mealType: MealType
    let servings: Double
    let quantityUnit: String
    let snapshot: NutritionSnapshot
    let privacyDomain: PrivateDomain

    init(
        userId: String,
        recipeId: String,
        recipeVersionId: String,
        date: String,
        mealType: MealType,
        servings: Double,
        quantityUnit: String = "serving",
        snapshot: NutritionSnapshot,
        privacyDomain: PrivateDomain = .privateUserData
    ) {
        self.userId = userId
        self.recipeId = recipeId
        self.recipeVersionId = recipeVersionId
        self.date = date
        self.mealType = mealType
        self.servings = servings
        self.quantityUnit = quantityUnit
        self.snapshot = snapshot
        self.privacyDomain = privacyDomain
    }
}

struct LogRecipeResponse: Codable, Equatable, Sendable {
    let entry: FoodLogEntry
    let dayLog: DayLog?
}

struct LogRecipeRequest: APIRequest {
    typealias Response = LogRecipeResponse

    let payload: LogRecipeRequestPayload

    var path: String { "/mock/logs/recipes" }
    var method: HTTPMethod { .post }
    var body: Data? { try? JSONEncoder.savoro.encode(payload) }

    init(payload: LogRecipeRequestPayload) {
        self.payload = payload
    }
}
