import Foundation

// MARK: - Enums

enum UIComponentType: String, Codable, Sendable {
    case foodCard = "food_card"
    case macroSummary = "macro_summary"
    case confirmButton = "confirm_button"
    case foodList = "food_list"
    case quickLogChips = "quick_log_chips"
    case dailySnapshot = "daily_snapshot"
    case recipeCard = "recipe_card"
    case unknown
}

enum MessageRole: String, Codable, Sendable {
    case user
    case assistant
    case system
    case tool
}

// MARK: - Props

struct FoodCardProps: Codable, Equatable, Sendable {
    let foodId: String
    let name: String
    let brandName: String?
    let servingId: String
    let servingDescription: String
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?
    let quantity: Double

    enum CodingKeys: String, CodingKey {
        case foodId = "food_id"
        case name
        case brandName = "brand_name"
        case servingId = "serving_id"
        case servingDescription = "serving_description"
        case calories
        case protein
        case carb
        case fat
        case quantity
    }
}

struct MacroSummaryGoals: Codable, Equatable, Sendable {
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?
}

struct MacroSummaryProps: Codable, Equatable, Sendable {
    let calories: Double
    let protein: Double
    let carb: Double
    let fat: Double
    let goals: MacroSummaryGoals?
}

struct ConfirmButtonProps: Codable, Equatable, Sendable {
    let action: String
    let foodId: String
    let servingId: String
    let quantity: Double
    let meal: MealType
    let label: String

    enum CodingKeys: String, CodingKey {
        case action
        case foodId = "food_id"
        case servingId = "serving_id"
        case quantity
        case meal
        case label
    }
}

struct FoodListItem: Codable, Equatable, Sendable {
    let foodId: String
    let name: String
    let brandName: String?
    let servingId: String
    let servingDescription: String
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?

    enum CodingKeys: String, CodingKey {
        case foodId = "food_id"
        case name
        case brandName = "brand_name"
        case servingId = "serving_id"
        case servingDescription = "serving_description"
        case calories
        case protein
        case carb
        case fat
    }
}

struct FoodListProps: Codable, Equatable, Sendable {
    let foods: [FoodListItem]
}

struct QuickLogChipItem: Codable, Equatable, Sendable {
    let foodId: String
    let servingId: String
    let name: String
    let calories: Double?

    enum CodingKeys: String, CodingKey {
        case foodId = "food_id"
        case servingId = "serving_id"
        case name
        case calories
    }
}

struct QuickLogChipsProps: Codable, Equatable, Sendable {
    let foods: [QuickLogChipItem]
}

struct DailySnapshotProps: Codable, Equatable, Sendable {
    let date: String
    let calories: Double
    let protein: Double
    let carb: Double
    let fat: Double
    let goals: MacroSummaryGoals?
    let mealBreakdown: [String: Double]?

    enum CodingKeys: String, CodingKey {
        case date
        case calories
        case protein
        case carb
        case fat
        case goals
        case mealBreakdown = "meal_breakdown"
    }
}

struct RecipeCardProps: Codable, Equatable, Sendable {
    let recipeId: String
    let title: String
    let description: String?
    let imageUrl: String?
    let caloriesPerServing: Double?
    let proteinPerServing: Double?
    let carbPerServing: Double?
    let fatPerServing: Double?
    let prepTime: Int?
    let cookTime: Int?

    enum CodingKeys: String, CodingKey {
        case recipeId = "recipe_id"
        case title
        case description
        case imageUrl = "image_url"
        case caloriesPerServing = "calories_per_serving"
        case proteinPerServing = "protein_per_serving"
        case carbPerServing = "carb_per_serving"
        case fatPerServing = "fat_per_serving"
        case prepTime = "prep_time"
        case cookTime = "cook_time"
    }
}

// MARK: - UIComponentProps (tagged union)

