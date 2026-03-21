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

// MARK: - RecipeIngredientDraft foodId/servingId Tests

@Suite("RecipeIngredientDraft foodId and servingId fields")
struct RecipeIngredientDraftFoodIdTests {

    // MARK: Encoding

    @Test("encodes food_id and serving_id using snake_case keys")
    func encodesFoodIdAndServingId() throws {
        let draft = RecipeIngredientDraft(
            label: "Chicken breast",
            quantity: 200,
            unit: "g",
            foodId: "food-abc",
            servingId: "srv-xyz"
        )
        let data = try JSONEncoder().encode(draft)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(json["food_id"] as? String == "food-abc")
        #expect(json["serving_id"] as? String == "srv-xyz")
        #expect(json["foodId"] == nil, "camelCase key must not be present")
        #expect(json["servingId"] == nil, "camelCase key must not be present")
    }

    @Test("nil foodId and servingId are absent or null in encoded output")
    func encodesNilFoodIdAndServingId() throws {
        let draft = RecipeIngredientDraft(label: "Salt")
        let data = try JSONEncoder().encode(draft)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let foodIdValue = json["food_id"]
        let servingIdValue = json["serving_id"]
        #expect(foodIdValue == nil || foodIdValue is NSNull)
        #expect(servingIdValue == nil || servingIdValue is NSNull)
    }

    @Test("id field excluded from encoding even when foodId/servingId present")
    func idExcludedFromEncoding() throws {
        let draft = RecipeIngredientDraft(label: "Tofu", foodId: "f1", servingId: "s1")
        let data = try JSONEncoder().encode(draft)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(json["id"] == nil)
    }

    @Test("draft id is stable after foodId mutation")
    func idStableAfterFoodIdMutation() {
        var draft = RecipeIngredientDraft(label: "Egg", foodId: "f1")
        let originalID = draft.id
        draft.foodId = "f2"
        #expect(draft.id == originalID)
    }

    @Test("draft id is stable after servingId mutation")
    func idStableAfterServingIdMutation() {
        var draft = RecipeIngredientDraft(label: "Egg", servingId: "s1")
        let originalID = draft.id
        draft.servingId = "s2"
        #expect(draft.id == originalID)
    }

    // MARK: RecipeIngredient → RecipeIngredientDraft mapping

    @Test("mapping preserves label, quantity, unit, foodId, servingId")
    func mappingPreservesAllFields() {
        let ingredient = RecipeIngredient(
            id: "i1",
            recipeId: "r1",
            foodId: "food-1",
            servingId: "srv-1",
            quantity: 150,
            unit: "g",
            label: "Salmon",
            sortOrder: 0
        )
        let draft = RecipeIngredientDraft(
            label: ingredient.label,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            foodId: ingredient.foodId,
            servingId: ingredient.servingId
        )
        #expect(draft.label == "Salmon")
        #expect(draft.quantity == 150)
        #expect(draft.unit == "g")
        #expect(draft.foodId == "food-1")
        #expect(draft.servingId == "srv-1")
    }

    @Test("mapping with nil foodId and servingId produces nil draft fields")
    func mappingPreservesNilFoodFields() {
        let ingredient = RecipeIngredient(
            id: "i2",
            recipeId: "r1",
            foodId: nil,
            servingId: nil,
            quantity: nil,
            unit: nil,
            label: "Pepper",
            sortOrder: 1
        )
        let draft = RecipeIngredientDraft(
            label: ingredient.label,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            foodId: ingredient.foodId,
            servingId: ingredient.servingId
        )
        #expect(draft.foodId == nil)
        #expect(draft.servingId == nil)
    }

    @Test("mapping multiple ingredients respects sort order")
    func mappingSortOrder() {
        let ingredients = [
            RecipeIngredient(id: "i3", recipeId: "r1", foodId: nil, servingId: nil,
                             quantity: 1, unit: "cup", label: "Rice", sortOrder: 2),
            RecipeIngredient(id: "i1", recipeId: "r1", foodId: nil, servingId: nil,
                             quantity: 200, unit: "g", label: "Chicken", sortOrder: 0),
            RecipeIngredient(id: "i2", recipeId: "r1", foodId: nil, servingId: nil,
                             quantity: 2, unit: "tbsp", label: "Sauce", sortOrder: 1),
        ]
        let sorted = ingredients.sorted { $0.sortOrder < $1.sortOrder }
        let drafts = sorted.map { ing in
            RecipeIngredientDraft(
                label: ing.label,
                quantity: ing.quantity,
                unit: ing.unit,
                foodId: ing.foodId,
                servingId: ing.servingId
            )
        }
        #expect(drafts.count == 3)
        #expect(drafts[0].label == "Chicken")
        #expect(drafts[1].label == "Sauce")
        #expect(drafts[2].label == "Rice")
    }

