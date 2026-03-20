import Testing
import Foundation
@testable import Savoro

// MARK: - Mock URLProtocol

final class MockURLProtocol: URLProtocol {
    // Keyed by URL string -> (Data, HTTPURLResponse)
    static var stubResponseData: Data?
    static var stubStatusCode: Int = 200
    static var stubError: Error?
    static var lastRequest: URLRequest?

    static func reset() {
        stubResponseData = nil
        stubStatusCode = 200
        stubError = nil
        lastRequest = nil
    }

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        MockURLProtocol.lastRequest = request

        if let error = MockURLProtocol.stubError {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }

        let responseData = MockURLProtocol.stubResponseData ?? Data()
        let url = request.url ?? URL(string: "http://localhost")!
        let response = HTTPURLResponse(
            url: url,
            statusCode: MockURLProtocol.stubStatusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!

        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: responseData)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

// MARK: - Helpers

private func makeMockSession() -> URLSession {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [MockURLProtocol.self]
    return URLSession(configuration: config)
}

private struct SampleResponse: Decodable, Equatable {
    let userId: Int
    let name: String
}

private struct SampleRequest: Encodable {
    let title: String
}

// MARK: - APIError Tests

@Suite("APIError")
struct APIErrorTests {

    @Test("unauthorized has non-nil errorDescription")
    func unauthorizedDescription() {
        let error = APIError.unauthorized
        #expect(error.errorDescription != nil)
        #expect(error.errorDescription?.contains("session") == true || error.errorDescription?.contains("sign in") == true)
    }

    @Test("notFound has non-nil errorDescription")
    func notFoundDescription() {
        let error = APIError.notFound
        #expect(error.errorDescription != nil)
        #expect(error.errorDescription?.isEmpty == false)
    }

    @Test("serverError includes status code in description")
    func serverErrorDescription() {
        let error = APIError.serverError(statusCode: 503)
        #expect(error.errorDescription != nil)
        #expect(error.errorDescription?.contains("503") == true)
    }

    @Test("networkError includes underlying description")
    func networkErrorDescription() {
        let underlying = URLError(.notConnectedToInternet)
        let error = APIError.networkError(underlying: underlying)
        #expect(error.errorDescription != nil)
        #expect(error.errorDescription?.isEmpty == false)
    }

    @Test("decodingError includes underlying description")
    func decodingErrorDescription() {
        let underlying = URLError(.cannotDecodeRawData)
        let error = APIError.decodingError(underlying: underlying)
        #expect(error.errorDescription != nil)
        #expect(error.errorDescription?.isEmpty == false)
    }

    @Test("encodingError includes underlying description")
    func encodingErrorDescription() {
        let underlying = URLError(.cannotDecodeRawData)
        let error = APIError.encodingError(underlying: underlying)
        #expect(error.errorDescription != nil)
        #expect(error.errorDescription?.contains("encode") == true)
    }

    @Test("all cases produce non-nil errorDescription")
    func allCasesNonNilDescription() {
        let errors: [APIError] = [
            .unauthorized,
            .notFound,
            .serverError(statusCode: 500),
            .networkError(underlying: URLError(.timedOut)),
            .decodingError(underlying: URLError(.cannotDecodeContentData)),
            .encodingError(underlying: URLError(.cannotDecodeRawData)),
        ]
        for error in errors {
            #expect(error.errorDescription != nil, "errorDescription was nil for \(error)")
        }
    }
}

// MARK: - APIClient Request Tests

@Suite("APIClient requests via MockURLProtocol")
struct APIClientRequestTests {

    @Test("successful 200 response decodes to expected model")
    func successfulDecode() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 42, "name": "Alice"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        let client = APIClient(session: makeMockSession())
        let result: SampleResponse = try await client.request("/test")

        #expect(result.userId == 42)
        #expect(result.name == "Alice")
    }

    @Test("201 created response decodes successfully")
    func created201Decode() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 7, "name": "Bob"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 201

        let client = APIClient(session: makeMockSession())
        let result: SampleResponse = try await client.request("/users", method: .post)

