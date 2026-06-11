import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { isCalendarDate } from '../dates'
import { createDb } from '../db/client'
import { mapDayLog, mapEntry } from '../dto/logs'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import { getActiveGoal } from '../repo/goals'
import { insertManualFoodLog, insertRecipeLog, listEntriesForDay } from '../repo/logs'
import { getLoggableVersion } from '../repo/recipes'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
type MealType = (typeof MEAL_TYPES)[number]

export const logs = new Hono<AppEnv>()

logs.use('*', requireAuth)

logs.get('/day', async (c) => {
  const userId = c.get('userId')
  const date = c.req.query('date')
  if (!date || !isCalendarDate(date)) {
    throw new ApiError('validation_failed', 'date query param must be YYYY-MM-DD.')
  }

  const db = createDb(c.env.DB)
  const [entries, goal] = await Promise.all([listEntriesForDay(db, userId, date), getActiveGoal(db, userId, date)])
  return c.json(mapDayLog(userId, date, entries, goal))
})

interface LogRecipeBody {
  recipeId?: unknown
  recipeVersionId?: unknown
  date?: unknown
  mealType?: unknown
  servings?: unknown
}

logs.post('/recipes', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<LogRecipeBody>().catch(() => {
    throw new ApiError('validation_failed', 'Body must be JSON.')
  })

  // Client-supplied userId/snapshot fields are intentionally ignored: the
  // user comes from the session and the snapshot is computed server-side.
  if (typeof body.recipeId !== 'string') throw new ApiError('validation_failed', 'recipeId is required.')
  if (body.recipeVersionId !== undefined && typeof body.recipeVersionId !== 'string') {
    throw new ApiError('validation_failed', 'recipeVersionId must be a string.')
  }
  if (typeof body.date !== 'string' || !isCalendarDate(body.date)) {
    throw new ApiError('validation_failed', 'date must be YYYY-MM-DD.')
  }
  if (!MEAL_TYPES.includes(body.mealType as MealType)) {
    throw new ApiError('validation_failed', `mealType must be one of ${MEAL_TYPES.join(', ')}.`)
  }
  if (typeof body.servings !== 'number' || !Number.isFinite(body.servings) || body.servings <= 0) {
    throw new ApiError('validation_failed', 'servings must be a positive number.')
  }

  const db = createDb(c.env.DB)
  const version = await getLoggableVersion(db, userId, body.recipeId, body.recipeVersionId)
  const entry = await insertRecipeLog(db, {
    userId,
    date: body.date,
    mealType: body.mealType as MealType,
    servings: body.servings,
    version,
  })

  const [entries, goal] = await Promise.all([
    listEntriesForDay(db, userId, body.date),
    getActiveGoal(db, userId, body.date),
  ])
  return c.json({ entry: mapEntry(entry), ...mapDayLog(userId, body.date, entries, goal) }, 201)
})

interface LogFoodBody {
  displayName?: unknown
  macros?: unknown
  date?: unknown
  mealType?: unknown
  quantity?: unknown
  quantityUnit?: unknown
}

const REQUIRED_MACROS = ['calories', 'proteinGrams', 'carbsGrams', 'fatGrams'] as const
const OPTIONAL_MACROS = ['fiberGrams', 'sodiumMilligrams'] as const

logs.post('/foods', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<LogFoodBody>().catch(() => {
    throw new ApiError('validation_failed', 'Body must be JSON.')
  })

  // Client-supplied userId/snapshot fields are intentionally ignored: the
  // user comes from the session, and the snapshot is frozen from the
  // top-level displayName + macros only.
  if (typeof body.displayName !== 'string' || body.displayName.trim() === '') {
    throw new ApiError('validation_failed', 'displayName must be a non-empty string.')
  }
  if (typeof body.date !== 'string' || !isCalendarDate(body.date)) {
    throw new ApiError('validation_failed', 'date must be YYYY-MM-DD.')
  }
  if (!MEAL_TYPES.includes(body.mealType as MealType)) {
    throw new ApiError('validation_failed', `mealType must be one of ${MEAL_TYPES.join(', ')}.`)
  }
  if (typeof body.quantity !== 'number' || !Number.isFinite(body.quantity) || body.quantity <= 0) {
    throw new ApiError('validation_failed', 'quantity must be a positive number.')
  }
  if (typeof body.quantityUnit !== 'string' || body.quantityUnit.trim() === '') {
    throw new ApiError('validation_failed', 'quantityUnit must be a non-empty string.')
  }
  const macros = parseLoggedMacros(body.macros)

  const db = createDb(c.env.DB)
  const entry = await insertManualFoodLog(db, {
    userId,
    date: body.date,
    mealType: body.mealType as MealType,
    displayName: body.displayName.trim(),
    macros,
    quantity: body.quantity,
    quantityUnit: body.quantityUnit,
  })

  const [entries, goal] = await Promise.all([
    listEntriesForDay(db, userId, body.date),
    getActiveGoal(db, userId, body.date),
  ])
  return c.json({ entry: mapEntry(entry), ...mapDayLog(userId, body.date, entries, goal) }, 201)
})

function parseLoggedMacros(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiError('validation_failed', 'macros is required.')
  }
  const raw = value as Record<string, unknown>
  const parsed: Record<string, number | null> = {}
  for (const key of REQUIRED_MACROS) {
    const n = raw[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      throw new ApiError('validation_failed', `macros.${key} must be a non-negative number.`)
    }
    parsed[key] = n
  }
  for (const key of OPTIONAL_MACROS) {
    const n = raw[key]
    if (n === undefined || n === null) {
      parsed[key] = null
      continue
    }
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
      throw new ApiError('validation_failed', `macros.${key} must be a non-negative number.`)
    }
    parsed[key] = n
  }
  return {
    calories: parsed.calories as number,
    proteinGrams: parsed.proteinGrams as number,
    carbsGrams: parsed.carbsGrams as number,
    fatGrams: parsed.fatGrams as number,
    fiberGrams: parsed.fiberGrams,
    sodiumMilligrams: parsed.sodiumMilligrams,
  }
}
