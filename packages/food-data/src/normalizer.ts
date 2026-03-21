// Normalize OFF product data into savoro food + serving schema rows

import { createId } from "@paralleldrive/cuid2";
import type { OFFProduct } from "./off";

export interface NormalizedFood {
  id: string;
  name: string;
  brandName: string | null;
  barcode: string | null;
  source: "off";
  sourceId: string;
  isVerified: boolean;
}

export interface NormalizedServing {
  id: string;
  foodId: string;
  description: string;
  amountGrams: number | null;
  isDefault: boolean;
  calories: number | null;
  protein: number | null;
  carb: number | null;
  fat: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  polyunsaturatedFat: number | null;
  monounsaturatedFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  potassium: number | null;
  fiber: number | null;
  sugar: number | null;
  addedSugars: number | null;
  vitaminD: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  calcium: number | null;
  iron: number | null;
}

export interface NormalizedResult {
  food: NormalizedFood;
  serving: NormalizedServing;
}

/**
 * Returns true if the product has the minimum required nutrition data:
 * calories + protein + carb + fat must all be present.
 */
export function hasValidNutrition(product: OFFProduct): boolean {
  const n = product.nutriments;
  if (!n) return false;
  return (
    n["energy-kcal_100g"] != null &&
    n.proteins_100g != null &&
    n.carbohydrates_100g != null &&
    n.fat_100g != null
  );
}

function num(val: number | undefined): number | null {
  return val != null && Number.isFinite(val) ? val : null;
}

function isFinitePositive(v: number): boolean {
  return Number.isFinite(v) && v >= 0;
}

export function normalizeOFFProduct(product: OFFProduct): NormalizedResult | null {
  if (!product.product_name || !product.code) return null;
  if (!hasValidNutrition(product)) return null;

  const n = product.nutriments!;

  const calories = n["energy-kcal_100g"]!;
  const protein = n.proteins_100g!;
  const carb = n.carbohydrates_100g!;
  const fat = n.fat_100g!;

  if (!isFinitePositive(calories) || calories > 1000) return null;
  if (!isFinitePositive(protein) || protein > 100) return null;
  if (!isFinitePositive(carb) || carb > 100) return null;
  if (!isFinitePositive(fat) || fat > 100) return null;
  const foodId = createId();

  const food: NormalizedFood = {
    id: foodId,
    name: product.product_name,
    brandName: product.brands || null,
    barcode: product.code,
    source: "off",
    sourceId: product.code,
    isVerified: false,
  };

  const serving: NormalizedServing = {
    id: createId(),
    foodId,
    description: product.serving_size || "100g",
    amountGrams: product.serving_quantity || 100,
    isDefault: true,
    calories: num(n["energy-kcal_100g"]),
    protein: num(n.proteins_100g),
    carb: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    saturatedFat: num(n["saturated-fat_100g"]),
    transFat: num(n["trans-fat_100g"]),
    polyunsaturatedFat: num(n["polyunsaturated-fat_100g"]),
    monounsaturatedFat: num(n["monounsaturated-fat_100g"]),
    cholesterol: num(n.cholesterol_100g),
    sodium: num(n.sodium_100g),
    potassium: num(n.potassium_100g),
    fiber: num(n.fiber_100g),
    sugar: num(n.sugars_100g),
    addedSugars: num(n["added-sugars_100g"]),
    vitaminD: num(n["vitamin-d_100g"]),
    vitaminA: num(n["vitamin-a_100g"]),
    vitaminC: num(n["vitamin-c_100g"]),
    calcium: num(n.calcium_100g),
    iron: num(n.iron_100g),
  };

  return { food, serving };
}