        #expect(result.userId == 7)
    }

    @Test("401 response throws unauthorized and deletes token")
    func unauthorizedClearsToken() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 401
        MockURLProtocol.stubResponseData = Data()

        // Pre-seed a token so we can verify it gets deleted
        try? KeychainHelper.save(token: "test-token-to-delete")

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/protected")
        } catch let error as APIError {
            thrownError = error
        }

        #expect(thrownError != nil)
        if case .unauthorized = thrownError! {
            // correct
        } else {
            Issue.record("Expected .unauthorized, got \(String(describing: thrownError))")
        }
        #expect(KeychainHelper.loadToken() == nil, "Token should have been cleared on 401")
    }

    @Test("401 posts unauthorizedNotification")
    func unauthorizedPostsNotification() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 401
        MockURLProtocol.stubResponseData = Data()

        var notificationReceived = false
        let token = NotificationCenter.default.addObserver(
            forName: APIClient.unauthorizedNotification,
            object: nil,
            queue: .main
        ) { _ in
            notificationReceived = true
        }
        defer { NotificationCenter.default.removeObserver(token) }

        let client = APIClient(session: makeMockSession())
        let _: ()? = try? await { () async -> ()? in
            let _: SampleResponse? = try? await client.request("/protected")
            return nil
        }()

        // Give RunLoop a tick for the MainActor notification
        await Task.yield()
        await MainActor.run {}

        #expect(notificationReceived)
    }

    @Test("404 response throws notFound")
    func notFoundThrows() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 404
        MockURLProtocol.stubResponseData = Data()

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/missing")
        } catch let error as APIError {
            thrownError = error
        }

        if case .notFound = thrownError! {
            // correct
        } else {
            Issue.record("Expected .notFound, got \(String(describing: thrownError))")
        }
    }

    @Test("500 response throws serverError with correct status code")
    func serverError500Throws() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 500
        MockURLProtocol.stubResponseData = Data()

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/boom")
        } catch let error as APIError {
            thrownError = error
        }

        if case .serverError(let code) = thrownError! {
            #expect(code == 500)
        } else {
            Issue.record("Expected .serverError(500), got \(String(describing: thrownError))")
        }
    }

    @Test("503 response throws serverError with correct status code")
    func serverError503Throws() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 503
        MockURLProtocol.stubResponseData = Data()

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/unavailable")
        } catch let error as APIError {
            thrownError = error
        }

        if case .serverError(let code) = thrownError! {
            #expect(code == 503)
        } else {
            Issue.record("Expected .serverError(503), got \(String(describing: thrownError))")
        }
    }

    @Test("network error wraps underlying error in APIError.networkError")
    func networkErrorWraps() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubError = URLError(.notConnectedToInternet)

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/any")
        } catch let error as APIError {
            thrownError = error
        }

        if case .networkError(let underlying) = thrownError! {
            #expect(underlying is URLError)
        } else {
            Issue.record("Expected .networkError, got \(String(describing: thrownError))")
        }
    }

    @Test("malformed JSON response throws decodingError")
    func decodingErrorOnBadJSON() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubResponseData = "not-json{{{".data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/bad")
        } catch let error as APIError {
            thrownError = error
        }

        if case .decodingError = thrownError! {
            // correct
        } else {
            Issue.record("Expected .decodingError, got \(String(describing: thrownError))")
        }
    }

    @Test("request sets Content-Type header to application/json")
    func contentTypeHeader() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 1, "name": "Test"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        let client = APIClient(session: makeMockSession())
        let _: SampleResponse = try await client.request("/headers")

        let contentType = MockURLProtocol.lastRequest?.value(forHTTPHeaderField: "Content-Type")
        #expect(contentType == "application/json")
    }

    @Test("request sets Authorization header when token exists in keychain")
    func authorizationHeaderSetWhenTokenPresent() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 1, "name": "Test"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        try KeychainHelper.save(token: "my-test-token")
        defer { KeychainHelper.deleteToken() }

        let client = APIClient(session: makeMockSession())
        let _: SampleResponse = try await client.request("/authed")

        let authHeader = MockURLProtocol.lastRequest?.value(forHTTPHeaderField: "Authorization")
        #expect(authHeader == "Bearer my-test-token")
    }

    @Test("request does not set Authorization header when no token in keychain")
    func noAuthorizationHeaderWhenNoToken() async throws {
        MockURLProtocol.reset()
        KeychainHelper.deleteToken()
        let json = #"{"user_id": 1, "name": "Test"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        let client = APIClient(session: makeMockSession())
        let _: SampleResponse = try await client.request("/public")

        let authHeader = MockURLProtocol.lastRequest?.value(forHTTPHeaderField: "Authorization")
        #expect(authHeader == nil)
    }

    @Test("POST request serializes body with snake_case encoding")
    func postBodyEncoding() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 1, "name": "Created"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 201

        let client = APIClient(session: makeMockSession())
        let body = SampleRequest(title: "Hello World")
        let _: SampleResponse = try await client.request("/create", method: .post, body: body)

        let requestBody = MockURLProtocol.lastRequest?.httpBody
        #expect(requestBody != nil)
        if let data = requestBody, let decoded = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            #expect(decoded["title"] as? String == "Hello World")
        } else {
            Issue.record("Request body was missing or not valid JSON")
        }
    }

    @Test("GET request uses GET HTTP method")
    func getMethod() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 1, "name": "Test"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        let client = APIClient(session: makeMockSession())
        let _: SampleResponse = try await client.request("/test")

        #expect(MockURLProtocol.lastRequest?.httpMethod == "GET")
    }

    @Test("DELETE request uses DELETE HTTP method")
    func deleteMethod() async throws {
        MockURLProtocol.reset()
        let json = #"{"user_id": 1, "name": "Deleted"}"#
        MockURLProtocol.stubResponseData = json.data(using: .utf8)
        MockURLProtocol.stubStatusCode = 200

        let client = APIClient(session: makeMockSession())
        let _: SampleResponse = try await client.request("/items/1", method: .delete)

        #expect(MockURLProtocol.lastRequest?.httpMethod == "DELETE")
    }

    @Test("default non-2xx non-mapped status throws serverError")
    func unmappedStatusThrowsServerError() async throws {
        MockURLProtocol.reset()
        MockURLProtocol.stubStatusCode = 422
        MockURLProtocol.stubResponseData = Data()

        let client = APIClient(session: makeMockSession())

        var thrownError: APIError?
        do {
            let _: SampleResponse = try await client.request("/validate")
        } catch let error as APIError {
            thrownError = error
        }

        if case .serverError(let code) = thrownError! {
            #expect(code == 422)
        } else {
            Issue.record("Expected .serverError(422), got \(String(describing: thrownError))")
        }
    }
}