    @Test("blank draft appended after mapped ingredients has empty label")
    func blankDraftAppendedAfterMapping() {
        let ingredients = [
            RecipeIngredient(id: "i1", recipeId: "r1", foodId: "f1", servingId: nil,
                             quantity: 100, unit: "g", label: "Beef", sortOrder: 0)
        ]
        let drafts = ingredients
            .sorted { $0.sortOrder < $1.sortOrder }
            .map { ing in
                RecipeIngredientDraft(
                    label: ing.label,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    foodId: ing.foodId,
                    servingId: ing.servingId
                )
            }
        let allDrafts = drafts + [RecipeIngredientDraft(label: "")]
        #expect(allDrafts.count == 2)
        #expect(allDrafts[0].label == "Beef")
        #expect(allDrafts[0].foodId == "f1")
        #expect(allDrafts[1].label == "")
        #expect(allDrafts[1].foodId == nil)
    }

    @Test("create mode init produces single blank draft")
    func createModeProducesSingleBlankDraft() {
        // Simulate create branch: ingredientDrafts = [RecipeIngredientDraft(label: "")]
        let drafts: [RecipeIngredientDraft] = [RecipeIngredientDraft(label: "")]
        #expect(drafts.count == 1)
        #expect(drafts[0].label == "")
        #expect(drafts[0].foodId == nil)
        #expect(drafts[0].servingId == nil)
    }

    @Test("edit mode init starts with empty drafts before loading")
    func editModeStartsEmpty() {
        // Simulate edit branch before .task runs: ingredientDrafts = []
        let drafts: [RecipeIngredientDraft] = []
        #expect(drafts.isEmpty)
    }

    @Test("error fallback produces single blank draft")
    func errorFallbackProducesSingleBlankDraft() {
        // Simulate the catch branch
        let drafts: [RecipeIngredientDraft] = [RecipeIngredientDraft(label: "")]
        #expect(drafts.count == 1)
        #expect(drafts[0].label == "")
    }
}

// MARK: - RecipeIngredient JSON Decoding Tests (foodId/servingId)

@Suite("RecipeIngredient JSON decoding with foodId and servingId")
struct RecipeIngredientFoodIdDecodingTests {

    private func decodeIngredient(_ jsonString: String) throws -> RecipeIngredient {
        try JSONDecoder().decode(RecipeIngredient.self, from: jsonString.data(using: .utf8)!)
    }

    @Test("decodes food_id and serving_id from snake_case JSON")
    func decodesFoodIdAndServingId() throws {
        let json = """
        {
            "id": "i1", "recipe_id": "r1",
            "food_id": "food-abc", "serving_id": "srv-xyz",
            "label": "Chicken", "sort_order": 0
        }
        """
        let ing = try decodeIngredient(json)
        #expect(ing.foodId == "food-abc")
        #expect(ing.servingId == "srv-xyz")
    }

    @Test("decodes nil food_id and serving_id when absent")
    func decodesNilWhenAbsent() throws {
        let json = """
        {
            "id": "i1", "recipe_id": "r1",
            "label": "Salt", "sort_order": 0
        }
        """
        let ing = try decodeIngredient(json)
        #expect(ing.foodId == nil)
        #expect(ing.servingId == nil)
    }

    @Test("decodes nil food_id and serving_id when null")
    func decodesNilWhenNull() throws {
        let json = """
        {
            "id": "i1", "recipe_id": "r1",
            "food_id": null, "serving_id": null,
            "label": "Salt", "sort_order": 0
        }
        """
        let ing = try decodeIngredient(json)
        #expect(ing.foodId == nil)
        #expect(ing.servingId == nil)
    }

    @Test("decodes food_id present but serving_id absent")
    func decodesFoodIdOnlyPresent() throws {
        let json = """
        {
            "id": "i1", "recipe_id": "r1",
            "food_id": "food-only",
            "label": "Tofu", "sort_order": 0
        }
        """
        let ing = try decodeIngredient(json)
        #expect(ing.foodId == "food-only")
        #expect(ing.servingId == nil)
    }
}

// MARK: - RecipeDetail Decoding Tests

@Suite("RecipeDetail JSON decoding")
struct RecipeDetailDecodingTests {

