import Foundation

struct Follow: Codable, Identifiable, Equatable, Sendable {
    // PROVISIONAL -- schema not yet defined; placeholder for social features
    let id: String
    let followerId: String
    let followeeId: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case followerId = "follower_id"
        case followeeId = "followee_id"
        case createdAt = "created_at"
    }
}

// PROVISIONAL -- schema not yet defined
struct RecipeShare: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let recipeId: String
    let sharedByUserId: String
    let sharedWithUserId: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case recipeId = "recipe_id"
        case sharedByUserId = "shared_by_user_id"
        case sharedWithUserId = "shared_with_user_id"
        case createdAt = "created_at"
    }
}

struct Favorite: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let foodId: String?
    let recipeId: String?
    let useCount: Int
    let lastUsedAt: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case foodId = "food_id"
        case recipeId = "recipe_id"
        case useCount = "use_count"
        case lastUsedAt = "last_used_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
