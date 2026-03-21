import Foundation

// MARK: - Public Model

struct Favorite: Decodable, Identifiable, Sendable {
    let id: String
    let foodId: String?
    let recipeId: String?
    let name: String
    let createdAt: String
}

// MARK: - Private Request / Response Types

private struct AddFavoriteRequest: Encodable {
    let foodId: String?
    let recipeId: String?
}

private struct FavoritesResponse: Decodable {
    let favorites: [Favorite]
}

private struct FavoriteResponse: Decodable {
    let favorite: Favorite
}

private struct EmptyResponse: Decodable {}

// MARK: - Service

struct FavoriteService {

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Endpoints

    func fetchFavorites() async throws -> [Favorite] {
        let response: FavoritesResponse = try await apiClient.request("/favorites")
        return response.favorites
    }

    func addFavorite(foodId: String? = nil, recipeId: String? = nil) async throws -> Favorite {
        let body = AddFavoriteRequest(foodId: foodId, recipeId: recipeId)
        let response: FavoriteResponse = try await apiClient.request(
            "/favorites",
            method: .post,
            body: body
        )
        return response.favorite
    }

    func deleteFavorite(id: String) async throws {
        let _: EmptyResponse = try await apiClient.request(
            "/favorites/\(id)",
            method: .delete
        )
    }
}
