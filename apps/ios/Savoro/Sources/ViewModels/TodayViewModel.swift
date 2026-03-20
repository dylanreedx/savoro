import Foundation
import Observation

@MainActor
@Observable
final class TodayViewModel {

    // MARK: State

    var nutrition: DailyNutrition?
    var entries: [LogEntry] = []
    var isLoading = false
    var error: String?

    // MARK: Private

    private static let todayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private var todayString: String {
        Self.todayFormatter.string(from: Date())
    }

    // MARK: Greeting

    var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:  return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default:      return "Good night"
        }
    }

    var formattedDate: String {
        Self.displayDateFormatter.string(from: Date())
    }

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f
    }()

    // MARK: Data Fetching

    func fetchTodayData() async {
        isLoading = true
        error = nil

        do {
            let date = todayString

            async let totalsResponse: DailyLogResponse = APIClient.shared.request(
                "/log?date=\(date)"
            )
            async let entriesResponse: [LogEntry] = APIClient.shared.request(
                "/log/entries?date=\(date)"
            )
            async let goalResponse: UserGoal = APIClient.shared.request(
                "/goal/current"
            )

            let totals = try await totalsResponse.totals
            let fetchedEntries = try await entriesResponse
            let goal: UserGoal? = try? await goalResponse

            nutrition = DailyNutrition(totals: totals, goal: goal)
            entries = fetchedEntries.sorted {
                $0.createdAt < $1.createdAt
            }
        } catch let apiError as APIError {
            error = Self.message(for: apiError)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: Private

    private static func message(for error: APIError) -> String {
        switch error {
        case .unauthorized:     return "Please log in to view your data."
        case .notFound:         return "No data found for today."
        case .serverError:      return "Something went wrong. Pull to retry."
        case .networkError:     return "Unable to reach the server."
        case .decodingError, .encodingError:
            return "An unexpected error occurred."
        }
    }
}
