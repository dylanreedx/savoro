import Foundation

enum RecipeTag: String, CaseIterable, Codable, Sendable {
    case highProtein = "high-protein"
    case lowCarb = "low-carb"
    case quick = "quick"
    case vegan = "vegan"
    case mealPrep = "meal-prep"
    case breakfast = "breakfast"
    case lunch = "lunch"
    case dinner = "dinner"
    case snack = "snack"
    case dessert = "dessert"

    var displayName: String {
        switch self {
        case .highProtein: return "High Protein"
        case .lowCarb:     return "Low Carb"
        case .quick:       return "Quick"
        case .vegan:       return "Vegan"
        case .mealPrep:    return "Meal Prep"
        case .breakfast:   return "Breakfast"
        case .lunch:       return "Lunch"
        case .dinner:      return "Dinner"
        case .snack:       return "Snack"
        case .dessert:     return "Dessert"
        }
    }

    var icon: String {
        switch self {
        case .highProtein: return "bolt.fill"
        case .lowCarb:     return "leaf.fill"
        case .quick:       return "timer"
        case .vegan:       return "hare.fill"
        case .mealPrep:    return "tray.2.fill"
        case .breakfast:   return "sunrise.fill"
        case .lunch:       return "sun.max.fill"
        case .dinner:      return "moon.fill"
        case .snack:       return "popcorn.fill"
        case .dessert:     return "birthday.cake.fill"
        }
    }
}
