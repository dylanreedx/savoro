import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeAuthResponseJSON(token: String = "test-token-abc", userId: String = "user-1") -> Data {
    let json = """
    {
        "token": "\(token)",
        "user": {
            "id": "\(userId)",
            "email": "test@example.com",
            "username": "testuser",
            "display_name": "Test User",
            "bio": null,
            "avatar_url": null,
            "is_public": true,
            "apple_id": null,
            "is_apple_private_email": false,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    }
    """
    return json.data(using: .utf8)!
}

private func makeUserJSON(userId: String = "user-1") -> Data {
    let json = """
    {
        "id": "\(userId)",
        "email": "test@example.com",
        "username": "testuser",
        "display_name": "Test User",
        "bio": null,
        "avatar_url": null,
        "is_public": true,
        "apple_id": null,
        "is_apple_private_email": false,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
    """
    return json.data(using: .utf8)!
}

private func makeMockAPIClient() -> APIClient {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [MockURLProtocol.self]
    return APIClient(session: URLSession(configuration: config))
}

// MARK: - AuthResponse Decoding Tests

@Suite("AuthResponse decoding")
struct AuthResponseDecodingTests {

    @Test("decodes token from valid JSON")
    func decodesToken() throws {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let response = try decoder.decode(AuthResponse.self, from: makeAuthResponseJSON(token: "my-token"))
        #expect(response.token == "my-token")
    }

    @Test("decodes nested user from valid JSON")
    func decodesUser() throws {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let response = try decoder.decode(AuthResponse.self, from: makeAuthResponseJSON(userId: "u-42"))
        #expect(response.user.id == "u-42")
        #expect(response.user.email == "test@example.com")
        #expect(response.user.username == "testuser")
    }

    @Test("decodes optional user fields as nil when absent")
    func decodesOptionalFieldsAsNil() throws {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let response = try decoder.decode(AuthResponse.self, from: makeAuthResponseJSON())
        #expect(response.user.bio == nil)
        #expect(response.user.avatarUrl == nil)
        #expect(response.user.appleId == nil)
    }

    @Test("decodes snake_case display_name and is_public fields")
    func decodesSnakeCaseFields() throws {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let response = try decoder.decode(AuthResponse.self, from: makeAuthResponseJSON())
        #expect(response.user.displayName == "Test User")
        #expect(response.user.isPublic == true)
        #expect(response.user.isApplePrivateEmail == false)
    }

    @Test("throws on missing required token field")
    func throwsOnMissingToken() {
        let json = #"{"user": {"id":"1","email":"a@b.com","username":"u","is_public":true,"is_apple_private_email":false,"created_at":"2024-01-01","updated_at":"2024-01-01"}}"#
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        #expect(throws: (any Error).self) {
            try decoder.decode(AuthResponse.self, from: json.data(using: .utf8)!)
        }
    }
}

// MARK: - AuthService Tests

@Suite("AuthService via APIClient")
struct AuthServiceTests {

    @Test("login sends POST to /auth/login with email and password")
    func loginSendsPostRequest() async throws {
        MockURLProtocol.reset()
        KeychainHelper.deleteToken()
        MockURLProtocol.stubResponseData = makeAuthResponseJSON(token: "svc-token")
        MockURLProtocol.stubStatusCode = 200

        let client = makeMockAPIClient()
        let response: AuthResponse = try await client.request(
            "/auth/login",
            method: .post,
            body: ["email": "test@example.com", "password": "secret"]
        )

        #expect(response.token == "svc-token")
        #expect(MockURLProtocol.lastRequest?.url?.path == "/auth/login")
        #expect(MockURLProtocol.lastRequest?.httpMethod == "POST")
    }

