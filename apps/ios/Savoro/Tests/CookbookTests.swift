import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeDecoder() -> JSONDecoder {
    JSONDecoder()
}

private func makeRecipeJSON(
    id: String = "r1",
    userId: String = "u1",
    slug: String = "my-recipe",
    title: String = "My Recipe",
    isPublic: Bool = true,
    tags: String = #"["vegan","quick"]"#,
    forkCount: Int = 0,
    description: String? = nil,
    instructions: String? = nil,
    prepTime: Int? = nil,
    cookTime: Int? = nil,
    imageUrl: String? = nil,
    caloriesPerServing: Double? = nil,
    proteinPerServing: Double? = nil,
    carbPerServing: Double? = nil,
    fatPerServing: Double? = nil
) -> Data {
    var fields: [String] = [
        #""id": "\#(id)""#,
        #""user_id": "\#(userId)""#,
        #""slug": "\#(slug)""#,
        #""title": "\#(title)""#,
        #""is_public": \#(isPublic)"#,
        #""tags": \#(tags)"#,
        #""fork_count": \#(forkCount)"#,
        #""servings": 2"#,
        #""created_at": "2025-01-01T00:00:00Z""#,
        #""updated_at": "2025-01-01T00:00:00Z""#
    ]
    if let v = description    { fields.append(#""description": "\#(v)""#) }
    if let v = instructions   { fields.append(#""instructions": "\#(v)""#) }
    if let v = prepTime       { fields.append(#""prep_time": \#(v)"#) }
    if let v = cookTime       { fields.append(#""cook_time": \#(v)"#) }
    if let v = imageUrl       { fields.append(#""image_url": "\#(v)""#) }
    if let v = caloriesPerServing { fields.append(#""calories_per_serving": \#(v)"#) }
    if let v = proteinPerServing  { fields.append(#""protein_per_serving": \#(v)"#) }
    if let v = carbPerServing     { fields.append(#""carb_per_serving": \#(v)"#) }
    if let v = fatPerServing      { fields.append(#""fat_per_serving": \#(v)"#) }
    let body = fields.joined(separator: ", ")
    return "{\(body)}".data(using: .utf8)!
}

private func makeRecipe(
    id: String = "r1",
    title: String = "My Recipe",
    tags: [String] = []
) -> Recipe {
    Recipe(id: id, userId: "u1", slug: "slug", title: title, tags: tags)
}

// MARK: - Recipe JSON Decoding Tests

@Suite("Recipe JSON decoding")
struct RecipeDecodingTests {

    @Test("decodes required fields from snake_case JSON")
    func decodesRequiredFields() throws {
        let data = makeRecipeJSON(
            id: "abc",
            userId: "u42",
            slug: "pasta-bake",
            title: "Pasta Bake",
            isPublic: true,
            forkCount: 5
        )
        let recipe = try makeDecoder().decode(Recipe.self, from: data)
        #expect(recipe.id == "abc")
        #expect(recipe.userId == "u42")
        #expect(recipe.slug == "pasta-bake")
        #expect(recipe.title == "Pasta Bake")
        #expect(recipe.isPublic == true)
        #expect(recipe.forkCount == 5)
        #expect(recipe.servings == 2)
        #expect(recipe.createdAt == "2025-01-01T00:00:00Z")
        #expect(recipe.updatedAt == "2025-01-01T00:00:00Z")
    }

    @Test("tags decodes from JSON array")
    func tagsFromArray() throws {
        let data = makeRecipeJSON(tags: #"["breakfast","high-protein"]"#)
        let recipe = try makeDecoder().decode(Recipe.self, from: data)
        #expect(recipe.tags == ["breakfast", "high-protein"])
    }

    @Test("tags decodes from JSON-encoded string (dual-decode fallback)")
    func tagsFromJSONString() throws {
        let data = makeRecipeJSON(tags: #""{\"0\":\"vegan\",\"1\":\"quick\"}"#)
        // Build a minimal JSON where tags is a string encoding a JSON array
        let jsonString = """
        {
            "id": "r1", "user_id": "u1", "slug": "s", "title": "T",
            "is_public": true, "fork_count": 0, "servings": 1,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
            "tags": "[\\\"vegan\\\",\\\"quick\\\"]"
        }
        """
        let recipe = try makeDecoder().decode(Recipe.self, from: jsonString.data(using: .utf8)!)
        #expect(recipe.tags == ["vegan", "quick"])
    }

    @Test("tags falls back to empty array when field is missing")
    func tagsMissingFieldFallback() throws {
        let jsonString = """
        {
            "id": "r1", "user_id": "u1", "slug": "s", "title": "T",
            "is_public": false, "fork_count": 0, "servings": 1,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z"
        }
        """
        let recipe = try makeDecoder().decode(Recipe.self, from: jsonString.data(using: .utf8)!)
        #expect(recipe.tags == [])
    }

    @Test("tags falls back to empty array when field is null")
    func tagsMissingNullFallback() throws {
        let jsonString = """
        {
            "id": "r1", "user_id": "u1", "slug": "s", "title": "T",
            "is_public": false, "fork_count": 0, "servings": 1,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
            "tags": null
        }
        """
        let recipe = try makeDecoder().decode(Recipe.self, from: jsonString.data(using: .utf8)!)
        #expect(recipe.tags == [])
    }

    @Test("tags falls back to empty array when field is unparseable string")
    func tagsUnparseableStringFallback() throws {
        let jsonString = """
        {
            "id": "r1", "user_id": "u1", "slug": "s", "title": "T",
            "is_public": false, "fork_count": 0, "servings": 1,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
            "tags": "not-json"
        }
        """
        let recipe = try makeDecoder().decode(Recipe.self, from: jsonString.data(using: .utf8)!)
        #expect(recipe.tags == [])
    }

    @Test("optional fields are nil when absent")
    func optionalFieldsNilWhenAbsent() throws {
        let data = makeRecipeJSON()
        let recipe = try makeDecoder().decode(Recipe.self, from: data)
        #expect(recipe.description == nil)
        #expect(recipe.instructions == nil)
        #expect(recipe.prepTime == nil)
        #expect(recipe.cookTime == nil)
        #expect(recipe.imageUrl == nil)
        #expect(recipe.caloriesPerServing == nil)
        #expect(recipe.proteinPerServing == nil)
        #expect(recipe.carbPerServing == nil)
        #expect(recipe.fatPerServing == nil)
    }

    @Test("optional fields decode when present")
    func optionalFieldsDecodeWhenPresent() throws {
        let data = makeRecipeJSON(
            description: "A tasty dish",
            instructions: "Step 1",
            prepTime: 10,
            cookTime: 30,
            imageUrl: "https://example.com/img.jpg",
            caloriesPerServing: 420.5,
            proteinPerServing: 28.0,
            carbPerServing: 45.0,
            fatPerServing: 14.0
        )
        let recipe = try makeDecoder().decode(Recipe.self, from: data)
        #expect(recipe.description == "A tasty dish")
        #expect(recipe.instructions == "Step 1")
        #expect(recipe.prepTime == 10)
        #expect(recipe.cookTime == 30)
        #expect(recipe.imageUrl == "https://example.com/img.jpg")
        #expect(recipe.caloriesPerServing == 420.5)
        #expect(recipe.proteinPerServing == 28.0)
        #expect(recipe.carbPerServing == 45.0)
        #expect(recipe.fatPerServing == 14.0)
    }

    @Test("throws when required field id is missing")
    func throwsOnMissingId() {
        let jsonString = """
        {
            "user_id": "u1", "slug": "s", "title": "T",
            "is_public": false, "fork_count": 0, "servings": 1,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
            "tags": []
        }
        """
        #expect(throws: (any Error).self) {
            try makeDecoder().decode(Recipe.self, from: jsonString.data(using: .utf8)!)
        }
    }

    @Test("throws when required field title is missing")
    func throwsOnMissingTitle() {
        let jsonString = """
        {
            "id": "r1", "user_id": "u1", "slug": "s",
            "is_public": false, "fork_count": 0, "servings": 1,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
            "tags": []
        }
        """
        #expect(throws: (any Error).self) {
            try makeDecoder().decode(Recipe.self, from: jsonString.data(using: .utf8)!)
        }
    }

    @Test("decodes isPublic false")
    func decodesIsPublicFalse() throws {
        let data = makeRecipeJSON(isPublic: false)
        let recipe = try makeDecoder().decode(Recipe.self, from: data)
        #expect(recipe.isPublic == false)
    }

    @Test("decodes empty tags array")
    func decodesEmptyTagsArray() throws {
        let data = makeRecipeJSON(tags: "[]")
        let recipe = try makeDecoder().decode(Recipe.self, from: data)
        #expect(recipe.tags.isEmpty)
    }

    @Test("decodes FeedPage with recipes and nextCursor")
    func decodesFeedPage() throws {
        let jsonString = """
        {
            "recipes": [],
            "next_cursor": "cursor-abc"
        }
        """
        let page = try makeDecoder().decode(FeedPage.self, from: jsonString.data(using: .utf8)!)
        #expect(page.recipes.isEmpty)
        #expect(page.nextCursor == "cursor-abc")
    }

    @Test("decodes FeedPage with null nextCursor")
    func decodesFeedPageNullCursor() throws {
        let jsonString = """
        {
            "recipes": [],
            "next_cursor": null
        }
        """
        let page = try makeDecoder().decode(FeedPage.self, from: jsonString.data(using: .utf8)!)
        #expect(page.nextCursor == nil)
    }
}

// MARK: - CookbookViewModel Filtering Tests

@Suite("CookbookViewModel filtering")
@MainActor
struct CookbookViewModelFilteringTests {

    private func makeVM(recipes: [Recipe]) -> CookbookViewModel {
        let vm = CookbookViewModel()
        vm.recipes = recipes
        return vm
    }

    @Test("empty searchText returns all recipes")
    func emptySearchReturnsAll() {
        let recipes = [
            makeRecipe(id: "1", title: "Pasta"),
            makeRecipe(id: "2", title: "Salad"),
            makeRecipe(id: "3", title: "Soup")
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = ""
        #expect(vm.filteredRecipes.count == 3)
    }

    @Test("searchText matches title case-insensitively")
    func searchMatchesTitleCaseInsensitive() {
        let recipes = [
            makeRecipe(id: "1", title: "Spicy Chicken"),
            makeRecipe(id: "2", title: "Overnight Oats"),
            makeRecipe(id: "3", title: "CHICKEN Stir Fry")
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "chicken"
        let results = vm.filteredRecipes
        #expect(results.count == 2)
        #expect(results.map(\.id).contains("1"))
        #expect(results.map(\.id).contains("3"))
    }

    @Test("searchText with no match returns empty array")
    func searchNoMatchReturnsEmpty() {
        let recipes = [
            makeRecipe(id: "1", title: "Pasta"),
            makeRecipe(id: "2", title: "Salad")
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "pizza"
        #expect(vm.filteredRecipes.isEmpty)
    }

    @Test("searchText matches tags case-insensitively")
    func searchMatchesTagsCaseInsensitive() {
        let recipes = [
            makeRecipe(id: "1", title: "Bowl", tags: ["Vegan", "quick"]),
            makeRecipe(id: "2", title: "Steak", tags: ["high-protein"]),
            makeRecipe(id: "3", title: "Smoothie", tags: ["vegan", "breakfast"])
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "VEGAN"
        let results = vm.filteredRecipes
        #expect(results.count == 2)
        #expect(results.map(\.id).contains("1"))
        #expect(results.map(\.id).contains("3"))
    }

    @Test("searchText matches on title or tags — at least one is sufficient")
    func searchMatchesTitleOrTags() {
        let recipes = [
            makeRecipe(id: "1", title: "Chicken Bowl", tags: ["quick"]),
            makeRecipe(id: "2", title: "Rice", tags: ["chicken", "dinner"])
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "chicken"
        #expect(vm.filteredRecipes.count == 2)
    }

    @Test("whitespace-only searchText is treated as non-empty and filters")
    func whiteSpaceSearchFilters() {
        let recipes = [
            makeRecipe(id: "1", title: "Pasta")
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "   "
        // localizedCaseInsensitiveContains("   ") on a non-whitespace string returns false
        #expect(vm.filteredRecipes.isEmpty)
    }

    @Test("filteredRecipes on empty recipe list returns empty")
    func emptyRecipeListReturnsEmpty() {
        let vm = makeVM(recipes: [])
        vm.searchText = "anything"
        #expect(vm.filteredRecipes.isEmpty)
    }

    @Test("filteredRecipes returns all when recipe list is empty and search is empty")
    func emptyRecipeListEmptySearchReturnsEmpty() {
        let vm = makeVM(recipes: [])
        vm.searchText = ""
        #expect(vm.filteredRecipes.isEmpty)
    }

    @Test("partial title match returns recipe")
    func partialTitleMatch() {
        let recipes = [makeRecipe(id: "1", title: "Overnight Oats")]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "night"
        #expect(vm.filteredRecipes.count == 1)
    }

    @Test("exact title match returns single recipe")
    func exactTitleMatch() {
        let recipes = [
            makeRecipe(id: "1", title: "Tacos"),
            makeRecipe(id: "2", title: "Taco Salad")
        ]
        let vm = makeVM(recipes: recipes)
        vm.searchText = "Tacos"
        #expect(vm.filteredRecipes.count == 1)
        #expect(vm.filteredRecipes[0].id == "1")
    }
}

// MARK: - RecipeIngredientDraft Identity Tests

@Suite("RecipeIngredientDraft identity")
struct RecipeIngredientDraftIdentityTests {

    @Test("newly created draft has a UUID id")
    func newDraftHasUUID() {
        let draft = RecipeIngredientDraft(label: "Flour")
        #expect(draft.id != UUID(uuidString: "00000000-0000-0000-0000-000000000000"))
    }

    @Test("two drafts with same label have distinct UUIDs")
    func twoDistinctDrafts() {
        let a = RecipeIngredientDraft(label: "Sugar")
        let b = RecipeIngredientDraft(label: "Sugar")
        #expect(a.id != b.id)
    }

    @Test("adding a draft appends and preserves existing UUIDs")
    func addPreservesExistingUUIDs() {
        var drafts: [RecipeIngredientDraft] = [
            RecipeIngredientDraft(label: "Flour"),
            RecipeIngredientDraft(label: "Eggs")
        ]
        let originalIDs = drafts.map(\.id)
        drafts.append(RecipeIngredientDraft(label: "Butter"))
        #expect(drafts.count == 3)
        #expect(drafts[0].id == originalIDs[0])
        #expect(drafts[1].id == originalIDs[1])
    }

    @Test("removing a draft by id preserves remaining UUIDs")
    func removeByIDPreservesOthers() {
        var drafts: [RecipeIngredientDraft] = [
            RecipeIngredientDraft(label: "A"),
            RecipeIngredientDraft(label: "B"),
            RecipeIngredientDraft(label: "C")
        ]
        let idToRemove = drafts[1].id
        let remainingIDs = [drafts[0].id, drafts[2].id]
        drafts.removeAll { $0.id == idToRemove }
        #expect(drafts.count == 2)
        #expect(drafts.map(\.id) == remainingIDs)
    }

    @Test("removing first draft leaves remaining with correct UUIDs")
    func removeFirstPreservesRest() {
        var drafts: [RecipeIngredientDraft] = [
            RecipeIngredientDraft(label: "X"),
            RecipeIngredientDraft(label: "Y")
        ]
        let yID = drafts[1].id
        drafts.removeFirst()
        #expect(drafts.count == 1)
        #expect(drafts[0].id == yID)
    }

    @Test("removing last draft leaves remaining with correct UUIDs")
    func removeLastPreservesRest() {
        var drafts: [RecipeIngredientDraft] = [
            RecipeIngredientDraft(label: "X"),
            RecipeIngredientDraft(label: "Y")
        ]
        let xID = drafts[0].id
        drafts.removeLast()
        #expect(drafts.count == 1)
        #expect(drafts[0].id == xID)
    }

    @Test("draft id is stable across label mutation")
    func idStableAfterLabelMutation() {
        var draft = RecipeIngredientDraft(label: "Flour")
        let originalID = draft.id
        draft.label = "Whole Wheat Flour"
        #expect(draft.id == originalID)
    }

    @Test("draft id is stable across quantity mutation")
    func idStableAfterQuantityMutation() {
        var draft = RecipeIngredientDraft(label: "Salt", quantity: 1.0, unit: "tsp")
        let originalID = draft.id
        draft.quantity = 2.5
        #expect(draft.id == originalID)
    }

    @Test("draft encodes without id field (CodingKeys excludes id)")
    func draftEncodesWithoutIdField() throws {
        let draft = RecipeIngredientDraft(label: "Garlic", quantity: 2.0, unit: "cloves")
        let data = try JSONEncoder().encode(draft)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(json["label"] as? String == "Garlic")
        #expect(json["quantity"] as? Double == 2.0)
        #expect(json["unit"] as? String == "cloves")
        #expect(json["id"] == nil)
    }

    @Test("draft with nil quantity and unit encodes correctly")
    func draftWithNilOptionalFields() throws {
        let draft = RecipeIngredientDraft(label: "Salt")
        let data = try JSONEncoder().encode(draft)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(json["label"] as? String == "Salt")
        // nil optionals are omitted or null — key should not be present or value is NSNull
        let quantityValue = json["quantity"]
        #expect(quantityValue == nil || quantityValue is NSNull)
    }
}
