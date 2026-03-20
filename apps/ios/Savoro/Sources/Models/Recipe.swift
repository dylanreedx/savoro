import Foundation

struct Recipe: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let slug: String
    let title: String
    let description: String?
    let instructions: String?  // markdown
    let servings: Int
    let prepTime: Int?   // minutes
    let cookTime: Int?   // minutes
    let imageUrl: String?
    let isPublic: Bool
    let tags: [String]
    // Denormalized per-serving macros
    let caloriesPerServing: Double?
    let proteinPerServing: Double?
    let carbPerServing: Double?
    let fatPerServing: Double?
    let forkCount: Int
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case slug
        case title
        case description
        case instructions
        case servings
        case prepTime = "prep_time"
        case cookTime = "cook_time"
        case imageUrl = "image_url"
        case isPublic = "is_public"
        case tags
        case caloriesPerServing = "calories_per_serving"
        case proteinPerServing = "protein_per_serving"
        case carbPerServing = "carb_per_serving"
        case fatPerServing = "fat_per_serving"
        case forkCount = "fork_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        slug = try container.decode(String.self, forKey: .slug)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        instructions = try container.decodeIfPresent(String.self, forKey: .instructions)
        servings = try container.decode(Int.self, forKey: .servings)
        prepTime = try container.decodeIfPresent(Int.self, forKey: .prepTime)
        cookTime = try container.decodeIfPresent(Int.self, forKey: .cookTime)
        imageUrl = try container.decodeIfPresent(String.self, forKey: .imageUrl)
        isPublic = try container.decode(Bool.self, forKey: .isPublic)
        tags = try container.decodeIfPresent([String].self, forKey: .tags) ?? []
        caloriesPerServing = try container.decodeIfPresent(Double.self, forKey: .caloriesPerServing)
        proteinPerServing = try container.decodeIfPresent(Double.self, forKey: .proteinPerServing)
        carbPerServing = try container.decodeIfPresent(Double.self, forKey: .carbPerServing)
        fatPerServing = try container.decodeIfPresent(Double.self, forKey: .fatPerServing)
        forkCount = try container.decode(Int.self, forKey: .forkCount)
        createdAt = try container.decode(String.self, forKey: .createdAt)
        updatedAt = try container.decode(String.self, forKey: .updatedAt)
    }
}

struct RecipeIngredient: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let recipeId: String
    let foodId: String?
    let servingId: String?
    let quantity: Double?
    let unit: String?
    let label: String
    let sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case id
        case recipeId = "recipe_id"
        case foodId = "food_id"
        case servingId = "serving_id"
        case quantity
        case unit
        case label
        case sortOrder = "sort_order"
    }
}

struct RecipeFork: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let originalRecipeId: String
    let forkedRecipeId: String
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case originalRecipeId = "original_recipe_id"
        case forkedRecipeId = "forked_recipe_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
