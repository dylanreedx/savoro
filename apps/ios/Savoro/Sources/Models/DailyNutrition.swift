import Foundation

/// Combines daily totals with user goals for display in the Daily Card.
struct DailyNutrition: Equatable, Sendable {
    let totals: DailyTotals
    let goal: UserGoal?

    var caloriesEaten: Double { totals.calories }
    var caloriesGoal: Double { Double(goal?.calories ?? 2000) }
    var caloriesRemaining: Double { max(0, caloriesGoal - caloriesEaten) }
    var caloriesProgress: Double {
        guard caloriesGoal > 0 else { return 0 }
        return min(caloriesEaten / caloriesGoal, 1.0)
    }

    var proteinEaten: Double { totals.protein }
    var proteinGoal: Double { Double(goal?.protein ?? 150) }
    var proteinProgress: Double {
        guard proteinGoal > 0 else { return 0 }
        return min(proteinEaten / proteinGoal, 1.0)
    }

    var carbEaten: Double { totals.carb }
    var carbGoal: Double { Double(goal?.carb ?? 200) }
    var carbProgress: Double {
        guard carbGoal > 0 else { return 0 }
        return min(carbEaten / carbGoal, 1.0)
    }

    var fatEaten: Double { totals.fat }
    var fatGoal: Double { Double(goal?.fat ?? 65) }
    var fatProgress: Double {
        guard fatGoal > 0 else { return 0 }
        return min(fatEaten / fatGoal, 1.0)
    }
}
