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
}
