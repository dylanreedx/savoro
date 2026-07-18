import { and, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { users, type UserRow } from '../db/schema'
import { ApiError } from '../errors'

export interface ProfilePatch {
  username?: string
  displayName?: string
  bio?: string | null
  avatarUrl?: string | null
  websiteUrl?: string | null
  instagramUrl?: string | null
  tiktokUrl?: string | null
  visibility?: 'private' | 'public'
}

export async function getUserById(db: Db, userId: string): Promise<UserRow> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw new ApiError('not_found', 'User not found.')
  return user
}

/** Missing and private profiles intentionally share one response. */
export async function getPublicUserByUsername(db: Db, username: string): Promise<UserRow> {
  const user = await db.query.users.findFirst({
    where: and(eq(users.username, username), eq(users.profileVisibility, 'public')),
  })
  if (!user) throw new ApiError('not_found', 'Profile not found.')
  return user
}

export async function updateUserProfile(db: Db, userId: string, patch: ProfilePatch): Promise<UserRow> {
  const current = await getUserById(db, userId)
  if (patch.username !== undefined && patch.username !== current.username) {
    await assertUsernameAvailable(db, patch.username, userId)
  }

  const values: Partial<typeof users.$inferInsert> = {
    ...(patch.username !== undefined && { username: patch.username }),
    ...(patch.displayName !== undefined && { displayName: patch.displayName }),
    ...(patch.bio !== undefined && { bio: patch.bio }),
    ...(patch.avatarUrl !== undefined && { avatarUrl: patch.avatarUrl }),
    ...(patch.websiteUrl !== undefined && { websiteUrl: patch.websiteUrl }),
    ...(patch.instagramUrl !== undefined && { instagramUrl: patch.instagramUrl }),
    ...(patch.tiktokUrl !== undefined && { tiktokUrl: patch.tiktokUrl }),
    ...(patch.visibility !== undefined && { profileVisibility: patch.visibility }),
    updatedAt: new Date().toISOString(),
  }

  try {
    await db.update(users).set(values).where(eq(users.id, userId))
  } catch (error) {
    // The preflight gives a useful response normally; this second check maps a
    // concurrent unique-index race to the same contract error.
    if (patch.username !== undefined) {
      await assertUsernameAvailable(db, patch.username, userId)
    }
    throw error
  }
  return getUserById(db, userId)
}

async function assertUsernameAvailable(db: Db, username: string, userId: string): Promise<void> {
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  })
  if (existing && existing.id !== userId) {
    throw new ApiError('validation_failed', 'Username is already in use.')
  }
}
