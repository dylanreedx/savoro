import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedRecipe, seedUser } from './seed'

interface EntryDTO {
  id: string
  userId: string
  date: string
  mealType: string
  itemType: 'food' | 'recipe'
  foodId: string | null
  servingId: string | null
  recipeId: string | null
  recipeVersionId: string | null
  quantity: number
  quantityUnit: string
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
    capturedAt: string
  }
  sourceType: string
  privacyDomain: string
  createdAt: string
  updatedAt: string
}

interface RecentsResponse {
  items: EntryDTO[]
  nextCursor: string | null
}

interface ErrorResponse {
  error: { code: string; message: string }
}

const MANUAL_FOOD = {
  displayName: 'Greek yogurt',
  macros: { calories: 180, proteinGrams: 17, carbsGrams: 9, fatGrams: 5 },
  date: '2026-06-10',
  mealType: 'breakfast',
  quantity: 1,
  quantityUnit: 'serving',
}

const INVALID_DATES = ['2026-02-30', '2026-13-10', '2026-06-00', 'June 10', '2026/06/10', '2026-6-10']

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

async function logRecipe(
  token: string,
  recipeId: string,
  overrides: Record<string, unknown> = {},
): Promise<EntryDTO> {
  const res = await app.request(
    '/v1/logs/recipes',
    authed(token, {
      method: 'POST',
      body: JSON.stringify({
        recipeId,
        date: '2026-06-10',
        mealType: 'lunch',
        servings: 1,
        ...overrides,
      }),
    }),
    env,
  )
  expect(res.status).toBe(201)
  return ((await res.json()) as { entry: EntryDTO }).entry
}

async function logFood(token: string, overrides: Record<string, unknown> = {}): Promise<EntryDTO> {
  const res = await app.request(
    '/v1/logs/foods',
    authed(token, { method: 'POST', body: JSON.stringify({ ...MANUAL_FOOD, ...overrides }) }),
    env,
  )
  expect(res.status).toBe(201)
  return ((await res.json()) as { entry: EntryDTO }).entry
}

async function patchEntry(token: string, entryId: string, body: unknown) {
  return app.request(
    `/v1/logs/${entryId}`,
    authed(token, { method: 'PATCH', body: JSON.stringify(body) }),
    env,
  )
}

async function setCreatedAt(entryId: string, timestamp: string) {
  await env.DB.prepare('update food_log_entries set created_at = ?, updated_at = ? where id = ?')
    .bind(timestamp, timestamp, entryId)
    .run()
}

