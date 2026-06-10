import Foundation
import Observation

@Observable
final class AppEnvironment {
    let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    static func live(
        baseURL: URL,
        authTokenProvider: @escaping URLSessionAPIClient.AuthTokenProvider = { nil }
    ) -> AppEnvironment {
        AppEnvironment(
            apiClient: URLSessionAPIClient(
                baseURL: baseURL,
                authTokenProvider: authTokenProvider
            )
        )
    }

    static let preview = AppEnvironment(apiClient: MockAPIClient())
}
