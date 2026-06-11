import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { isCalendarDate } from '../dates'
import { createDb } from '../db/client'
import { mapGoal } from '../dto/goals'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import { createGoal, getActiveGoal, type CreateGoalInput } from '../repo/goals'

export const goals = new Hono<AppEnv>()

goals.use('*', requireAuth)

goals.get('/current', async (c) => {
  const userId = c.get('userId')
  const date = c.req.query('date')
  if (!date || !isCalendarDate(date)) {
    throw new ApiError('validation_failed', 'date query param must be YYYY-MM-DD.')
  }

  const goal = await getActiveGoal(createDb(c.env.DB), userId, date)
  return c.json({ goal: goal ? mapGoal(goal) : null })
})

goals.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<Record<string, unknown>>().catch(() => {
    throw new ApiError('validation_failed', 'Body must be JSON.')
  })

  // Client-supplied userId is intentionally ignored: identity comes from the session.
  const input = parseCreateGoalBody(body)
  const goal = await createGoal(createDb(c.env.DB), userId, input)
  return c.json({ goal: mapGoal(goal) }, 201)
})

const REQUIRED_TARGETS = ['calories', 'proteinGrams', 'carbsGrams', 'fatGrams'] as const
const OPTIONAL_TARGETS = ['fiberGrams', 'sodiumMilligrams'] as const

function parseCreateGoalBody(body: Record<string, unknown>): CreateGoalInput {
  const targets = body.dailyTargets
  if (typeof targets !== 'object' || targets === null || Array.isArray(targets)) {
    throw new ApiError('validation_failed', 'dailyTargets is required.')
  }
  const raw = targets as Record<string, unknown>

  const parsed: Record<string, number | null> = {}
  for (const key of REQUIRED_TARGETS) {
    const n = raw[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
      throw new ApiError('validation_failed', `dailyTargets.${key} must be a positive number.`)
    }
    parsed[key] = n
  }
  for (const key of OPTIONAL_TARGETS) {
    const n = raw[key]
    if (n === undefined || n === null) {
      parsed[key] = null
      continue
    }
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
      throw new ApiError('validation_failed', `dailyTargets.${key} must be a positive number.`)
    }
    parsed[key] = n
  }

  if (typeof body.startDate !== 'string' || !isCalendarDate(body.startDate)) {
    throw new ApiError('validation_failed', 'startDate must be YYYY-MM-DD.')
  }
  let endDate: string | null = null
  if (body.endDate !== undefined && body.endDate !== null) {
    if (typeof body.endDate !== 'string' || !isCalendarDate(body.endDate)) {
      throw new ApiError('validation_failed', 'endDate must be YYYY-MM-DD or null.')
    }
    if (body.endDate < body.startDate) {
      throw new ApiError('validation_failed', 'endDate must not be before startDate.')
    }
    endDate = body.endDate
  }

  return {
    calories: parsed.calories as number,
    proteinGrams: parsed.proteinGrams as number,
    carbsGrams: parsed.carbsGrams as number,
    fatGrams: parsed.fatGrams as number,
    fiberGrams: parsed.fiberGrams,
    sodiumMilligrams: parsed.sodiumMilligrams,
    startDate: body.startDate,
    endDate,
  }
}
