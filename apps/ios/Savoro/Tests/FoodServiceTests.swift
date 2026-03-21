import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeFoodMockSession() -> URLSession {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [MockURLProtocol.self]
    return URLSession(configuration: config)
}

// MARK: - FoodService Tests

@Suite("FoodService", .serialized)
struct FoodServiceTests {

    // MARK: searchFoods

    @Test("searchFoods decodes wrapped SearchResponse into [FoodSearchResult]")
    func searchFoodsDecodes() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "foods": [
                {
                    "id": "food-1",
                    "name": "Chicken Breast",
                    "brand_name": "Generic",
                    "barcode": null,
                    "source": "usda",
                    "is_verified": true,
                    "serving": {
                        "id": "srv-1",
                        "description": "100g",
                        "amount_grams": 100.0,
                        "calories": 165.0,
                        "protein": 31.0,
                        "carb": 0.0,
                        "fat": 3.6
                    }
                },
                {
                    "id": "food-2",
                    "name": "Brown Rice",
                    "brand_name": null,
                    "barcode": null,
                    "source": "usda",
                    "is_verified": false,
                    "serving": null
                }
            ]
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let results = try await service.searchFoods(query: "chicken")

        #expect(results.count == 2)
        #expect(results[0].id == "food-1")
        #expect(results[0].name == "Chicken Breast")
        #expect(results[0].brandName == "Generic")
        #expect(results[0].isVerified == true)
        #expect(results[0].serving?.amountGrams == 100.0)
        #expect(results[1].id == "food-2")
        #expect(results[1].serving == nil)
    }

    @Test("searchFoods returns empty array when foods array is empty")
    func searchFoodsEmpty() async throws {
        MockURLProtocol.reset()
        let json = #"{"foods": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let results = try await service.searchFoods(query: "zzz_no_match")

        #expect(results.isEmpty)
    }

    @Test("searchFoods percent-encodes query with spaces")
    func searchFoodsPercentEncodesQuery() async throws {
        MockURLProtocol.reset()
        let json = #"{"foods": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        _ = try await service.searchFoods(query: "brown rice")

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("brown%20rice") || requestURL.contains("brown+rice"))
        #expect(!requestURL.contains("brown rice"))
    }

    @Test("searchFoods uses limit parameter in URL")
    func searchFoodsUsesLimit() async throws {
        MockURLProtocol.reset()
        let json = #"{"foods": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        _ = try await service.searchFoods(query: "apple", limit: 5)

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("limit=5"))
    }

    // MARK: lookupBarcode

    @Test("lookupBarcode decodes food and servings tuple")
    func lookupBarcodeDecodes() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "food": {
                "id": "food-barcode-1",
                "name": "Oat Milk",
                "brand_name": "Oatly",
                "barcode": "012345678901",
                "source": "usda",
                "is_verified": true
            },
            "servings": [
                {
                    "id": "srv-10",
                    "description": "1 cup (240ml)",
                    "amount_grams": 240.0,
                    "is_default": true,
                    "calories": 120.0,
                    "protein": 3.0,
                    "carb": 16.0,
                    "fat": 5.0,
                    "saturated_fat": 0.5,
                    "trans_fat": 0.0,
                    "fiber": 2.0,
                    "sugar": 7.0,
                    "sodium": 100.0
                }
            ]
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let result = try await service.lookupBarcode(code: "012345678901")

        let (food, servings) = try #require(result)
        #expect(food.id == "food-barcode-1")
        #expect(food.name == "Oat Milk")
        #expect(food.brandName == "Oatly")
        #expect(food.barcode == "012345678901")
        #expect(food.isVerified == true)
        #expect(servings.count == 1)
        #expect(servings[0].id == "srv-10")
        #expect(servings[0].description == "1 cup (240ml)")
        #expect(servings[0].isDefault == true)
        #expect(servings[0].calories == 120.0)
        #expect(servings[0].sodium == 100.0)
    }

    @Test("lookupBarcode returns nil on 404 not found")
    func lookupBarcodeReturnsNilOn404() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 404
        MockURLProtocol.stubResponseData = Data()

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let result = try await service.lookupBarcode(code: "000000000000")

        #expect(result == nil)
    }

    @Test("lookupBarcode rethrows non-404 errors")
    func lookupBarcodeRethrowsOtherErrors() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 500
        MockURLProtocol.stubResponseData = Data()

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))

        var thrownError: APIError?
        do {
            _ = try await service.lookupBarcode(code: "999999999999")
        } catch let error as APIError {
            thrownError = error
        }

        if case .serverError(let code) = thrownError! {
            #expect(code == 500)
        } else {
            Issue.record("Expected .serverError(500), got \(String(describing: thrownError))")
        }
    }

    @Test("lookupBarcode uses correct URL path with barcode code")
    func lookupBarcodeUsesCorrectPath() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "food": {
                "id": "f1", "name": "Test", "brand_name": null,
                "barcode": "111222333444", "source": "usda", "is_verified": false
            },
            "servings": []
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        _ = try await service.lookupBarcode(code: "111222333444")

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("/food/barcode/111222333444"))
    }

    // MARK: getServings

    @Test("getServings decodes servings array")
    func getServingsDecodes() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "servings": [
                {
                    "id": "srv-a",
                    "description": "1 slice",
                    "amount_grams": 30.0,
                    "is_default": true,
                    "calories": 80.0,
                    "protein": 3.0,
                    "carb": 15.0,
                    "fat": 1.0,
                    "saturated_fat": null,
                    "trans_fat": null,
                    "fiber": 1.5,
                    "sugar": 2.0,
                    "sodium": 140.0
                },
                {
                    "id": "srv-b",
                    "description": "1 loaf",
                    "amount_grams": 480.0,
                    "is_default": false,
                    "calories": 1280.0,
                    "protein": 48.0,
                    "carb": 240.0,
                    "fat": 16.0,
                    "saturated_fat": null,
                    "trans_fat": null,
                    "fiber": 24.0,
                    "sugar": 32.0,
                    "sodium": 2240.0
                }
            ]
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let servings = try await service.getServings(foodId: "food-bread-1")

        #expect(servings.count == 2)
        #expect(servings[0].id == "srv-a")
        #expect(servings[0].description == "1 slice")
        #expect(servings[0].amountGrams == 30.0)
        #expect(servings[0].isDefault == true)
        #expect(servings[1].id == "srv-b")
        #expect(servings[1].calories == 1280.0)
    }

    @Test("getServings returns empty array when servings is empty")
    func getServingsEmpty() async throws {
        MockURLProtocol.reset()
        let json = #"{"servings": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let servings = try await service.getServings(foodId: "food-no-servings")

        #expect(servings.isEmpty)
    }

    @Test("getServings uses correct URL path with foodId")
    func getServingsUsesCorrectPath() async throws {
        MockURLProtocol.reset()
        let json = #"{"servings": []}"#.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        _ = try await service.getServings(foodId: "food-abc-123")

        let requestURL = MockURLProtocol.lastRequest?.url?.absoluteString ?? ""
        #expect(requestURL.contains("/food/food-abc-123/servings"))
    }

    @Test("getServings decodes optional nutrient fields as nil")
    func getServingsNilNutrients() async throws {
        MockURLProtocol.reset()
        let json = """
        {
            "servings": [
                {
                    "id": "srv-min",
                    "description": "1 unit",
                    "amount_grams": null,
                    "is_default": null,
                    "calories": null,
                    "protein": null,
                    "carb": null,
                    "fat": null,
                    "saturated_fat": null,
                    "trans_fat": null,
                    "fiber": null,
                    "sugar": null,
                    "sodium": null
                }
            ]
        }
        """.data(using: .utf8)!
        MockURLProtocol.stubResponseData = json
        MockURLProtocol.stubStatusCode = 200

        let service = FoodService(apiClient: APIClient(session: makeFoodMockSession()))
        let servings = try await service.getServings(foodId: "food-minimal")

        #expect(servings.count == 1)
        #expect(servings[0].id == "srv-min")
        #expect(servings[0].amountGrams == nil)
        #expect(servings[0].calories == nil)
        #expect(servings[0].saturatedFat == nil)
    }
}
