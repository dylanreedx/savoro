import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../db/client'
import {
  follows,
  friendRequests,
  friendships,
  recipeVersions,
  recipes,
  savedRecipes,
  users,
  type FriendRequestRow,
  type UserRow,
} from '../db/schema'
import { ApiError } from '../errors'
import type { RecipeSummaryRows } from './recipes'

export interface FriendRequestResult {
  request: FriendRequestRow
  created: boolean
}

export interface FriendActivityRows {
  id: string
  actor: UserRow
  type: 'recipe_published' | 'recipe_forked'
  recipe: RecipeSummaryRows
  createdAt: string
}

type SqliteBatch = [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]

/**
 * Follows are always scoped to the session viewer. Private profiles may be
 * followed because the contract has no approval state; profile/activity reads
 * continue to hide that user's private profile, so following grants no access.
 */
export async function followUser(db: Db, viewerUserId: string, targetUserId: string): Promise<void> {
  if (viewerUserId === targetUserId) {
    throw new ApiError('validation_failed', 'You cannot follow yourself.')
  }
  await assertUserExists(db, targetUserId)

  // The unique viewer/target pair makes retries idempotent. A race can only
  // preserve the existing row; it cannot create a second follow.
  await db
    .insert(follows)
    .values({
      id: `fol_${crypto.randomUUID()}`,
      followerUserId: viewerUserId,
      followedUserId: targetUserId,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing({ target: [follows.followerUserId, follows.followedUserId] })
}

/** Deleting an absent viewer-owned pair is deliberately an idempotent no-op. */
export async function unfollowUser(db: Db, viewerUserId: string, targetUserId: string): Promise<void> {
  await db
    .delete(follows)
    .where(and(eq(follows.followerUserId, viewerUserId), eq(follows.followedUserId, targetUserId)))
}

export async function viewerFollows(db: Db, viewerUserId: string, targetUserId: string): Promise<boolean> {
  if (viewerUserId === targetUserId) return false
  const row = await db.query.follows.findFirst({
    where: and(eq(follows.followerUserId, viewerUserId), eq(follows.followedUserId, targetUserId)),
    columns: { id: true },
  })
  return row !== undefined
}

/**
 * Same-direction pending retries return the original request. A reverse
 * pending request is rejected instead of silently changing who may accept it.
 * Declined pairs may be requested again; accepted friends cannot be requested.
 */
export async function createFriendRequest(
  db: Db,
  requesterUserId: string,
  targetUserId: string,
): Promise<FriendRequestResult> {
  if (requesterUserId === targetUserId) {
    throw new ApiError('validation_failed', 'You cannot send yourself a friend request.')
  }
  await assertUserExists(db, targetUserId)
  const [pairUserOneId, pairUserTwoId] = canonicalPair(requesterUserId, targetUserId)

  const friendship = await db.query.friendships.findFirst({
    where: and(eq(friendships.userOneId, pairUserOneId), eq(friendships.userTwoId, pairUserTwoId)),
    columns: { id: true },
  })
  if (friendship) {
    throw new ApiError('validation_failed', 'These users are already friends.')
  }

  const existing = await findPendingRequest(db, pairUserOneId, pairUserTwoId)
  if (existing) return duplicateRequestResult(existing, requesterUserId)

  const now = new Date().toISOString()
  const request: FriendRequestRow = {
    id: `frq_${crypto.randomUUID()}`,
    requesterUserId,
    targetUserId,
    pairUserOneId,
    pairUserTwoId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.insert(friendRequests).values(request)
    return { request, created: true }
  } catch (error) {
    // The partial unique index arbitrates concurrent requests for the pair.
    const raced = await findPendingRequest(db, pairUserOneId, pairUserTwoId)
    if (raced) return duplicateRequestResult(raced, requesterUserId)
    throw error
  }
}

/** Only the request target can accept; wrong viewers and unknown ids both 404. */
export async function acceptFriendRequest(
  db: Db,
  targetUserId: string,
  requestId: string,
): Promise<FriendRequestRow> {
  const request = await findTargetOwnedRequest(db, targetUserId, requestId)
  if (request.status === 'declined') {
    throw new ApiError('not_found', 'Friend request not found.')
  }
  if (request.status === 'accepted') return request

  const now = new Date().toISOString()
  const friendshipId = `frn_${crypto.randomUUID()}`
  const operations: BatchItem<'sqlite'>[] = [
    db
      .update(friendRequests)
      .set({ status: 'accepted', updatedAt: now })
      .where(
        and(
          eq(friendRequests.id, request.id),
          eq(friendRequests.targetUserId, targetUserId),
          eq(friendRequests.status, 'pending'),
        ),
      ),
    // Insert only if this batch left the target-owned request accepted. This
    // prevents an accept/decline race from creating a friendship after decline;
    // canonical-pair conflict-ignore also makes target retries idempotent.
    db
      .insert(friendships)
      .select(
        db
          .select({
            id: sql<string>`${friendshipId}`.as('id'),
            userOneId: friendRequests.pairUserOneId,
            userTwoId: friendRequests.pairUserTwoId,
            createdAt: sql<string>`${now}`.as('created_at'),
          })
          .from(friendRequests)
          .where(
            and(
              eq(friendRequests.id, request.id),
              eq(friendRequests.targetUserId, targetUserId),
              eq(friendRequests.status, 'accepted'),
            ),
          ),
      )
      .onConflictDoNothing({ target: [friendships.userOneId, friendships.userTwoId] }),
  ]
  await db.batch(operations as SqliteBatch)
  return { ...request, status: 'accepted', updatedAt: now }
}

/** Target-owned decline retries are no-ops; accepted requests cannot be reversed. */
export async function declineFriendRequest(
  db: Db,
  targetUserId: string,
  requestId: string,
): Promise<void> {
  const request = await findTargetOwnedRequest(db, targetUserId, requestId)
  if (request.status === 'declined') return
  if (request.status === 'accepted') {
    throw new ApiError('not_found', 'Friend request not found.')
  }
  await db
    .update(friendRequests)
    .set({ status: 'declined', updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(friendRequests.id, request.id),
        eq(friendRequests.targetUserId, targetUserId),
        eq(friendRequests.status, 'pending'),
      ),
    )
}

/** Mutual accepted friends for this viewer only; no account/private nutrition rows are joined. */
export async function listFriends(db: Db, viewerUserId: string): Promise<UserRow[]> {
  const rows = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userOneId, viewerUserId), eq(friendships.userTwoId, viewerUserId)))
  const friendIds = rows.map((row) =>
    row.userOneId === viewerUserId ? row.userTwoId : row.userOneId,
  )
  if (friendIds.length === 0) return []
  return db.query.users.findMany({
    where: inArray(users.id, friendIds),
    orderBy: [asc(users.username), asc(users.id)],
  })
}

