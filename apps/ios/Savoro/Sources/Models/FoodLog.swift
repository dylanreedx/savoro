import Foundation

enum MealType: String, Codable, Sendable {
    case breakfast
    case lunch
    case dinner
    case snack
}

struct FoodLog: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let foodId: String
    let servingId: String
    let quantity: Double
    let meal: MealType
    let date: String  // YYYY-MM-DD
    let chatMessageId: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case foodId = "food_id"
        case servingId = "serving_id"
        case quantity
        case meal
        case date
        case chatMessageId = "chat_message_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Client-side aggregation of daily nutrient totals.
struct DailyTotals: Equatable, Sendable {
    var calories: Double = 0
    var protein: Double = 0
    var carb: Double = 0
    var fat: Double = 0
    var fiber: Double = 0
}

/// Joined view: a food log entry with its associated food and serving.
struct FoodLogEntry: Equatable, Sendable {
    let log: FoodLog
    let food: Food
    let serving: Serving
}
