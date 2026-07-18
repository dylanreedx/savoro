import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapFoodDetail, mapFoodSummary } from '../dto/foods'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import {
  getFoodDetail,
  searchFoods,
  type FoodSearchCursor,
  type FoodSearchOptions,
} from '../repo/foods'

export const foods = new Hono<AppEnv>()

foods.use('*', requireAuth)

foods.get('/search', async (c) => {
  const query = parseFoodQuery(c.req.query('q'))
  const page = await searchFoods(
    createDb(c.env.DB),
    query,
    parseFoodSearchOptions(c.req.query('limit'), c.req.query('cursor')),
  )
  return c.json({
    query,
    items: page.items.map(mapFoodSummary),
    nextCursor: page.nextCursor === null ? null : encodeFoodSearchCursor(page.nextCursor),
  })
})

foods.get('/:id', async (c) => {
  const food = await getFoodDetail(createDb(c.env.DB), c.req.param('id'))
  return c.json({ food: mapFoodDetail(food) })
})

function parseFoodQuery(value: string | undefined): string {
  const query = value?.trim()
  if (!query) throw new ApiError('validation_failed', 'q must be a non-empty string.')
  return query
}

function parseFoodSearchOptions(
  limitParam: string | undefined,
  cursorParam: string | undefined,
): FoodSearchOptions {
  let limit = 20
  if (limitParam !== undefined) {
    if (!/^\d+$/.test(limitParam)) {
      throw new ApiError('validation_failed', 'limit must be an integer from 1 to 50.')
    }
    limit = Number(limitParam)
    if (limit < 1 || limit > 50) {
      throw new ApiError('validation_failed', 'limit must be an integer from 1 to 50.')
    }
  }
  return { limit, ...(cursorParam !== undefined && { cursor: decodeFoodSearchCursor(cursorParam) }) }
}

function encodeFoodSearchCursor(cursor: FoodSearchCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeFoodSearchCursor(value: string): FoodSearchCursor {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    const decoded = JSON.parse(atob(base64)) as Record<string, unknown>
    if (
      typeof decoded.name === 'string' &&
      decoded.name !== '' &&
      typeof decoded.foodId === 'string' &&
      decoded.foodId !== ''
    ) {
      return { name: decoded.name, foodId: decoded.foodId }
    }
  } catch {
    // Invalid opaque cursors use the normal validation envelope below.
  }
  throw new ApiError('validation_failed', 'cursor is invalid.')
}