/**
 * A read-time activity projection: only public-profile friends and their
 * public, currently published recipes are queried. No log/goal/body/progress
 * table participates, making those private domains structurally unavailable.
 * Forked public recipes use recipe_forked; other publications use
 * recipe_published. Community-backed event types are deferred with communities.
 */
export async function listFriendActivity(db: Db, viewerUserId: string): Promise<FriendActivityRows[]> {
  const friendshipRows = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userOneId, viewerUserId), eq(friendships.userTwoId, viewerUserId)))
  const friendIds = friendshipRows.map((row) =>
    row.userOneId === viewerUserId ? row.userTwoId : row.userOneId,
  )
  if (friendIds.length === 0) return []

  const publishedAt = sql<string>`coalesce(${recipeVersions.publishedAt}, ${recipes.updatedAt})`
  const rows = await db
    .select({ recipe: recipes, version: recipeVersions, actor: users, publishedAt })
    .from(recipes)
    .innerJoin(recipeVersions, eq(recipes.currentVersionId, recipeVersions.id))
    .innerJoin(users, eq(recipes.ownerUserId, users.id))
    .where(
      and(
        inArray(recipes.ownerUserId, friendIds),
        eq(users.profileVisibility, 'public'),
        eq(recipes.visibility, 'public'),
        eq(recipes.status, 'published'),
      ),
    )
    .orderBy(desc(publishedAt), desc(recipes.id))
    .limit(50)

  if (rows.length === 0) return []
  const saved = await db.query.savedRecipes.findMany({
    where: and(
      eq(savedRecipes.userId, viewerUserId),
      inArray(
        savedRecipes.recipeId,
        rows.map(({ recipe }) => recipe.id),
      ),
    ),
    columns: { recipeId: true },
  })
  const savedIds = new Set(saved.map(({ recipeId }) => recipeId))

  return rows.map(({ recipe, version, actor, publishedAt: eventCreatedAt }) => {
    const type = recipe.forkedFromRecipeId === null ? 'recipe_published' : 'recipe_forked'
    return {
      id: `activity_${type}_${recipe.id}_${version.id}`,
      actor,
      type,
      recipe: { recipe, owner: actor, version, isSaved: savedIds.has(recipe.id) },
      createdAt: eventCreatedAt,
    }
  })
}

async function assertUserExists(db: Db, userId: string): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } })
  if (!user) throw new ApiError('not_found', 'User not found.')
}

function canonicalPair(firstUserId: string, secondUserId: string): [string, string] {
  return firstUserId < secondUserId
    ? [firstUserId, secondUserId]
    : [secondUserId, firstUserId]
}

function findPendingRequest(db: Db, pairUserOneId: string, pairUserTwoId: string) {
  return db.query.friendRequests.findFirst({
    where: and(
      eq(friendRequests.pairUserOneId, pairUserOneId),
      eq(friendRequests.pairUserTwoId, pairUserTwoId),
      eq(friendRequests.status, 'pending'),
    ),
  })
}

function duplicateRequestResult(
  existing: FriendRequestRow,
  requesterUserId: string,
): FriendRequestResult {
  if (existing.requesterUserId !== requesterUserId) {
    throw new ApiError('validation_failed', 'A friend request between these users is already pending.')
  }
  return { request: existing, created: false }
}

async function findTargetOwnedRequest(
  db: Db,
  targetUserId: string,
  requestId: string,
): Promise<FriendRequestRow> {
  const request = await db.query.friendRequests.findFirst({
    where: and(eq(friendRequests.id, requestId), eq(friendRequests.targetUserId, targetUserId)),
  })
  // Target ownership is part of this lookup so request existence cannot leak.
  if (!request) throw new ApiError('not_found', 'Friend request not found.')
  return request
}
