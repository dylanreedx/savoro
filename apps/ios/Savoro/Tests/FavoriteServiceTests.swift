import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeFavoriteMockSession() -> URLSession {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [MockURLProtocol.self]
    return URLSession(configuration: config)
}

// MARK: - FavoriteService Tests

@Suite("FavoriteService", .serialized)
struct FavoriteServiceTests {

    // MARK: fetchFavorites

    @Test("fetchFavorites decodes wrapped FavoritesResponse into [Favorite]")
    func fetchFavoritesDecodes() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "favorites": [
                {
                    "id": "fav-1",
                    "food_id": "food-1",
                    "recipe_id": null,
                    "name": "Chicken Breast",
                    "created_at": "2026-03-20T10:00:00Z"
                },
                {
                    "id": "fav-2",
                    "food_id": null,
                    "recipe_id": "recipe-1",
                    "name": "Pasta Carbonara",
                    "created_at": "2026-03-21T08:00:00Z"
                }
            ]
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        let results = try await service.fetchFavorites()

        #expect(results.count == 2)
        #expect(results[0].id == "fav-1")
        #expect(results[0].name == "Chicken Breast")
        #expect(results[0].foodId == "food-1")
        #expect(results[0].recipeId == nil)
        #expect(results[1].id == "fav-2")
        #expect(results[1].recipeId == "recipe-1")
        #expect(results[1].foodId == nil)
    }

    @Test("fetchFavorites returns empty array when favorites is empty")
    func fetchFavoritesEmpty() async throws {
        MockURLProtocol.reset()
        let json = #"{"favorites": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        let results = try await service.fetchFavorites()

        #expect(results.isEmpty)
    }

    @Test("fetchFavorites uses GET /favorites endpoint")
    func fetchFavoritesUsesCorrectPath() async throws {
        MockURLProtocol.reset()
        let json = #"{"favorites": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        _ = try await service.fetchFavorites()

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("/favorites"))
        let method = MockURLProtocol.lastRequest?.httpMethod ?? ""
        #expect(method == "GET")
    }

    // MARK: addFavorite

    @Test("addFavorite with foodId decodes returned Favorite")
    func addFavoriteFoodIdDecodes() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "favorite": {
                "id": "fav-3",
                "food_id": "food-99",
                "recipe_id": null,
                "name": "Brown Rice",
                "created_at": "2026-03-21T09:00:00Z"
            }
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        let favorite = try await service.addFavorite(foodId: "food-99")

        #expect(favorite.id == "fav-3")
        #expect(favorite.name == "Brown Rice")
        #expect(favorite.foodId == "food-99")
        #expect(favorite.recipeId == nil)
    }

    @Test("addFavorite with recipeId decodes returned Favorite")
    func addFavoriteRecipeIdDecodes() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "favorite": {
                "id": "fav-4",
                "food_id": null,
                "recipe_id": "recipe-42",
                "name": "Spaghetti Bolognese",
                "created_at": "2026-03-21T10:00:00Z"
            }
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        let favorite = try await service.addFavorite(recipeId: "recipe-42")

        #expect(favorite.id == "fav-4")
        #expect(favorite.name == "Spaghetti Bolognese")
        #expect(favorite.recipeId == "recipe-42")
        #expect(favorite.foodId == nil)
    }

    @Test("addFavorite uses POST /favorites endpoint")
    func addFavoriteUsesCorrectMethodAndPath() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "favorite": {
                "id": "fav-5",
                "food_id": "food-1",
                "recipe_id": null,
                "name": "Apple",
                "created_at": "2026-03-21T11:00:00Z"
            }
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        _ = try await service.addFavorite(foodId: "food-1")

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("/favorites"))
        let method = MockURLProtocol.lastRequest?.httpMethod ?? ""
        #expect(method == "POST")
    }

    @Test("addFavorite throws on server error")
    func addFavoriteThrowsOnServerError() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 422
        MockURLProtocol.stubResponseData = Data()

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))

        var thrownError: APIError?
        do {
            _ = try await service.addFavorite(foodId: "food-bad")
        } catch let error as APIError {
            thrownError = error
        }

        #expect(thrownError != nil)
    }

    // MARK: deleteFavorite

    @Test("deleteFavorite succeeds on 200 empty response")
    func deleteFavoriteSucceeds() async throws {
        MockURLProtocol.reset()
        let json = #"{}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        try await service.deleteFavorite(id: "fav-1")
        // No throw = success
    }

    @Test("deleteFavorite uses DELETE /favorites/{id} endpoint")
    func deleteFavoriteUsesCorrectMethodAndPath() async throws {
        MockURLProtocol.reset()
        let json = #"{}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))
        try await service.deleteFavorite(id: "fav-abc-123")

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("/favorites/fav-abc-123"))
        let method = MockURLProtocol.lastRequest?.httpMethod ?? ""
        #expect(method == "DELETE")
    }

    @Test("deleteFavorite throws on server error")
    func deleteFavoriteThrowsOnServerError() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 500
        MockURLProtocol.stubResponseData = Data()

        let service = FavoriteService(apiClient: APIClient(session: makeFavoriteMockSession()))

        var thrownError: APIError?
        do {
            try await service.deleteFavorite(id: "fav-nonexistent")
        } catch let error as APIError {
            thrownError = error
        }

        if case .serverError(let code) = thrownError! {
            #expect(code == 500)
        } else {
            Issue.record("Expected .serverError(500), got \(String(describing: thrownError))")
        }
    }

    // MARK: Favorite model

    @Test("Favorite model decodes all fields correctly")
    func favoriteModelDecodes() throws {
        let json = """
        {
            "id": "fav-model-1",
            "food_id": "food-model-1",
            "recipe_id": "recipe-model-1",
            "name": "Test Food",
            "created_at": "2026-01-15T12:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let favorite = try decoder.decode(Favorite.self, from: json)

        #expect(favorite.id == "fav-model-1")
        #expect(favorite.foodId == "food-model-1")
        #expect(favorite.recipeId == "recipe-model-1")
        #expect(favorite.name == "Test Food")
        #expect(favorite.createdAt == "2026-01-15T12:00:00Z")
    }

    @Test("Favorite model decodes with nil optional fields")
    func favoriteModelDecodesNilOptionals() throws {
        let json = """
        {
            "id": "fav-model-2",
            "food_id": null,
            "recipe_id": null,
            "name": "Minimal",
            "created_at": "2026-01-15T12:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let favorite = try decoder.decode(Favorite.self, from: json)

        #expect(favorite.id == "fav-model-2")
        #expect(favorite.foodId == nil)
        #expect(favorite.recipeId == nil)
    }
}
