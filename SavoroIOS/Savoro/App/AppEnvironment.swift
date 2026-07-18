import Foundation
import Observation

@Observable
final class AppEnvironment {
    let apiClient: APIClient
    let todayRequestTarget: TodayAPIRequestTarget

    var usesLiveTodayAPI: Bool { todayRequestTarget == .live }

    init(apiClient: APIClient, todayRequestTarget: TodayAPIRequestTarget = .localMock) {
        self.apiClient = apiClient
        self.todayRequestTarget = todayRequestTarget
    }

    static func live(
        baseURL: URL,
        authTokenProvider: @escaping URLSessionAPIClient.AuthTokenProvider = { nil }
    ) -> AppEnvironment {
        AppEnvironment(
            apiClient: URLSessionAPIClient(
                baseURL: baseURL,
                decoder: .savoro,
                authTokenProvider: authTokenProvider
            ),
            todayRequestTarget: .live
        )
    }

    /// Resolves the launch environment only when the caller explicitly allows
    /// live configuration. The app passes `true` in Debug and never does so in
    /// Release, keeping distributed builds self-contained.
    static func configured(
        processEnvironment: [String: String],
        allowsLiveConfiguration: Bool
    ) -> AppEnvironment {
        guard allowsLiveConfiguration,
              let rawBaseURL = processEnvironment["SAVORO_API_BASE_URL"]?.trimmingCharacters(in: .whitespacesAndNewlines),
              !rawBaseURL.isEmpty,
              let baseURL = URL(string: rawBaseURL),
              ["http", "https"].contains(baseURL.scheme?.lowercased() ?? ""),
              baseURL.host != nil,
              let token = processEnvironment["SAVORO_API_TOKEN"]?.trimmingCharacters(in: .whitespacesAndNewlines),
              !token.isEmpty
        else {
            return .localMock
        }

        return .live(baseURL: baseURL, authTokenProvider: { token })
    }

    static func appLaunchEnvironment(
        processEnvironment: [String: String] = ProcessInfo.processInfo.environment
    ) -> AppEnvironment {
#if DEBUG
        configured(processEnvironment: processEnvironment, allowsLiveConfiguration: true)
#else
        configured(processEnvironment: processEnvironment, allowsLiveConfiguration: false)
#endif
    }

    static let localMock = AppEnvironment(apiClient: MockAPIClient.localMockSuccessRoutes())
    static let preview = localMock
}
