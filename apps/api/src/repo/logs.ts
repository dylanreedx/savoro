import { and, asc, desc, eq, getTableColumns, lt, or, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { foodLogEntries, type FoodLogEntryRow, type RecipeVersionRow } from '../db/schema'
import { ApiError } from '../errors'

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

export interface InsertManualFoodLogInput {
  userId: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  displayName: string
  macros: {
    calories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
    fiberGrams: number | null
    sodiumMilligrams: number | null
  }
  quantity: number
  quantityUnit: string
}

/**
 * Inserts a manually-entered food log entry. The client-supplied macros are
 * for the logged amount and are frozen verbatim as the snapshot — never
 * scaled, recomputed, or backed by a food database row.
 */
export async function insertManualFoodLog(db: Db, input: InsertManualFoodLogInput): Promise<FoodLogEntryRow> {
  const now = new Date().toISOString()
  const row: typeof foodLogEntries.$inferInsert = {
    id: `log_${crypto.randomUUID()}`,
    userId: input.userId,
    logDate: input.date,
    mealType: input.mealType,
    itemType: 'food',
    foodId: null,
    servingId: null,
    recipeId: null,
    recipeVersionId: null,
    quantity: input.quantity,
    quantityUnit: input.quantityUnit,
    snapshotDisplayName: input.displayName,
    snapshotCalories: input.macros.calories,
    snapshotProteinGrams: input.macros.proteinGrams,
    snapshotCarbsGrams: input.macros.carbsGrams,
    snapshotFatGrams: input.macros.fatGrams,
    snapshotFiberGrams: input.macros.fiberGrams,
    snapshotSodiumMilligrams: input.macros.sodiumMilligrams,
    snapshotSourceLabel: null,
    snapshotCapturedAt: now,
    sourceType: 'manual',
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

export interface RecentLogCursor {
  createdAt: string
  entryId: string
}

export interface RecentLogOptions {
  limit: number
  cursor?: RecentLogCursor
}

export interface RecentLogPage {
  items: FoodLogEntryRow[]
  nextCursor: RecentLogCursor | null
}

/**
 * The viewer's distinct log items, newest first. Recipes dedupe by recipe id
 * and database foods by food id; manual foods have no stable source identity,
 * so each manual entry remains independently re-loggable.
 */
export async function listRecentEntries(db: Db, userId: string, options: RecentLogOptions): Promise<RecentLogPage> {
  const itemKey = sql<string>`case
    when ${foodLogEntries.itemType} = 'recipe' then 'recipe:' || ${foodLogEntries.recipeId}
    when ${foodLogEntries.foodId} is not null then 'food:' || ${foodLogEntries.foodId}
    else 'manual:' || ${foodLogEntries.id}
  end`
  const ranked = db.$with('ranked_recent_logs').as(
    db
      .select({
        ...getTableColumns(foodLogEntries),
        recentRank:
          sql<number>`row_number() over (partition by ${itemKey} order by ${foodLogEntries.createdAt} desc, ${foodLogEntries.id} desc)`.as(
            'recent_rank',
          ),
      })
      .from(foodLogEntries)
      .where(eq(foodLogEntries.userId, userId)),
  )
  const cursor = options.cursor
  const cursorFilter = cursor
    ? or(
        lt(ranked.createdAt, cursor.createdAt),
        and(eq(ranked.createdAt, cursor.createdAt), lt(ranked.id, cursor.entryId)),
      )
    : undefined
  const found = await db
    .with(ranked)
    .select()
    .from(ranked)
    .where(and(eq(ranked.recentRank, 1), cursorFilter))
    .orderBy(desc(ranked.createdAt), desc(ranked.id))
    .limit(options.limit + 1)
  const items = found.slice(0, options.limit).map(({ recentRank: _, ...row }) => row)
  const last = items.at(-1)
  return {
    items,
    nextCursor: found.length > options.limit && last ? { createdAt: last.createdAt, entryId: last.id } : null,
  }
}

export interface PatchLogEntryInput {
  date?: string
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  quantity?: number
}

/** Owner-scoped update that never reads recipe or food source tables. */
export async function updateLogEntry(
  db: Db,
  userId: string,
  entryId: string,
  patch: PatchLogEntryInput,
): Promise<FoodLogEntryRow> {
  const existing = await db.query.foodLogEntries.findFirst({
    where: and(eq(foodLogEntries.id, entryId), eq(foodLogEntries.userId, userId)),
  })
  if (!existing) throw new ApiError('not_found', 'Log entry not found.')

  const values: Partial<typeof foodLogEntries.$inferInsert> = {
    updatedAt: new Date().toISOString(),
    ...(patch.date !== undefined && { logDate: patch.date }),
    ...(patch.mealType !== undefined && { mealType: patch.mealType }),
  }
  if (patch.quantity !== undefined) {
    // Derive each frozen per-unit value only from this entry, then scale it:
    // new snapshot total = (stored snapshot total / stored quantity) * new quantity.
    // Source recipe/food data is never consulted, and recipeVersionId is untouched.
    const scale = patch.quantity / existing.quantity
    const scaled = {
      calories: existing.snapshotCalories * scale,
      proteinGrams: existing.snapshotProteinGrams * scale,
      carbsGrams: existing.snapshotCarbsGrams * scale,
      fatGrams: existing.snapshotFatGrams * scale,
      fiberGrams: existing.snapshotFiberGrams === null ? null : existing.snapshotFiberGrams * scale,
      sodiumMilligrams:
        existing.snapshotSodiumMilligrams === null ? null : existing.snapshotSodiumMilligrams * scale,
    }
    if (!Number.isFinite(scale) || Object.values(scaled).some((value) => value !== null && !Number.isFinite(value))) {
      throw new ApiError('validation_failed', 'quantity is too large to scale this entry.')
    }
    values.quantity = patch.quantity
    values.snapshotCalories = scaled.calories
    values.snapshotProteinGrams = scaled.proteinGrams
    values.snapshotCarbsGrams = scaled.carbsGrams
    values.snapshotFatGrams = scaled.fatGrams
    values.snapshotFiberGrams = scaled.fiberGrams
    values.snapshotSodiumMilligrams = scaled.sodiumMilligrams
  }

  const updated = await db
    .update(foodLogEntries)
    .set(values)
    .where(and(eq(foodLogEntries.id, entryId), eq(foodLogEntries.userId, userId)))
    .returning()
  return updated[0]
}

/** Deletes exactly one owner-scoped entry; foreign ids and missing ids match. */
export async function deleteLogEntry(db: Db, userId: string, entryId: string): Promise<void> {
  const deleted = await db
    .delete(foodLogEntries)
    .where(and(eq(foodLogEntries.id, entryId), eq(foodLogEntries.userId, userId)))
    .returning({ id: foodLogEntries.id })
  if (deleted.length === 0) throw new ApiError('not_found', 'Log entry not found.')
}
