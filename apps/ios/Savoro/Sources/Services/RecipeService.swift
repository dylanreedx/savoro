import Foundation

struct RecipeService {

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - User Recipes

    func list() async throws -> [Recipe] {
        try await apiClient.request("/recipes")
    }

    func get(_ id: String) async throws -> RecipeDetail {
        try await apiClient.request("/recipes/\(id)")
    }

    func create(_ draft: RecipeDraft) async throws -> Recipe {
        try await apiClient.request("/recipes", method: .post, body: draft)
    }

    func update(_ id: String, draft: RecipeDraft) async throws -> Recipe {
        try await apiClient.request("/recipes/\(id)", method: .put, body: draft)
    }

    func delete(_ id: String) async throws {
        let _: EmptyResponse = try await apiClient.request(
            "/recipes/\(id)",
            method: .delete
        )
    }

    func fork(_ id: String) async throws -> Recipe {
        try await apiClient.request("/recipes/\(id)/fork", method: .post)
    }

    // MARK: - Discovery Feed

    func feed(cursor: String? = nil, limit: Int = 20, sort: String? = nil, tags: [String] = []) async throws -> FeedPage {
        var path = "/recipes/feed?limit=\(limit)"
        if let cursor {
            path += "&cursor=\(cursor)"
        }
        if let sort {
            path += "&sort=\(sort)"
        }
        if !tags.isEmpty {
            path += "&tags=\(tags.joined(separator: ","))"
        }
        return try await apiClient.request(path)
    }

    func similar(_ id: String) async throws -> [Recipe] {
        try await apiClient.request("/recipes/\(id)/similar")
    }
}

// MARK: - Empty Response Helper

private struct EmptyResponse: Decodable {}