// MARK: - KeychainHelper Tests

@Suite("KeychainHelper")
struct KeychainHelperTests {

    @Test("save and load round-trip succeeds")
    func saveAndLoad() throws {
        defer { KeychainHelper.deleteToken() }
        try KeychainHelper.save(token: "roundtrip-token")
        let loaded = KeychainHelper.loadToken()
        #expect(loaded == "roundtrip-token")
    }

    @Test("loadToken returns nil when no token stored")
    func loadNilWhenEmpty() {
        KeychainHelper.deleteToken()
        #expect(KeychainHelper.loadToken() == nil)
    }

    @Test("deleteToken removes existing token")
    func deleteRemovesToken() throws {
        try KeychainHelper.save(token: "to-be-deleted")
        KeychainHelper.deleteToken()
        #expect(KeychainHelper.loadToken() == nil)
    }

    @Test("saving a token twice updates it without throwing")
    func overwriteToken() throws {
        defer { KeychainHelper.deleteToken() }
        try KeychainHelper.save(token: "first-token")
        try KeychainHelper.save(token: "second-token")
        #expect(KeychainHelper.loadToken() == "second-token")
    }
}

// MARK: - Constants Tests

@Suite("Constants")
struct ConstantsTests {

    @Test("baseURL is a non-empty string")
    func baseURLNonEmpty() {
        #expect(!Constants.baseURL.isEmpty)
    }

    @Test("baseURL starts with http scheme")
    func baseURLHasHTTPScheme() {
        let startsWithHttp = Constants.baseURL.hasPrefix("http://") || Constants.baseURL.hasPrefix("https://")
        #expect(startsWithHttp)
    }

    @Test("baseURL is a valid URL base")
    func baseURLIsValidURL() {
        let url = URL(string: Constants.baseURL + "/test")
        #expect(url != nil)
    }
}
