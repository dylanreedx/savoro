import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedRecipe, seedUser } from './seed'

interface EntryDTO {
  userId: string
  recipeId: string
  recipeVersionId: string
  snapshot: { displayName: string; macros: { calories: number; proteinGrams: number } }
}

interface DayResponse {
  dayLog: { userId: string; meals: { mealType: string; entries: EntryDTO[] }[]; totals: { calories: number } }
  goal: { dailyTargets: { calories: number } } | null
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

async function logRecipe(token: string, body: Record<string, unknown>) {
  return app.request('/v1/logs/recipes', authed(token, { method: 'POST', body: JSON.stringify(body) }), env)
}

const INVALID_DATES = ['2026-02-30', '2026-13-10', '2026-06-00', 'June 10', '2026/06/10', '2026-6-10']

describe('logs endpoints', () => {
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

  it('logs a recipe with a frozen snapshot and recipeVersionId', async () => {
    const res = await logRecipe('alice-token', {
      recipeId: 'rec_bowl',
      date: '2026-06-10',
      mealType: 'lunch',
      servings: 1.5,
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { entry: EntryDTO } & DayResponse
    expect(body.entry.recipeVersionId).toBe(versionId)
    expect(body.entry.snapshot.displayName).toBe('Burrito Bowl')
    expect(body.entry.snapshot.macros.calories).toBe(750)
    expect(body.entry.snapshot.macros.proteinGrams).toBe(60)
    expect(body.dayLog.totals.calories).toBe(750)
  })

  it('derives userId from the session, ignoring client-supplied userId', async () => {
    const res = await logRecipe('alice-token', {
      userId: 'usr_bob',
      recipeId: 'rec_bowl',
      date: '2026-06-10',
      mealType: 'lunch',
      servings: 1,
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { entry: EntryDTO }
    expect(body.entry.userId).toBe('usr_alice')
  })

  it('keeps historical totals frozen when the recipe is mutated later', async () => {
    const logged = await logRecipe('alice-token', {
      recipeId: 'rec_bowl',
      date: '2026-06-10',
      mealType: 'dinner',
      servings: 2,
    })
    expect(logged.status).toBe(201)

    // Simulate the recipe's nutrition changing after the fact. Direct SQL is
    // intentional: even a hostile rewrite of the version row must not change
    // historical day totals.
    await env.DB.prepare('update recipe_versions set calories = 9000, protein_grams = 1 where id = ?')
      .bind(versionId)
      .run()

    const res = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    expect(res.status).toBe(200)
    const body = (await res.json()) as DayResponse
    expect(body.dayLog.totals.calories).toBe(1000)
    const dinner = body.dayLog.meals.find((m) => m.mealType === 'dinner')
    expect(dinner?.entries[0].snapshot.macros.calories).toBe(1000)
  })

  it("never returns another user's entries", async () => {
    await logRecipe('alice-token', { recipeId: 'rec_bowl', date: '2026-06-10', mealType: 'lunch', servings: 1 })

    const res = await app.request('/v1/logs/day?date=2026-06-10', authed('bob-token'), env)
    expect(res.status).toBe(200)
    const body = (await res.json()) as DayResponse
    expect(body.dayLog.userId).toBe('usr_bob')
    expect(body.dayLog.meals).toEqual([])
    expect(body.dayLog.totals.calories).toBe(0)
  })

  it("rejects logging another user's private recipe as not_found", async () => {
    const res = await logRecipe('bob-token', {
      recipeId: 'rec_bowl',
      date: '2026-06-10',
      mealType: 'lunch',
      servings: 1,
    })
    expect(res.status).toBe(404)
  })

  it('rejects fetching and logging a public draft recipe as a stranger', async () => {
    await env.DB.prepare("update recipes set visibility = 'public' where id = 'rec_bowl'").run()

    const fetched = await app.request('/v1/recipes/rec_bowl', authed('bob-token'), env)
    expect(fetched.status).toBe(404)

    const logged = await logRecipe('bob-token', {
      recipeId: 'rec_bowl',
      date: '2026-06-10',
      mealType: 'lunch',
      servings: 1,
    })
    expect(logged.status).toBe(404)
    const body = (await logged.json()) as { error: { code: string } }
    expect(body.error.code).toBe('not_found')
  })

  it('rejects a recipeVersionId that belongs to a different recipe', async () => {
    const otherVersionId = await seedRecipe(env.DB, { recipeId: 'rec_other', ownerUserId: 'usr_alice' })
    const res = await logRecipe('alice-token', {
      recipeId: 'rec_bowl',
      recipeVersionId: otherVersionId,
      date: '2026-06-10',
      mealType: 'lunch',
      servings: 1,
    })
    expect(res.status).toBe(422)
  })

  it('rejects invalid calendar dates when reading a day log', async () => {
    for (const date of INVALID_DATES) {
      const res = await app.request(`/v1/logs/day?date=${encodeURIComponent(date)}`, authed('alice-token'), env)
      expect(res.status).toBe(422)
    }
  })

  it('rejects invalid calendar dates when logging a recipe', async () => {
    for (const date of INVALID_DATES) {
      const res = await logRecipe('alice-token', { recipeId: 'rec_bowl', date, mealType: 'lunch', servings: 1 })
      expect(res.status).toBe(422)
    }
  })

  it('accepts real calendar dates when reading and logging logs', async () => {
    const logged = await logRecipe('alice-token', {
      recipeId: 'rec_bowl',
      date: '2028-02-29',
      mealType: 'lunch',
      servings: 1,
    })
    expect(logged.status).toBe(201)

    const res = await app.request('/v1/logs/day?date=2028-02-29', authed('alice-token'), env)
    expect(res.status).toBe(200)
    const body = (await res.json()) as DayResponse
    expect(body.dayLog.totals.calories).toBe(500)
  })

  it('validates servings and meal type', async () => {
    for (const bad of [
      { recipeId: 'rec_bowl', date: '2026-06-10', mealType: 'lunch', servings: 0 },
      { recipeId: 'rec_bowl', date: '2026-06-10', mealType: 'brunch', servings: 1 },
    ]) {
      const res = await logRecipe('alice-token', bad)
      expect(res.status).toBe(422)
    }
  })

  it('returns the active goal with the day log', async () => {
    await env.DB.prepare(
      "insert into goals (id, user_id, calories, protein_grams, carbs_grams, fat_grams, start_date, created_at, updated_at) values ('goal_1', 'usr_alice', 2200, 160, 220, 70, '2026-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
    ).run()
    const res = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    const body = (await res.json()) as DayResponse
    expect(body.goal?.dailyTargets.calories).toBe(2200)
  })
})
