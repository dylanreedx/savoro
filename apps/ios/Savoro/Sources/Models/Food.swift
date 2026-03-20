import Foundation

enum FoodSource: String, Codable, Sendable {
    case off
    case usda
    case user
    case recipe
}

struct Food: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let brandName: String?
    let barcode: String?
    let source: FoodSource
    let sourceId: String?
    let sourceRevision: Int?
    let isVerified: Bool
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case brandName = "brand_name"
        case barcode
        case source
        case sourceId = "source_id"
        case sourceRevision = "source_revision"
        case isVerified = "is_verified"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct Serving: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let foodId: String
    let description: String
    let amountGrams: Double?
    let isDefault: Bool
    // Core macros
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?
    // Extended nutrients
    let saturatedFat: Double?
    let transFat: Double?
    let polyunsaturatedFat: Double?
    let monounsaturatedFat: Double?
    let cholesterol: Double?
    let sodium: Double?
    let potassium: Double?
    let fiber: Double?
    let sugar: Double?
    let addedSugars: Double?
    let vitaminD: Double?
    let vitaminA: Double?
    let vitaminC: Double?
    let calcium: Double?
    let iron: Double?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case foodId = "food_id"
        case description
        case amountGrams = "amount_grams"
        case isDefault = "is_default"
        case calories
        case protein
        case carb
        case fat
        case saturatedFat = "saturated_fat"
        case transFat = "trans_fat"
        case polyunsaturatedFat = "polyunsaturated_fat"
        case monounsaturatedFat = "monounsaturated_fat"
        case cholesterol
        case sodium
        case potassium
        case fiber
        case sugar
        case addedSugars = "added_sugars"
        case vitaminD = "vitamin_d"
        case vitaminA = "vitamin_a"
        case vitaminC = "vitamin_c"
        case calcium
        case iron
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
