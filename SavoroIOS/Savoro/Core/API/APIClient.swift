import Foundation

protocol APIClient: Sendable {
    func send<Request: APIRequest>(_ request: Request) async throws -> Request.Response
}

protocol APIRequest: Sendable {
    associatedtype Response: Decodable & Sendable

    var path: String { get }
    var method: HTTPMethod { get }
    var queryItems: [URLQueryItem] { get }
    var headers: [String: String] { get }
    var body: Data? { get }
}

extension APIRequest {
    var method: HTTPMethod { .get }
    var queryItems: [URLQueryItem] { [] }
    var headers: [String: String] { [:] }
    var body: Data? { nil }
}

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

struct Endpoint<Response: Decodable & Sendable>: APIRequest {
    let path: String
    var method: HTTPMethod
    var queryItems: [URLQueryItem]
    var headers: [String: String]
    var body: Data?

    init(
        path: String,
        method: HTTPMethod = .get,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        body: Data? = nil
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.headers = headers
        self.body = body
    }
}

struct URLSessionAPIClient: APIClient {
    typealias AuthTokenProvider = @Sendable () async throws -> String?

    let baseURL: URL
    let session: URLSession
    let decoder: JSONDecoder
    let authTokenProvider: AuthTokenProvider

    init(
        baseURL: URL,
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder(),
        authTokenProvider: @escaping AuthTokenProvider = { nil }
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = decoder
        self.authTokenProvider = authTokenProvider
    }

    func send<Request: APIRequest>(_ request: Request) async throws -> Request.Response {
        let urlRequest = try await makeURLRequest(for: request)
        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIClientError.httpStatus(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(Request.Response.self, from: data)
        } catch {
            throw APIClientError.decoding(error)
        }
    }

    func makeURLRequest<Request: APIRequest>(for request: Request) async throws -> URLRequest {
        guard var components = URLComponents(url: baseURL.appending(path: request.path), resolvingAgainstBaseURL: false) else {
            throw APIClientError.invalidURL(request.path)
        }
        components.queryItems = request.queryItems.isEmpty ? nil : request.queryItems

        guard let url = components.url else {
            throw APIClientError.invalidURL(request.path)
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.httpBody = request.body
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")

        if request.body != nil {
            urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        for (name, value) in request.headers {
            urlRequest.setValue(value, forHTTPHeaderField: name)
        }

        if let token = try await authTokenProvider(), !token.isEmpty {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return urlRequest
    }
}

enum APIClientError: Error, Equatable {
    case invalidURL(String)
    case invalidResponse
    case httpStatus(Int)
    case decoding(String)

    static func decoding(_ error: Error) -> APIClientError {
        .decoding(String(describing: error))
    }
}
