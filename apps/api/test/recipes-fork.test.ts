import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

interface RecipeResponse {
  recipe: {
    summary: {
      id: string
      ownerUserId: string
      slug: string
      title: string
      visibility: string
      status: string
      currentVersionId: string
      forkedFromRecipeId: string | null
      forkedFromVersionId: string | null
      viewerState: { isOwner: boolean; isSaved: boolean; canFork: boolean; canLog: boolean }
    }
    currentVersion: { id: string; recipeId: string; versionNumber: number; title: string; servings: number }
    ingredients: { id: string; recipeVersionId: string; label: string; sortOrder: number }[]
    steps: { id: string; recipeVersionId: string; body: string; sortOrder: number }[]
  }
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

const BODY = {
  title: 'Forkable Bowl',
  description: 'Source recipe.',
  servings: 2,
  perServingMacros: { calories: 520, proteinGrams: 38, carbsGrams: 42, fatGrams: 21, fiberGrams: 7 },
  ingredients: [
    { label: 'Chicken', quantity: 120, unit: 'g' },
    { label: 'Rice', quantity: 100, unit: 'g' },
  ],
  steps: [{ body: 'Cook chicken.' }, { body: 'Assemble bowl.' }],
}

async function createRecipe(token: string) {
  const res = await app.request('/v1/recipes', authed(token, { method: 'POST', body: JSON.stringify(BODY) }), env)
  expect(res.status).toBe(201)
  return (await res.json()) as RecipeResponse
}

async function forkRecipe(token: string, id: string) {
  return app.request(`/v1/recipes/${id}/fork`, authed(token, { method: 'POST' }), env)
}

async function sourceRows(recipeId: string) {
  const recipe = await env.DB.prepare('select * from recipes where id = ?').bind(recipeId).first<Record<string, unknown>>()
  const version = await env.DB.prepare('select * from recipe_versions where recipe_id = ?').bind(recipeId).first<Record<string, unknown>>()
  const ingredients = await env.DB.prepare('select * from recipe_ingredients where recipe_version_id = ? order by sort_order')
    .bind(version?.id)
    .all<Record<string, unknown>>()
  const steps = await env.DB.prepare('select * from recipe_steps where recipe_version_id = ? order by sort_order')
    .bind(version?.id)
    .all<Record<string, unknown>>()
  return { recipe, version, ingredients: ingredients.results, steps: steps.results }
}

describe('POST /v1/recipes/:id/fork', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires auth', async () => {
    const created = await createRecipe('alice-token')
    const res = await app.request(`/v1/recipes/${created.recipe.summary.id}/fork`, { method: 'POST' }, env)
    expect(res.status).toBe(401)
  })

  it('creates a private draft copy with source attribution and copied content', async () => {
    const created = await createRecipe('alice-token')
    await env.DB.prepare("update recipes set visibility = 'public', status = 'published' where id = ?")
      .bind(created.recipe.summary.id)
      .run()

    const res = await forkRecipe('bob-token', created.recipe.summary.id)
    expect(res.status).toBe(201)
    const { recipe } = (await res.json()) as RecipeResponse

    expect(recipe.summary.ownerUserId).toBe('usr_bob')
    expect(recipe.summary.visibility).toBe('private')
    expect(recipe.summary.status).toBe('draft')
    expect(recipe.summary.forkedFromRecipeId).toBe(created.recipe.summary.id)
    expect(recipe.summary.forkedFromVersionId).toBe(created.recipe.currentVersion.id)
    expect(recipe.summary.title).toBe('Forkable Bowl')
    expect(recipe.summary.viewerState).toEqual({ isOwner: true, isSaved: false, canFork: true, canLog: true })

    expect(recipe.currentVersion.id).toBe(recipe.summary.currentVersionId)
    expect(recipe.currentVersion.id).not.toBe(created.recipe.currentVersion.id)
    expect(recipe.currentVersion.recipeId).toBe(recipe.summary.id)
    expect(recipe.currentVersion.versionNumber).toBe(1)
    expect(recipe.ingredients.map((i) => i.label)).toEqual(['Chicken', 'Rice'])
    expect(recipe.ingredients.every((i) => i.recipeVersionId === recipe.currentVersion.id)).toBe(true)
    expect(recipe.steps.map((s) => s.body)).toEqual(['Cook chicken.', 'Assemble bowl.'])
    expect(recipe.steps.every((s) => s.recipeVersionId === recipe.currentVersion.id)).toBe(true)
  })

  it('does not modify the source recipe, version, ingredients, or steps', async () => {
    const created = await createRecipe('alice-token')
    await env.DB.prepare("update recipes set visibility = 'public', status = 'published' where id = ?")
      .bind(created.recipe.summary.id)
      .run()
    const before = await sourceRows(created.recipe.summary.id)

    const res = await forkRecipe('bob-token', created.recipe.summary.id)
    expect(res.status).toBe(201)

    expect(await sourceRows(created.recipe.summary.id)).toEqual(before)
  })

  it('hides private recipes the viewer cannot see as not_found', async () => {
    const created = await createRecipe('alice-token')
    const hidden = await forkRecipe('bob-token', created.recipe.summary.id)
    expect(hidden.status).toBe(404)
    const hiddenBody = (await hidden.json()) as { error: { code: string } }
    expect(hiddenBody.error.code).toBe('not_found')

    const missing = await forkRecipe('bob-token', 'rec_missing')
    expect(missing.status).toBe(404)
    const missingBody = (await missing.json()) as { error: { code: string } }
    expect(missingBody.error.code).toBe('not_found')
  })

  it('can fork an unlisted published recipe by id but not a draft or archived recipe', async () => {
    const unlisted = await createRecipe('alice-token')
    await env.DB.prepare("update recipes set visibility = 'unlisted', status = 'published' where id = ?")
      .bind(unlisted.recipe.summary.id)
      .run()
    expect((await forkRecipe('bob-token', unlisted.recipe.summary.id)).status).toBe(201)

    const draft = await createRecipe('alice-token')
    await env.DB.prepare("update recipes set visibility = 'public', status = 'draft' where id = ?")
      .bind(draft.recipe.summary.id)
      .run()
    expect((await forkRecipe('bob-token', draft.recipe.summary.id)).status).toBe(404)

    const archived = await createRecipe('alice-token')
    await env.DB.prepare("update recipes set visibility = 'public', status = 'archived' where id = ?")
      .bind(archived.recipe.summary.id)
      .run()
    expect((await forkRecipe('bob-token', archived.recipe.summary.id)).status).toBe(404)
  })
})
