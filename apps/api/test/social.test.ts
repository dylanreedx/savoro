import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedRecipe, seedUser } from './seed'

interface RelationshipDTO {
  id: string
  actorUserId: string
  targetUserId: string
  type: 'follow' | 'friend_request' | 'friend'
  status: 'pending' | 'accepted'
  createdAt: string
  updatedAt: string
}

interface FriendDTO {
  userId: string
  username: string
  displayName: string
  visibility: 'private' | 'public'
}

interface ActivityDTO {
  id: string
  actor: { userId: string; username: string; displayName: string }
  type: 'recipe_published' | 'recipe_forked'
  recipe: {
    id: string
    visibility: 'private' | 'unlisted' | 'public'
    status: 'draft' | 'published' | 'archived'
  }
  community: null
  visibility: 'public'
  createdAt: string
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

function request(token: string, path: string, method = 'GET', body?: unknown) {
  return app.request(
    path,
    authed(token, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  )
}

async function makeProfile(userId: string, username: string, visibility: 'private' | 'public') {
  await env.DB.prepare(
    'update users set username = ?, display_name = ?, profile_visibility = ? where id = ?',
  )
    .bind(username, username, visibility, userId)
    .run()
}

async function requestFriend(
  requesterToken: string,
  targetUserId: string,
): Promise<{ response: Response; relationship: RelationshipDTO }> {
  const response = await request(requesterToken, '/v1/friends/requests', 'POST', { targetUserId })
  const body = (await response.clone().json()) as { relationship: RelationshipDTO }
  return { response, relationship: body.relationship }
}

async function becomeFriends(requesterToken: string, targetToken: string, targetUserId: string) {
  const created = await requestFriend(requesterToken, targetUserId)
  expect(created.response.status).toBe(201)
  const accepted = await request(
    targetToken,
    `/v1/friends/requests/${created.relationship.id}/accept`,
    'POST',
  )
  expect(accepted.status).toBe(200)
  return created.relationship.id
}

async function seedPublishedRecipe(options: {
  recipeId: string
  ownerUserId: string
  visibility: 'private' | 'unlisted' | 'public'
  status?: 'draft' | 'published'
  publishedAt: string
  forkedFromRecipeId?: string
}) {
  const versionId = await seedRecipe(env.DB, {
    recipeId: options.recipeId,
    ownerUserId: options.ownerUserId,
    visibility: options.visibility,
    title: options.recipeId,
  })
  await env.DB.prepare(
    `update recipes
     set status = ?, forked_from_recipe_id = ?, forked_from_version_id = ?
     where id = ?`,
  )
    .bind(
      options.status ?? 'published',
      options.forkedFromRecipeId ?? null,
      options.forkedFromRecipeId ? `rcv_${options.forkedFromRecipeId}_v1` : null,
      options.recipeId,
    )
    .run()
  await env.DB.prepare('update recipe_versions set published_at = ? where id = ?')
    .bind(options.publishedAt, versionId)
    .run()
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

describe('follows, friends, and activity', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
    await seedUser(env.DB, 'usr_charlie', 'charlie-token')
    await seedUser(env.DB, 'usr_dana', 'dana-token')
    await makeProfile('usr_alice', 'alice', 'public')
    await makeProfile('usr_bob', 'bob', 'public')
    await makeProfile('usr_charlie', 'charlie', 'public')
    await makeProfile('usr_dana', 'dana-private', 'private')
  })

  it('requires authentication on every social endpoint', async () => {
    for (const [path, method] of [
      ['/v1/users/usr_bob/follow', 'POST'],
      ['/v1/users/usr_bob/follow', 'DELETE'],
      ['/v1/friends/requests', 'POST'],
      ['/v1/friends/requests/request-id/accept', 'POST'],
      ['/v1/friends/requests/request-id/decline', 'POST'],
      ['/v1/friends', 'GET'],
      ['/v1/activity?scope=friends', 'GET'],
    ] as const) {
      const response = await app.request(path, { method }, env)
      expect(response.status, `${method} ${path}`).toBe(401)
    }
  })

  it('follows and unfollows idempotently and updates the viewer-scoped public profile state', async () => {
    const initial = await request('alice-token', '/v1/profiles/bob')
    expect(initial.status).toBe(200)
    expect(await initial.json()).toMatchObject({ followState: 'none' })

    const first = await request('alice-token', '/v1/users/usr_bob/follow', 'POST')
    const duplicate = await request('alice-token', '/v1/users/usr_bob/follow', 'POST')
    expect(first.status).toBe(204)
    expect(duplicate.status).toBe(204)

    const count = await env.DB.prepare(
      "select count(*) as count from follows where follower_user_id = 'usr_alice' and followed_user_id = 'usr_bob'",
    ).first<{ count: number }>()
    expect(count?.count).toBe(1)
    expect(await (await request('alice-token', '/v1/profiles/bob')).json()).toMatchObject({
      followState: 'following',
    })
    expect(await (await request('charlie-token', '/v1/profiles/bob')).json()).toMatchObject({
      followState: 'none',
    })

    const removed = await request('alice-token', '/v1/users/usr_bob/follow', 'DELETE')
    const missing = await request('alice-token', '/v1/users/usr_bob/follow', 'DELETE')
    expect(removed.status).toBe(204)
    expect(missing.status).toBe(204)
    expect(await (await request('alice-token', '/v1/profiles/bob')).json()).toMatchObject({
      followState: 'none',
    })
  })

  it('rejects self-follow with validation_failed', async () => {
    const response = await request('alice-token', '/v1/users/usr_alice/follow', 'POST')
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ error: { code: 'validation_failed' } })
  })

  it('handles duplicate friend requests idempotently and accepts only as the target user', async () => {
    const first = await requestFriend('alice-token', 'usr_bob')
    const duplicate = await requestFriend('alice-token', 'usr_bob')
    expect(first.response.status).toBe(201)
    expect(duplicate.response.status).toBe(200)
    expect(duplicate.relationship).toEqual(first.relationship)
    expect(first.relationship).toMatchObject({
      actorUserId: 'usr_alice',
      targetUserId: 'usr_bob',
      type: 'friend_request',
      status: 'pending',
    })

    const reverseDuplicate = await request(
      'bob-token',
      '/v1/friends/requests',
      'POST',
      { targetUserId: 'usr_alice' },
    )
    expect(reverseDuplicate.status).toBe(422)
    expect(await reverseDuplicate.json()).toMatchObject({ error: { code: 'validation_failed' } })

    const wrongUser = await request(
      'charlie-token',
      `/v1/friends/requests/${first.relationship.id}/accept`,
      'POST',
    )
    expect(wrongUser.status).toBe(404)

    const accepted = await request(
      'bob-token',
      `/v1/friends/requests/${first.relationship.id}/accept`,
      'POST',
    )
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toMatchObject({
      relationship: {
        actorUserId: 'usr_alice',
        targetUserId: 'usr_bob',
        type: 'friend',
        status: 'accepted',
      },
    })

    const acceptedAgain = await request(
      'bob-token',
      `/v1/friends/requests/${first.relationship.id}/accept`,
      'POST',
    )
    expect(acceptedAgain.status).toBe(200)
    const friendshipCount = await env.DB.prepare(
      "select count(*) as count from friendships where user_one_id = 'usr_alice' and user_two_id = 'usr_bob'",
    ).first<{ count: number }>()
    expect(friendshipCount?.count).toBe(1)
  })

  it('declines only as the target user and does not create a friendship', async () => {
    const created = await requestFriend('alice-token', 'usr_bob')
    expect(created.response.status).toBe(201)

    const wrongUser = await request(
      'charlie-token',
      `/v1/friends/requests/${created.relationship.id}/decline`,
      'POST',
    )
    expect(wrongUser.status).toBe(404)

    const declined = await request(
      'bob-token',
      `/v1/friends/requests/${created.relationship.id}/decline`,
      'POST',
    )
    const declinedAgain = await request(
      'bob-token',
      `/v1/friends/requests/${created.relationship.id}/decline`,
      'POST',
    )
    expect(declined.status).toBe(204)
    expect(declinedAgain.status).toBe(204)

    const friends = (await (await request('alice-token', '/v1/friends')).json()) as {
      items: FriendDTO[]
    }
    expect(friends.items).toEqual([])
  })

  it('lists only the viewer’s accepted friends with public profile DTOs', async () => {
    await becomeFriends('alice-token', 'bob-token', 'usr_bob')
    await becomeFriends('alice-token', 'charlie-token', 'usr_charlie')

    const aliceResponse = await request('alice-token', '/v1/friends')
    expect(aliceResponse.status).toBe(200)
    const alice = (await aliceResponse.json()) as { items: FriendDTO[] }
    expect(alice.items.map((friend) => friend.userId)).toEqual(['usr_bob', 'usr_charlie'])
    expect(alice.items[0]).toMatchObject({ username: 'bob', visibility: 'public' })
    expect(collectKeys(alice)).not.toContain('email')

    const bob = (await (await request('bob-token', '/v1/friends')).json()) as {
      items: FriendDTO[]
    }
    expect(bob.items.map((friend) => friend.userId)).toEqual(['usr_alice'])

    const dana = (await (await request('dana-token', '/v1/friends')).json()) as {
      items: FriendDTO[]
    }
    expect(dana.items).toEqual([])
  })

  it('validates activity scope and returns a contract-shaped empty communities feed', async () => {
    for (const path of ['/v1/activity', '/v1/activity?scope=all', '/v1/activity?scope=']) {
      const response = await request('alice-token', path)
      expect(response.status, path).toBe(422)
      expect(await response.json()).toMatchObject({ error: { code: 'validation_failed' } })
    }

    const communities = await request('alice-token', '/v1/activity?scope=communities')
    expect(communities.status).toBe(200)
    expect(await communities.json()).toEqual({ items: [] })
  })

  it('returns only public published recipe event types and denies private nutrition fields', async () => {
    await becomeFriends('alice-token', 'bob-token', 'usr_bob')
    await seedPublishedRecipe({
      recipeId: 'rec_bob_published',
      ownerUserId: 'usr_bob',
      visibility: 'public',
      publishedAt: '2026-06-11T10:00:00Z',
    })
    await seedPublishedRecipe({
      recipeId: 'rec_bob_fork',
      ownerUserId: 'usr_bob',
      visibility: 'public',
      publishedAt: '2026-06-12T10:00:00Z',
      forkedFromRecipeId: 'rec_bob_published',
    })
    await seedPublishedRecipe({
      recipeId: 'rec_bob_unlisted',
      ownerUserId: 'usr_bob',
      visibility: 'unlisted',
      publishedAt: '2026-06-13T10:00:00Z',
    })
    await seedPublishedRecipe({
      recipeId: 'rec_bob_private',
      ownerUserId: 'usr_bob',
      visibility: 'private',
      publishedAt: '2026-06-14T10:00:00Z',
    })
    await seedPublishedRecipe({
      recipeId: 'rec_bob_draft',
      ownerUserId: 'usr_bob',
      visibility: 'public',
      status: 'draft',
      publishedAt: '2026-06-15T10:00:00Z',
    })
    await env.DB.prepare(
      `insert into goals
       (id, user_id, calories, protein_grams, carbs_grams, fat_grams, start_date, created_at, updated_at)
       values ('PRIVATE_GOAL_MARKER', 'usr_bob', 2100, 130, 220, 70, '2026-06-01',
               '2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z')`,
    ).run()
    await env.DB.prepare(
      `insert into food_log_entries
       (id, user_id, log_date, meal_type, item_type, food_id, quantity, quantity_unit,
        snapshot_display_name, snapshot_calories, snapshot_protein_grams, snapshot_carbs_grams,
        snapshot_fat_grams, snapshot_captured_at, source_type, privacy_domain, created_at, updated_at)
       values ('PRIVATE_LOG_MARKER', 'usr_bob', '2026-06-12', 'dinner', 'food', 'food_private', 1, 'serving',
        'PRIVATE_FOOD_MARKER', 700, 40, 60, 20, '2026-06-12T00:00:00Z', 'manual',
        'private_user_data', '2026-06-12T00:00:00Z', '2026-06-12T00:00:00Z')`,
    ).run()

    const response = await request('alice-token', '/v1/activity?scope=friends')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { items: ActivityDTO[] }
    expect(body.items.map((item) => [item.type, item.recipe.id])).toEqual([
      ['recipe_forked', 'rec_bob_fork'],
      ['recipe_published', 'rec_bob_published'],
    ])
    expect(body.items.every((item) => item.recipe.visibility === 'public')).toBe(true)
    expect(body.items.every((item) => item.recipe.status === 'published')).toBe(true)
    expect(body.items.every((item) => item.community === null && item.visibility === 'public')).toBe(true)

    const keys = collectKeys(body)
    for (const denied of [
      'email',
      'goal',
      'goals',
      'log',
      'logs',
      'foodLog',
      'foodLogs',
      'adherence',
      'bodyMetric',
      'bodyMetrics',
      'dayProgress',
      'calorieGoal',
      'calorieTotal',
      'caloriesConsumed',
    ]) {
      expect(keys, denied).not.toContain(denied)
    }
    const raw = JSON.stringify(body)
    for (const marker of [
      'rec_bob_unlisted',
      'rec_bob_private',
      'rec_bob_draft',
      'PRIVATE_GOAL_MARKER',
      'PRIVATE_LOG_MARKER',
      'PRIVATE_FOOD_MARKER',
    ]) {
      expect(raw).not.toContain(marker)
    }
  })

  it('hides non-friend and private-profile activity even when recipes are public', async () => {
    await becomeFriends('alice-token', 'bob-token', 'usr_bob')
    await becomeFriends('alice-token', 'dana-token', 'usr_dana')
    await seedPublishedRecipe({
      recipeId: 'rec_bob_visible',
      ownerUserId: 'usr_bob',
      visibility: 'public',
      publishedAt: '2026-06-11T10:00:00Z',
    })
    await seedPublishedRecipe({
      recipeId: 'rec_charlie_not_friend',
      ownerUserId: 'usr_charlie',
      visibility: 'public',
      publishedAt: '2026-06-12T10:00:00Z',
    })
    await seedPublishedRecipe({
      recipeId: 'rec_dana_private_profile',
      ownerUserId: 'usr_dana',
      visibility: 'public',
      publishedAt: '2026-06-13T10:00:00Z',
    })

    // Following a private profile is allowed, but it does not expose that
    // profile or their activity to the follower.
    expect((await request('alice-token', '/v1/users/usr_dana/follow', 'POST')).status).toBe(204)

    const alice = (await (await request('alice-token', '/v1/activity?scope=friends')).json()) as {
      items: ActivityDTO[]
    }
    expect(alice.items.map((item) => item.recipe.id)).toEqual(['rec_bob_visible'])

    const charlie = (await (await request('charlie-token', '/v1/activity?scope=friends')).json()) as {
      items: ActivityDTO[]
    }
    expect(charlie.items).toEqual([])
  })

  it('keeps follow deletion, friendship lists, and activity scoped to the authenticated viewer', async () => {
    await request('alice-token', '/v1/users/usr_bob/follow', 'POST')
    await request('charlie-token', '/v1/users/usr_bob/follow', 'DELETE')
    const followCount = await env.DB.prepare(
      "select count(*) as count from follows where follower_user_id = 'usr_alice' and followed_user_id = 'usr_bob'",
    ).first<{ count: number }>()
    expect(followCount?.count).toBe(1)

    await becomeFriends('alice-token', 'bob-token', 'usr_bob')
    await seedPublishedRecipe({
      recipeId: 'rec_bob_cross_user',
      ownerUserId: 'usr_bob',
      visibility: 'public',
      publishedAt: '2026-06-11T10:00:00Z',
    })

    const charlieFriends = (await (await request('charlie-token', '/v1/friends')).json()) as {
      items: FriendDTO[]
    }
    const charlieActivity = (await (
      await request('charlie-token', '/v1/activity?scope=friends')
    ).json()) as { items: ActivityDTO[] }
    expect(charlieFriends.items).toEqual([])
    expect(charlieActivity.items).toEqual([])
  })
})
