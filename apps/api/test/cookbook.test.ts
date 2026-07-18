import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

interface RecipeSummaryDTO {
  id: string
  ownerUserId: string
  title: string
  visibility: 'private' | 'unlisted' | 'public'
  status: 'draft' | 'published' | 'archived'
  viewerState: { isOwner: boolean; isSaved: boolean; canFork: boolean; canLog: boolean }
  createdAt: string
  updatedAt: string
}

interface RecipeResponse {
  recipe: { summary: RecipeSummaryDTO }
}

interface CookbookResponse {
  items: RecipeSummaryDTO[]
  nextCursor: string | null
}

interface ErrorResponse {
  error: { code: string; message: string }
}

const BODY = {
  title: 'Cookbook Recipe',
  description: 'A recipe description.',
  servings: 2,
  perServingMacros: { calories: 450, proteinGrams: 30, carbsGrams: 50, fatGrams: 14 },
  ingredients: [{ label: 'Ingredient', quantity: 1, unit: 'serving' }],
  steps: [{ body: 'Prepare the recipe.' }],
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

async function createRecipe(token: string, title: string): Promise<string> {
  const res = await app.request(
    '/v1/recipes',
    authed(token, { method: 'POST', body: JSON.stringify({ ...BODY, title }) }),
    env,
  )
  expect(res.status).toBe(201)
  return ((await res.json()) as RecipeResponse).recipe.summary.id
}

async function publishRecipe(token: string, recipeId: string, visibility: 'public' | 'unlisted' = 'public') {
  const res = await app.request(
    `/v1/recipes/${recipeId}/publish`,
    authed(token, { method: 'POST', body: JSON.stringify({ visibility }) }),
    env,
  )
  expect(res.status).toBe(200)
}

async function saveRecipe(token: string, recipeId: string) {
  return app.request(`/v1/recipes/${recipeId}/save`, authed(token, { method: 'POST' }), env)
}

async function unsaveRecipe(token: string, recipeId: string) {
  return app.request(`/v1/recipes/${recipeId}/save`, authed(token, { method: 'DELETE' }), env)
}

async function getRecipe(token: string, recipeId: string) {
  return app.request(`/v1/recipes/${recipeId}`, authed(token), env)
}

async function getCookbook(token: string, list: 'mine' | 'saved' | 'drafts') {
  return app.request(`/v1/cookbook/${list}`, authed(token), env)
}

async function cookbookBody(token: string, list: 'mine' | 'saved' | 'drafts'): Promise<CookbookResponse> {
  const res = await getCookbook(token, list)
  expect(res.status).toBe(200)
  return (await res.json()) as CookbookResponse
}

describe('cookbook save and lists', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
    await seedUser(env.DB, 'usr_carla', 'carla-token')
  })

  it('requires the session user for save, unsave, and every cookbook list', async () => {
    for (const [path, method] of [
      ['/v1/recipes/rec_missing/save', 'POST'],
      ['/v1/recipes/rec_missing/save', 'DELETE'],
      ['/v1/cookbook/mine', 'GET'],
      ['/v1/cookbook/saved', 'GET'],
      ['/v1/cookbook/drafts', 'GET'],
    ] as const) {
      const res = await app.request(path, { method }, env)
      expect(res.status, `${method} ${path}`).toBe(401)
    }
  })

  it('round-trips save and unsave and reflects real isSaved state in recipe detail', async () => {
    const recipeId = await createRecipe('alice-token', 'Round Trip Bowl')
    await publishRecipe('alice-token', recipeId)

    const before = (await (await getRecipe('bob-token', recipeId)).json()) as RecipeResponse
    expect(before.recipe.summary.viewerState.isSaved).toBe(false)

    expect((await saveRecipe('bob-token', recipeId)).status).toBe(204)
    const savedDetail = (await (await getRecipe('bob-token', recipeId)).json()) as RecipeResponse
    expect(savedDetail.recipe.summary.viewerState.isSaved).toBe(true)

    const saved = await cookbookBody('bob-token', 'saved')
    expect(saved.nextCursor).toBeNull()
    expect(saved.items.map((item) => item.id)).toEqual([recipeId])
    expect(saved.items[0].viewerState.isSaved).toBe(true)
    expect(saved.items[0]).not.toHaveProperty('currentVersion')
    expect(saved.items[0]).not.toHaveProperty('ingredients')
    expect(saved.items[0]).not.toHaveProperty('steps')
    expect(saved.items[0]).not.toHaveProperty('provenance')
    for (const banned of ['email', 'goal', 'logDate', 'dayLog', 'bodyMetric']) {
      expect(JSON.stringify(saved)).not.toContain(banned)
    }

    expect((await unsaveRecipe('bob-token', recipeId)).status).toBe(204)
    expect((await cookbookBody('bob-token', 'saved')).items).toEqual([])
    const unsavedDetail = (await (await getRecipe('bob-token', recipeId)).json()) as RecipeResponse
    expect(unsavedDetail.recipe.summary.viewerState.isSaved).toBe(false)
  })

  it('allows saving owner-visible and published public/unlisted recipes but does not leak hidden recipes', async () => {
    const ownDraft = await createRecipe('bob-token', 'Own Draft')
    expect((await saveRecipe('bob-token', ownDraft)).status).toBe(204)

    const unlisted = await createRecipe('alice-token', 'Unlisted Recipe')
    await publishRecipe('alice-token', unlisted, 'unlisted')
    expect((await saveRecipe('bob-token', unlisted)).status).toBe(204)

    const privateDraft = await createRecipe('alice-token', 'Private Draft')
    const publicDraft = await createRecipe('alice-token', 'Public Draft')
    await env.DB.prepare("update recipes set visibility = 'public' where id = ?").bind(publicDraft).run()
    const privatePublished = await createRecipe('alice-token', 'Private Published')
    await env.DB.prepare("update recipes set status = 'published' where id = ?").bind(privatePublished).run()
    const archived = await createRecipe('alice-token', 'Archived Recipe')
    await env.DB.prepare("update recipes set visibility = 'public', status = 'archived' where id = ?").bind(archived).run()

    for (const hiddenId of [privateDraft, publicDraft, privatePublished, archived]) {
      const hidden = await saveRecipe('bob-token', hiddenId)
      const missing = await saveRecipe('bob-token', 'rec_missing')
      expect(hidden.status, hiddenId).toBe(404)
      expect((await hidden.json()) as ErrorResponse).toEqual((await missing.json()) as ErrorResponse)
    }
  })

  it('is idempotent per user and isolates saves and unsaves across users', async () => {
    const recipeId = await createRecipe('alice-token', 'Shared Recipe')
    await publishRecipe('alice-token', recipeId)

    expect((await saveRecipe('bob-token', recipeId)).status).toBe(204)
    expect((await saveRecipe('bob-token', recipeId)).status).toBe(204)
    const count = await env.DB.prepare('select count(*) as n from saved_recipes where user_id = ? and recipe_id = ?')
      .bind('usr_bob', recipeId)
      .first<{ n: number }>()
    expect(count?.n).toBe(1)

    const carlaDetail = (await (await getRecipe('carla-token', recipeId)).json()) as RecipeResponse
    expect(carlaDetail.recipe.summary.viewerState.isSaved).toBe(false)
    expect((await cookbookBody('carla-token', 'saved')).items).toEqual([])

    // Unsave is an idempotent no-op for a viewer who has no matching row.
    expect((await unsaveRecipe('carla-token', recipeId)).status).toBe(204)
    expect((await cookbookBody('bob-token', 'saved')).items.map((item) => item.id)).toEqual([recipeId])
    expect((await unsaveRecipe('bob-token', recipeId)).status).toBe(204)
    expect((await unsaveRecipe('bob-token', recipeId)).status).toBe(204)
  })

  it('lists own recipes in every status and own drafts newest first as summary DTOs', async () => {
    const oldDraft = await createRecipe('alice-token', 'Old Draft')
    const unpublishedDraft = await createRecipe('alice-token', 'Unpublished Draft')
    await publishRecipe('alice-token', unpublishedDraft)
    const unpublish = await app.request(`/v1/recipes/${unpublishedDraft}/unpublish`, authed('alice-token', { method: 'POST' }), env)
    expect(unpublish.status).toBe(200)
    const published = await createRecipe('alice-token', 'Published Recipe')
    await publishRecipe('alice-token', published)
    const archived = await createRecipe('alice-token', 'Archived Own Recipe')
    const archive = await app.request(`/v1/recipes/${archived}/archive`, authed('alice-token', { method: 'POST' }), env)
    expect(archive.status).toBe(200)
    await createRecipe('bob-token', 'Bobs Recipe')

    const createdTimes: [string, string][] = [
      [oldDraft, '2026-01-01T00:00:00.000Z'],
      [unpublishedDraft, '2026-01-02T00:00:00.000Z'],
      [published, '2026-01-03T00:00:00.000Z'],
      [archived, '2026-01-04T00:00:00.000Z'],
    ]
    for (const [id, createdAt] of createdTimes) {
      await env.DB.prepare('update recipes set created_at = ? where id = ?').bind(createdAt, id).run()
    }

    // Saving an own draft is allowed, and list viewer state remains viewer-correct.
    expect((await saveRecipe('alice-token', unpublishedDraft)).status).toBe(204)

    const mine = await cookbookBody('alice-token', 'mine')
    expect(mine.items.map((item) => item.id)).toEqual([archived, published, unpublishedDraft, oldDraft])
    expect([...new Set(mine.items.map((item) => item.status))].sort()).toEqual(['archived', 'draft', 'published'])
    expect(mine.items.every((item) => item.viewerState.isOwner)).toBe(true)
    expect(mine.items.find((item) => item.id === unpublishedDraft)?.viewerState.isSaved).toBe(true)

    const drafts = await cookbookBody('alice-token', 'drafts')
    expect(drafts.items.map((item) => item.id)).toEqual([unpublishedDraft, oldDraft])
    for (const item of [...mine.items, ...drafts.items]) {
      expect(item).not.toHaveProperty('ingredients')
      expect(item).not.toHaveProperty('currentVersion')
    }
  })

  it('lists saved visible recipes newest-saved first and drops rows whose recipes later become hidden', async () => {
    const publicRecipe = await createRecipe('alice-token', 'Public Saved')
    await publishRecipe('alice-token', publicRecipe)
    const unlistedRecipe = await createRecipe('alice-token', 'Unlisted Saved')
    await publishRecipe('alice-token', unlistedRecipe, 'unlisted')

    expect((await saveRecipe('bob-token', publicRecipe)).status).toBe(204)
    expect((await saveRecipe('bob-token', unlistedRecipe)).status).toBe(204)
    await env.DB.prepare('update saved_recipes set created_at = ? where user_id = ? and recipe_id = ?')
      .bind('2026-01-01T00:00:00.000Z', 'usr_bob', publicRecipe)
      .run()
    await env.DB.prepare('update saved_recipes set created_at = ? where user_id = ? and recipe_id = ?')
      .bind('2026-01-02T00:00:00.000Z', 'usr_bob', unlistedRecipe)
      .run()

    expect((await cookbookBody('bob-token', 'saved')).items.map((item) => item.id)).toEqual([
      unlistedRecipe,
      publicRecipe,
    ])

    const unpublish = await app.request(`/v1/recipes/${publicRecipe}/unpublish`, authed('alice-token', { method: 'POST' }), env)
    expect(unpublish.status).toBe(200)
    expect((await cookbookBody('bob-token', 'saved')).items.map((item) => item.id)).toEqual([unlistedRecipe])

    // Visibility filtering does not destroy the viewer's row; it can be removed
    // explicitly even while hidden.
    const stored = await env.DB.prepare('select count(*) as n from saved_recipes where user_id = ? and recipe_id = ?')
      .bind('usr_bob', publicRecipe)
      .first<{ n: number }>()
    expect(stored?.n).toBe(1)
    expect((await unsaveRecipe('bob-token', publicRecipe)).status).toBe(204)

    const archive = await app.request(`/v1/recipes/${unlistedRecipe}/archive`, authed('alice-token', { method: 'POST' }), env)
    expect(archive.status).toBe(200)
    expect((await cookbookBody('bob-token', 'saved')).items).toEqual([])
  })
})
