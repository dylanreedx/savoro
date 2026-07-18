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
            try logRecipeResponseData(for: request)
        }
    }

    static func localLogFoodSuccess(decoder: JSONDecoder = .savoro) -> MockAPIClient {
        MockAPIClient(decoder: decoder) { request in
            try logFoodResponseData(for: request)
        }
    }

    /// Local mock mirror of `POST /v1/recipes/:id/fork`: creates a new private
    /// draft copy owned by the viewer, attributed to the source recipe and its
    /// frozen current version. The source fixture is never modified.
    static func localForkRecipeSuccess(decoder: JSONDecoder = .savoro) -> MockAPIClient {
        MockAPIClient(decoder: decoder) { request in
            try forkRecipeResponseData(for: request)
        }
    }

    /// Single client serving every local mock success route used by the app shell.
    static func localMockSuccessRoutes(decoder: JSONDecoder = .savoro) -> MockAPIClient {
        MockAPIClient(decoder: decoder) { request in
            switch request.path {
            case "/mock/logs/recipes":
                return try logRecipeResponseData(for: request)
            case "/mock/logs/foods":
                return try logFoodResponseData(for: request)
            default:
                return try forkRecipeResponseData(for: request)
            }
        }
    }

    private static func logRecipeResponseData(for request: any APIRequest) throws -> Data {
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

    private static func logFoodResponseData(for request: any APIRequest) throws -> Data {
        guard request.path == "/mock/logs/foods",
              let body = request.body,
              let payload = try? JSONDecoder.savoro.decode(LogFoodRequestPayload.self, from: body)
        else {
            throw MockAPIClientError.unimplemented(request.path)
        }
        let now = Date()
        let entry = try FoodLogEntry(
            id: "mock_food_\(Int(now.timeIntervalSince1970))",
            userId: "user_1",
            date: payload.date,
            mealType: payload.mealType,
            itemType: .food,
            quantity: payload.quantity,
            quantityUnit: payload.quantityUnit,
            snapshot: NutritionSnapshot(
                displayName: payload.displayName,
                macros: payload.macros,
                sourceLabel: nil,
                capturedAt: now
            ),
            sourceType: .manual,
            createdAt: now,
            updatedAt: now
        )
        return try JSONEncoder.savoro.encode(LogRecipeResponse(entry: entry, dayLog: nil))
    }

    private static func forkRecipeResponseData(for request: any APIRequest, now: Date = Date()) throws -> Data {
        guard request.method == .post,
              request.path.hasPrefix("/mock/recipes/"),
              request.path.hasSuffix("/fork")
        else {
            throw MockAPIClientError.unimplemented(request.path)
        }
        let recipeId = String(request.path.dropFirst("/mock/recipes/".count).dropLast("/fork".count))
        let source = RecipeDetail.mockFixture(forRoutedId: recipeId)
        guard source.summary.id == recipeId, source.summary.viewerState.canFork else {
            throw MockAPIClientError.unimplemented(request.path)
        }

        // Build the copy server-style: re-shape the source JSON into a new
        // private draft recipe owned by the viewer, never touching the source.
        let sourceData = try JSONEncoder.savoro.encode(source)
        guard var detail = try JSONSerialization.jsonObject(with: sourceData) as? [String: Any],
              var summary = detail["summary"] as? [String: Any],
              var version = detail["currentVersion"] as? [String: Any],
              let ingredients = detail["ingredients"] as? [[String: Any]],
              let steps = detail["steps"] as? [[String: Any]],
              var provenance = detail["provenance"] as? [String: Any]
        else {
            throw MockAPIClientError.unimplemented(request.path)
        }

        let forkRecipeId = "fork_\(source.summary.id)"
        let forkVersionId = "fork_\(source.currentVersion.id)_v1"
        let nowString = ISO8601DateFormatter().string(from: now)

        summary["id"] = forkRecipeId
        summary["ownerUserId"] = "user_1"
        summary["slug"] = "\(source.summary.slug)-private-remix"
        summary["visibility"] = RecipeVisibility.private.rawValue
        summary["status"] = RecipeStatus.draft.rawValue
        summary["currentVersionId"] = forkVersionId
        summary["forkedFromRecipeId"] = source.summary.id
        summary["forkedFromVersionId"] = source.currentVersion.id
        summary["creator"] = ["userId": "user_1", "username": "home_cook", "displayName": "You"]
        summary["viewerState"] = ["isOwner": true, "isSaved": false, "canFork": false, "canLog": true]
        summary["createdAt"] = nowString
        summary["updatedAt"] = nowString

        version["id"] = forkVersionId
        version["recipeId"] = forkRecipeId
        version["versionNumber"] = 1
        version["createdByUserId"] = "user_1"
        version.removeValue(forKey: "publishedAt")
        version["createdAt"] = nowString

        func rehomed(_ items: [[String: Any]]) -> [[String: Any]] {
            items.map { item in
                var copy = item
                copy["recipeVersionId"] = forkVersionId
                if let id = copy["id"] as? String { copy["id"] = "fork_\(id)" }
                return copy
            }
        }

        var attributions = provenance["attributions"] as? [[String: Any]] ?? []
        attributions.append([
            "sourceType": ProvenanceSourceType.recipe.rawValue,
            "sourceId": source.summary.id,
            "sourceRevision": source.currentVersion.id,
            "displayName": source.summary.creator.displayName,
            "isVerified": false
        ])
        provenance["attributions"] = attributions

        detail["summary"] = summary
        detail["currentVersion"] = version
        detail["ingredients"] = rehomed(ingredients)
        detail["steps"] = rehomed(steps)
        detail["provenance"] = provenance

        return try JSONSerialization.data(withJSONObject: ["recipe": detail])
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
        case .unimplemented:
            return "This action isn’t available right now."
        case .decoding:
            return "We couldn’t complete this action. Please try again."
        }
    }
}
