import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

interface RecipeResponse {
  recipe: {
    summary: {
      id: string
      visibility: string
      status: string
      currentVersionId: string
      forkedFromRecipeId: string | null
      forkedFromVersionId: string | null
      viewerState: { isOwner: boolean; isSaved: boolean; canFork: boolean; canLog: boolean }
    }
    currentVersion: {
      id: string
      publishedAt: string | null
    }
  }
}

interface ErrorResponse {
  error: { code: string; message: string }
}

interface LogResponse {
  entry: {
    recipeVersionId: string
    snapshot: {
      displayName: string
      macros: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number }
      sourceLabel: string
      capturedAt: string
    }
  }
}

const BODY = {
  title: 'Lifecycle Bowl',
  servings: 2,
  perServingMacros: { calories: 520, proteinGrams: 38, carbsGrams: 42, fatGrams: 21 },
  ingredients: [{ label: 'Chicken', quantity: 120, unit: 'g' }],
  steps: [{ body: 'Assemble bowl.' }],
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

async function createRecipe(token = 'alice-token'): Promise<RecipeResponse> {
  const res = await app.request('/v1/recipes', authed(token, { method: 'POST', body: JSON.stringify(BODY) }), env)
  expect(res.status).toBe(201)
  return (await res.json()) as RecipeResponse
}

async function lifecycleRequest(
  token: string,
  id: string,
  action: 'publish' | 'unpublish' | 'archive',
  body?: Record<string, unknown>,
) {
  return app.request(
    `/v1/recipes/${id}/${action}`,
    authed(token, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
    env,
  )
}

async function publish(token: string, id: string, visibility: 'public' | 'unlisted') {
  return lifecycleRequest(token, id, 'publish', { visibility })
}

async function getRecipe(token: string, id: string) {
  return app.request(`/v1/recipes/${id}`, authed(token), env)
}

async function logRecipe(token: string, id: string) {
  return app.request(
    '/v1/logs/recipes',
    authed(token, {
      method: 'POST',
      body: JSON.stringify({ recipeId: id, date: '2026-06-10', mealType: 'lunch', servings: 1 }),
    }),
    env,
  )
}

async function forkRecipe(token: string, id: string) {
  return app.request(`/v1/recipes/${id}/fork`, authed(token, { method: 'POST' }), env)
}

describe('recipe publish/unpublish/archive lifecycle', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires authentication for every lifecycle endpoint', async () => {
    const created = await createRecipe()
    for (const action of ['publish', 'unpublish', 'archive'] as const) {
      const res = await app.request(`/v1/recipes/${created.recipe.summary.id}/${action}`, { method: 'POST' }, env)
      expect(res.status, action).toBe(401)
    }
  })

  it('publishes only a draft, validates visibility, and exposes the stored publishedAt', async () => {
    const created = await createRecipe()
    expect(created.recipe.currentVersion.publishedAt).toBeNull()

    const invalidVisibility = await lifecycleRequest('alice-token', created.recipe.summary.id, 'publish', {
      visibility: 'private',
    })
    expect(invalidVisibility.status).toBe(422)

    const res = await publish('alice-token', created.recipe.summary.id, 'public')
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse
    expect(recipe.summary.status).toBe('published')
    expect(recipe.summary.visibility).toBe('public')
    expect(recipe.currentVersion.publishedAt).not.toBeNull()
    expect(Number.isNaN(Date.parse(recipe.currentVersion.publishedAt as string))).toBe(false)

    const stored = await env.DB.prepare('select published_at from recipe_versions where id = ?')
      .bind(recipe.currentVersion.id)
      .first<{ published_at: string | null }>()
    expect(stored?.published_at).toBe(recipe.currentVersion.publishedAt)

    const duplicate = await publish('alice-token', recipe.summary.id, 'unlisted')
    expect(duplicate.status).toBe(422)
    expect(((await duplicate.json()) as ErrorResponse).error.code).toBe('validation_failed')

    const archived = await createRecipe()
    expect((await lifecycleRequest('alice-token', archived.recipe.summary.id, 'archive')).status).toBe(200)
    expect((await publish('alice-token', archived.recipe.summary.id, 'public')).status).toBe(422)
  })

  it('unpublishes only a published recipe back to private draft', async () => {
    const created = await createRecipe()
    expect((await lifecycleRequest('alice-token', created.recipe.summary.id, 'unpublish')).status).toBe(422)
    expect((await publish('alice-token', created.recipe.summary.id, 'public')).status).toBe(200)

    const res = await lifecycleRequest('alice-token', created.recipe.summary.id, 'unpublish')
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse
    expect(recipe.summary.status).toBe('draft')
    expect(recipe.summary.visibility).toBe('private')
    expect(recipe.currentVersion.publishedAt).not.toBeNull()

    expect((await lifecycleRequest('alice-token', created.recipe.summary.id, 'unpublish')).status).toBe(422)
    expect((await lifecycleRequest('alice-token', created.recipe.summary.id, 'archive')).status).toBe(200)
    expect((await lifecycleRequest('alice-token', created.recipe.summary.id, 'unpublish')).status).toBe(422)
  })

  it('archives draft or published recipes but rejects an already archived recipe', async () => {
    const draft = await createRecipe()
    const archivedDraft = await lifecycleRequest('alice-token', draft.recipe.summary.id, 'archive')
    expect(archivedDraft.status).toBe(200)
    expect(((await archivedDraft.json()) as RecipeResponse).recipe.summary.status).toBe('archived')
    expect((await lifecycleRequest('alice-token', draft.recipe.summary.id, 'archive')).status).toBe(422)

    const published = await createRecipe()
    expect((await publish('alice-token', published.recipe.summary.id, 'public')).status).toBe(200)
    const archivedPublished = await lifecycleRequest('alice-token', published.recipe.summary.id, 'archive')
    expect(archivedPublished.status).toBe(200)
    expect(((await archivedPublished.json()) as RecipeResponse).recipe.summary.status).toBe('archived')
  })

  it('is owner-only and gives non-owners the same 404 as a missing recipe', async () => {
    const draft = await createRecipe()
    const published = await createRecipe()
    expect((await publish('alice-token', published.recipe.summary.id, 'public')).status).toBe(200)

    const attempts: { id: string; action: 'publish' | 'unpublish' | 'archive'; body?: Record<string, unknown> }[] = [
      { id: draft.recipe.summary.id, action: 'publish', body: { visibility: 'public' } },
      { id: published.recipe.summary.id, action: 'unpublish' },
      { id: published.recipe.summary.id, action: 'archive' },
    ]
    for (const attempt of attempts) {
      const hidden = await lifecycleRequest('bob-token', attempt.id, attempt.action, attempt.body)
      const missing = await lifecycleRequest('bob-token', 'rec_missing', attempt.action, attempt.body)
      expect(hidden.status, attempt.action).toBe(404)
      expect(missing.status, attempt.action).toBe(404)
      expect((await hidden.json()) as ErrorResponse).toEqual((await missing.json()) as ErrorResponse)
    }
  })

  it('makes public recipes visible, loggable, and forkable, then revokes access without changing old logs or forks', async () => {
    const created = await createRecipe()
    const recipeId = created.recipe.summary.id
    const versionId = created.recipe.currentVersion.id
    expect((await publish('alice-token', recipeId, 'public')).status).toBe(200)

    const visible = await getRecipe('bob-token', recipeId)
    expect(visible.status).toBe(200)
    expect(((await visible.json()) as RecipeResponse).recipe.summary.viewerState).toEqual({
      isOwner: false,
      isSaved: false,
      canFork: true,
      canLog: true,
    })

    const logged = await logRecipe('bob-token', recipeId)
    expect(logged.status).toBe(201)
    const loggedBody = (await logged.json()) as LogResponse
    expect(loggedBody.entry.recipeVersionId).toBe(versionId)
    const forked = await forkRecipe('bob-token', recipeId)
    expect(forked.status).toBe(201)
    const forkedBody = (await forked.json()) as RecipeResponse

    expect((await lifecycleRequest('alice-token', recipeId, 'unpublish')).status).toBe(200)
    expect((await getRecipe('bob-token', recipeId)).status).toBe(404)
    expect((await logRecipe('bob-token', recipeId)).status).toBe(404)
    expect((await forkRecipe('bob-token', recipeId)).status).toBe(404)

    const existingFork = await getRecipe('bob-token', forkedBody.recipe.summary.id)
    expect(existingFork.status).toBe(200)
    const existingForkBody = (await existingFork.json()) as RecipeResponse
    expect(existingForkBody.recipe.summary.forkedFromRecipeId).toBe(recipeId)
    expect(existingForkBody.recipe.summary.forkedFromVersionId).toBe(versionId)

    expect((await publish('alice-token', recipeId, 'public')).status).toBe(200)
    expect((await getRecipe('bob-token', recipeId)).status).toBe(200)
    expect((await lifecycleRequest('alice-token', recipeId, 'archive')).status).toBe(200)
    expect((await getRecipe('bob-token', recipeId)).status).toBe(404)
    expect((await logRecipe('bob-token', recipeId)).status).toBe(404)
    expect((await forkRecipe('bob-token', recipeId)).status).toBe(404)

    const day = await app.request('/v1/logs/day?date=2026-06-10', authed('bob-token'), env)
    expect(day.status).toBe(200)
    const dayBody = (await day.json()) as {
      dayLog: { meals: { entries: LogResponse['entry'][] }[]; totals: { calories: number } }
    }
    expect(dayBody.dayLog.meals[0].entries[0].recipeVersionId).toBe(versionId)
    expect(dayBody.dayLog.meals[0].entries[0].snapshot).toEqual(loggedBody.entry.snapshot)
    expect(dayBody.dayLog.totals.calories).toBe(520)
  })

  it('makes unlisted published recipes link-visible and forkable but not loggable to strangers', async () => {
    const created = await createRecipe()
    expect((await publish('alice-token', created.recipe.summary.id, 'unlisted')).status).toBe(200)

    const visible = await getRecipe('bob-token', created.recipe.summary.id)
    expect(visible.status).toBe(200)
    expect(((await visible.json()) as RecipeResponse).recipe.summary.viewerState).toEqual({
      isOwner: false,
      isSaved: false,
      canFork: true,
      canLog: false,
    })
    expect((await forkRecipe('bob-token', created.recipe.summary.id)).status).toBe(201)
    expect((await logRecipe('bob-token', created.recipe.summary.id)).status).toBe(404)
  })
})
