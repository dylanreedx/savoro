import type { FoodLogEntryRow, GoalRow } from '../db/schema'

// DTO shapes follow docs/api-contract.md exactly (camelCase, nested snapshot).

export interface MacroTotalsDTO {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  sodiumMilligrams?: number
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export function mapEntry(row: FoodLogEntryRow) {
  return {
    id: row.id,
    userId: row.userId,
    date: row.logDate,
    mealType: row.mealType,
    itemType: row.itemType,
    foodId: row.foodId,
    servingId: row.servingId,
    recipeId: row.recipeId,
    recipeVersionId: row.recipeVersionId,
    quantity: row.quantity,
    quantityUnit: row.quantityUnit,
    snapshot: {
      displayName: row.snapshotDisplayName,
      macros: macros(
        row.snapshotCalories,
        row.snapshotProteinGrams,
        row.snapshotCarbsGrams,
        row.snapshotFatGrams,
        row.snapshotFiberGrams,
        row.snapshotSodiumMilligrams,
      ),
      ...(row.snapshotSourceLabel !== null && { sourceLabel: row.snapshotSourceLabel }),
      capturedAt: row.snapshotCapturedAt,
    },
    sourceType: row.sourceType,
    privacyDomain: row.privacyDomain,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Day DTO grouped by meal; all totals are sums of frozen snapshot values. */
export function mapDayLog(userId: string, date: string, rows: FoodLogEntryRow[], goal: GoalRow | null) {
  const meals = MEAL_ORDER.flatMap((mealType) => {
    const entries = rows.filter((r) => r.mealType === mealType)
    if (entries.length === 0) return []
    return [{ mealType, entries: entries.map(mapEntry), totals: sumSnapshots(entries) }]
  })

  return {
    dayLog: {
      userId,
      date,
      meals,
      totals: sumSnapshots(rows),
      privacyDomain: 'private_user_data',
    },
    goal: goal
      ? {
          dailyTargets: macros(
            goal.calories,
            goal.proteinGrams,
            goal.carbsGrams,
            goal.fatGrams,
            goal.fiberGrams,
            goal.sodiumMilligrams,
          ),
        }
      : null,
  }
}

function sumSnapshots(rows: FoodLogEntryRow[]): MacroTotalsDTO {
  return rows.reduce<MacroTotalsDTO>(
    (acc, r) =>
      macros(
        acc.calories + r.snapshotCalories,
        acc.proteinGrams + r.snapshotProteinGrams,
        acc.carbsGrams + r.snapshotCarbsGrams,
        acc.fatGrams + r.snapshotFatGrams,
        addOptional(acc.fiberGrams ?? null, r.snapshotFiberGrams),
        addOptional(acc.sodiumMilligrams ?? null, r.snapshotSodiumMilligrams),
      ),
    macros(0, 0, 0, 0, null, null),
  )
}

function addOptional(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null
  return (a ?? 0) + (b ?? 0)
}

function macros(
  calories: number,
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number,
  fiberGrams: number | null,
  sodiumMilligrams: number | null,
): MacroTotalsDTO {
  return {
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    ...(fiberGrams !== null && { fiberGrams }),
    ...(sodiumMilligrams !== null && { sodiumMilligrams }),
  }
}
