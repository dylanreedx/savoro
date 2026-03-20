import Foundation

struct User: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let email: String
    let username: String
    let displayName: String?
    let bio: String?
    let avatarUrl: String?
    let isPublic: Bool
    // passwordHash intentionally omitted -- never sent to client
    let appleId: String?
    let isApplePrivateEmail: Bool
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case username
        case displayName = "display_name"
        case bio
        case avatarUrl = "avatar_url"
        case isPublic = "is_public"
        case appleId = "apple_id"
        case isApplePrivateEmail = "is_apple_private_email"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct UserGoal: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let calories: Int?
    let protein: Int?
    let carb: Int?
    let fat: Int?
    let fiber: Int?
    let startDate: String  // YYYY-MM-DD
    let endDate: String?   // nil = current
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case calories
        case protein
        case carb
        case fat
        case fiber
        case startDate = "start_date"
        case endDate = "end_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
