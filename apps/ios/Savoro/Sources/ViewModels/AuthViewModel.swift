import Foundation
import Observation

@MainActor
@Observable
final class AuthViewModel {

    // MARK: Published State

    var currentUser: User?
    var isLoading = false
    var errorMessage: String?

    // MARK: Computed

    var isAuthenticated: Bool { currentUser != nil }

    // MARK: Dependencies

    private let authService = AuthService()
    nonisolated(unsafe) private var unauthorizedObserver: NSObjectProtocol?

    // MARK: Init

    init() {
        // Observe 401 events from APIClient
        unauthorizedObserver = NotificationCenter.default.addObserver(
            forName: APIClient.unauthorizedNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            MainActor.assumeIsolated {
                self.currentUser = nil
            }
        }

        // Attempt silent re-auth if a token exists
        if KeychainHelper.loadToken() != nil {
            Task { await loadCurrentUser() }
        }
    }

    deinit {
        if let unauthorizedObserver {
            NotificationCenter.default.removeObserver(unauthorizedObserver)
        }
    }

    // MARK: Public Actions

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await authService.login(email: email, password: password)
            try KeychainHelper.save(token: response.token)
            currentUser = response.user
        } catch let error as APIError {
            errorMessage = Self.message(for: error)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func register(email: String, username: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await authService.register(
                email: email,
                username: username,
                password: password
            )
            try KeychainHelper.save(token: response.token)
            currentUser = response.user
        } catch let error as APIError {
            errorMessage = Self.message(for: error)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func logout() {
        KeychainHelper.deleteToken()
        currentUser = nil
    }

    // MARK: Private

    private func loadCurrentUser() async {
        do {
            currentUser = try await authService.fetchMe()
        } catch {
            KeychainHelper.deleteToken()
            currentUser = nil
        }
    }

    private static func message(for error: APIError) -> String {
        switch error {
        case .unauthorized:
            return "Invalid email or password."
        case .notFound:
            return "Account not found."
        case .serverError:
            return "Something went wrong. Please try again."
        case .networkError:
            return "Unable to reach the server. Check your connection."
        case .decodingError, .encodingError:
            return "An unexpected error occurred."
        }
    }
}