    @Test("register sends POST to /auth/register")
    func registerSendsPostRequest() async throws {
        MockURLProtocol.reset()
        KeychainHelper.deleteToken()
        MockURLProtocol.stubResponseData = makeAuthResponseJSON(token: "reg-token", userId: "new-user")
        MockURLProtocol.stubStatusCode = 201

        let client = makeMockAPIClient()
        let response: AuthResponse = try await client.request(
            "/auth/register",
            method: .post,
            body: ["email": "new@example.com", "username": "newuser", "password": "pass123"]
        )

        #expect(response.token == "reg-token")
        #expect(response.user.id == "new-user")
        #expect(MockURLProtocol.lastRequest?.url?.path == "/auth/register")
        #expect(MockURLProtocol.lastRequest?.httpMethod == "POST")
    }

    @Test("fetchMe sends GET to /auth/me")
    func fetchMeSendsGetRequest() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubResponseData = makeUserJSON(userId: "me-123")
        MockURLProtocol.stubStatusCode = 200

        let client = makeMockAPIClient()
        let user: User = try await client.request("/auth/me")

        #expect(user.id == "me-123")
        #expect(MockURLProtocol.lastRequest?.url?.path == "/auth/me")
        #expect(MockURLProtocol.lastRequest?.httpMethod == "GET")
    }

    @Test("login 401 throws APIError.unauthorized")
    func login401ThrowsUnauthorized() async throws {
        MockURLProtocol.reset()
        KeychainHelper.deleteToken()
        MockURLProtocol.stubStatusCode = 401
        MockURLProtocol.stubResponseData = Data()

        let client = makeMockAPIClient()
        var thrownError: APIError?
        do {
            let _: AuthResponse = try await client.request("/auth/login", method: .post, body: nil as String?)
        } catch let error as APIError {
            thrownError = error
        }

        if case .unauthorized = thrownError! {
            // correct
        } else {
            Issue.record("Expected .unauthorized, got \(String(describing: thrownError))")
        }
    }

    @Test("login request body includes email and password keys")
    func loginRequestBodyHasEmailAndPassword() async throws {
        MockURLProtocol.reset()
        KeychainHelper.deleteToken()
        MockURLProtocol.stubResponseData = makeAuthResponseJSON()
        MockURLProtocol.stubStatusCode = 200

        struct LoginBody: Encodable {
            let email: String
            let password: String
        }

        let client = makeMockAPIClient()
        let _: AuthResponse = try await client.request(
            "/auth/login",
            method: .post,
            body: LoginBody(email: "user@test.com", password: "pw")
        )

        guard let bodyData = MockURLProtocol.lastRequest?.httpBody,
              let decoded = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any]
        else {
            Issue.record("Request body was missing or not valid JSON")
            return
        }
        #expect(decoded["email"] as? String == "user@test.com")
        #expect(decoded["password"] as? String == "pw")
    }

    @Test("register request body includes email, username, and password keys")
    func registerRequestBodyHasAllFields() async throws {
        MockURLProtocol.reset()
        KeychainHelper.deleteToken()
        MockURLProtocol.stubResponseData = makeAuthResponseJSON()
        MockURLProtocol.stubStatusCode = 201

        struct RegisterBody: Encodable {
            let email: String
            let username: String
            let password: String
        }

        let client = makeMockAPIClient()
        let _: AuthResponse = try await client.request(
            "/auth/register",
            method: .post,
            body: RegisterBody(email: "new@test.com", username: "newbie", password: "pw123")
        )

        guard let bodyData = MockURLProtocol.lastRequest?.httpBody,
              let decoded = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any]
        else {
            Issue.record("Request body was missing or not valid JSON")
            return
        }
        #expect(decoded["email"] as? String == "new@test.com")
        #expect(decoded["username"] as? String == "newbie")
        #expect(decoded["password"] as? String == "pw123")
    }
}

// MARK: - AuthViewModel Logout Tests
// Note: login() and register() on AuthViewModel call AuthService which uses APIClient.shared.
// Full end-to-end ViewModel tests require DI into AuthService. These tests cover the
// state-management logic that doesn't require network calls.

