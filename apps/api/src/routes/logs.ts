import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapDayLog, mapEntry } from '../dto/logs'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import { getActiveGoal } from '../repo/goals'
import { insertRecipeLog, listEntriesForDay } from '../repo/logs'
import { getLoggableVersion } from '../repo/recipes'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function isCalendarDate(value: string): boolean {
  const match = DATE_RE.exec(value)
  if (!match) return false

  const [, yearPart, monthPart, dayPart] = match
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
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
