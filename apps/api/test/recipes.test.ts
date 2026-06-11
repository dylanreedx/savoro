import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

interface MacroDTO {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  sodiumMilligrams?: number
}

interface RecipeDetailDTO {
  summary: {
    id: string
    ownerUserId: string
    slug: string
    title: string
    description?: string
    visibility: string
    status: string
    currentVersionId: string
    creator: { userId: string; username: string; displayName: string }
    perServingMacros: MacroDTO
    tags: string[]
    viewerState: { isOwner: boolean; isSaved: boolean; canFork: boolean; canLog: boolean }
    createdAt: string
    updatedAt: string
  }
  currentVersion: {
    id: string
    recipeId: string
    versionNumber: number
    title: string
    description?: string
    instructionsMarkdown: string
    servings: number
    perServingMacros: MacroDTO
    createdByUserId: string
    createdAt: string
  }
  ingredients: {
    id: string
    recipeVersionId: string
    foodId: string | null
    servingId: string | null
    quantity: number | null
    unit: string
    label: string
    note: string | null
    sortOrder: number
  }[]
  steps: { id: string; recipeVersionId: string; body: string; sortOrder: number }[]
  provenance: { trustLevel: string; summary: string; attributions: unknown[] }
}

interface RecipeResponse {
  recipe: RecipeDetailDTO
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

const VALID_BODY = {
  title: 'Protein Oats',
  description: 'Morning staple.',
  servings: 2,
  perServingMacros: { calories: 420, proteinGrams: 32, carbsGrams: 55, fatGrams: 9, fiberGrams: 8 },
  ingredients: [
    { label: 'Rolled oats', quantity: 100, unit: 'g' },
    { label: 'Whey protein', quantity: 30, unit: 'g', note: 'vanilla' },
    { label: 'Pinch of salt' },
  ],
  steps: [{ body: 'Simmer oats in water.' }, { body: 'Stir in whey off the heat.' }],
}

async function createRecipe(token: string, body: Record<string, unknown> = VALID_BODY) {
  return app.request('/v1/recipes', authed(token, { method: 'POST', body: JSON.stringify(body) }), env)
}

async function patchRecipe(token: string, id: string, body: Record<string, unknown>) {
  return app.request(`/v1/recipes/${id}`, authed(token, { method: 'PATCH', body: JSON.stringify(body) }), env)
}

describe('recipe create/edit', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires auth', async () => {
    const res = await app.request('/v1/recipes', { method: 'POST', body: JSON.stringify(VALID_BODY) }, env)
    expect(res.status).toBe(401)
  })

  it('creates a private draft with version 1, ingredients, and steps', async () => {
    const res = await createRecipe('alice-token')
    expect(res.status).toBe(201)
    const { recipe } = (await res.json()) as RecipeResponse

    expect(recipe.summary.ownerUserId).toBe('usr_alice')
    expect(recipe.summary.visibility).toBe('private')
    expect(recipe.summary.status).toBe('draft')
    expect(recipe.summary.title).toBe('Protein Oats')
    expect(recipe.summary.description).toBe('Morning staple.')
    expect(recipe.summary.slug).toBe('protein-oats')
    expect(recipe.summary.tags).toEqual([])
    expect(recipe.summary.viewerState).toEqual({ isOwner: true, isSaved: false, canFork: true, canLog: true })
    expect(recipe.summary.perServingMacros).toEqual(VALID_BODY.perServingMacros)

    expect(recipe.currentVersion.id).toBe(recipe.summary.currentVersionId)
    expect(recipe.currentVersion.recipeId).toBe(recipe.summary.id)
    expect(recipe.currentVersion.versionNumber).toBe(1)
    expect(recipe.currentVersion.servings).toBe(2)
    expect(recipe.currentVersion.perServingMacros).toEqual(VALID_BODY.perServingMacros)
    expect(recipe.currentVersion.createdByUserId).toBe('usr_alice')
    expect(recipe.currentVersion.instructionsMarkdown).toBe('1. Simmer oats in water.\n2. Stir in whey off the heat.')

    expect(recipe.ingredients.map((i) => i.label)).toEqual(['Rolled oats', 'Whey protein', 'Pinch of salt'])
    expect(recipe.ingredients.map((i) => i.sortOrder)).toEqual([0, 1, 2])
    expect(recipe.ingredients[1].note).toBe('vanilla')
    expect(recipe.ingredients[2].quantity).toBeNull()
    expect(recipe.ingredients.every((i) => i.recipeVersionId === recipe.currentVersion.id)).toBe(true)

    expect(recipe.steps.map((s) => s.body)).toEqual(['Simmer oats in water.', 'Stir in whey off the heat.'])
    expect(recipe.steps.map((s) => s.sortOrder)).toEqual([0, 1])
    expect(recipe.steps.every((s) => s.recipeVersionId === recipe.currentVersion.id)).toBe(true)

    expect(recipe.provenance.trustLevel).toBe('creator_provided')

    // Persisted, not just echoed.
    const versionCount = await env.DB.prepare('select count(*) as n from recipe_versions where recipe_id = ?')
      .bind(recipe.summary.id)
      .first<{ n: number }>()
    expect(versionCount?.n).toBe(1)
  })

  it('derives the owner from the session, ignoring client-supplied user ids', async () => {
    const res = await createRecipe('alice-token', { ...VALID_BODY, userId: 'usr_bob', ownerUserId: 'usr_bob' })
    expect(res.status).toBe(201)
    const { recipe } = (await res.json()) as RecipeResponse
    expect(recipe.summary.ownerUserId).toBe('usr_alice')
    expect(recipe.summary.creator.userId).toBe('usr_alice')
  })

  it('never leaks email or private data in the recipe DTO', async () => {
    const res = await createRecipe('alice-token')
    const raw = JSON.stringify(await res.json())
    for (const banned of ['email', 'goal', 'logDate', 'dayLog', 'adherence', 'bodyMetric']) {
      expect(raw).not.toContain(banned)
    }
  })

  it('keeps slugs unique per owner', async () => {
    const first = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    const second = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    const bobs = (await (await createRecipe('bob-token')).json()) as RecipeResponse
    expect(first.recipe.summary.slug).toBe('protein-oats')
    expect(second.recipe.summary.slug).toBe('protein-oats-2')
    expect(bobs.recipe.summary.slug).toBe('protein-oats')
  })

  it('rejects invalid create payloads', async () => {
    const bad: Record<string, unknown>[] = [
      { ...VALID_BODY, title: '   ' },
      { ...VALID_BODY, title: undefined },
      { ...VALID_BODY, servings: 0 },
      { ...VALID_BODY, servings: Number.POSITIVE_INFINITY },
      { ...VALID_BODY, perServingMacros: undefined },
      { ...VALID_BODY, perServingMacros: { calories: -1, proteinGrams: 1, carbsGrams: 1, fatGrams: 1 } },
      { ...VALID_BODY, perServingMacros: { calories: 1, proteinGrams: 1, carbsGrams: 1 } },
      { ...VALID_BODY, ingredients: [{ label: '' }] },
      { ...VALID_BODY, ingredients: [{ label: 'Oats', quantity: -2 }] },
      { ...VALID_BODY, ingredients: 'oats' },
      { ...VALID_BODY, steps: [{ body: '  ' }] },
    ]
    for (const body of bad) {
      const res = await createRecipe('alice-token', body)
      expect(res.status).toBe(422)
    }
  })

  it('mutates version 1 in place when editing a draft', async () => {
    const created = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    const recipeId = created.recipe.summary.id
    const v1Id = created.recipe.currentVersion.id

    const res = await patchRecipe('alice-token', recipeId, {
      title: 'Protein Oats v2 Title',
      perServingMacros: { calories: 500, proteinGrams: 40, carbsGrams: 50, fatGrams: 12 },
    })
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse

    expect(recipe.currentVersion.id).toBe(v1Id)
    expect(recipe.currentVersion.versionNumber).toBe(1)
    expect(recipe.currentVersion.title).toBe('Protein Oats v2 Title')
    expect(recipe.summary.perServingMacros.calories).toBe(500)
    // Slug is stable after creation.
    expect(recipe.summary.slug).toBe('protein-oats')

    const versionCount = await env.DB.prepare('select count(*) as n from recipe_versions where recipe_id = ?')
      .bind(recipeId)
      .first<{ n: number }>()
    expect(versionCount?.n).toBe(1)
  })

  it('keeps content not present in a partial draft edit', async () => {
    const created = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    const res = await patchRecipe('alice-token', created.recipe.summary.id, { title: 'Renamed Oats' })
    const { recipe } = (await res.json()) as RecipeResponse

    expect(recipe.currentVersion.title).toBe('Renamed Oats')
    expect(recipe.summary.description).toBe('Morning staple.')
    expect(recipe.ingredients).toHaveLength(3)
    expect(recipe.steps).toHaveLength(2)
    expect(recipe.currentVersion.servings).toBe(2)
  })

  it('creates a new immutable version when editing a published recipe, leaving old logs intact', async () => {
    const created = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    const recipeId = created.recipe.summary.id
    const v1Id = created.recipe.currentVersion.id

    // Log v1, then publish (publish endpoint is SAV-129; set state directly).
    const logged = await app.request(
      '/v1/logs/recipes',
      authed('alice-token', {
        method: 'POST',
        body: JSON.stringify({ recipeId, date: '2026-06-10', mealType: 'breakfast', servings: 1 }),
      }),
      env,
    )
    expect(logged.status).toBe(201)
    await env.DB.prepare("update recipes set status = 'published', visibility = 'public' where id = ?")
      .bind(recipeId)
      .run()

    const res = await patchRecipe('alice-token', recipeId, {
      title: 'Leaner Oats',
      perServingMacros: { calories: 300, proteinGrams: 35, carbsGrams: 30, fatGrams: 5 },
      steps: [{ body: 'Microwave everything.' }],
    })
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse

    expect(recipe.currentVersion.versionNumber).toBe(2)
    expect(recipe.currentVersion.id).not.toBe(v1Id)
    expect(recipe.summary.currentVersionId).toBe(recipe.currentVersion.id)
    expect(recipe.currentVersion.title).toBe('Leaner Oats')
    // Carried over from v1 because the patch omitted them.
    expect(recipe.ingredients).toHaveLength(3)
    expect(recipe.steps).toHaveLength(1)

    // v1 row is untouched: old logs' recipe_version_id still resolves to the original values.
    const v1 = await env.DB.prepare('select title, calories from recipe_versions where id = ?')
      .bind(v1Id)
      .first<{ title: string; calories: number }>()
    expect(v1?.title).toBe('Protein Oats')
    expect(v1?.calories).toBe(420)

    const logRow = await env.DB.prepare('select recipe_version_id from food_log_entries where recipe_id = ?')
      .bind(recipeId)
      .first<{ recipe_version_id: string }>()
    expect(logRow?.recipe_version_id).toBe(v1Id)

    // Day totals still come from the frozen snapshot of v1.
    const day = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    const dayBody = (await day.json()) as { dayLog: { totals: { calories: number } } }
    expect(dayBody.dayLog.totals.calories).toBe(420)
  })

  it('returns not_found for a non-owner PATCH without leaking existence', async () => {
    const created = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    const res = await patchRecipe('bob-token', created.recipe.summary.id, { title: 'Hijacked' })
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('not_found')
  })

  it('returns not_found for a missing recipe', async () => {
    const res = await patchRecipe('alice-token', 'rec_nope', { title: 'Ghost' })
    expect(res.status).toBe(404)
  })

  it('rejects edits to archived recipes', async () => {
    const created = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    await env.DB.prepare("update recipes set status = 'archived' where id = ?").bind(created.recipe.summary.id).run()
    const res = await patchRecipe('alice-token', created.recipe.summary.id, { title: 'Zombie' })
    expect(res.status).toBe(422)
  })

  it('rejects invalid patch payloads', async () => {
    const created = (await (await createRecipe('alice-token')).json()) as RecipeResponse
    for (const body of [{ title: '' }, { servings: -1 }, { steps: [{ body: '' }] }] as Record<string, unknown>[]) {
      const res = await patchRecipe('alice-token', created.recipe.summary.id, body)
      expect(res.status).toBe(422)
    }
  })
})
