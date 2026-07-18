import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapUserProfile } from '../dto/profiles'
import {
  mapAcceptedFriendRequest,
  mapActivityItem,
  mapPendingFriendRequest,
} from '../dto/social'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import {
  acceptFriendRequest,
  createFriendRequest,
  declineFriendRequest,
  followUser,
  listFriendActivity,
  listFriends,
  unfollowUser,
} from '../repo/social'

export const users = new Hono<AppEnv>()
export const friends = new Hono<AppEnv>()
export const activity = new Hono<AppEnv>()

users.use('*', requireAuth)
friends.use('*', requireAuth)
activity.use('*', requireAuth)

users.post('/:id/follow', async (c) => {
  await followUser(createDb(c.env.DB), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

users.delete('/:id/follow', async (c) => {
  await unfollowUser(createDb(c.env.DB), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

friends.post('/requests', async (c) => {
  const body = await readObjectBody(c.req.raw)
  if (typeof body.targetUserId !== 'string' || body.targetUserId.trim() === '') {
    throw new ApiError('validation_failed', 'targetUserId must be a non-empty string.')
  }
  const result = await createFriendRequest(
    createDb(c.env.DB),
    c.get('userId'),
    body.targetUserId,
  )
  return c.json(
    { relationship: mapPendingFriendRequest(result.request) },
    result.created ? 201 : 200,
  )
})

friends.post('/requests/:id/accept', async (c) => {
  const request = await acceptFriendRequest(
    createDb(c.env.DB),
    c.get('userId'),
    c.req.param('id'),
  )
  return c.json({ relationship: mapAcceptedFriendRequest(request) })
})

friends.post('/requests/:id/decline', async (c) => {
  await declineFriendRequest(createDb(c.env.DB), c.get('userId'), c.req.param('id'))
  return c.body(null, 204)
})

friends.get('/', async (c) => {
  const rows = await listFriends(createDb(c.env.DB), c.get('userId'))
  return c.json({ items: rows.map(mapUserProfile) })
})

activity.get('/', async (c) => {
  const scope = c.req.query('scope')
  if (scope !== 'friends' && scope !== 'communities') {
    throw new ApiError('validation_failed', 'scope must be friends or communities.')
  }

  if (scope === 'communities') {
    // Contract-shaped placeholder until community membership/share persistence
    // lands. It intentionally performs no broad social/private-data query.
    return c.json({ items: [] })
  }

  const viewerUserId = c.get('userId')
  const rows = await listFriendActivity(createDb(c.env.DB), viewerUserId)
  return c.json({ items: rows.map((row) => mapActivityItem(row, viewerUserId)) })
})

async function readObjectBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => {
    throw new ApiError('validation_failed', 'Body must be JSON.')
  })
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('validation_failed', 'Body must be a JSON object.')
  }
  return body as Record<string, unknown>
}
