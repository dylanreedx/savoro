import type { UserRow } from '../db/schema'

// This mapper is the only public profile projection. Account email and all
// private nutrition domains are deliberately impossible to add by spreading a
// database row into a response.
export function mapUserProfile(user: UserRow) {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName ?? user.username ?? user.id,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    // Cover-image writes are not part of SAV-133, but the canonical iOS
    // UserProfile DTO requires the nullable field.
    coverImageUrl: null,
    websiteUrl: user.websiteUrl,
    instagramUrl: user.instagramUrl,
    tiktokUrl: user.tiktokUrl,
    visibility: user.profileVisibility,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function mapMe(user: UserRow) {
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    profile: mapUserProfile(user),
    // User settings persistence is outside this profile-only ticket. Keep the
    // contract member stable without inventing settings values.
    settings: {},
  }
}
