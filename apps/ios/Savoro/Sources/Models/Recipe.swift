import Foundation

struct Recipe: Codable, Identifiable, Equatable, Hashable, Sendable {
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

        // tags: try [String] first, then JSON string fallback, then empty
        if let array = try? container.decode([String].self, forKey: .tags) {
            tags = array
        } else if let jsonString = try? container.decode(String.self, forKey: .tags),
                  let data = jsonString.data(using: .utf8),
                  let parsed = try? JSONDecoder().decode([String].self, from: data) {
            tags = parsed
        } else {
            tags = []
        }

        caloriesPerServing = try container.decodeIfPresent(Double.self, forKey: .caloriesPerServing)
        proteinPerServing = try container.decodeIfPresent(Double.self, forKey: .proteinPerServing)
        carbPerServing = try container.decodeIfPresent(Double.self, forKey: .carbPerServing)
        fatPerServing = try container.decodeIfPresent(Double.self, forKey: .fatPerServing)
        forkCount = try container.decode(Int.self, forKey: .forkCount)
        createdAt = try container.decode(String.self, forKey: .createdAt)
        updatedAt = try container.decode(String.self, forKey: .updatedAt)
    }

    // MARK: - Memberwise Init (for previews)

    init(
        id: String,
        userId: String,
        slug: String,
        title: String,
        description: String? = nil,
        instructions: String? = nil,
        servings: Int = 1,
        prepTime: Int? = nil,
        cookTime: Int? = nil,
        imageUrl: String? = nil,
        isPublic: Bool = true,
        tags: [String] = [],
        caloriesPerServing: Double? = nil,
        proteinPerServing: Double? = nil,
        carbPerServing: Double? = nil,
        fatPerServing: Double? = nil,
        forkCount: Int = 0,
        createdAt: String = "2025-01-01T00:00:00Z",
        updatedAt: String = "2025-01-01T00:00:00Z"
    ) {
        self.id = id
        self.userId = userId
        self.slug = slug
        self.title = title
        self.description = description
        self.instructions = instructions
        self.servings = servings
        self.prepTime = prepTime
        self.cookTime = cookTime
        self.imageUrl = imageUrl
        self.isPublic = isPublic
        self.tags = tags
        self.caloriesPerServing = caloriesPerServing
        self.proteinPerServing = proteinPerServing
        self.carbPerServing = carbPerServing
        self.fatPerServing = fatPerServing
        self.forkCount = forkCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Preview Data

    static let preview = Recipe(
        id: "preview-1",
        userId: "user-1",
        slug: "spicy-tofu-bowl",
        title: "Spicy Tofu Bowl",
        description: "A quick weeknight tofu bowl with sesame dressing.",
        instructions: "1. Press tofu and cube.\n2. Pan-fry until golden.\n3. Toss with rice and vegetables.",
        servings: 2,
        prepTime: 10,
        cookTime: 20,
        tags: ["quick", "vegetarian"],
        caloriesPerServing: 420,
        proteinPerServing: 28,
        carbPerServing: 45,
        fatPerServing: 14,
        forkCount: 3
    )

    static let previewList: [Recipe] = [
        preview,
        Recipe(
            id: "preview-2",
            userId: "user-1",
            slug: "overnight-oats",
            title: "Overnight Oats",
            servings: 1,
            prepTime: 5,
            tags: ["breakfast"],
            caloriesPerServing: 350,
            proteinPerServing: 15,
            carbPerServing: 52,
            fatPerServing: 9
        ),
        Recipe(
            id: "preview-3",
            userId: "user-1",
            slug: "chicken-stir-fry",
            title: "Chicken Stir Fry",
            servings: 4,
            prepTime: 15,
            cookTime: 15,
            tags: ["dinner", "high-protein"],
            caloriesPerServing: 510,
            proteinPerServing: 42,
            carbPerServing: 38,
            fatPerServing: 18,
            forkCount: 7
        ),
    ]
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

// MARK: - Recipe Draft (Create / Update)

struct RecipeDraft: Encodable, Sendable {
    var title: String
    var description: String?
    var instructions: String?
    var servings: Int
    var prepTime: Int?
    var cookTime: Int?
    var isPublic: Bool
    var tags: [String]
    var ingredients: [RecipeIngredientDraft]

    enum CodingKeys: String, CodingKey {
        case title
        case description
        case instructions
        case servings
        case prepTime = "prep_time"
        case cookTime = "cook_time"
        case isPublic = "is_public"
        case tags
        case ingredients
    }
}

struct RecipeIngredientDraft: Encodable, Sendable, Identifiable {
    var id = UUID()
    var label: String
    var quantity: Double?
    var unit: String?
    var foodId: String?
    var servingId: String?

    enum CodingKeys: String, CodingKey {
        case label
        case quantity
        case unit
        case foodId = "food_id"
        case servingId = "serving_id"
    }
}

// MARK: - Recipe Detail (with ingredients)

struct RecipeDetail: Decodable, Sendable {
    let recipe: Recipe
    let ingredients: [RecipeIngredient]

    enum CodingKeys: String, CodingKey {
        case recipe
        case ingredients
    }
}

// MARK: - Feed Page

struct FeedPage: Decodable, Sendable {
    let recipes: [Recipe]
    let nextCursor: String?

    enum CodingKeys: String, CodingKey {
        case recipes
        case nextCursor = "next_cursor"
    }
}
