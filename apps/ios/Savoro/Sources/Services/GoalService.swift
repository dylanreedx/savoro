import Foundation

struct GoalService {

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Endpoints

    func fetchCurrent() async throws -> UserGoal {
        try await apiClient.request("/goal/current")
    }

    func saveGoal(_ draft: GoalDraft) async throws -> UserGoal {
        try await apiClient.request("/goal", method: .post, body: draft)
    }
}

// MARK: - Request Body

struct GoalDraft: Encodable {
    let calories: Int
    let protein: Int
    let carb: Int
    let fat: Int
}