enum UIComponentProps: Equatable, Sendable {
    case foodCard(FoodCardProps)
    case macroSummary(MacroSummaryProps)
    case confirmButton(ConfirmButtonProps)
    case foodList(FoodListProps)
    case quickLogChips(QuickLogChipsProps)
    case dailySnapshot(DailySnapshotProps)
    case recipeCard(RecipeCardProps)
    case unknown([String: AnyCodable])
}

// MARK: - UIComponent

struct UIComponent: Codable, Equatable, Sendable {
    let type: UIComponentType
    let props: UIComponentProps

    enum CodingKeys: String, CodingKey {
        case type
        case props
    }

    init(type: UIComponentType, props: UIComponentProps) {
        self.type = type
        self.props = props
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Decode the raw type string, falling back to .unknown for unrecognized values
        let rawType = try container.decode(String.self, forKey: .type)
        type = UIComponentType(rawValue: rawType) ?? .unknown

        // Decode props based on the resolved type
        switch type {
        case .foodCard:
            props = .foodCard(try container.decode(FoodCardProps.self, forKey: .props))
        case .macroSummary:
            props = .macroSummary(try container.decode(MacroSummaryProps.self, forKey: .props))
        case .confirmButton:
            props = .confirmButton(try container.decode(ConfirmButtonProps.self, forKey: .props))
        case .foodList:
            props = .foodList(try container.decode(FoodListProps.self, forKey: .props))
        case .quickLogChips:
            props = .quickLogChips(try container.decode(QuickLogChipsProps.self, forKey: .props))
        case .dailySnapshot:
            props = .dailySnapshot(try container.decode(DailySnapshotProps.self, forKey: .props))
        case .recipeCard:
            props = .recipeCard(try container.decode(RecipeCardProps.self, forKey: .props))
        case .unknown:
            let raw = try container.decode([String: AnyCodable].self, forKey: .props)
            props = .unknown(raw)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)

        switch props {
        case .foodCard(let p):
            try container.encode(p, forKey: .props)
        case .macroSummary(let p):
            try container.encode(p, forKey: .props)
        case .confirmButton(let p):
            try container.encode(p, forKey: .props)
        case .foodList(let p):
            try container.encode(p, forKey: .props)
        case .quickLogChips(let p):
            try container.encode(p, forKey: .props)
        case .dailySnapshot(let p):
            try container.encode(p, forKey: .props)
        case .recipeCard(let p):
            try container.encode(p, forKey: .props)
        case .unknown(let raw):
            try container.encode(raw, forKey: .props)
        }
    }
}

// MARK: - ChatMessage

struct ChatMessage: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let role: MessageRole
    let content: String?
    let toolCalls: [AnyCodable]?
    let uiComponents: [UIComponent]?
    let attachments: [AnyCodable]?
    let date: String  // YYYY-MM-DD
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case role
        case content
        case toolCalls = "tool_calls"
        case uiComponents = "ui_components"
        case attachments
        case date
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - ChatEvent (streaming response envelope)

/// Events emitted by `ChatService.sendMessage()` via `AsyncStream`.
/// Covers both SSE streaming mode and JSON smart-route mode.
enum ChatEvent: Sendable {
    case textDelta(String)
    case toolCalls([String: AnyCodable])
    case uiComponents([UIComponent])
    case done
    case error(Error)
}

// MARK: - ChatAttachment

struct ChatAttachment: Codable, Sendable {
    let type: String        // "image", "barcode", etc.
    let url: String?
    let data: String?       // base64 for inline
}

// MARK: - Smart-Route JSON Response

struct SmartRouteResponse: Codable, Sendable {
    let messages: [ChatMessage]
    let uiComponents: [UIComponent]?

    enum CodingKeys: String, CodingKey {
        case messages
        case uiComponents = "ui_components"
    }
}

// MARK: - Chat History Response

struct ChatHistoryResponse: Codable, Sendable {
    let messages: [ChatMessage]
}
