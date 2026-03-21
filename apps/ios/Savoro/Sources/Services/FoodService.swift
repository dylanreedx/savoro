import Foundation

// MARK: - Public Summary Types

struct FoodSearchResult: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let brandName: String?
    let barcode: String?
    let source: FoodSource
    let isVerified: Bool
    let serving: ServingSearchSummary?

    struct ServingSearchSummary: Decodable, Sendable {
        let id: String
        let description: String?
        let amountGrams: Double?
        let calories: Double?
        let protein: Double?
        let carb: Double?
        let fat: Double?
    }
}

struct FoodSummary: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let brandName: String?
    let barcode: String?
    let source: FoodSource
    let isVerified: Bool
}

struct ServingSummary: Decodable, Identifiable, Sendable {
    let id: String
    let description: String
    let amountGrams: Double?
    let isDefault: Bool?
    let calories: Double?
    let protein: Double?
    let carb: Double?
    let fat: Double?
    let saturatedFat: Double?
    let transFat: Double?
    let fiber: Double?
    let sugar: Double?
    let sodium: Double?
}

// MARK: - Private Response Wrappers

private struct SearchResponse: Decodable {
    let foods: [FoodSearchResult]
}

private struct BarcodeResponse: Decodable {
    let food: FoodSummary
    let servings: [ServingSummary]
}

private struct ServingsResponse: Decodable {
    let servings: [ServingSummary]
}

// MARK: - Service

struct FoodService {

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Endpoints

    /// Search foods by query string. Returns up to `limit` results.
    func searchFoods(query: String, limit: Int = 20) async throws -> [FoodSearchResult] {
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            return []
        }
        let response: SearchResponse = try await apiClient.request("/food/search?q=\(encoded)&limit=\(limit)")
        return response.foods
    }

    /// Look up a food by barcode. Returns `nil` if not found (404), rethrows all other errors.
    func lookupBarcode(code: String) async throws -> (FoodSummary, [ServingSummary])? {
        do {
            let response: BarcodeResponse = try await apiClient.request("/food/barcode/\(code)")
            return (response.food, response.servings)
        } catch APIError.notFound {
            return nil
        }
    }

    /// Fetch all servings for a given food ID.
    func getServings(foodId: String) async throws -> [ServingSummary] {
        let response: ServingsResponse = try await apiClient.request("/food/\(foodId)/servings")
        return response.servings
    }
}
