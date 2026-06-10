import Foundation

struct MockAPIClient: APIClient {
    typealias Handler = @Sendable (any APIRequest) async throws -> Data

    private let handler: Handler
    private let decoder: JSONDecoder

    init(decoder: JSONDecoder = JSONDecoder(), handler: @escaping Handler = { request in
        throw MockAPIClientError.unimplemented(request.path)
    }) {
        self.decoder = decoder
        self.handler = handler
    }

    init(responses: [String: Data], decoder: JSONDecoder = JSONDecoder()) {
        self.init(decoder: decoder) { request in
            guard let data = responses[request.path] else {
                throw MockAPIClientError.unimplemented(request.path)
            }
            return data
        }
    }

    init(fixtures: [String: String], bundle: Bundle, decoder: JSONDecoder = .savoro) throws {
        var responses: [String: Data] = [:]
        for (path, fixtureName) in fixtures {
            responses[path] = try FixtureLoader.data(named: fixtureName, bundle: bundle)
        }
        self.init(responses: responses, decoder: decoder)
    }

    static func localLogRecipeSuccess(decoder: JSONDecoder = .savoro) -> MockAPIClient {
        MockAPIClient(decoder: decoder) { request in
            guard request.path == "/mock/logs/recipes",
                  let body = request.body,
                  let payload = try? JSONDecoder.savoro.decode(LogRecipeRequestPayload.self, from: body)
            else {
                throw MockAPIClientError.unimplemented(request.path)
            }
            let now = payload.snapshot.capturedAt
            let entry = try FoodLogEntry(
                id: "mock_log_\(Int(now.timeIntervalSince1970))",
                userId: payload.userId,
                date: payload.date,
                mealType: payload.mealType,
                itemType: .recipe,
                recipeId: payload.recipeId,
                recipeVersionId: payload.recipeVersionId,
                quantity: payload.servings,
                quantityUnit: payload.quantityUnit,
                snapshot: payload.snapshot,
                sourceType: .recipe,
                privacyDomain: payload.privacyDomain,
                createdAt: now,
                updatedAt: now
            )
            return try JSONEncoder.savoro.encode(LogRecipeResponse(entry: entry, dayLog: nil))
        }
    }

    func send<Request: APIRequest>(_ request: Request) async throws -> Request.Response {
        let data = try await handler(request)
        do {
            return try decoder.decode(Request.Response.self, from: data)
        } catch {
            throw MockAPIClientError.decoding(request.path, String(describing: error))
        }
    }
}

enum MockAPIClientError: LocalizedError, Equatable {
    case unimplemented(String)
    case decoding(String, String)

    var errorDescription: String? {
        switch self {
        case .unimplemented(let path):
            return "No mock response is registered for \(path)."
        case .decoding(let path, let error):
            return "Mock response for \(path) could not be decoded: \(error)"
        }
    }
}
