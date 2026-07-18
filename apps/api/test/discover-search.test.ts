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
}

interface DiscoverResponse {
  items: RecipeSummaryDTO[]
  nextCursor: string | null
}

interface SearchResultDTO {
  kind: 'recipe' | 'profile' | 'community'
  recipe?: RecipeSummaryDTO
  profile?: unknown
  community?: unknown
}

interface SearchResponse {
  query: string
  results: SearchResultDTO[]
}

interface RecipeResponse {
  recipe: { summary: RecipeSummaryDTO }
}

const BODY = {
  title: 'Recipe',
  description: 'Public recipe search fixture.',
  servings: 2,
  perServingMacros: { calories: 420, proteinGrams: 24, carbsGrams: 48, fatGrams: 14 },
  ingredients: [{ label: 'Ingredient', quantity: 1, unit: 'serving' }],
  steps: [{ body: 'Prepare the recipe.' }],
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

async function createRecipe(token: string, title: string): Promise<string> {
  const response = await app.request(
    '/v1/recipes',
    authed(token, { method: 'POST', body: JSON.stringify({ ...BODY, title }) }),
    env,
  )
  expect(response.status).toBe(201)
  return ((await response.json()) as RecipeResponse).recipe.summary.id
}

async function publishRecipe(token: string, recipeId: string, visibility: 'public' | 'unlisted' = 'public') {
  const response = await app.request(
    `/v1/recipes/${recipeId}/publish`,
    authed(token, { method: 'POST', body: JSON.stringify({ visibility }) }),
    env,
  )
  expect(response.status).toBe(200)
}

async function setPublishedAt(recipeId: string, publishedAt: string) {
  await env.DB.prepare(
    'update recipe_versions set published_at = ? where id = (select current_version_id from recipes where id = ?)',
  )
    .bind(publishedAt, recipeId)
    .run()
}

async function getDiscover(token: string, query: string): Promise<Response> {
  return app.request(`/v1/discover/recipes?${query}`, authed(token), env)
}

async function getSearch(token: string, query: string): Promise<Response> {
  return app.request(`/v1/search?${query}`, authed(token), env)
}

describe('discover and search public recipe surfaces', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires authentication for both public recipe surfaces', async () => {
    expect((await app.request('/v1/discover/recipes?rail=recent', {}, env)).status).toBe(401)
    expect((await app.request('/v1/search?q=bowl&kind=all', {}, env)).status).toBe(401)
  })

  it('only lists public published recipes on every rail and in recipe search', async () => {
    const visible = await createRecipe('alice-token', 'Visible Matrix Bowl')
    await publishRecipe('alice-token', visible)

    const unlisted = await createRecipe('alice-token', 'Unlisted Matrix Bowl')
    await publishRecipe('alice-token', unlisted, 'unlisted')

    const privatePublished = await createRecipe('alice-token', 'Private Matrix Bowl')
    await env.DB.prepare("update recipes set status = 'published' where id = ?").bind(privatePublished).run()

    const publicDraft = await createRecipe('alice-token', 'Draft Matrix Bowl')
    await env.DB.prepare("update recipes set visibility = 'public' where id = ?").bind(publicDraft).run()

    const archived = await createRecipe('alice-token', 'Archived Matrix Bowl')
    await env.DB.prepare("update recipes set visibility = 'public', status = 'archived' where id = ?").bind(archived).run()

    for (const rail of ['featured', 'recent', 'trending']) {
      const response = await getDiscover('bob-token', `rail=${rail}`)
      expect(response.status, rail).toBe(200)
      const body = (await response.json()) as DiscoverResponse
      expect(body.items.map((item) => item.id), rail).toEqual([visible])
      expect(body.items.every((item) => item.visibility === 'public' && item.status === 'published')).toBe(true)
    }

    const search = await getSearch('bob-token', 'q=matrix&kind=recipes')
    expect(search.status).toBe(200)
    const searchBody = (await search.json()) as SearchResponse
    expect(searchBody.results.map((result) => result.recipe?.id)).toEqual([visible])
    expect(searchBody.results.every((result) => result.recipe?.visibility === 'public' && result.recipe.status === 'published')).toBe(true)
  })

  it('validates the discover rail parameter', async () => {
    for (const query of ['', 'rail=', 'rail=popular', 'rail=RECENT']) {
      const response = await getDiscover('bob-token', query)
      expect(response.status, query).toBe(422)
      expect(await response.json()).toMatchObject({ error: { code: 'validation_failed' } })
    }
  })

  it('paginates rails by newest publication time with cookbook-compatible cursors', async () => {
    const oldest = await createRecipe('alice-token', 'Oldest Public Recipe')
    await publishRecipe('alice-token', oldest)
    await setPublishedAt(oldest, '2026-01-01T00:00:00.000Z')
    const middle = await createRecipe('alice-token', 'Middle Public Recipe')
    await publishRecipe('alice-token', middle)
    await setPublishedAt(middle, '2026-01-02T00:00:00.000Z')
    const newest = await createRecipe('alice-token', 'Newest Public Recipe')
    await publishRecipe('alice-token', newest)
    await setPublishedAt(newest, '2026-01-03T00:00:00.000Z')

    const firstResponse = await getDiscover('bob-token', 'rail=recent&limit=2')
    expect(firstResponse.status).toBe(200)
    const first = (await firstResponse.json()) as DiscoverResponse
    expect(first.items.map((item) => item.id)).toEqual([newest, middle])
    expect(first.nextCursor).toEqual(expect.any(String))

    const secondResponse = await getDiscover(
      'bob-token',
      `rail=recent&limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`,
    )
    expect(secondResponse.status).toBe(200)
    const second = (await secondResponse.json()) as DiscoverResponse
    expect(second.items.map((item) => item.id)).toEqual([oldest])
    expect(second.nextCursor).toBeNull()
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(3)
  })

  it('matches recipe titles case-insensitively and does not reveal hidden-title existence', async () => {
    const match = await createRecipe('alice-token', 'Weeknight Sesame Noodles')
    await publishRecipe('alice-token', match)
    const other = await createRecipe('alice-token', 'Tomato Soup')
    await publishRecipe('alice-token', other)
    await createRecipe('alice-token', 'Secret Sesame Draft')

    const response = await getSearch('bob-token', 'q=SeSaMe&kind=recipes')
    expect(response.status).toBe(200)
    const body = (await response.json()) as SearchResponse
    expect(body).toMatchObject({ query: 'SeSaMe' })
    expect(body.results.map((result) => result.recipe?.id)).toEqual([match])

    const hiddenOnly = await getSearch('bob-token', 'q=Secret%20Sesame%20Draft&kind=recipes')
    expect(hiddenOnly.status).toBe(200)
    expect(((await hiddenOnly.json()) as SearchResponse).results).toEqual([])
  })

  it('rejects empty queries and unsupported search kinds', async () => {
    for (const query of ['kind=all', 'q=&kind=all', 'q=%20%20%20&kind=all', 'q=bowl&kind=foods']) {
      const response = await getSearch('bob-token', query)
      expect(response.status, query).toBe(422)
      expect(await response.json()).toMatchObject({ error: { code: 'validation_failed' } })
    }
  })

  it('returns the kind=all contract shape without private cross-user data', async () => {
    const recipeId = await createRecipe('alice-token', 'Privacy Boundary Bowl')
    await publishRecipe('alice-token', recipeId)
    await env.DB.prepare(
      `insert into goals
       (id, user_id, calories, protein_grams, carbs_grams, fat_grams, start_date, created_at, updated_at)
       values ('goal_private_marker', 'usr_alice', 2100, 140, 220, 70, '2026-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
    ).run()
    await env.DB.prepare(
      `insert into food_log_entries
       (id, user_id, log_date, meal_type, item_type, quantity, quantity_unit,
        snapshot_display_name, snapshot_calories, snapshot_protein_grams, snapshot_carbs_grams,
        snapshot_fat_grams, snapshot_captured_at, source_type, privacy_domain, created_at, updated_at)
       values ('log_private_marker', 'usr_alice', '2026-01-01', 'dinner', 'food', 1, 'serving',
        'PRIVATE_LOG_MARKER', 500, 30, 40, 20, '2026-01-01T00:00:00Z', 'manual',
        'private_user_data', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
    ).run()

    const response = await getSearch('bob-token', 'q=boundary&kind=all')
    expect(response.status).toBe(200)
    const body = (await response.json()) as SearchResponse
    expect(body.query).toBe('boundary')
    expect(body.results).toHaveLength(1)
    expect(body.results[0]).toEqual({
      kind: 'recipe',
      recipe: expect.objectContaining({ id: recipeId, visibility: 'public', status: 'published' }),
    })

    const discoverResponse = await getDiscover('bob-token', 'rail=recent')
    expect(discoverResponse.status).toBe(200)
    const discoverBody = (await discoverResponse.json()) as DiscoverResponse
    expect(discoverBody.items.map((item) => item.id)).toContain(recipeId)

    for (const payload of [JSON.stringify(body), JSON.stringify(discoverBody)]) {
      for (const banned of [
        'email',
        'dailyTargets',
        'goal_private_marker',
        'log_private_marker',
        'PRIVATE_LOG_MARKER',
        'private_user_data',
        'usr_alice@example.com',
      ]) {
        expect(payload).not.toContain(banned)
      }
    }

    for (const kind of ['profiles', 'communities']) {
      const empty = await getSearch('bob-token', `q=boundary&kind=${kind}`)
      expect(empty.status).toBe(200)
      expect(await empty.json()).toEqual({ query: 'boundary', results: [] })
    }

    const emailProbe = await getSearch('bob-token', 'q=usr_alice%40example.com&kind=all')
    expect(emailProbe.status).toBe(200)
    expect(((await emailProbe.json()) as SearchResponse).results).toEqual([])
  })
})
