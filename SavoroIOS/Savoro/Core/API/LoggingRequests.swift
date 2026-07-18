import Foundation

enum TodayAPIRequestTarget: Equatable, Sendable {
    case localMock
    case live

    var pathPrefix: String {
        switch self {
        case .localMock: "/mock"
        case .live: "/v1"
        }
    }
}

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

private struct LiveLogRecipeRequestPayload: Encodable {
    let recipeId: String
    let recipeVersionId: String
    let date: String
    let mealType: MealType
    let servings: Double

    init(_ payload: LogRecipeRequestPayload) {
        recipeId = payload.recipeId
        recipeVersionId = payload.recipeVersionId
        date = payload.date
        mealType = payload.mealType
        servings = payload.servings
    }
}

struct LogRecipeResponse: Codable, Equatable, Sendable {
    let entry: FoodLogEntry
    let dayLog: DayLog?
}

struct LogRecipeRequest: APIRequest {
    typealias Response = LogRecipeResponse

    let payload: LogRecipeRequestPayload
    let target: TodayAPIRequestTarget

    var path: String { "\(target.pathPrefix)/logs/recipes" }
    var method: HTTPMethod { .post }
    var body: Data? {
        switch target {
        case .localMock:
            try? JSONEncoder.savoro.encode(payload)
        case .live:
            try? JSONEncoder.savoro.encode(LiveLogRecipeRequestPayload(payload))
        }
    }

    init(payload: LogRecipeRequestPayload, target: TodayAPIRequestTarget = .localMock) {
        self.payload = payload
        self.target = target
    }
}

struct LogFoodRequestPayload: Codable, Equatable, Sendable {
    let displayName: String
    let macros: MacroTotals
    let date: String
    let mealType: MealType
    let quantity: Double
    let quantityUnit: String
}

struct LogFoodRequest: APIRequest {
    typealias Response = LogRecipeResponse

    let payload: LogFoodRequestPayload
    let target: TodayAPIRequestTarget

    var path: String { "\(target.pathPrefix)/logs/foods" }
    var method: HTTPMethod { .post }
    var body: Data? { try? JSONEncoder.savoro.encode(payload) }

    init(payload: LogFoodRequestPayload, target: TodayAPIRequestTarget = .localMock) {
        self.payload = payload
        self.target = target
    }
}

struct DayLogResponse: Decodable, Equatable, Sendable {
    struct GoalSummary: Decodable, Equatable, Sendable {
        let dailyTargets: MacroTotals
    }

    let dayLog: DayLog
    let goal: GoalSummary?
}

struct DayLogRequest: APIRequest {
    typealias Response = DayLogResponse

    let date: String
    let target: TodayAPIRequestTarget

    var path: String { "\(target.pathPrefix)/logs/day" }
    var queryItems: [URLQueryItem] { [URLQueryItem(name: "date", value: date)] }

    init(date: String, target: TodayAPIRequestTarget = .localMock) {
        self.date = date
        self.target = target
    }
}

struct CurrentGoalResponse: Decodable, Equatable, Sendable {
    struct CurrentGoal: Decodable, Equatable, Sendable {
        let id: String
        let dailyTargets: MacroTotals
        let startDate: String
        let endDate: String?
    }

    let goal: CurrentGoal?
}

struct CurrentGoalRequest: APIRequest {
    typealias Response = CurrentGoalResponse

    let date: String
    let target: TodayAPIRequestTarget

    var path: String { "\(target.pathPrefix)/goals/current" }
    var queryItems: [URLQueryItem] { [URLQueryItem(name: "date", value: date)] }

    init(date: String, target: TodayAPIRequestTarget = .localMock) {
        self.date = date
        self.target = target
    }
}

struct TodayLoadedData: Equatable, Sendable {
    let dayLog: DayLog
    let goals: MacroTotals
}

struct TodayAPIService: Sendable {
    let client: APIClient
    let target: TodayAPIRequestTarget

    func fetch(date: String) async throws -> TodayLoadedData {
        async let dayResponse = client.send(DayLogRequest(date: date, target: target))
        async let goalResponse = client.send(CurrentGoalRequest(date: date, target: target))
        let (day, goal) = try await (dayResponse, goalResponse)
        return TodayLoadedData(
            dayLog: day.dayLog,
            goals: goal.goal?.dailyTargets ?? .zero
        )
    }

    func logRecipe(_ payload: LogRecipeRequestPayload) async throws -> LogRecipeResponse {
        try await client.send(LogRecipeRequest(payload: payload, target: target))
    }

    func logFood(_ payload: LogFoodRequestPayload) async throws -> LogRecipeResponse {
        try await client.send(LogFoodRequest(payload: payload, target: target))
    }
}
