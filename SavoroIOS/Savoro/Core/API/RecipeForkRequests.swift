import Foundation

/// Local mock mirror of `POST /v1/recipes/:id/fork` from docs/api-contract.md.
/// The server creates a new private draft copy owned by the caller, preserving
/// `forkedFromRecipeId` + `forkedFromVersionId`; the request carries no body and
/// the source recipe is never modified.
struct ForkRecipeResponse: Codable, Equatable, Sendable {
    let recipe: RecipeDetail
}

struct ForkRecipeRequest: APIRequest {
    typealias Response = ForkRecipeResponse

    let recipeId: String

    var path: String { "/mock/recipes/\(recipeId)/fork" }
    var method: HTTPMethod { .post }

    init(recipeId: String) {
        self.recipeId = recipeId
    }
}