@Suite("AuthViewModel logout")
@MainActor
struct AuthViewModelLogoutTests {

    @Test("logout clears currentUser so isAuthenticated becomes false")
    func logoutClearsUserAndAuthentication() {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        // Manually seed state to simulate a logged-in user
        vm.currentUser = User(
            id: "u1",
            email: "a@b.com",
            username: "alice",
            displayName: nil,
            bio: nil,
            avatarUrl: nil,
            isPublic: true,
            appleId: nil,
            isApplePrivateEmail: false,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01"
        )
        #expect(vm.isAuthenticated == true)

        vm.logout()

        #expect(vm.currentUser == nil)
        #expect(vm.isAuthenticated == false)
    }

    @Test("logout deletes Keychain token")
    func logoutDeletesKeychainToken() throws {
        // Clear first so AuthViewModel() init does not trigger a network Task
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        // Seed token after VM creation to avoid init network side-effect
        try KeychainHelper.save(token: "to-delete")
        vm.logout()
        #expect(KeychainHelper.loadToken() == nil)
    }

    @Test("logout is safe when already logged out")
    func logoutWhenAlreadyLoggedOut() {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        // Should not crash
        vm.logout()
        vm.logout()
        #expect(vm.currentUser == nil)
        #expect(vm.isAuthenticated == false)
    }
}

// MARK: - AuthViewModel isAuthenticated Tests

@Suite("AuthViewModel isAuthenticated computed property")
@MainActor
struct AuthViewModelIsAuthenticatedTests {

    @Test("isAuthenticated is false when currentUser is nil")
    func isAuthFalseWhenNoUser() {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        vm.currentUser = nil
        #expect(vm.isAuthenticated == false)
    }

    @Test("isAuthenticated is true when currentUser is set")
    func isAuthTrueWhenUserSet() {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        vm.currentUser = User(
            id: "u1",
            email: "a@b.com",
            username: "alice",
            displayName: nil,
            bio: nil,
            avatarUrl: nil,
            isPublic: true,
            appleId: nil,
            isApplePrivateEmail: false,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01"
        )
        #expect(vm.isAuthenticated == true)
    }
}

// MARK: - AuthViewModel 401 Notification Tests

@Suite("AuthViewModel 401 notification handling")
@MainActor
struct AuthViewModelUnauthorizedNotificationTests {

    @Test("unauthorizedNotification clears currentUser")
    func notificationClearsUser() async {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        vm.currentUser = User(
            id: "u1",
            email: "a@b.com",
            username: "alice",
            displayName: nil,
            bio: nil,
            avatarUrl: nil,
            isPublic: true,
            appleId: nil,
            isApplePrivateEmail: false,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01"
        )
        #expect(vm.isAuthenticated == true)

        NotificationCenter.default.post(name: APIClient.unauthorizedNotification, object: nil)

        // Give the RunLoop a tick for the observer callback on Main
        await Task.yield()
        await MainActor.run {}

        #expect(vm.currentUser == nil)
        #expect(vm.isAuthenticated == false)
    }

    @Test("unauthorizedNotification when already logged out is a no-op")
    func notificationWhenNotLoggedIn() async {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        #expect(vm.currentUser == nil)

        NotificationCenter.default.post(name: APIClient.unauthorizedNotification, object: nil)
        await Task.yield()
        await MainActor.run {}

        #expect(vm.currentUser == nil)
    }
}

// MARK: - AuthViewModel errorMessage Tests

@Suite("AuthViewModel errorMessage state")
@MainActor
struct AuthViewModelErrorMessageTests {

    @Test("initial errorMessage is nil")
    func initialErrorMessageIsNil() {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        #expect(vm.errorMessage == nil)
    }

    @Test("initial isLoading is false")
    func initialIsLoadingIsFalse() {
        KeychainHelper.deleteToken()
        let vm = AuthViewModel()
        #expect(vm.isLoading == false)
    }
}
