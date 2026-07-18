import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { mapMe, mapUserProfile } from '../dto/profiles'
import { ApiError } from '../errors'
import { requireAuth } from '../middleware/auth'
import { getPublicUserByUsername, getUserById, updateUserProfile, type ProfilePatch } from '../repo/profiles'
import { listPublicRecipesByOwner } from '../repo/recipes'
import { viewerFollows } from '../repo/social'
import { mapRecipePage, parseRecipeListOptions } from './recipe-list'

export const me = new Hono<AppEnv>()
export const profiles = new Hono<AppEnv>()

me.use('*', requireAuth)
profiles.use('*', requireAuth)

me.get('/', async (c) => {
  const user = await getUserById(createDb(c.env.DB), c.get('userId'))
  return c.json(mapMe(user))
})

me.patch('/profile', async (c) => {
  const body = await c.req.json().catch(() => null)
  const patch = parseProfilePatch(body)
  const user = await updateUserProfile(createDb(c.env.DB), c.get('userId'), patch)
  return c.json({ profile: mapUserProfile(user) })
})

profiles.get('/:username/recipes', async (c) => {
  const db = createDb(c.env.DB)
  const viewerUserId = c.get('userId')
  const profileUser = await getPublicUserByUsername(db, c.req.param('username'))
  const page = await listPublicRecipesByOwner(
    db,
    viewerUserId,
    profileUser.id,
    parseRecipeListOptions(c.req.query('limit'), c.req.query('cursor')),
  )
  return c.json(mapRecipePage(page, viewerUserId))
})

profiles.get('/:username', async (c) => {
  const db = createDb(c.env.DB)
  const viewerUserId = c.get('userId')
  const profileUser = await getPublicUserByUsername(db, c.req.param('username'))
  const [recipes, isFollowing] = await Promise.all([
    listPublicRecipesByOwner(db, viewerUserId, profileUser.id, { limit: 20 }),
    viewerFollows(db, viewerUserId, profileUser.id),
  ])
  return c.json({
    profile: mapUserProfile(profileUser),
    isSelf: profileUser.id === viewerUserId,
    followState: isFollowing ? ('following' as const) : ('none' as const),
    publicRecipes: mapRecipePage(recipes, viewerUserId).items,
  })
})

function parseProfilePatch(value: unknown): ProfilePatch {
  if (!isRecord(value)) {
    throw new ApiError('validation_failed', 'Profile body must be an object.')
  }

  const patch: ProfilePatch = {}
  let fieldCount = 0

  if (hasOwn(value, 'username')) {
    fieldCount++
    // Usernames are mutable because the contract defines no immutable period.
    // Canonical URL slug: 3-30 lowercase letters/digits, with hyphens or
    // underscores only inside the slug; it must start and end alphanumeric.
    if (typeof value.username !== 'string' || !/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/.test(value.username)) {
      throw new ApiError(
        'validation_failed',
        'username must be a 3-30 character lowercase URL slug.',
      )
    }
    patch.username = value.username
  }

  if (hasOwn(value, 'displayName')) {
    fieldCount++
    if (typeof value.displayName !== 'string') {
      throw new ApiError('validation_failed', 'displayName must be a string.')
    }
    const displayName = value.displayName.trim()
    if (displayName.length < 1 || displayName.length > 80) {
      throw new ApiError('validation_failed', 'displayName must be 1-80 characters.')
    }
    patch.displayName = displayName
  }

  if (hasOwn(value, 'bio')) {
    fieldCount++
    if (value.bio !== null && typeof value.bio !== 'string') {
      throw new ApiError('validation_failed', 'bio must be a string or null.')
    }
    const bio = typeof value.bio === 'string' ? value.bio.trim() : null
    if (bio !== null && bio.length > 300) {
      throw new ApiError('validation_failed', 'bio must be at most 300 characters.')
    }
    patch.bio = bio === '' ? null : bio
  }

  if (hasOwn(value, 'avatarUrl')) {
    fieldCount++
    patch.avatarUrl = parseOptionalWebUrl(value.avatarUrl, 'avatarUrl')
  }

  // The canonical UserProfile DTO names these fields individually. The
  // endpoint contract calls them “links” collectively; grouped input is also
  // accepted below, while responses stay canonical for iOS Codable models.
  if (hasOwn(value, 'websiteUrl')) {
    fieldCount++
    patch.websiteUrl = parseOptionalWebUrl(value.websiteUrl, 'websiteUrl')
  }
  if (hasOwn(value, 'instagramUrl')) {
    fieldCount++
    patch.instagramUrl = parseOptionalWebUrl(value.instagramUrl, 'instagramUrl')
  }
  if (hasOwn(value, 'tiktokUrl')) {
    fieldCount++
    patch.tiktokUrl = parseOptionalWebUrl(value.tiktokUrl, 'tiktokUrl')
  }

  if (hasOwn(value, 'links')) {
    fieldCount++
    if (!isRecord(value.links)) {
      throw new ApiError('validation_failed', 'links must be an object.')
    }
    const allowed = new Set(['websiteUrl', 'instagramUrl', 'tiktokUrl'])
    const keys = Object.keys(value.links)
    if (keys.length === 0 || keys.some((key) => !allowed.has(key))) {
      throw new ApiError(
        'validation_failed',
        'links may contain websiteUrl, instagramUrl, and tiktokUrl.',
      )
    }
    if (hasOwn(value.links, 'websiteUrl')) {
      patch.websiteUrl = parseOptionalWebUrl(value.links.websiteUrl, 'links.websiteUrl')
    }
    if (hasOwn(value.links, 'instagramUrl')) {
      patch.instagramUrl = parseOptionalWebUrl(value.links.instagramUrl, 'links.instagramUrl')
    }
    if (hasOwn(value.links, 'tiktokUrl')) {
      patch.tiktokUrl = parseOptionalWebUrl(value.links.tiktokUrl, 'links.tiktokUrl')
    }
  }

  if (hasOwn(value, 'visibility')) {
    fieldCount++
    if (value.visibility !== 'private' && value.visibility !== 'public') {
      throw new ApiError('validation_failed', 'visibility must be private or public.')
    }
    patch.visibility = value.visibility
  }

  if (fieldCount === 0) {
    throw new ApiError('validation_failed', 'At least one profile field is required.')
  }
  return patch
}

function parseOptionalWebUrl(value: unknown, field: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new ApiError('validation_failed', `${field} must be an http(s) URL or null.`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) {
    throw new ApiError('validation_failed', `${field} must be an http(s) URL or null.`)
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol')
  } catch {
    throw new ApiError('validation_failed', `${field} must be an http(s) URL or null.`)
  }
  return trimmed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}