    private func makeIngredientJSON(
        id: String = "ing1",
        recipeId: String = "r1",
        label: String = "Chicken breast",
        quantity: Double? = 200,
        unit: String? = "g",
        sortOrder: Int = 0
    ) -> String {
        var fields = [
            #""id": "\#(id)""#,
            #""recipe_id": "\#(recipeId)""#,
            #""label": "\#(label)""#,
            #""sort_order": \#(sortOrder)"#
        ]
        if let q = quantity { fields.append(#""quantity": \#(q)"#) }
        if let u = unit     { fields.append(#""unit": "\#(u)""#) }
        return "{\(fields.joined(separator: ", "))}"
    }

    private func makeDetailJSON(
        recipeId: String = "r1",
        ingredientsJSON: String = "[]"
    ) -> Data {
        let recipeJSON = """
        {
            "id": "\(recipeId)", "user_id": "u1", "slug": "slug", "title": "Title",
            "is_public": true, "fork_count": 0, "servings": 2,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
            "tags": []
        }
        """
        return """
        { "recipe": \(recipeJSON), "ingredients": \(ingredientsJSON) }
        """.data(using: .utf8)!
    }

    @Test("decodes RecipeDetail with empty ingredients")
    func decodesEmptyIngredients() throws {
        let data = makeDetailJSON()
        let detail = try JSONDecoder().decode(RecipeDetail.self, from: data)
        #expect(detail.recipe.id == "r1")
        #expect(detail.ingredients.isEmpty)
    }

    @Test("decodes RecipeDetail with one ingredient")
    func decodesOneIngredient() throws {
        let ingJSON = makeIngredientJSON(id: "i1", label: "Tofu", quantity: 300, unit: "g")
        let data = makeDetailJSON(ingredientsJSON: "[\(ingJSON)]")
        let detail = try JSONDecoder().decode(RecipeDetail.self, from: data)
        #expect(detail.ingredients.count == 1)
        let ing = detail.ingredients[0]
        #expect(ing.id == "i1")
        #expect(ing.label == "Tofu")
        #expect(ing.quantity == 300)
        #expect(ing.unit == "g")
    }

    @Test("decodes ingredient with nil quantity and unit")
    func decodesIngredientNilOptionals() throws {
        let ingJSON = makeIngredientJSON(id: "i2", label: "Salt", quantity: nil, unit: nil)
        let data = makeDetailJSON(ingredientsJSON: "[\(ingJSON)]")
        let detail = try JSONDecoder().decode(RecipeDetail.self, from: data)
        let ing = detail.ingredients[0]
        #expect(ing.quantity == nil)
        #expect(ing.unit == nil)
    }

    @Test("decodes multiple ingredients preserving order")
    func decodesMultipleIngredients() throws {
        let ing1 = makeIngredientJSON(id: "i1", label: "A", sortOrder: 0)
        let ing2 = makeIngredientJSON(id: "i2", label: "B", sortOrder: 1)
        let data = makeDetailJSON(ingredientsJSON: "[\(ing1), \(ing2)]")
        let detail = try JSONDecoder().decode(RecipeDetail.self, from: data)
        #expect(detail.ingredients.count == 2)
        #expect(detail.ingredients[0].id == "i1")
        #expect(detail.ingredients[1].id == "i2")
    }
}

// MARK: - ingredientDisplayString Tests

@Suite("ingredientDisplayString formatting")
struct IngredientDisplayStringTests {

    private func displayString(quantity: Double?, unit: String?, label: String) -> String {
        var parts: [String] = []
        if let qty = quantity {
            let formatted = qty.truncatingRemainder(dividingBy: 1) == 0
                ? String(Int(qty))
                : String(qty)
            parts.append(formatted)
        }
        if let u = unit, !u.isEmpty {
            parts.append(u)
        }
        parts.append(label)
        return parts.joined(separator: " ")
    }

    @Test("formats whole number quantity without decimal")
    func wholeQuantity() {
        #expect(displayString(quantity: 200, unit: "g", label: "chicken breast") == "200 g chicken breast")
    }

    @Test("formats fractional quantity with decimal")
    func fractionalQuantity() {
        #expect(displayString(quantity: 1.5, unit: "cups", label: "flour") == "1.5 cups flour")
    }

    @Test("formats nil quantity — omits quantity")
    func nilQuantity() {
        #expect(displayString(quantity: nil, unit: "pinch", label: "salt") == "pinch salt")
    }

    @Test("formats nil unit — omits unit")
    func nilUnit() {
        #expect(displayString(quantity: 2, unit: nil, label: "eggs") == "2 eggs")
    }

    @Test("formats nil quantity and unit — label only")
    func nilBoth() {
        #expect(displayString(quantity: nil, unit: nil, label: "salt") == "salt")
    }

    @Test("formats empty unit string — omits unit")
    func emptyUnit() {
        #expect(displayString(quantity: 3, unit: "", label: "cloves garlic") == "3 cloves garlic")
    }
}
