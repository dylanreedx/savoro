import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

interface ViewerStateDTO {
  isOwner: boolean
  isSaved: boolean
  canFork: boolean
  canLog: boolean
}

interface RecipeResponse {
  recipe: {
    summary: {
      id: string
      ownerUserId: string
      title: string
      visibility: string
      status: string
      currentVersionId: string
      viewerState: ViewerStateDTO
    }
    currentVersion: { id: string; versionNumber: number }
    ingredients: { label: string; sortOrder: number }[]
    steps: { body: string; sortOrder: number }[]
  }
}

interface ErrorResponse {
  error: { code: string; message: string }
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

const VALID_BODY = {
  title: 'Protein Oats',
  description: 'Morning staple.',
  servings: 2,
  perServingMacros: { calories: 420, proteinGrams: 32, carbsGrams: 55, fatGrams: 9 },
  ingredients: [{ label: 'Rolled oats', quantity: 100, unit: 'g' }, { label: 'Pinch of salt' }],
  steps: [{ body: 'Simmer oats in water.' }],
}

/** Creates a recipe owned by `token`'s user, then forces visibility/status. */
async function makeRecipe(token: string, visibility: string, status: string): Promise<string> {
  const res = await app.request('/v1/recipes', authed(token, { method: 'POST', body: JSON.stringify(VALID_BODY) }), env)
  expect(res.status).toBe(201)
  const { recipe } = (await res.json()) as RecipeResponse
  await env.DB.prepare('update recipes set visibility = ?, status = ? where id = ?')
    .bind(visibility, status, recipe.summary.id)
    .run()
  return recipe.summary.id
}

async function getRecipe(token: string, id: string) {
  return app.request(`/v1/recipes/${id}`, authed(token), env)
}

describe('GET /v1/recipes/:id', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires auth', async () => {
    const res = await app.request('/v1/recipes/rec_whatever', {}, env)
    expect(res.status).toBe(401)
  })

  it('returns the full RecipeDetail to the owner of a private draft', async () => {
    const id = await makeRecipe('alice-token', 'private', 'draft')
    const res = await getRecipe('alice-token', id)
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse

    expect(recipe.summary.id).toBe(id)
    expect(recipe.summary.ownerUserId).toBe('usr_alice')
    expect(recipe.summary.title).toBe('Protein Oats')
    expect(recipe.summary.visibility).toBe('private')
    expect(recipe.summary.status).toBe('draft')
    expect(recipe.currentVersion.id).toBe(recipe.summary.currentVersionId)
    expect(recipe.ingredients.map((i) => i.label)).toEqual(['Rolled oats', 'Pinch of salt'])
    expect(recipe.steps.map((s) => s.body)).toEqual(['Simmer oats in water.'])
    expect(recipe.summary.viewerState).toEqual({ isOwner: true, isSaved: false, canFork: true, canLog: true })
  })

  it('owner sees their recipe in every visibility/status combination', async () => {
    for (const visibility of ['private', 'unlisted', 'public']) {
      for (const status of ['draft', 'published', 'archived']) {
        const id = await makeRecipe('alice-token', visibility, status)
        const res = await getRecipe('alice-token', id)
        expect(res.status, `${visibility}/${status}`).toBe(200)
        const { recipe } = (await res.json()) as RecipeResponse
        expect(recipe.summary.viewerState.isOwner).toBe(true)
      }
    }
  })

  it('hides non-visible recipes from strangers as not_found (no existence leak)', async () => {
    const hidden: [string, string][] = [
      ['private', 'draft'],
      ['private', 'published'],
      ['private', 'archived'],
      ['unlisted', 'draft'],
      ['unlisted', 'archived'],
      ['public', 'draft'],
      ['public', 'archived'],
    ]
    for (const [visibility, status] of hidden) {
      const id = await makeRecipe('alice-token', visibility, status)
      const res = await getRecipe('bob-token', id)
      expect(res.status, `${visibility}/${status}`).toBe(404)
      const body = (await res.json()) as ErrorResponse
      expect(body.error.code).toBe('not_found')
    }

    // Identical envelope to a genuinely missing id.
    const missing = await getRecipe('bob-token', 'rec_nope')
    expect(missing.status).toBe(404)
    const missingBody = (await missing.json()) as ErrorResponse
    expect(missingBody.error.code).toBe('not_found')
  })

  it('shows a public published recipe to a stranger with viewer-correct state', async () => {
    const id = await makeRecipe('alice-token', 'public', 'published')
    const res = await getRecipe('bob-token', id)
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse
    expect(recipe.summary.viewerState).toEqual({ isOwner: false, isSaved: false, canFork: true, canLog: true })
    expect(recipe.ingredients).toHaveLength(2)
    expect(recipe.steps).toHaveLength(1)
  })

  it('shows an unlisted published recipe by id (link-reachable), fork but not log for strangers', async () => {
    const id = await makeRecipe('alice-token', 'unlisted', 'published')
    const res = await getRecipe('bob-token', id)
    expect(res.status).toBe(200)
    const { recipe } = (await res.json()) as RecipeResponse
    expect(recipe.summary.viewerState).toEqual({ isOwner: false, isSaved: false, canFork: true, canLog: false })
  })

  it('never leaks email or private data in the fetched DTO', async () => {
    const id = await makeRecipe('alice-token', 'public', 'published')
    const res = await getRecipe('bob-token', id)
    const raw = JSON.stringify(await res.json())
    for (const banned of ['email', 'goal', 'logDate', 'dayLog', 'adherence', 'bodyMetric']) {
      expect(raw).not.toContain(banned)
    }
  })

  it('returns not_found for a missing recipe id', async () => {
    const res = await getRecipe('alice-token', 'rec_missing')
    expect(res.status).toBe(404)
  })
})
