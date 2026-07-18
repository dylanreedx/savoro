import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedRecipe, seedUser } from './seed'

interface EntryDTO {
  id: string
  userId: string
  itemType: string
  foodId: string | null
  servingId: string | null
  recipeId: string | null
  recipeVersionId: string | null
  quantity: number
  quantityUnit: string
  sourceType: string
  snapshot: {
    displayName: string
    macros: {
      calories: number
      proteinGrams: number
      carbsGrams: number
      fatGrams: number
      fiberGrams?: number
      sodiumMilligrams?: number
    }
    sourceLabel?: string
  }
}

interface FoodLogResponse {
  entry: EntryDTO
  dayLog: { userId: string; totals: { calories: number; proteinGrams: number } }
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

const VALID_BODY = {
  displayName: 'Greek yogurt, 2% (manual)',
  macros: { calories: 180, proteinGrams: 17, carbsGrams: 9, fatGrams: 5, sodiumMilligrams: 65 },
  date: '2026-06-10',
  mealType: 'breakfast',
  quantity: 1,
  quantityUnit: 'serving',
}

async function logFood(token: string, body: Record<string, unknown> = VALID_BODY) {
  return app.request('/v1/logs/foods', authed(token, { method: 'POST', body: JSON.stringify(body) }), env)
}

describe('manual food logging', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
  })

  it('requires auth', async () => {
    const res = await app.request('/v1/logs/foods', { method: 'POST', body: JSON.stringify(VALID_BODY) }, env)
    expect(res.status).toBe(401)
  })

  it('logs a manual food with the client macros frozen verbatim', async () => {
    const res = await logFood('alice-token')
    expect(res.status).toBe(201)
    const body = (await res.json()) as FoodLogResponse

    expect(Object.keys(body).sort()).toEqual(['dayLog', 'entry'])
    expect(body.entry.itemType).toBe('food')
    expect(body.entry.sourceType).toBe('manual')
    expect(body.entry.foodId).toBeNull()
    expect(body.entry.servingId).toBeNull()
    expect(body.entry.recipeId).toBeNull()
    expect(body.entry.recipeVersionId).toBeNull()
    expect(body.entry.quantity).toBe(1)
    expect(body.entry.quantityUnit).toBe('serving')
    expect(body.entry.snapshot.displayName).toBe('Greek yogurt, 2% (manual)')
    expect(body.entry.snapshot.macros).toEqual(VALID_BODY.macros)
    expect(body.dayLog.totals.calories).toBe(180)
  })

  it('freezes macros verbatim — never scaled by quantity', async () => {
    const res = await logFood('alice-token', { ...VALID_BODY, quantity: 3 })
    const body = (await res.json()) as FoodLogResponse
    expect(body.entry.snapshot.macros.calories).toBe(180)
    expect(body.dayLog.totals.calories).toBe(180)
  })

  it('derives userId from the session, ignoring a client-supplied userId and snapshot', async () => {
    await seedUser(env.DB, 'usr_bob', 'bob-token')
    const res = await logFood('alice-token', {
      ...VALID_BODY,
      userId: 'usr_bob',
      snapshot: { displayName: 'spoofed', macros: { calories: 1, proteinGrams: 1, carbsGrams: 1, fatGrams: 1 } },
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as FoodLogResponse
    expect(body.entry.userId).toBe('usr_alice')
    expect(body.entry.snapshot.displayName).toBe('Greek yogurt, 2% (manual)')
    expect(body.entry.snapshot.macros.calories).toBe(180)
  })

  it('combines manual foods and recipe logs in day totals', async () => {
    await seedRecipe(env.DB, { recipeId: 'rec_bowl', ownerUserId: 'usr_alice', caloriesPerServing: 500 })
    await app.request(
      '/v1/logs/recipes',
      authed('alice-token', {
        method: 'POST',
        body: JSON.stringify({ recipeId: 'rec_bowl', date: '2026-06-10', mealType: 'lunch', servings: 1 }),
      }),
      env,
    )
    const res = await logFood('alice-token')
    const body = (await res.json()) as FoodLogResponse
    expect(body.dayLog.totals.calories).toBe(680)
  })

  it('appears on the day log read back', async () => {
    await logFood('alice-token')
    const res = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    const body = (await res.json()) as {
      dayLog: { meals: { mealType: string; entries: EntryDTO[] }[]; totals: { calories: number } }
    }
    const breakfast = body.dayLog.meals.find((m) => m.mealType === 'breakfast')
    expect(breakfast?.entries[0].sourceType).toBe('manual')
    expect(body.dayLog.totals.calories).toBe(180)
  })

  it('rejects invalid payloads', async () => {
    const bad: Record<string, unknown>[] = [
      { ...VALID_BODY, displayName: '  ' },
      { ...VALID_BODY, displayName: undefined },
      { ...VALID_BODY, macros: undefined },
      { ...VALID_BODY, macros: { calories: -10, proteinGrams: 1, carbsGrams: 1, fatGrams: 1 } },
      { ...VALID_BODY, macros: { calories: 100, proteinGrams: 1, carbsGrams: 1 } },
      { ...VALID_BODY, macros: { ...VALID_BODY.macros, fiberGrams: -1 } },
      { ...VALID_BODY, date: '2026-02-30' },
      { ...VALID_BODY, date: 'today' },
      { ...VALID_BODY, mealType: 'brunch' },
      { ...VALID_BODY, quantity: 0 },
      { ...VALID_BODY, quantity: -1 },
      { ...VALID_BODY, quantityUnit: '' },
    ]
    for (const body of bad) {
      const res = await logFood('alice-token', body)
      expect(res.status).toBe(422)
    }
  })

  it('rejects non-finite macros encoded as JSON', async () => {
    const raw = '{"displayName":"x","macros":{"calories":1e999,"proteinGrams":1,"carbsGrams":1,"fatGrams":1},"date":"2026-06-10","mealType":"breakfast","quantity":1,"quantityUnit":"serving"}'
    const res = await app.request('/v1/logs/foods', authed('alice-token', { method: 'POST', body: raw }), env)
    expect(res.status).toBe(422)
  })

  it('still forbids non-manual food rows without a food_id at the schema level', async () => {
    const insert = env.DB.prepare(
      `insert into food_log_entries (
        id, user_id, log_date, meal_type, item_type, food_id, quantity, quantity_unit,
        snapshot_display_name, snapshot_calories, snapshot_protein_grams, snapshot_carbs_grams,
        snapshot_fat_grams, snapshot_captured_at, source_type, created_at, updated_at
      ) values ('log_bad', 'usr_alice', '2026-06-10', 'lunch', 'food', null, 1, 'serving',
        'sneaky', 100, 1, 1, 1, '2026-06-10T00:00:00Z', 'search', '2026-06-10T00:00:00Z', '2026-06-10T00:00:00Z')`,
    )
    await expect(insert.run()).rejects.toThrow()
  })

  it('keeps the recipe-entry constraint intact after the rebuild', async () => {
    const insert = env.DB.prepare(
      `insert into food_log_entries (
        id, user_id, log_date, meal_type, item_type, recipe_id, recipe_version_id, quantity, quantity_unit,
        snapshot_display_name, snapshot_calories, snapshot_protein_grams, snapshot_carbs_grams,
        snapshot_fat_grams, snapshot_captured_at, source_type, created_at, updated_at
      ) values ('log_bad2', 'usr_alice', '2026-06-10', 'lunch', 'recipe', null, null, 1, 'serving',
        'sneaky', 100, 1, 1, 1, '2026-06-10T00:00:00Z', 'recipe', '2026-06-10T00:00:00Z', '2026-06-10T00:00:00Z')`,
    )
    await expect(insert.run()).rejects.toThrow()
  })
})
