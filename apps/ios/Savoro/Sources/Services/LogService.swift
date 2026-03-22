import Foundation

// MARK: - Protocol

protocol LogServiceProtocol {
    func logFood(_ request: LogFoodRequest) async throws -> LogFoodResponse
}

// MARK: - Request Structs

struct LogFoodRequest: Codable {
    let foodId: String
    let servingId: String
    let quantity: Double
    let meal: String?
    let date: String?
    let utcOffset: Int

    init(foodId: String, servingId: String, quantity: Double = 1, meal: String? = nil, date: String? = nil) {
        self.foodId = foodId
        self.servingId = servingId
        self.quantity = quantity
        self.meal = meal
        self.date = date
        self.utcOffset = TimeZone.current.secondsFromGMT() / 60
    }
}

struct LogRecipeRequest: Encodable {
    let recipeId: String
    let quantity: Double
    let meal: String?
    let date: String?
    let utcOffset: Int

    init(recipeId: String, quantity: Double = 1, meal: String? = nil, date: String? = nil) {
        self.recipeId = recipeId
        self.quantity = quantity
        self.meal = meal
        self.date = date
        self.utcOffset = TimeZone.current.secondsFromGMT() / 60
    }
}

// MARK: - Response Structs

struct LogFoodResponse: Decodable, Sendable {
    let log: LoggedEntry
}

struct LogRecipeResponse: Decodable, Sendable {
    let log: LoggedEntry
}

struct LoggedEntry: Decodable, Sendable {
    let id: String
    let foodId: String
    let foodName: String?
    let servingId: String?
    let servingDescription: String?
    let quantity: Double
    let meal: MealType
    let date: String
    let calories: Double
    let protein: Double
    let carb: Double
    let fat: Double
}

// MARK: - Service

struct LogService: LogServiceProtocol {

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Endpoints

    /// Fetch daily totals for a given date (YYYY-MM-DD).
    func fetchDailyTotals(date: String) async throws -> DailyLogResponse {
        try await apiClient.request("/log?date=\(date)")
    }

    /// Fetch denormalized log entries for a given date (YYYY-MM-DD).
    func fetchEntries(date: String) async throws -> [LogEntry] {
        try await apiClient.request("/log/entries?date=\(date)")
    }

    /// Log a food item. Sends the client UTC offset so the server infers the correct meal.
    func logFood(_ request: LogFoodRequest) async throws -> LogFoodResponse {
        try await apiClient.request("/log", method: .post, body: request)
    }

    /// Log a recipe serving. Sends the client UTC offset so the server infers the correct meal.
    func logRecipe(_ request: LogRecipeRequest) async throws -> LogRecipeResponse {
        try await apiClient.request("/log/recipe", method: .post, body: request)
    }
}
