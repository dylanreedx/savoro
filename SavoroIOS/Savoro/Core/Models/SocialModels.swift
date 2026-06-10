import Foundation

/// Privacy-safe public/profile/social/community domain contracts.
///
/// These models intentionally exclude private logs, goals, adherence, and body metrics.
/// Social activity is constrained to recipe and social/community events only.
enum ProfileVisibility: String, Codable, CaseIterable, Equatable, Sendable {
    case `private`
    case `public`
}

struct UserProfile: Codable, Equatable, Sendable {
    let userId: String
    let username: String
    let displayName: String
    let bio: String?
    let avatarUrl: URL?
    let coverImageUrl: URL?
    let websiteUrl: URL?
    let instagramUrl: URL?
    let tiktokUrl: URL?
    let visibility: ProfileVisibility
    let createdAt: Date
    let updatedAt: Date
}

struct PublicProfile: Codable, Equatable, Sendable {
    let profile: UserProfile
    let isSelf: Bool
    let followState: FollowState
    let friendState: FriendState?
    let publicRecipes: [RecipeSummary]

    init(profile: UserProfile, isSelf: Bool, followState: FollowState, friendState: FriendState? = nil, publicRecipes: [RecipeSummary]) throws {
        self.profile = profile
        self.isSelf = isSelf
        self.followState = followState
        self.friendState = friendState
        self.publicRecipes = publicRecipes
        try validate()
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        profile = try container.decode(UserProfile.self, forKey: .profile)
        isSelf = try container.decode(Bool.self, forKey: .isSelf)
        followState = try container.decode(FollowState.self, forKey: .followState)
        friendState = try container.decodeIfPresent(FriendState.self, forKey: .friendState)
        publicRecipes = try container.decode([RecipeSummary].self, forKey: .publicRecipes)
        try validate()
    }

    private func validate() throws {
        guard profile.visibility == .public else {
            throw SocialValidationError.publicProfileNotPublic
        }
        guard publicRecipes.allSatisfy({ $0.isPublicPublished }) else {
            throw SocialValidationError.publicRecipeNotPublicPublished
        }
    }
}

enum FollowState: String, Codable, CaseIterable, Equatable, Sendable {
    case none
    case following
    case muted
    case blocked
}

enum FriendState: String, Codable, CaseIterable, Equatable, Sendable {
    case none
    case requestSent = "request_sent"
    case requestReceived = "request_received"
    case friends
    case blocked
}

enum RelationshipType: String, Codable, CaseIterable, Equatable, Sendable {
    case follow
    case friendRequest = "friend_request"
    case friend
}

enum RelationshipStatus: String, Codable, CaseIterable, Equatable, Sendable {
    case pending
    case accepted
    case blocked
    case muted
}

struct UserRelationship: Codable, Equatable, Sendable {
    let id: String
    let actorUserId: String
    let targetUserId: String
    let type: RelationshipType
    let status: RelationshipStatus
    let createdAt: Date
    let updatedAt: Date
}

enum CommunityVisibility: String, Codable, CaseIterable, Equatable, Sendable {
    case `public`
    case `private`
    case unlisted
}

enum CommunityJoinPolicy: String, Codable, CaseIterable, Equatable, Sendable {
    case open
    case request
    case inviteOnly = "invite_only"
}

enum CommunityMemberRole: String, Codable, CaseIterable, Equatable, Sendable {
    case owner
    case admin
    case moderator
    case member
}

enum CommunityMemberStatus: String, Codable, CaseIterable, Equatable, Sendable {
    case active
    case pending
    case banned
    case left
}

enum ViewerMembershipState: String, Codable, CaseIterable, Equatable, Sendable {
    case none
    case pending
    case member
    case owner
}

struct Community: Codable, Equatable, Sendable {
    let id: String
    let slug: String
    let name: String
    let description: String?
    let imageUrl: URL?
    let ownerUserId: String
    let visibility: CommunityVisibility
    let joinPolicy: CommunityJoinPolicy
    let viewerMembership: ViewerMembershipState
    let createdAt: Date
    let updatedAt: Date
}

struct CommunityMember: Codable, Equatable, Sendable {
    let id: String
    let communityId: String
    let userId: String
    let role: CommunityMemberRole
    let status: CommunityMemberStatus
    let joinedAt: Date?
    let createdAt: Date
    let updatedAt: Date
}

