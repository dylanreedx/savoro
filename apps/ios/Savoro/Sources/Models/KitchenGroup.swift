import Foundation

// MARK: - Kitchen Group Models

enum MemberRole: String, Codable, Sendable {
    case owner
    case admin
    case member
}

struct KitchenMember: Codable, Identifiable, Sendable {
    let id: String
    let user: User
    let role: MemberRole
    let joinedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case user
        case role
        case joinedAt = "joined_at"
    }

    init(id: String, user: User, role: MemberRole, joinedAt: String = "2025-01-01T00:00:00Z") {
        self.id = id
        self.user = user
        self.role = role
        self.joinedAt = joinedAt
    }
}

struct KitchenActivity: Codable, Identifiable, Sendable {
    let id: String
    let actorName: String
    let verb: String
    let recipeName: String
    let timestamp: Date

    enum CodingKeys: String, CodingKey {
        case id
        case actorName = "actor_name"
        case verb
        case recipeName = "recipe_name"
        case timestamp
    }

    init(id: String, actorName: String, verb: String, recipeName: String, timestamp: Date = Date()) {
        self.id = id
        self.actorName = actorName
        self.verb = verb
        self.recipeName = recipeName
        self.timestamp = timestamp
    }
}

struct KitchenGroup: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let description: String?
    let memberCount: Int
    let members: [KitchenMember]
    let recipes: [Recipe]
    let activities: [KitchenActivity]

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case memberCount = "member_count"
        case members
        case recipes
        case activities
    }

    init(
        id: String,
        name: String,
        description: String? = nil,
        memberCount: Int,
        members: [KitchenMember] = [],
        recipes: [Recipe] = [],
        activities: [KitchenActivity] = []
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.memberCount = memberCount
        self.members = members
        self.recipes = recipes
        self.activities = activities
    }

    // MARK: - Preview Data

    static let preview: KitchenGroup = {
        let alice = User(
            id: "u1", email: "alice@example.com", username: "alice",
            displayName: "Alice", bio: nil, avatarUrl: nil,
            isPublic: true, appleId: nil, isApplePrivateEmail: false,
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z"
        )
        let bob = User(
            id: "u2", email: "bob@example.com", username: "bob",
            displayName: "Bob", bio: nil, avatarUrl: nil,
            isPublic: true, appleId: nil, isApplePrivateEmail: false,
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z"
        )
        let sarah = User(
            id: "u3", email: "sarah@example.com", username: "sarah",
            displayName: "Sarah", bio: nil, avatarUrl: nil,
            isPublic: true, appleId: nil, isApplePrivateEmail: false,
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z"
        )
        let members = [
            KitchenMember(id: "m1", user: alice, role: .owner),
            KitchenMember(id: "m2", user: bob, role: .admin),
            KitchenMember(id: "m3", user: sarah, role: .member),
        ]
        let activities = [
            KitchenActivity(
                id: "a1", actorName: "Sarah", verb: "added",
                recipeName: "Miso Salmon",
                timestamp: Date(timeIntervalSinceNow: -7200)
            ),
            KitchenActivity(
                id: "a2", actorName: "Bob", verb: "forked",
                recipeName: "Spicy Tofu Bowl",
                timestamp: Date(timeIntervalSinceNow: -86400)
            ),
            KitchenActivity(
                id: "a3", actorName: "Alice", verb: "added",
                recipeName: "Overnight Oats",
                timestamp: Date(timeIntervalSinceNow: -172800)
            ),
        ]
        return KitchenGroup(
            id: "g1",
            name: "Sunday Kitchen",
            description: "Shared recipes for the crew",
            memberCount: 3,
            members: members,
            recipes: Recipe.previewList,
            activities: activities
        )
    }()
}
