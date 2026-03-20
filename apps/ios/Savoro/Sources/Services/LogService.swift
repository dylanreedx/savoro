import Foundation

struct LogService {

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Endpoints

    /// Fetch daily totals for a given date (YYYY-MM-DD).
    func fetchDailyTotals(date: String) async throws -> DailyLogResponse {
        try await apiClient.request("/log?date=\(date)")
    }

    /// Fetch denormalized log entries for a given date (YYYY-MM-DD).
    func fetchEntries(date: String) async throws -> [LogEntry] {
        try await apiClient.request("/log/entries?date=\(date)")
    }
}
