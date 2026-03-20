import Foundation
import Observation

@MainActor
@Observable
final class CookbookViewModel {

    // MARK: State

    var recipes: [Recipe] = []
    var searchText: String = ""
    var isLoading = false
    var error: String?

    var discoverRecipes: [Recipe] = []
    var discoverCursor: String?
    var isLoadingDiscover = false

    // MARK: Dependencies

    private let recipeService: RecipeService

    init(recipeService: RecipeService = RecipeService()) {
        self.recipeService = recipeService
    }

    // MARK: Computed

    var filteredRecipes: [Recipe] {
        guard !searchText.isEmpty else { return recipes }
        return recipes.filter {
            $0.title.localizedCaseInsensitiveContains(searchText)
            || $0.tags.contains { tag in
                tag.localizedCaseInsensitiveContains(searchText)
            }
        }
    }

    // MARK: Data Loading

    func loadRecipes() async {
        isLoading = true
        error = nil

        do {
            recipes = try await recipeService.list()
        } catch let apiError as APIError {
            error = Self.message(for: apiError)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func loadDiscover() async {
        isLoadingDiscover = true

        do {
            let page = try await recipeService.feed()
            discoverRecipes = page.recipes
            discoverCursor = page.nextCursor
        } catch {
            // Silently fail discover -- non-critical
        }

        isLoadingDiscover = false
    }

    func loadMoreDiscover() async {
        guard !isLoadingDiscover, let cursor = discoverCursor else { return }
        isLoadingDiscover = true

        do {
            let page = try await recipeService.feed(cursor: cursor)
            discoverRecipes.append(contentsOf: page.recipes)
            discoverCursor = page.nextCursor
        } catch {
            // Silently fail
        }

        isLoadingDiscover = false
    }

    // MARK: Mutations

    func createRecipe(_ draft: RecipeDraft) async throws -> Recipe {
        let recipe = try await recipeService.create(draft)
        recipes.insert(recipe, at: 0)
        return recipe
    }

    func updateRecipe(_ id: String, _ draft: RecipeDraft) async throws -> Recipe {
        let updated = try await recipeService.update(id, draft: draft)
        if let index = recipes.firstIndex(where: { $0.id == id }) {
            recipes[index] = updated
        }
        return updated
    }

    func deleteRecipe(_ id: String) async throws {
        try await recipeService.delete(id)
        recipes.removeAll { $0.id == id }
    }

    func forkRecipe(_ id: String) async throws -> Recipe {
        let forked = try await recipeService.fork(id)
        recipes.insert(forked, at: 0)
        return forked
    }

    // MARK: Private

    private static func message(for error: APIError) -> String {
        switch error {
        case .unauthorized:     return "Please log in to view your recipes."
        case .notFound:         return "No recipes found."
        case .serverError:      return "Something went wrong. Pull to retry."
        case .networkError:     return "Unable to reach the server."
        case .decodingError, .encodingError:
            return "An unexpected error occurred."
        }
    }
}
