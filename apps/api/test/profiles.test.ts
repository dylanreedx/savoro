import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedRecipe, seedUser } from './seed'

interface UserProfileDTO {
  userId: string
  username: string | null
  displayName: string
  bio: string | null
  avatarUrl: string | null
  coverImageUrl: string | null
  websiteUrl: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  visibility: 'private' | 'public'
  createdAt: string
  updatedAt: string
}

interface RecipeSummaryDTO {
  id: string
  visibility: 'private' | 'unlisted' | 'public'
  status: 'draft' | 'published' | 'archived'
  creator: { userId: string; username: string; displayName: string; avatarUrl?: string }
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  }
}

function getMe(token: string) {
  return app.request('/v1/me', authed(token), env)
}

function patchProfile(token: string, body: unknown) {
  return app.request(
    '/v1/me/profile',
    authed(token, { method: 'PATCH', body: JSON.stringify(body) }),
    env,
  )
}

async function makePublicProfile(token: string, username: string, displayName: string): Promise<void> {
  const response = await patchProfile(token, { username, displayName, visibility: 'public' })
  expect(response.status).toBe(200)
}

function collectKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found)
  } else if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      found.add(key)
      collectKeys(nested, found)
    }
  }
  return found
}

describe('profiles and usernames', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires authentication for every profile endpoint', async () => {
    for (const [path, method] of [
      ['/v1/me', 'GET'],
      ['/v1/me/profile', 'PATCH'],
      ['/v1/profiles/alice', 'GET'],
      ['/v1/profiles/alice/recipes', 'GET'],
    ] as const) {
      const response = await app.request(path, { method }, env)
      expect(response.status, `${method} ${path}`).toBe(401)
    }
  })

  it('round-trips the authenticated user profile through PATCH and GET /v1/me', async () => {
    const initial = await getMe('alice-token')
    expect(initial.status).toBe(200)
    expect(await initial.json()).toMatchObject({
      user: { id: 'usr_alice', email: 'usr_alice@example.com' },
      profile: {
        userId: 'usr_alice',
        username: null,
        displayName: 'usr_alice',
        bio: null,
        avatarUrl: null,
        visibility: 'private',
      },
      settings: {},
    })

    const update = {
      username: 'alice-eats_2',
      displayName: 'Alice Example',
      bio: 'Weeknight recipes.',
      avatarUrl: 'https://cdn.example.test/alice.jpg',
      websiteUrl: 'https://alice.example.test',
      instagramUrl: 'https://instagram.com/alice',
      tiktokUrl: null,
      visibility: 'public',
    }
    const patched = await patchProfile('alice-token', update)
    expect(patched.status).toBe(200)
    const patchedBody = (await patched.json()) as { profile: UserProfileDTO }
    expect(patchedBody.profile).toMatchObject(update)
    expect(patchedBody.profile).toMatchObject({
      userId: 'usr_alice',
      coverImageUrl: null,
      websiteUrl: update.websiteUrl,
      instagramUrl: update.instagramUrl,
      tiktokUrl: null,
    })

    const fetched = await getMe('alice-token')
    expect(fetched.status).toBe(200)
    const fetchedBody = (await fetched.json()) as {
      user: { id: string; email: string }
      profile: UserProfileDTO
      settings: Record<string, never>
    }
    expect(fetchedBody.user).toMatchObject({ id: 'usr_alice', email: 'usr_alice@example.com' })
    expect(fetchedBody.profile).toEqual(patchedBody.profile)
    expect(fetchedBody.settings).toEqual({})
  })

  it('returns validation_failed for invalid profile fields without partially updating', async () => {
    const invalidBodies: unknown[] = [
      {},
      { username: 'UPPERCASE' },
      { username: 'ab' },
      { username: '-starts-with-punctuation' },
      { username: 'contains spaces' },
      { displayName: '   ' },
      { bio: 'x'.repeat(301) },
      { avatarUrl: 'not a URL' },
      { links: [] },
      { websiteUrl: 'ftp://example.test' },
      { visibility: 'unlisted' },
    ]

    for (const body of invalidBodies) {
      const response = await patchProfile('alice-token', body)
      expect(response.status, JSON.stringify(body)).toBe(422)
      expect(await response.json()).toMatchObject({ error: { code: 'validation_failed' } })
    }

    const me = (await (await getMe('alice-token')).json()) as { profile: UserProfileDTO }
    expect(me.profile).toMatchObject({ username: null, displayName: 'usr_alice', visibility: 'private' })
  })

  it('enforces unique usernames and reports conflicts as validation_failed', async () => {
    await makePublicProfile('alice-token', 'shared-name', 'Alice')

    const conflict = await patchProfile('bob-token', { username: 'shared-name' })
    expect(conflict.status).toBe(422)
    expect(await conflict.json()).toMatchObject({ error: { code: 'validation_failed' } })

    const bob = (await (await getMe('bob-token')).json()) as { profile: UserProfileDTO }
    expect(bob.profile.username).toBeNull()
  })

  it('returns a contract-shaped public profile with the tested private-data denylist', async () => {
    await makePublicProfile('alice-token', 'alice-public', 'Alice Public')
    await env.DB.prepare(
      `insert into goals
       (id, user_id, calories, protein_grams, carbs_grams, fat_grams, start_date, created_at, updated_at)
       values ('goal_private_marker', 'usr_alice', 2000, 120, 220, 70, '2026-01-01',
               '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
    ).run()
    await env.DB.prepare(
      `insert into food_log_entries
       (id, user_id, log_date, meal_type, item_type, food_id, quantity, quantity_unit,
        snapshot_display_name, snapshot_calories, snapshot_protein_grams, snapshot_carbs_grams,
        snapshot_fat_grams, snapshot_captured_at, source_type, privacy_domain, created_at, updated_at)
       values ('log_private_marker', 'usr_alice', '2026-01-01', 'dinner', 'food', 'manual_food', 1, 'serving',
        'PRIVATE_LOG_MARKER', 500, 30, 40, 20, '2026-01-01T00:00:00Z', 'manual',
        'private_user_data', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
    ).run()

    const response = await app.request('/v1/profiles/alice-public', authed('bob-token'), env)
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      profile: UserProfileDTO
      isSelf: boolean
      followState: string
      publicRecipes: RecipeSummaryDTO[]
    }
    expect(body).toMatchObject({
      profile: {
        userId: 'usr_alice',
        username: 'alice-public',
        displayName: 'Alice Public',
        visibility: 'public',
      },
      isSelf: false,
      followState: 'none',
      publicRecipes: [],
    })

    const keys = collectKeys(body)
    for (const denied of ['email', 'goal', 'goals', 'log', 'logs', 'bodyMetric', 'bodyMetrics', 'dayProgress', 'adherence']) {
      expect(keys, denied).not.toContain(denied)
    }
    const raw = JSON.stringify(body)
    for (const marker of ['usr_alice@example.com', 'goal_private_marker', 'log_private_marker', 'PRIVATE_LOG_MARKER']) {
      expect(raw).not.toContain(marker)
    }
  })

  it('does not reveal private or missing profiles, including through their recipe list', async () => {
    await patchProfile('alice-token', { username: 'alice-private', visibility: 'private' })

    for (const path of [
      '/v1/profiles/alice-private',
      '/v1/profiles/alice-private/recipes',
      '/v1/profiles/missing-profile',
      '/v1/profiles/missing-profile/recipes',
    ]) {
      const response = await app.request(path, authed('bob-token'), env)
      expect(response.status, path).toBe(404)
      expect(await response.json()).toMatchObject({ error: { code: 'not_found' } })
    }
  })

  it('lists only that profile owner’s public published recipes with pagination and real creator usernames', async () => {
    await patchProfile('alice-token', {
      username: 'alice-recipes',
      displayName: 'Alice Recipes',
      avatarUrl: 'https://cdn.example.test/alice.jpg',
      visibility: 'public',
    })
    await makePublicProfile('bob-token', 'bob-recipes', 'Bob Recipes')

    const visibleOlder = await seedRecipe(env.DB, {
      recipeId: 'rec_alice_visible_older',
      ownerUserId: 'usr_alice',
      visibility: 'public',
      title: 'Older Public Recipe',
    })
    const visibleNewer = await seedRecipe(env.DB, {
      recipeId: 'rec_alice_visible_newer',
      ownerUserId: 'usr_alice',
      visibility: 'public',
      title: 'Newer Public Recipe',
    })
    const unlisted = await seedRecipe(env.DB, {
      recipeId: 'rec_alice_unlisted', ownerUserId: 'usr_alice', visibility: 'unlisted',
    })
    const privateRecipe = await seedRecipe(env.DB, {
      recipeId: 'rec_alice_private', ownerUserId: 'usr_alice', visibility: 'private',
    })
    const publicDraft = await seedRecipe(env.DB, {
      recipeId: 'rec_alice_draft', ownerUserId: 'usr_alice', visibility: 'public',
    })
    const archived = await seedRecipe(env.DB, {
      recipeId: 'rec_alice_archived', ownerUserId: 'usr_alice', visibility: 'public',
    })
    const bobs = await seedRecipe(env.DB, {
      recipeId: 'rec_bob_visible', ownerUserId: 'usr_bob', visibility: 'public',
    })

    for (const [versionId, recipeId, status, publishedAt] of [
      [visibleOlder, 'rec_alice_visible_older', 'published', '2026-01-01T00:00:00Z'],
      [visibleNewer, 'rec_alice_visible_newer', 'published', '2026-01-02T00:00:00Z'],
      [unlisted, 'rec_alice_unlisted', 'published', '2026-01-03T00:00:00Z'],
      [privateRecipe, 'rec_alice_private', 'published', '2026-01-04T00:00:00Z'],
      [publicDraft, 'rec_alice_draft', 'draft', null],
      [archived, 'rec_alice_archived', 'archived', '2026-01-05T00:00:00Z'],
      [bobs, 'rec_bob_visible', 'published', '2026-01-06T00:00:00Z'],
    ] as const) {
      await env.DB.prepare('update recipes set status = ? where id = ?').bind(status, recipeId).run()
      await env.DB.prepare('update recipe_versions set published_at = ? where id = ?').bind(publishedAt, versionId).run()
    }

    const firstResponse = await app.request(
      '/v1/profiles/alice-recipes/recipes?limit=1',
      authed('bob-token'),
      env,
    )
    expect(firstResponse.status).toBe(200)
    const first = (await firstResponse.json()) as { items: RecipeSummaryDTO[]; nextCursor: string | null }
    expect(first.items.map((item) => item.id)).toEqual(['rec_alice_visible_newer'])
    expect(first.nextCursor).toEqual(expect.any(String))
    expect(first.items[0].creator).toMatchObject({
      userId: 'usr_alice',
      username: 'alice-recipes',
      displayName: 'Alice Recipes',
      avatarUrl: 'https://cdn.example.test/alice.jpg',
    })

    const secondResponse = await app.request(
      `/v1/profiles/alice-recipes/recipes?limit=1&cursor=${encodeURIComponent(first.nextCursor!)}`,
      authed('bob-token'),
      env,
    )
    expect(secondResponse.status).toBe(200)
    const second = (await secondResponse.json()) as { items: RecipeSummaryDTO[]; nextCursor: string | null }
    expect(second.items.map((item) => item.id)).toEqual(['rec_alice_visible_older'])
    expect(second.nextCursor).toBeNull()

    const publicProfile = await app.request('/v1/profiles/alice-recipes', authed('bob-token'), env)
    const profileBody = (await publicProfile.json()) as { publicRecipes: RecipeSummaryDTO[] }
    expect(profileBody.publicRecipes.map((item) => item.id)).toEqual([
      'rec_alice_visible_newer',
      'rec_alice_visible_older',
    ])

    // Onboarding users can already own recipes. Until they choose a username,
    // recipe links keep the existing non-email user-id fallback.
    await env.DB.prepare("update users set username = null where id = 'usr_bob'").run()
    const bobRecipe = await app.request('/v1/recipes/rec_bob_visible', authed('alice-token'), env)
    expect(bobRecipe.status).toBe(200)
    const bobBody = (await bobRecipe.json()) as { recipe: { summary: RecipeSummaryDTO } }
    expect(bobBody.recipe.summary.creator.username).toBe('usr_bob')
  })
})