describe('logs management endpoints', () => {
  let versionId: string

  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
    versionId = await seedRecipe(env.DB, {
      recipeId: 'rec_bowl',
      ownerUserId: 'usr_alice',
      title: 'Burrito Bowl',
      caloriesPerServing: 500,
      proteinGrams: 40,
      carbsGrams: 50,
      fatGrams: 15,
    })
  })

  it('requires authentication for recents, patch, and delete', async () => {
    for (const [path, method] of [
      ['/v1/logs/recents', 'GET'],
      ['/v1/logs/log_missing', 'PATCH'],
      ['/v1/logs/log_missing', 'DELETE'],
    ] as const) {
      const res = await app.request(path, { method }, env)
      expect(res.status, `${method} ${path}`).toBe(401)
    }
  })

  it('returns distinct recent items newest first in FoodLogEntry shape with cursor paging', async () => {
    const otherVersionId = await seedRecipe(env.DB, {
      recipeId: 'rec_soup',
      ownerUserId: 'usr_alice',
      title: 'Tomato Soup',
      caloriesPerServing: 300,
    })
    expect(otherVersionId).toBeTruthy()

    const oldBowl = await logRecipe('alice-token', 'rec_bowl')
    const manual = await logFood('alice-token')
    const soup = await logRecipe('alice-token', 'rec_soup')
    const latestBowl = await logRecipe('alice-token', 'rec_bowl', { servings: 2, mealType: 'dinner' })
    const bobFood = await logFood('bob-token', { displayName: "Bob's private food" })

    await setCreatedAt(oldBowl.id, '2026-06-10T10:00:00.000Z')
    await setCreatedAt(manual.id, '2026-06-10T11:00:00.000Z')
    await setCreatedAt(soup.id, '2026-06-10T12:00:00.000Z')
    await setCreatedAt(latestBowl.id, '2026-06-10T13:00:00.000Z')
    await setCreatedAt(bobFood.id, '2026-06-10T14:00:00.000Z')

    const firstRes = await app.request('/v1/logs/recents?limit=2', authed('alice-token'), env)
    expect(firstRes.status).toBe(200)
    const first = (await firstRes.json()) as RecentsResponse
    expect(Object.keys(first).sort()).toEqual(['items', 'nextCursor'])
    expect(first.items.map((item) => item.id)).toEqual([latestBowl.id, soup.id])
    expect(first.items.map((item) => item.recipeId)).toEqual(['rec_bowl', 'rec_soup'])
    expect(first.items[0].quantity).toBe(2)
    expect(first.items[0].userId).toBe('usr_alice')
    expect(first.items[0].privacyDomain).toBe('private_user_data')
    expect(Object.keys(first.items[0]).sort()).toEqual([
      'createdAt',
      'date',
      'foodId',
      'id',
      'itemType',
      'mealType',
      'privacyDomain',
      'quantity',
      'quantityUnit',
      'recipeId',
      'recipeVersionId',
      'servingId',
      'snapshot',
      'sourceType',
      'updatedAt',
      'userId',
    ])
    expect(first.nextCursor).not.toBeNull()

    const secondRes = await app.request(
      `/v1/logs/recents?limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`,
      authed('alice-token'),
      env,
    )
    expect(secondRes.status).toBe(200)
    const second = (await secondRes.json()) as RecentsResponse
    expect(second.items.map((item) => item.id)).toEqual([manual.id])
    expect(second.nextCursor).toBeNull()
    expect([...first.items, ...second.items].some((item) => item.id === oldBowl.id)).toBe(false)
    expect(JSON.stringify([...first.items, ...second.items])).not.toContain("Bob's private food")
  })

  it('validates recents limit and cursor', async () => {
    for (const query of ['limit=0', 'limit=51', 'limit=1.5', 'limit=nope', 'cursor=not-a-cursor']) {
      const res = await app.request(`/v1/logs/recents?${query}`, authed('alice-token'), env)
      expect(res.status, query).toBe(422)
    }
  })

  it('deletes an owned entry and day totals recompute from the remaining snapshots', async () => {
    const recipe = await logRecipe('alice-token', 'rec_bowl')
    const food = await logFood('alice-token')

    const deleted = await app.request(`/v1/logs/${recipe.id}`, authed('alice-token', { method: 'DELETE' }), env)
    expect(deleted.status).toBe(204)
    expect(await deleted.text()).toBe('')

    const day = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    expect(day.status).toBe(200)
    const body = (await day.json()) as {
      dayLog: { meals: { entries: EntryDTO[] }[]; totals: { calories: number; proteinGrams: number } }
    }
    expect(body.dayLog.meals.flatMap((meal) => meal.entries).map((entry) => entry.id)).toEqual([food.id])
    expect(body.dayLog.totals.calories).toBe(180)
    expect(body.dayLog.totals.proteinGrams).toBe(17)
  })

  it('patches only editable fields and rescales from the frozen snapshot without reading the recipe', async () => {
    const original = await logRecipe('alice-token', 'rec_bowl', { servings: 2 })

    // A hostile source rewrite must not affect the subsequent quantity edit.
    await env.DB.prepare(
      'update recipe_versions set calories = 9000, protein_grams = 1, carbs_grams = 2, fat_grams = 3 where id = ?',
    )
      .bind(versionId)
      .run()

    const res = await patchEntry('alice-token', original.id, {
      date: '2026-06-11',
      mealType: 'dinner',
      quantity: 3,
    })
    expect(res.status).toBe(200)
    const response = (await res.json()) as { entry: EntryDTO }
    expect(Object.keys(response)).toEqual(['entry'])
    expect(response.entry.date).toBe('2026-06-11')
    expect(response.entry.mealType).toBe('dinner')
    expect(response.entry.quantity).toBe(3)
    expect(response.entry.recipeId).toBe('rec_bowl')
    expect(response.entry.recipeVersionId).toBe(versionId)
    expect(response.entry.snapshot.displayName).toBe(original.snapshot.displayName)
    expect(response.entry.snapshot.sourceLabel).toBe(original.snapshot.sourceLabel)
    expect(response.entry.snapshot.capturedAt).toBe(original.snapshot.capturedAt)
    expect(response.entry.snapshot.macros).toEqual({
      calories: 1500,
      proteinGrams: 120,
      carbsGrams: 150,
      fatGrams: 45,
    })

    const oldDay = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    const newDay = await app.request('/v1/logs/day?date=2026-06-11', authed('alice-token'), env)
    expect(((await oldDay.json()) as { dayLog: { totals: { calories: number } } }).dayLog.totals.calories).toBe(0)
    expect(((await newDay.json()) as { dayLog: { totals: { calories: number } } }).dayLog.totals.calories).toBe(1500)
  })

  it('rescales a manual food snapshot proportionally from its previous quantity', async () => {
    const original = await logFood('alice-token', { quantity: 2 })
    const res = await patchEntry('alice-token', original.id, { quantity: 5 })
    expect(res.status).toBe(200)
    const entry = ((await res.json()) as { entry: EntryDTO }).entry
    expect(entry.quantity).toBe(5)
    expect(entry.snapshot.macros).toEqual({
      calories: 450,
      proteinGrams: 42.5,
      carbsGrams: 22.5,
      fatGrams: 12.5,
    })
  })

  it('rejects empty, unsupported, and invalid patches without changing the entry', async () => {
    const entry = await logRecipe('alice-token', 'rec_bowl')
    const invalidBodies: unknown[] = [
      {},
      null,
      [],
      { quantity: 2, snapshot: { macros: { calories: 1 } } },
      { recipeVersionId: 'rcv_spoofed' },
      { servings: 2 },
      { mealType: 'brunch' },
      { date: '2026-02-30' },
      { quantity: 0 },
      { quantity: -1 },
      { quantity: Number.MAX_VALUE },
      { quantity: '2' },
      { quantity: 2, quantityUnit: 'grams' },
      { date: '2026-06-11', userId: 'usr_bob' },
    ]

    for (const body of invalidBodies) {
      const res = await patchEntry('alice-token', entry.id, body)
      expect(res.status, JSON.stringify(body)).toBe(422)
      expect(((await res.json()) as ErrorResponse).error.code).toBe('validation_failed')
    }
    const malformed = await app.request(
      `/v1/logs/${entry.id}`,
      authed('alice-token', { method: 'PATCH', body: '{' }),
      env,
    )
    expect(malformed.status).toBe(422)

    const day = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    const unchanged = ((await day.json()) as { dayLog: { meals: { entries: EntryDTO[] }[] } }).dayLog.meals[0].entries[0]
    expect(unchanged.quantity).toBe(1)
    expect(unchanged.date).toBe('2026-06-10')
    expect(unchanged.mealType).toBe('lunch')
    expect(unchanged.recipeVersionId).toBe(versionId)
  })

  it('returns the same 404 for missing and foreign entries without modifying another user data', async () => {
    const entry = await logRecipe('alice-token', 'rec_bowl')

    const foreignPatch = await patchEntry('bob-token', entry.id, { quantity: 2 })
    const missingPatch = await patchEntry('bob-token', 'log_missing', { quantity: 2 })
    expect(foreignPatch.status).toBe(404)
    expect(await foreignPatch.json()).toEqual(await missingPatch.json())

    const foreignDelete = await app.request(`/v1/logs/${entry.id}`, authed('bob-token', { method: 'DELETE' }), env)
    const missingDelete = await app.request('/v1/logs/log_missing', authed('bob-token', { method: 'DELETE' }), env)
    expect(foreignDelete.status).toBe(404)
    expect(await foreignDelete.json()).toEqual(await missingDelete.json())

    const aliceDay = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    expect(
      ((await aliceDay.json()) as { dayLog: { meals: { entries: EntryDTO[] }[] } }).dayLog.meals[0].entries[0].id,
    ).toBe(entry.id)
    const bobRecents = await app.request('/v1/logs/recents', authed('bob-token'), env)
    expect(((await bobRecents.json()) as RecentsResponse).items).toEqual([])
  })

  it('reuses strict calendar-date validation for date edits and accepts a real leap day', async () => {
    const entry = await logRecipe('alice-token', 'rec_bowl')
    for (const date of INVALID_DATES) {
      const res = await patchEntry('alice-token', entry.id, { date })
      expect(res.status, date).toBe(422)
    }

    const valid = await patchEntry('alice-token', entry.id, { date: '2028-02-29' })
    expect(valid.status).toBe(200)
    expect(((await valid.json()) as { entry: EntryDTO }).entry.date).toBe('2028-02-29')
  })
})
