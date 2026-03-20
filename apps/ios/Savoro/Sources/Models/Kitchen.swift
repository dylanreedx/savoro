import Foundation

// PROVISIONAL -- Kitchen schema not yet finalized in Drizzle

enum KitchenRole: String, Codable, Sendable {
    case owner
    case admin
    case member
}

enum InviteStatus: String, Codable, Sendable {
    case pending
    case accepted
    case declined
    case expired
}

struct Kitchen: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let description: String?
    let imageUrl: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case imageUrl = "image_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct KitchenMember: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let kitchenId: String
    let userId: String
    let role: KitchenRole
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case kitchenId = "kitchen_id"
        case userId = "user_id"
        case role
        case createdAt = "created_at"
    }
}

struct KitchenInvite: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let kitchenId: String
    let invitedByUserId: String
    let invitedUserId: String?
    let invitedEmail: String?
    let status: InviteStatus
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case kitchenId = "kitchen_id"
        case invitedByUserId = "invited_by_user_id"
        case invitedUserId = "invited_user_id"
        case invitedEmail = "invited_email"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
