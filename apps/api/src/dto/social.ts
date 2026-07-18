import type { FriendRequestRow } from '../db/schema'
import type { FriendActivityRows } from '../repo/social'
import { mapRecipeSummary } from './recipes'

export function mapPendingFriendRequest(request: FriendRequestRow) {
  return {
    id: request.id,
    actorUserId: request.requesterUserId,
    targetUserId: request.targetUserId,
    type: 'friend_request' as const,
    status: 'pending' as const,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

export function mapAcceptedFriendRequest(request: FriendRequestRow) {
  return {
    id: request.id,
    actorUserId: request.requesterUserId,
    targetUserId: request.targetUserId,
    type: 'friend' as const,
    status: 'accepted' as const,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

/** Activity DTOs expose only explicit public actor/recipe projections. */
export function mapActivityItem(rows: FriendActivityRows, viewerUserId: string) {
  return {
    id: rows.id,
    actor: {
      userId: rows.actor.id,
      username: rows.actor.username ?? rows.actor.id,
      displayName: rows.actor.displayName ?? rows.actor.username ?? rows.actor.id,
      avatarUrl: rows.actor.avatarUrl,
    },
    type: rows.type,
    recipe: mapRecipeSummary(rows.recipe, viewerUserId),
    community: null,
    visibility: 'public' as const,
    createdAt: rows.createdAt,
  }
}
