import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { foodLogEntries, type FoodLogEntryRow, type RecipeVersionRow } from '../db/schema'

export interface InsertRecipeLogInput {
  userId: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings: number
  version: RecipeVersionRow
}

/**
 * Inserts a recipe log entry, freezing the version's nutrition (scaled by
 * servings) into snapshot columns. The snapshot is never recomputed.
 */
export async function insertRecipeLog(db: Db, input: InsertRecipeLogInput): Promise<FoodLogEntryRow> {
  const { version } = input
  const now = new Date().toISOString()
  const scale = input.servings
  const row: typeof foodLogEntries.$inferInsert = {
    id: `log_${crypto.randomUUID()}`,
    userId: input.userId,
    logDate: input.date,
    mealType: input.mealType,
    itemType: 'recipe',
    recipeId: version.recipeId,
    recipeVersionId: version.id,
    quantity: input.servings,
    quantityUnit: 'serving',
    snapshotDisplayName: version.title,
    snapshotCalories: version.calories * scale,
    snapshotProteinGrams: version.proteinGrams * scale,
    snapshotCarbsGrams: version.carbsGrams * scale,
    snapshotFatGrams: version.fatGrams * scale,
    snapshotFiberGrams: version.fiberGrams === null ? null : version.fiberGrams * scale,
    snapshotSodiumMilligrams: version.sodiumMilligrams === null ? null : version.sodiumMilligrams * scale,
    snapshotSourceLabel: `recipe v${version.versionNumber}`,
    snapshotCapturedAt: now,
    sourceType: 'recipe',
    privacyDomain: 'private_user_data',
    createdAt: now,
    updatedAt: now,
  }
  const inserted = await db.insert(foodLogEntries).values(row).returning()
  return inserted[0]
}

/** All of one user's entries for a calendar day. Always scoped by userId. */
export async function listEntriesForDay(db: Db, userId: string, date: string): Promise<FoodLogEntryRow[]> {
  return db.query.foodLogEntries.findMany({
    where: and(eq(foodLogEntries.userId, userId), eq(foodLogEntries.logDate, date)),
    orderBy: [asc(foodLogEntries.createdAt)],
  })
}