struct CommunityRecipeShare: Codable, Equatable, Sendable {
    let id: String
    let communityId: String
    let recipe: RecipeSummary
    let recipeVersionId: String
    let sharedBy: RecipeCreatorSummary
    let caption: String?
    let pinnedByUserId: String?
    let pinnedAt: Date?
    let createdAt: Date

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        communityId = try container.decode(String.self, forKey: .communityId)
        recipe = try container.decode(RecipeSummary.self, forKey: .recipe)
        recipeVersionId = try container.decode(String.self, forKey: .recipeVersionId)
        sharedBy = try container.decode(RecipeCreatorSummary.self, forKey: .sharedBy)
        caption = try container.decodeIfPresent(String.self, forKey: .caption)
        pinnedByUserId = try container.decodeIfPresent(String.self, forKey: .pinnedByUserId)
        pinnedAt = try container.decodeIfPresent(Date.self, forKey: .pinnedAt)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        try validate()
    }

    private func validate() throws {
        guard recipe.isPublicPublished else {
            throw SocialValidationError.publicRecipeNotPublicPublished
        }
    }
}

enum ActivityItemType: String, Codable, CaseIterable, Equatable, Sendable {
    case recipePublished = "recipe_published"
    case recipeSaved = "recipe_saved"
    case recipeForked = "recipe_forked"
    case joinedCommunity = "joined_community"
    case createdCollection = "created_collection"
    case recipeSharedToCommunity = "recipe_shared_to_community"
}

enum ActivityVisibility: String, Codable, CaseIterable, Equatable, Sendable {
    case `public`
    case friends
    case community
}

struct ActivityItem: Codable, Equatable, Sendable {
    let id: String
    let actor: RecipeCreatorSummary
    let type: ActivityItemType
    let recipe: RecipeSummary?
    let community: Community?
    let visibility: ActivityVisibility
    let createdAt: Date

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        actor = try container.decode(RecipeCreatorSummary.self, forKey: .actor)
        type = try container.decode(ActivityItemType.self, forKey: .type)
        recipe = try container.decodeIfPresent(RecipeSummary.self, forKey: .recipe)
        community = try container.decodeIfPresent(Community.self, forKey: .community)
        visibility = try container.decode(ActivityVisibility.self, forKey: .visibility)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        try validate()
    }

    private func validate() throws {
        switch type {
        case .recipePublished, .recipeSaved, .recipeForked:
            guard recipe != nil else { throw SocialValidationError.activityMissingRecipe }
            guard community == nil else { throw SocialValidationError.activityUnexpectedTarget }
        case .recipeSharedToCommunity:
            guard recipe != nil else { throw SocialValidationError.activityMissingRecipe }
            guard community != nil else { throw SocialValidationError.activityMissingCommunity }
        case .joinedCommunity:
            guard community != nil else { throw SocialValidationError.activityMissingCommunity }
            guard recipe == nil else { throw SocialValidationError.activityUnexpectedTarget }
        case .createdCollection:
            guard recipe == nil, community == nil else { throw SocialValidationError.activityUnexpectedTarget }
        }
    }
}

enum SearchResultKind: String, Codable, CaseIterable, Equatable, Sendable {
    case recipe
    case profile
    case community
}

struct SearchResult: Codable, Equatable, Sendable {
    let kind: SearchResultKind
    let recipe: RecipeSummary?
    let profile: UserProfile?
    let community: Community?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        kind = try container.decode(SearchResultKind.self, forKey: .kind)
        recipe = try container.decodeIfPresent(RecipeSummary.self, forKey: .recipe)
        profile = try container.decodeIfPresent(UserProfile.self, forKey: .profile)
        community = try container.decodeIfPresent(Community.self, forKey: .community)
        try validate()
    }

    private func validate() throws {
        switch kind {
        case .recipe:
            guard let recipe, profile == nil, community == nil else { throw SocialValidationError.invalidSearchWrapper }
            guard recipe.isPublicPublished else { throw SocialValidationError.publicRecipeNotPublicPublished }
        case .profile:
            guard let profile, recipe == nil, community == nil else { throw SocialValidationError.invalidSearchWrapper }
            guard profile.visibility == .public else { throw SocialValidationError.publicProfileNotPublic }
        case .community:
            guard let community, recipe == nil, profile == nil else { throw SocialValidationError.invalidSearchWrapper }
            guard community.visibility == .public else { throw SocialValidationError.publicCommunityNotPublic }
        }
    }
}

struct SearchResponse: Codable, Equatable, Sendable {
    let query: String
    let results: [SearchResult]
}

enum SocialValidationError: Error, Equatable {
    case publicProfileNotPublic
    case publicRecipeNotPublicPublished
    case publicCommunityNotPublic
    case activityMissingRecipe
    case activityMissingCommunity
    case activityUnexpectedTarget
    case invalidSearchWrapper
}

private extension RecipeSummary {
    var isPublicPublished: Bool {
        visibility == .public && status == .published
    }
}
