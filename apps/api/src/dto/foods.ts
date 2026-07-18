import type { FoodRow, FoodServingRow } from '../db/schema'
import type { FoodDetailRows } from '../repo/foods'

// Food nutrition is normalized at rest to 100 g. The DTO names both the basis
// and macro field explicitly so callers never treat per-100g values as a serving.
export function mapFoodSummary(food: FoodRow) {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    category: food.category,
    source: food.source,
    sourceId: food.sourceId,
    nutritionBasis: 'per_100g' as const,
    per100gMacros: per100gMacros(food),
  }
}

export function mapFoodDetail(rows: FoodDetailRows) {
  return {
    ...mapFoodSummary(rows.food),
    servings: rows.servings.map((serving) => mapFoodServing(rows.food, serving)),
  }
}

function mapFoodServing(food: FoodRow, serving: FoodServingRow) {
  const factor = serving.gramWeight / 100
  const macros = per100gMacros(food)
  return {
    id: serving.id,
    description: serving.description,
    gramWeight: serving.gramWeight,
    isDefault: serving.isDefault,
    nutritionBasis: 'per_serving' as const,
    perServingMacros: {
      calories: scale(macros.calories, factor),
      proteinGrams: scale(macros.proteinGrams, factor),
      carbsGrams: scale(macros.carbsGrams, factor),
      fatGrams: scale(macros.fatGrams, factor),
      ...(macros.fiberGrams !== undefined && { fiberGrams: scale(macros.fiberGrams, factor) }),
      ...(macros.sodiumMilligrams !== undefined && {
        sodiumMilligrams: scale(macros.sodiumMilligrams, factor),
      }),
    },
  }
}

function per100gMacros(food: FoodRow) {
  return {
    calories: food.caloriesPer100g,
    proteinGrams: food.proteinGramsPer100g,
    carbsGrams: food.carbsGramsPer100g,
    fatGrams: food.fatGramsPer100g,
    ...(food.fiberGramsPer100g !== null && { fiberGrams: food.fiberGramsPer100g }),
    ...(food.sodiumMilligramsPer100g !== null && {
      sodiumMilligrams: food.sodiumMilligramsPer100g,
    }),
  }
}

function scale(value: number, factor: number): number {
  return Math.round(value * factor * 10_000) / 10_000
}
