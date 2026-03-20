import Foundation

// MARK: - Auth Response

struct AuthResponse: Decodable {
    let token: String
    let user: User
}

// MARK: - Auth Service

struct AuthService {

    // MARK: Request Bodies

    private struct LoginRequest: Encodable {
        let email: String
        let password: String
    }

    private struct RegisterRequest: Encodable {
        let email: String
        let username: String
        let password: String
    }

    // MARK: Endpoints

    func login(email: String, password: String) async throws -> AuthResponse {
        try await APIClient.shared.request(
            "/auth/login",
            method: .post,
            body: LoginRequest(email: email, password: password)
        )
    }

    func register(email: String, username: String, password: String) async throws -> AuthResponse {
        try await APIClient.shared.request(
            "/auth/register",
            method: .post,
            body: RegisterRequest(email: email, username: username, password: password)
        )
    }

    func fetchMe() async throws -> User {
        try await APIClient.shared.request("/auth/me")
    }
}
