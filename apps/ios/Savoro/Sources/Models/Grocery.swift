import Foundation

// PROVISIONAL -- Grocery schema not yet finalized in Drizzle

struct GroceryList: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let name: String
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct GroceryItem: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let listId: String
    let foodId: String?
    let name: String
    let quantity: Double?
    let unit: String?
    let isChecked: Bool
    let sortOrder: Int
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case listId = "list_id"
        case foodId = "food_id"
        case name
        case quantity
        case unit
        case isChecked = "is_checked"
        case sortOrder = "sort_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
