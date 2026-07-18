import { and, asc, desc, eq, gt, or, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { foods, foodServings, type FoodRow, type FoodServingRow } from '../db/schema'
import { ApiError } from '../errors'

export interface FoodSearchCursor {
  name: string
  foodId: string
}

export interface FoodSearchOptions {
  limit: number
  cursor?: FoodSearchCursor
}

export interface FoodSearchPage {
  items: FoodRow[]
  nextCursor: FoodSearchCursor | null
}

export interface FoodDetailRows {
  food: FoodRow
  servings: FoodServingRow[]
}

/** Case-insensitive substring search over public reference-food fields. */
export async function searchFoods(
  db: Db,
  query: string,
  options: FoodSearchOptions,
): Promise<FoodSearchPage> {
  const pattern = `%${escapeLike(query)}%`
  const sortName = sql<string>`${foods.name} collate nocase`
  const cursorFilter = options.cursor
    ? or(
        gt(sortName, options.cursor.name),
        and(eq(sortName, options.cursor.name), gt(foods.id, options.cursor.foodId)),
      )
    : undefined
  const escapeCharacter = '\\'
  const matches = or(
    sql<boolean>`${foods.name} like ${pattern} escape ${escapeCharacter} collate nocase`,
    sql<boolean>`${foods.brand} like ${pattern} escape ${escapeCharacter} collate nocase`,
    sql<boolean>`${foods.category} like ${pattern} escape ${escapeCharacter} collate nocase`,
  )
  const found = await db
    .select()
    .from(foods)
    .where(and(matches, cursorFilter))
    .orderBy(asc(sortName), asc(foods.id))
    .limit(options.limit + 1)
  const items = found.slice(0, options.limit)
  const last = items.at(-1)
  return {
    items,
    nextCursor: found.length > options.limit && last ? { name: last.name, foodId: last.id } : null,
  }
}

export async function getFoodDetail(db: Db, foodId: string): Promise<FoodDetailRows> {
  const food = await db.query.foods.findFirst({ where: eq(foods.id, foodId) })
  if (!food) throw new ApiError('not_found', 'Food not found.')

  const servings = await db.query.foodServings.findMany({
    where: eq(foodServings.foodId, foodId),
    orderBy: [desc(foodServings.isDefault), asc(foodServings.sortOrder), asc(foodServings.id)],
  })
  return { food, servings }
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}
