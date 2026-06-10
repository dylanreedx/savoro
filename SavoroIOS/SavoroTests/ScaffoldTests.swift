import Foundation
import SwiftUI
import XCTest
@testable import Savoro

final class ScaffoldTests: XCTestCase {
    func testPreviewEnvironmentUsesMockAPIClient() {
        XCTAssertTrue(AppEnvironment.preview.apiClient is MockAPIClient)
    }

    func testFixtureLoaderDecodesBundledJSONFixture() throws {
        let response = try FixtureLoader.decode(
            SampleResponse.self,
            named: "health",
            bundle: Bundle(for: Self.self)
        )

        XCTAssertEqual(response.message, "ready from fixture")
    }

    func testFixtureLoaderAcceptsJSONExtensionInFixtureName() throws {
        let response = try FixtureLoader.decode(
            SampleResponse.self,
            named: "health.json",
            bundle: Bundle(for: Self.self)
        )

        XCTAssertEqual(response.message, "ready from fixture")
    }

    func testMockAPIClientDecodesRegisteredResponse() async throws {
        let data = try JSONEncoder().encode(SampleResponse(message: "ready"))
        let client = MockAPIClient(responses: ["/health": data])

        let response: SampleResponse = try await client.send(Endpoint(path: "/health"))

        XCTAssertEqual(response.message, "ready")
    }

    func testMockAPIClientDecodesFixtureResponse() async throws {
        let client = try MockAPIClient(
            fixtures: ["/health": "health"],
            bundle: Bundle(for: Self.self)
        )

        let response: SampleResponse = try await client.send(Endpoint(path: "/health"))

        XCTAssertEqual(response.message, "ready from fixture")
    }

    @MainActor
    func testPlaceholderFeatureViewsCanBeConstructed() {
        _ = RootPlaceholderView()
        _ = SavoroTabShellView()
        _ = TodayPlaceholderView()
        _ = CookbookPlaceholderView()
        _ = DiscoverPlaceholderView()
        _ = CommunityPlaceholderView()
        _ = ProfilePlaceholderView()
        _ = LoggingPlaceholderView()
        _ = RecipeDetailPlaceholderView()
        _ = RecipeEditorPlaceholderView()
        var visibilityOption: RecipeVisibilityOption = .keepPrivate
        _ = RecipeVisibilityOptionSheetView(selectedOption: Binding(get: { visibilityOption }, set: { visibilityOption = $0 }))
        _ = SavoroPlaceholderSheetView(route: .logPicker())
        _ = LogPickerPlaceholderView(mealType: .lunch)
        _ = LogRecipeSheetView(viewModel: LogRecipeSheetViewModel(requestedRecipeId: nil))

        var toast: SavoroToast? = .scaffoldDemo
        let toastBinding = Binding(get: { toast }, set: { toast = $0 })
        _ = EmptyView().savoroToast(toastBinding)
    }

    func testTodaySummaryViewModelUsesPrivateFrozenFixtureTotals() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )
        let goals = try MacroTotals(calories: 2200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70)
        let viewModel = TodaySummaryViewModel(dayLog: dayLog, goals: goals)

        XCTAssertEqual(viewModel.greeting, "Hi, Avery")
        XCTAssertEqual(viewModel.reassuranceText, "Your food logs and goals are private by default.")
        XCTAssertEqual(viewModel.totals.calories, 670)
        XCTAssertEqual(viewModel.totals.proteinGrams, 62)
        XCTAssertEqual(viewModel.totals.carbsGrams, 56)
        XCTAssertEqual(viewModel.totals.fatGrams, 22)
        XCTAssertEqual(viewModel.loggedMealCount, 2)
        XCTAssertEqual(viewModel.macroValues.map(\.kind), [.calories, .protein, .carbs, .fat])
        XCTAssertEqual(viewModel.quickActions, [.addMeal, .logRecipe, .createRecipe])
        XCTAssertEqual(viewModel.recentLogAgainItems.map(\.title), ["Greek Yogurt", "Chicken Shawarma Bowl"])
        XCTAssertTrue(viewModel.summarySubtitle.localizedCaseInsensitiveContains("no pressure"))
        XCTAssertEqual(dayLog.privacyDomain, .privateUserData)
    }

    func testTodayCalorieAndMacroProgressValuesUseFixtureGoals() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )
        let goals = try MacroTotals(calories: 2200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70)
        let viewModel = TodaySummaryViewModel(dayLog: dayLog, goals: goals)

        XCTAssertEqual(viewModel.calorieProgress.kind, .calories)
        XCTAssertEqual(viewModel.calorieProgress.value, 670)
        XCTAssertEqual(viewModel.calorieProgress.goal, 2200)
        XCTAssertEqual(viewModel.calorieProgressFraction, 670.0 / 2200.0, accuracy: 0.0001)
        XCTAssertEqual(viewModel.macroProgressValues.map(\.kind), [.protein, .carbs, .fat])
        XCTAssertEqual(viewModel.macroProgressValues.map(\.goal), [160, 220, 70])
    }

    func testTodayMealSectionsGroupAllMealTypesWithEmptyStates() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = TodaySummaryViewModel(dayLog: dayLog)

        XCTAssertEqual(viewModel.mealSections.map(\.mealType), MealType.allCases)
        XCTAssertEqual(viewModel.mealSections.map(\.title), ["Breakfast", "Lunch", "Dinner", "Snack"])
        XCTAssertEqual(viewModel.mealSections.first(where: { $0.mealType == .lunch })?.entries.count, 1)
        XCTAssertEqual(viewModel.mealSections.first(where: { $0.mealType == .snack })?.entries.count, 1)
        XCTAssertTrue(viewModel.mealSections.first(where: { $0.mealType == .breakfast })?.isEmpty == true)
        XCTAssertTrue(viewModel.mealSections.first(where: { $0.mealType == .dinner })?.isEmpty == true)
    }

    func testTodayMealSectionsFlattenDuplicateMealTypeBuckets() throws {
        let firstLunch = try makeFoodLogEntry(id: "lunch_first", displayName: "Chicken Shawarma Bowl", calories: 520, mealType: .lunch)
        let secondLunch = try makeFoodLogEntry(id: "lunch_second", displayName: "Lentil Soup", calories: 320, mealType: .lunch)
        let snack = try makeFoodLogEntry(id: "snack_first", displayName: "Greek Yogurt", calories: 150, mealType: .snack)
        let dayLog = try DayLog(userId: "user_1", date: "2026-06-06", meals: [
            try MealLog(mealType: .lunch, entries: [firstLunch]),
            try MealLog(mealType: .lunch, entries: [secondLunch]),
            try MealLog(mealType: .snack, entries: [snack])
        ])

        let viewModel = TodaySummaryViewModel(dayLog: dayLog)
        let lunchSection = try XCTUnwrap(viewModel.mealSections.first(where: { $0.mealType == .lunch }))

        XCTAssertEqual(viewModel.mealSections.filter { $0.mealType == .lunch }.count, 1)
        XCTAssertEqual(lunchSection.entries.map(\.id), ["lunch_first", "lunch_second"])
        XCTAssertEqual(lunchSection.entries.map(\.snapshot.displayName), ["Chicken Shawarma Bowl", "Lentil Soup"])
        XCTAssertEqual(lunchSection.entryCountText, "2 entries")
        XCTAssertEqual(viewModel.loggedMealCount, 2)
    }

    func testTodayQuickActionMetadataIsPlaceholderOnlyAndPrivacySafe() {
        let actions = TodayQuickActionKind.allCases
        let copy = actions.map { [$0.title, $0.subtitle, $0.toast.message ?? ""].joined(separator: " ") }.joined(separator: " ")

        XCTAssertEqual(actions.map(\.title), ["Add meal", "Log recipe", "Create recipe"])
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("private"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("mock"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("failed"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("cheat"))
    }

    func testTodayRecentLogAgainRailDataUsesFrozenLogSnapshots() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )
        let items = TodaySummaryViewModel(dayLog: dayLog).recentLogAgainItems

        XCTAssertEqual(items.count, 2)
        XCTAssertEqual(items.first?.title, "Greek Yogurt")
        XCTAssertEqual(items.first?.actionTitle, "Log again")
        XCTAssertTrue(try XCTUnwrap(items.first?.subtitle).localizedCaseInsensitiveContains("private snapshot"))
        XCTAssertEqual(items.first?.macroSummary.map(\.kind), [.calories, .protein, .carbs, .fat])
        XCTAssertEqual(items.last?.sourceLabel, "Recipe v20260606")
    }

    func testTodayMealEmptyStateCopyIsWarmPrivateAndNonShaming() {
        let section = TodayMealSectionViewModel(mealType: .breakfast, entries: [])
        let copy = [section.emptyTitle, section.emptyBody].joined(separator: " ")

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("privately"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Nothing here yet"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("missed"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("failed"))
    }

    func testTodayMealEntryRowsUseFrozenSnapshotDisplayData() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )
        let lunchEntry = try XCTUnwrap(dayLog.meals.first(where: { $0.mealType == .lunch })?.entries.first)
        let viewModel = TodaySummaryViewModel(dayLog: dayLog)
        let displayedLunchEntry = try XCTUnwrap(viewModel.mealSections.first(where: { $0.mealType == .lunch })?.entries.first)

        XCTAssertEqual(displayedLunchEntry.snapshot.displayName, lunchEntry.snapshot.displayName)
        XCTAssertEqual(displayedLunchEntry.snapshot.macros, lunchEntry.snapshot.macros)
        XCTAssertEqual(displayedLunchEntry.snapshot.sourceLabel, "Recipe v20260606")
        XCTAssertEqual(displayedLunchEntry.recipeVersionId, "recipe_version_20260606")
    }

    func testTodayProgressCopyStaysNonShamingNearAndPastGoal() throws {
        let nearGoalTotals = try MacroTotals(calories: 2100, proteinGrams: 140, carbsGrams: 190, fatGrams: 62)
        let overGoalTotals = try MacroTotals(calories: 2300, proteinGrams: 165, carbsGrams: 230, fatGrams: 72)
        let goals = try MacroTotals(calories: 2200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70)
        let nearGoalLog = try DayLog(userId: "user_1", date: "2026-06-06", meals: [try makeMealLog(macros: nearGoalTotals)])
        let overGoalLog = try DayLog(userId: "user_1", date: "2026-06-06", meals: [try makeMealLog(macros: overGoalTotals)])

        let copy = [
            TodaySummaryViewModel(dayLog: nearGoalLog, goals: goals).calorieSupportText,
            TodaySummaryViewModel(dayLog: overGoalLog, goals: goals).calorieSupportText
        ]
        let shamingTerms = ["adherence", "compliance", "failure", "failed", "bad", "guilt", "cheat", "over limit", "blown", "shame"]

        XCTAssertTrue(copy.allSatisfy { $0.localizedCaseInsensitiveContains("flexible") || $0.localizedCaseInsensitiveContains("gentle") })
        XCTAssertTrue(shamingTerms.allSatisfy { !copy.joined(separator: " ").localizedCaseInsensitiveContains($0) })
    }

    func testVisibleTodayPrivacyAndSupportCopyAvoidsComplianceLanguage() {
        let viewModel = TodaySummaryViewModel()
        let visibleCopy = [
            viewModel.reassuranceText,
            viewModel.privacySupportText,
            viewModel.summarySubtitle,
            viewModel.calorieSupportText,
            viewModel.macroProgressSubtitle,
            "Daily goals are used only for your private context."
        ].joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "over limit"]

        XCTAssertTrue(deniedTerms.allSatisfy { !visibleCopy.localizedCaseInsensitiveContains($0) })
        XCTAssertTrue(viewModel.privacySupportText.localizedCaseInsensitiveContains("private"))
    }

    @MainActor
    func testTodaySummaryViewCanBeConstructedWithFixtureData() {
        _ = TodayPlaceholderView(viewModel: TodaySummaryViewModel())
    }

    func testRecipeVisibilityOptionsMatchLinearScope() {
        XCTAssertEqual(RecipeVisibilityOption.allCases.map(\.title), [
            "Keep private",
            "Unlisted link",
            "Publish to profile",
            "Share to community"
        ])
        XCTAssertEqual(RecipeVisibilityOption.allCases.map(\.rawValue), [
            "keepPrivate",
            "unlistedLink",
            "publishToProfile",
            "shareToCommunity"
        ])
    }

    func testRecipeVisibilityPrivacyNoteIsVisibleLocalOnlyAndNoPrivatePayloadClaims() {
        let model = RecipeVisibilityOptionSheetModel()
        let copy = model.visibleCopy
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "body metric", "calorie goal", "starts backend"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Privacy note"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("private logs"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("goals"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("nutrition logs"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("never shared"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local mock"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("no backend"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testRecipeVisibilitySelectionUpdatesLocalStatus() {
        var model = RecipeVisibilityOptionSheetModel()

        model.select(.shareToCommunity)

        XCTAssertEqual(model.selectedOption, .shareToCommunity)
        XCTAssertEqual(model.selectedStatusCopy, "Selected visibility: Share to community. Local mock state only.")
        XCTAssertTrue(model.visibleCopy.localizedCaseInsensitiveContains("future community selection step"))
    }

    func testRecipeVisibilitySheetDraftStateSeparatesCancelFromApply() {
        var draftState = RecipeVisibilityOptionSheetDraftState(committedOption: .keepPrivate)

        draftState.selectPending(.shareToCommunity)
        XCTAssertEqual(draftState.committedOption, .keepPrivate)
        XCTAssertEqual(draftState.pendingOption, .shareToCommunity)

        draftState.cancel()
        XCTAssertEqual(draftState.committedOption, .keepPrivate)
        XCTAssertEqual(draftState.pendingOption, .keepPrivate)

        draftState.selectPending(.unlistedLink)
        XCTAssertEqual(draftState.apply(), .unlistedLink)
        XCTAssertEqual(draftState.committedOption, .unlistedLink)
        XCTAssertEqual(draftState.pendingOption, .unlistedLink)
    }

    @MainActor
    func testRecipeVisibilitySheetAndEditorViewCanBeConstructed() {
        var option: RecipeVisibilityOption = .unlistedLink
        _ = RecipeVisibilityOptionSheetView(selectedOption: Binding(get: { option }, set: { option = $0 }))
        _ = RecipeEditorPlaceholderView()
    }

    func testRecipeEditorIngredientRowValidationAndStateChanges() {
        var row = RecipeEditorIngredientRow(id: "ingredient_1")
        XCTAssertFalse(row.isValidForDraft)

        row.quantityText = "2"
        row.unit = "cups"
        row.name = "Spinach"

        XCTAssertTrue(row.isValidForDraft)
        XCTAssertTrue(row.hasIncompleteNutrition)
        XCTAssertEqual(row.source, .freeText)
    }

    func testRecipeEditorEditedBlankRowBecomesManualIncompleteNutrition() {
        var row = RecipeEditorIngredientRow.empty(id: "blank_edited")

        row.name = "Handful of greens"
        row.quantityText = "1"

        XCTAssertEqual(row.source, .freeText)
        XCTAssertTrue(row.hasIncompleteNutrition)
        XCTAssertTrue(row.nutritionStatusText.localizedCaseInsensitiveContains("no local nutrition metadata"))
        XCTAssertFalse(row.nutritionStatusText.localizedCaseInsensitiveContains("seeded from local mock food"))
    }

    func testRecipeEditorAggregateWarningAppearsForEditedManualRows() {
        var row = RecipeEditorIngredientRow.empty(id: "manual_aggregate")
        row.quantityText = "2"
        row.name = "Custom sauce"
        let form = RecipeEditorDraftForm(ingredients: [row])

        XCTAssertTrue(form.hasIncompleteNutritionIngredients)
        XCTAssertEqual(form.incompleteNutritionNotice, RecipeEditorIngredientRow.incompleteNutritionNotice)
        XCTAssertTrue(form.visibleCopy.localizedCaseInsensitiveContains("partial macro preview"))
    }

    func testRecipeEditorCanAddAndRemoveIngredients() {
        var form = RecipeEditorDraftForm()
        form.addIngredient(.empty(id: "row_1"))
        form.addFreeTextIngredient(named: "Pinch of herbs")

        XCTAssertEqual(form.ingredients.map(\.id).first, "row_1")
        XCTAssertEqual(form.ingredients.count, 2)
        XCTAssertTrue(form.hasIncompleteNutritionIngredients)

        form.removeIngredient(id: "row_1")

        XCTAssertEqual(form.ingredients.count, 1)
        XCTAssertEqual(form.ingredients.first?.name, "Pinch of herbs")
    }

    func testRecipeEditorFreeTextWarningCopyIsClearAndNonShaming() {
        let row = RecipeEditorIngredientRow.freeText(id: "free_1", quantityText: "1", unit: "handful", name: "Herbs")
        var form = RecipeEditorDraftForm(ingredients: [row])
        let copy = form.visibleCopy
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food"]

        XCTAssertTrue(row.hasIncompleteNutrition)
        XCTAssertEqual(form.incompleteNutritionNotice, RecipeEditorIngredientRow.incompleteNutritionNotice)
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Nutrition details are incomplete"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("partial macro preview"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testRecipeEditorMockFoodSearchMetadataIsLocalOnly() {
        let results = RecipeEditorMockFoodSearchResult.search("chicken")
        let food = try! XCTUnwrap(results.first)
        let row = RecipeEditorIngredientRow.fromMockFood(food, id: "mock_1")

        XCTAssertEqual(results.map(\.foodId), ["mock_food_chicken"])
        XCTAssertEqual(food.metadata["mode"], "mock-local-fixture")
        XCTAssertEqual(food.metadata["startsBackendSearch"], "false")
        XCTAssertEqual(row.name, "Chicken breast")
        XCTAssertFalse(row.hasIncompleteNutrition)
        XCTAssertEqual(row.nutritionStatusText, "Nutrition is seeded from local mock food metadata.")
    }

    func testRecipeEditorMacroMathUsesKnownMockIngredientQuantityAndUnit() {
        var chicken = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "chicken")
        chicken.quantityText = "200"
        chicken.unit = "g"
        let form = RecipeEditorDraftForm(servingsText: "2", ingredients: [chicken])
        let preview = form.macroPreview

        XCTAssertEqual(preview.includedIngredientCount, 1)
        XCTAssertEqual(preview.partialIngredientCount, 0)
        XCTAssertEqual(preview.totalMacros.calories, 330, accuracy: 0.0001)
        XCTAssertEqual(preview.totalMacros.proteinGrams, 62, accuracy: 0.0001)
        XCTAssertEqual(preview.totalMacros.fatGrams, 7.2, accuracy: 0.0001)
        XCTAssertEqual(preview.perServingMacros.calories, 165, accuracy: 0.0001)
    }

    func testRecipeEditorMacroPreviewRecalculatesWhenServingCountChanges() {
        let yogurt = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[1], id: "yogurt")
        let twoServings = RecipeEditorDraftForm(servingsText: "2", ingredients: [yogurt]).macroPreview
        let fourServings = RecipeEditorDraftForm(servingsText: "4", ingredients: [yogurt]).macroPreview

        XCTAssertEqual(twoServings.totalMacros.calories, fourServings.totalMacros.calories, accuracy: 0.0001)
        XCTAssertEqual(twoServings.perServingMacros.calories, 50, accuracy: 0.0001)
        XCTAssertEqual(fourServings.perServingMacros.calories, 25, accuracy: 0.0001)
        XCTAssertEqual(fourServings.perServingMacros.proteinGrams, 4.25, accuracy: 0.0001)
    }

    func testRecipeEditorMacroPreviewRecalculatesWhenQuantityChanges() {
        var base = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "chicken")
        base.quantityText = "100"
        var doubled = base
        doubled.quantityText = "200"

        XCTAssertEqual(RecipeEditorDraftForm(servingsText: "1", ingredients: [base]).macroPreview.totalMacros.calories, 165, accuracy: 0.0001)
        XCTAssertEqual(RecipeEditorDraftForm(servingsText: "1", ingredients: [doubled]).macroPreview.totalMacros.calories, 330, accuracy: 0.0001)
    }

    func testRecipeEditorKnownMockFoodWithBlankOrInvalidQuantityIsPartial() {
        var blank = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "blank_quantity")
        blank.quantityText = ""
        var invalid = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[1], id: "invalid_quantity")
        invalid.quantityText = "abc"
        let preview = RecipeEditorDraftForm(servingsText: "2", ingredients: [blank, invalid]).macroPreview

        XCTAssertTrue(preview.isPartial)
        XCTAssertEqual(preview.includedIngredientCount, 0)
        XCTAssertEqual(preview.partialIngredientCount, 2)
        XCTAssertTrue(preview.statusText.localizedCaseInsensitiveContains("Partial macro preview"))
        XCTAssertTrue(preview.statusText.localizedCaseInsensitiveContains("not included"))
    }

    func testRecipeEditorKnownMockFoodInvalidQuantityStatusSaysNotIncludedInPartialPreview() {
        var invalid = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "invalid_quantity_status")
        invalid.quantityText = "abc"

        XCTAssertEqual(invalid.nutritionStatusText, RecipeEditorIngredientRow.nonComputableMockNutritionNotice)
        XCTAssertTrue(invalid.nutritionStatusText.localizedCaseInsensitiveContains("not included"))
        XCTAssertTrue(invalid.nutritionStatusText.localizedCaseInsensitiveContains("partial macro preview"))
        XCTAssertFalse(invalid.nutritionStatusText.localizedCaseInsensitiveContains("seeded from local mock food"))
    }

    func testRecipeEditorKnownMockFoodUnsupportedUnitStatusSaysNotIncludedInPartialPreview() {
        var unsupportedUnit = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[1], id: "unsupported_unit_status")
        unsupportedUnit.unit = "container"

        XCTAssertEqual(unsupportedUnit.nutritionStatusText, RecipeEditorIngredientRow.nonComputableMockNutritionNotice)
        XCTAssertTrue(unsupportedUnit.nutritionStatusText.localizedCaseInsensitiveContains("not included"))
        XCTAssertTrue(unsupportedUnit.nutritionStatusText.localizedCaseInsensitiveContains("quantity and unit"))
        XCTAssertFalse(unsupportedUnit.nutritionStatusText.localizedCaseInsensitiveContains("seeded from local mock food"))
    }

    func testRecipeEditorInvalidOrBlankServingsNeedServingsCopyInsteadOfPerServingTotals() {
        let chicken = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "chicken")
        for servingsText in ["", "zero", "0"] {
            let preview = RecipeEditorDraftForm(servingsText: servingsText, ingredients: [chicken]).macroPreview

            XCTAssertTrue(preview.isPartial)
            XCTAssertTrue(preview.needsServings)
            XCTAssertNil(preview.servings)
            XCTAssertEqual(preview.totalMacros.calories, 165, accuracy: 0.0001)
            XCTAssertEqual(preview.perServingMacros, .zero)
            XCTAssertFalse(preview.perServingSummaryText.localizedCaseInsensitiveContains("Per serving: 165"))
            XCTAssertTrue(preview.perServingSummaryText.localizedCaseInsensitiveContains("need a valid servings"))
        }
    }

    func testRecipeEditorMacroMathSupportsKilogramsAndOuncesForKnownMockFoods() {
        var chickenKg = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "chicken_kg")
        chickenKg.quantityText = "0.1"
        chickenKg.unit = "kg"
        var chickenOz = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "chicken_oz")
        chickenOz.quantityText = "1"
        chickenOz.unit = "oz"

        let kgPreview = RecipeEditorDraftForm(servingsText: "1", ingredients: [chickenKg]).macroPreview
        let ozPreview = RecipeEditorDraftForm(servingsText: "1", ingredients: [chickenOz]).macroPreview

        XCTAssertEqual(kgPreview.totalMacros.calories, 165, accuracy: 0.0001)
        XCTAssertEqual(ozPreview.totalMacros.calories, 46.776675, accuracy: 0.0001)
        XCTAssertEqual(kgPreview.partialIngredientCount, 0)
        XCTAssertEqual(ozPreview.partialIngredientCount, 0)
    }

    func testRecipeEditorOverflowQuantityBecomesPartialInsteadOfCrashing() {
        var chicken = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "huge_chicken")
        chicken.quantityText = "1e309"
        let preview = RecipeEditorDraftForm(servingsText: "1", ingredients: [chicken]).macroPreview

        XCTAssertTrue(preview.isPartial)
        XCTAssertEqual(preview.includedIngredientCount, 0)
        XCTAssertEqual(preview.partialIngredientCount, 1)
        XCTAssertEqual(preview.totalMacros, .zero)
    }

    func testRecipeEditorUnknownAndFreeTextIngredientsCreatePartialPreviewWithoutFalseTotals() {
        let known = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "known")
        let freeText = RecipeEditorIngredientRow.freeText(id: "free", quantityText: "2", unit: "cups", name: "Family sauce")
        var unknownUnit = RecipeEditorIngredientRow.fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[1], id: "unknown_unit")
        unknownUnit.unit = "container"
        let preview = RecipeEditorDraftForm(servingsText: "1", ingredients: [known, freeText, unknownUnit]).macroPreview

        XCTAssertTrue(preview.isPartial)
        XCTAssertEqual(preview.includedIngredientCount, 1)
        XCTAssertEqual(preview.partialIngredientCount, 2)
        XCTAssertEqual(preview.totalMacros.calories, 165, accuracy: 0.0001)
        XCTAssertTrue(preview.statusText.localizedCaseInsensitiveContains("Partial macro preview"))
        XCTAssertTrue(preview.statusText.localizedCaseInsensitiveContains("not included"))
    }

    func testRecipeEditorMacroPreviewCopyIsPrivacySafeAndNonShaming() {
        var form = RecipeEditorDraftForm(servingsText: "2")
        form.addMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0])
        form.addFreeTextIngredient(named: "Family spice blend")
        let copy = form.visibleCopy
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "daily goal", "calorie goal", "body metric", "private log", "food log"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("partial macro preview"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local mock"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testRecipeEditorIngredientCopyIsPrivacySafeAndNoBackendOverreach() {
        var form = RecipeEditorDraftForm()
        form.addMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0])
        form.addFreeTextIngredient(named: "Family spice blend")
        let copy = form.visibleCopy
        let deniedTerms = ["private log", "food log", "daily goal", "calorie goal", "body metric", "adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "starts backend"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("mock"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    @MainActor
    func testRecipeEditorIngredientViewCanBeConstructedWithRows() {
        let form = RecipeEditorDraftForm(ingredients: [
            .fromMockFood(RecipeEditorMockFoodSearchResult.fixtureResults[0], id: "mock_1"),
            .freeText(id: "free_1", quantityText: "1", unit: "pinch", name: "Free text spice")
        ])
        _ = RecipeEditorPlaceholderView(form: form)
    }

    func testRecipeEditorInstructionStepsConstructWithStableOrderedNumbering() {
        let form = RecipeEditorDraftForm(instructions: [
            RecipeEditorInstructionStep(id: "step_b", order: 99, body: "Bake until golden."),
            RecipeEditorInstructionStep(id: "step_a", order: 42, body: "Mix the batter.")
        ])

        XCTAssertEqual(form.instructions.map(\.id), ["step_b", "step_a"])
        XCTAssertEqual(form.instructions.map(\.order), [1, 2])
        XCTAssertEqual(form.instructions.map(\.displayNumber), ["Step 1", "Step 2"])
        XCTAssertEqual(form.persistedInstructionOrder.map(\.id), ["step_b", "step_a"])
        XCTAssertEqual(form.persistedInstructionOrder.map(\.order), [1, 2])
    }

    func testRecipeEditorCanAddRemoveAndReorderInstructionsDeterministically() {
        var form = RecipeEditorDraftForm()
        form.addInstruction(body: "Prep vegetables.")
        form.addInstruction(body: "Cook filling.")
        form.addInstruction(body: "Serve warm.")
        let prepId = form.instructions[0].id
        let cookId = form.instructions[1].id
        let serveId = form.instructions[2].id

        form.moveInstructionDown(id: prepId)
        XCTAssertEqual(form.persistedInstructionOrder.map(\.id), [cookId, prepId, serveId])
        XCTAssertEqual(form.persistedInstructionOrder.map(\.order), [1, 2, 3])

        form.moveInstruction(id: serveId, to: 0)
        XCTAssertEqual(form.persistedInstructionOrder.map(\.id), [serveId, cookId, prepId])
        XCTAssertEqual(form.persistedInstructionOrder.map(\.body), ["Serve warm.", "Cook filling.", "Prep vegetables."])
        XCTAssertEqual(form.persistedInstructionOrder.map(\.order), [1, 2, 3])

        form.removeInstruction(id: cookId)
        XCTAssertEqual(form.persistedInstructionOrder.map(\.id), [serveId, prepId])
        XCTAssertEqual(form.persistedInstructionOrder.map(\.order), [1, 2])
    }

    func testRecipeEditorInstructionCopyIsPrivacySafeLocalOnlyAndNonShaming() {
        var form = RecipeEditorDraftForm(instructions: [
            RecipeEditorInstructionStep(id: "step_1", order: 1, body: "Fold in herbs gently."),
            RecipeEditorInstructionStep(id: "step_2", order: 2, body: "Rest before serving.")
        ])
        form.addInstruction(body: "Taste and adjust seasoning.")
        let copy = form.visibleCopy
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "food log", "daily goal", "calorie goal", "body metric", "saved local", "starts backend"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Step 1"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Taste and adjust seasoning"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Draft saving is in-session only"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Reordering updates step numbers in this form only"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testRecipeEditorHeaderCopyReflectsCurrentLocalScaffoldCapabilities() {
        let copy = RecipeEditorDraftForm.headerContextCopy

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("basics"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("ingredients"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("ordered instructions"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("macro preview"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Save Draft keeps fields in this app session only"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("later slices"))
    }

    func testRecipeEditorEmptyInstructionStateCopyIsWarmAndLocalOnly() {
        let form = RecipeEditorDraftForm()
        let copy = form.visibleCopy

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("No instructions yet"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("when you're ready"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local form only"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("save this in-session draft"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("saved local"))
    }

    func testRecipeEditorInstructionAccessibilityMetadataIsStepSpecific() {
        let first = RecipeEditorInstructionStep(id: "step_1", order: 1, body: "Whisk sauce.")
        let second = RecipeEditorInstructionStep(id: "step_2", order: 2, body: "Plate bowls.")

        XCTAssertEqual(first.instructionFieldAccessibilityLabel, "Instruction step 1")
        XCTAssertEqual(second.moveUpAccessibilityLabel, "Move step 2 up")
        XCTAssertEqual(second.moveDownAccessibilityLabel, "Move step 2 down")
        XCTAssertEqual(second.removeAccessibilityLabel, "Remove step 2")
        XCTAssertEqual(first.moveUpAccessibilityHint, "First step cannot move up.")
        XCTAssertEqual(second.moveDownAccessibilityHint(totalSteps: 2), "Last step cannot move down.")
    }

    @MainActor
    func testRecipeEditorInstructionViewCanBeConstructedWithSteps() {
        let form = RecipeEditorDraftForm(instructions: [
            RecipeEditorInstructionStep(id: "step_1", order: 1, body: "Whisk sauce."),
            RecipeEditorInstructionStep(id: "step_2", order: 2, body: "Plate bowls.")
        ])
        _ = RecipeEditorPlaceholderView(form: form)
    }

    func testCookbookLibrarySegmentsAreDistinct() {
        let mine = CookbookLibraryViewModel(selectedSegment: .mine).selectedSection
        let saved = CookbookLibraryViewModel(selectedSegment: .saved).selectedSection
        let drafts = CookbookLibraryViewModel(selectedSegment: .drafts).selectedSection

        XCTAssertEqual(CookbookLibrarySegment.allCases.map(\.description), ["Mine", "Saved", "Drafts"])
        XCTAssertEqual(mine.items.map(\.id), ["mine_shawarma", "mine_lentil"])
        XCTAssertEqual(saved.items.map(\.id), ["saved_oats", "saved_tacos"])
        XCTAssertEqual(drafts.items.map(\.id), ["draft_green_curry", "draft_snack_box"])
        XCTAssertNotEqual(mine.items, saved.items)
        XCTAssertNotEqual(saved.items, drafts.items)
    }

    func testCookbookDraftsArePrivateLocalOnlyWithoutPrivateNutritionLeakage() {
        let viewModel = CookbookLibraryViewModel(selectedSegment: .drafts)
        let drafts = viewModel.selectedSection.items
        let copy = viewModel.visibleCopy
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "food log", "daily goal", "calorie goal", "body metric", "progress"]

        XCTAssertEqual(viewModel.selectedSection.segment, .drafts)
        XCTAssertTrue(drafts.allSatisfy(\.isLocalOnly))
        XCTAssertTrue(drafts.allSatisfy { $0.visibility == .localDraft })
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("private"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("not published"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testCookbookPublicSegmentsDoNotExposePrivateLogGoalOrBodyCopy() {
        let copy = [
            CookbookLibraryViewModel(selectedSegment: .mine).visibleCopy,
            CookbookLibraryViewModel(selectedSegment: .saved).visibleCopy
        ].joined(separator: " ")
        let deniedTerms = ["private log", "food log", "daily goal", "calorie goal", "body metric", "adherence", "compliance", "failed", "over limit"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("fixture data"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testCookbookCardBadgesReflectSavedDraftAndForkMetadataOnly() {
        let mine = CookbookLibraryViewModel(selectedSegment: .mine).selectedSection.items
        let saved = CookbookLibraryViewModel(selectedSegment: .saved).selectedSection.items
        let drafts = CookbookLibraryViewModel(selectedSegment: .drafts).selectedSection.items

        XCTAssertEqual(CookbookLibraryItem.BadgeKind.allCases, [.saved, .draft, .forked])
        XCTAssertEqual(mine.first(where: { $0.id == "mine_shawarma" })?.badges, [])
        XCTAssertEqual(mine.first(where: { $0.id == "mine_lentil" })?.badges, [.forked])
        XCTAssertTrue(saved.allSatisfy { $0.badges == [.saved] })
        XCTAssertTrue(drafts.allSatisfy { $0.badges == [.draft] })
    }

    func testCookbookCardRoutesUseRecipeDetailForPublicItemsAndEditorForPrivateDrafts() throws {
        let mine = CookbookLibraryViewModel(selectedSegment: .mine).selectedSection.items
        let saved = CookbookLibraryViewModel(selectedSegment: .saved).selectedSection.items
        let drafts = CookbookLibraryViewModel(selectedSegment: .drafts).selectedSection.items

        XCTAssertEqual(try XCTUnwrap(mine.first(where: { $0.id == "mine_shawarma" })?.destinationRoute), .recipeDetail(id: "recipe_shawarma_bowl"))
        XCTAssertEqual(try XCTUnwrap(saved.first(where: { $0.id == "saved_oats" })?.destinationRoute), .recipeDetail(id: "recipe_berry_oats"))
        XCTAssertEqual(try XCTUnwrap(drafts.first(where: { $0.id == "draft_green_curry" })?.destinationRoute), .recipeEditor(draftId: "draft_green_curry"))
        XCTAssertTrue(drafts.allSatisfy { $0.visibility == .localDraft && $0.isLocalOnly })
        XCTAssertTrue(drafts.allSatisfy { $0.accessibilityHint == "Opens draft editor" })
        XCTAssertTrue(mine.allSatisfy { $0.accessibilityHint == "Opens recipe details" })
        XCTAssertTrue(saved.allSatisfy { $0.accessibilityHint == "Opens recipe details" })
    }

    func testCookbookSearchAndFilterRunOnLocalFixtureItems() {
        let search = CookbookLibraryViewModel(selectedSegment: .mine, searchText: "lentil")
        XCTAssertEqual(search.filteredItems.map(\.id), ["mine_lentil"])

        let tagSearch = CookbookLibraryViewModel(selectedSegment: .saved, searchText: "fiber")
        XCTAssertEqual(tagSearch.filteredItems.map(\.id), ["saved_oats"])

        let savedFilterInsideMine = CookbookLibraryViewModel(selectedSegment: .mine, selectedFilter: .saved)
        XCTAssertTrue(savedFilterInsideMine.filteredItems.isEmpty)
        XCTAssertTrue(savedFilterInsideMine.emptySearchBody.localizedCaseInsensitiveContains("local fixture"))
    }

    func testCookbookEmptyStateMetadataDistinguishesTrueEmptyFromNoResults() throws {
        let emptySaved = CookbookLibraryViewModel(selectedSegment: .saved, savedRecipeIDs: [])
        let savedEmptyState = try XCTUnwrap(emptySaved.emptyState)
        XCTAssertEqual(savedEmptyState.kind, .trueEmpty(.saved))
        XCTAssertEqual(savedEmptyState.title, "Nothing here yet")
        XCTAssertTrue(savedEmptyState.body.localizedCaseInsensitiveContains("on this device"))
        XCTAssertEqual(savedEmptyState.systemImage, "bookmark")

        let noResults = CookbookLibraryViewModel(selectedSegment: .mine, searchText: "dragonfruit")
        let noResultState = try XCTUnwrap(noResults.emptyState)
        XCTAssertEqual(noResultState.kind, .noResults(.mine))
        XCTAssertEqual(noResultState.title, "No recipes match")
        XCTAssertTrue(noResultState.body.localizedCaseInsensitiveContains("local fixture"))
        XCTAssertEqual(noResultState.systemImage, "magnifyingglass")
    }

    func testCookbookEmptyStateCopyIsPrivacySafeWarmAndNonShaming() throws {
        let states = try [
            XCTUnwrap(CookbookLibraryViewModel(selectedSegment: .mine, searchText: "zzz").emptyState),
            XCTUnwrap(CookbookLibraryViewModel(selectedSegment: .saved, savedRecipeIDs: []).emptyState),
            XCTUnwrap(CookbookLibraryViewModel(selectedSegment: .drafts, searchText: "zzz").emptyState)
        ]
        let copy = states.flatMap { [$0.title, $0.body] }.joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "food log", "daily goal", "calorie goal", "body metric", "sync"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    @MainActor
    func testCookbookSavedStatePersistsThroughRenderedMockStorePath() {
        let store = CookbookMockLocalStore(savedRecipeIDs: [])
        let emptyView = CookbookPlaceholderView(selectedSegment: .saved, localStore: store)
        let emptyRendered = emptyView.renderedViewModel()
        XCTAssertTrue(emptyRendered.filteredItems.isEmpty)
        XCTAssertEqual(emptyRendered.emptyState?.kind, .trueEmpty(.saved))

        store.save(recipeId: "recipe_berry_oats")
        let refreshedView = CookbookPlaceholderView(selectedSegment: .saved, localStore: store)
        let refreshed = refreshedView.renderedViewModel()

        XCTAssertEqual(refreshed.selectedSection.segment, .saved)
        XCTAssertEqual(refreshed.filteredItems.map(\.recipeId), ["recipe_berry_oats"])
        XCTAssertNil(refreshed.emptyState)
        XCTAssertTrue(refreshed.visibleCopy.localizedCaseInsensitiveContains("local"))
        XCTAssertFalse(refreshed.visibleCopy.localizedCaseInsensitiveContains("synced"))
    }

    @MainActor
    func testSharedCookbookStoreSaveRouteIdRefreshesSavedSegment() {
        let store = CookbookMockLocalStore(savedRecipeIDs: [])
        XCTAssertTrue(CookbookPlaceholderView(selectedSegment: .saved, localStore: store).renderedViewModel().filteredItems.isEmpty)

        store.save(recipeId: "recipe_shawarma_bowl")
        let refreshed = CookbookPlaceholderView(selectedSegment: .saved, localStore: store).renderedViewModel()
        let toast = try! XCTUnwrap(RecipeDetailActionBarViewModel(recipe: .mockHeaderFixture).toast(for: .save))

        XCTAssertEqual(store.savedRecipeIDs, ["recipe_shawarma_bowl"])
        XCTAssertEqual(refreshed.filteredItems.map(\.recipeId), ["recipe_shawarma_bowl"])
        XCTAssertEqual(refreshed.filteredItems.first?.id, "saved_shawarma")
        XCTAssertNil(refreshed.emptyState)
        XCTAssertEqual(toast.title, "Saved to local mock")
        XCTAssertTrue((toast.message ?? "").localizedCaseInsensitiveContains("on this device"))
        XCTAssertTrue((toast.message ?? "").localizedCaseInsensitiveContains("no backend"))
        XCTAssertFalse((toast.message ?? "").localizedCaseInsensitiveContains("nothing is persisted"))
    }

    func testCookbookFilterKeepsDraftDetailsInPersonalDraftSegmentOnly() {
        let mineDraftFilter = CookbookLibraryViewModel(selectedSegment: .mine, selectedFilter: .drafts)
        let drafts = CookbookLibraryViewModel(selectedSegment: .drafts, selectedFilter: .drafts)

        XCTAssertTrue(mineDraftFilter.filteredItems.isEmpty)
        XCTAssertEqual(drafts.filteredItems.map(\.id), ["draft_green_curry", "draft_snack_box"])
        XCTAssertTrue(drafts.filteredItems.allSatisfy { $0.visibility == .localDraft && $0.isLocalOnly })
    }

    func testCookbookCreateRouteMetadataOpensNewRecipeEditorDraft() {
        let viewModel = CookbookLibraryViewModel()

        XCTAssertEqual(CookbookLibraryViewModel.createRecipeRoute, .recipeEditor(draftId: nil))
        XCTAssertEqual(CookbookLibraryViewModel.createRecipeRoute.id, "recipe-editor:new")
        XCTAssertTrue(viewModel.visibleCopy.localizedCaseInsensitiveContains("Create recipe"))
        XCTAssertTrue(viewModel.visibleCopy.localizedCaseInsensitiveContains("private draft"))
    }

    func testCookbookSearchFilterAndCreateCopyIsPrivacySafeAndNonShaming() {
        let copy = CookbookLibrarySegment.allCases
            .map { CookbookLibraryViewModel(selectedSegment: $0, searchText: "notes", selectedFilter: .drafts).visibleCopy }
            .joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "food log", "daily goal", "calorie goal", "body metric", "progress"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local fixtures"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("private"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testCookbookGridDeclaresExactlyTwoColumns() {
        XCTAssertEqual(CookbookPlaceholderView.cardGridColumns.count, 2)
    }

    func testRecipeDetailRouteIdIsPassedIntoDestinationView() {
        let detail = RecipeDetailPlaceholderView(routedRecipeId: "recipe_berry_oats")
        XCTAssertEqual(detail.routedRecipeId, "recipe_berry_oats")
    }

    func testCookbookCardGridCopyIsPrivacySafeAndNonShaming() {
        let copy = CookbookLibrarySegment.allCases
            .map { CookbookLibraryViewModel(selectedSegment: $0).visibleCopy }
            .joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "daily goal", "calorie goal", "body metric"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Draft"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Saved"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("Forked"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    @MainActor
    func testCookbookLibraryViewsCanBeConstructedForAllSegments() {
        for segment in CookbookLibrarySegment.allCases {
            _ = CookbookLibraryViewModel(selectedSegment: segment)
            _ = CookbookPlaceholderView(selectedSegment: segment)
        }
    }

    func testRecipeDetailHeaderViewModelUsesFixtureHeroTitleTagsAndCreator() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let now = ISO8601DateFormatter().date(from: "2026-06-08T12:00:00Z")!
        let viewModel = RecipeDetailHeaderViewModel(recipe: recipe, now: now)

        XCTAssertEqual(viewModel.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(viewModel.title, "Chicken Shawarma Bowl")
        XCTAssertEqual(viewModel.tags, ["high-protein", "meal-prep"])
        XCTAssertEqual(viewModel.creatorHandle, "@maya")
        XCTAssertEqual(viewModel.creatorDisplayName, "Maya Reed")
        XCTAssertEqual(viewModel.updatedText, "Updated yesterday")
    }

    func testRecipeDetailTrustBadgeDerivesFromProvenanceFields() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailHeaderViewModel(recipe: recipe)

        XCTAssertEqual(recipe.provenance.trustLevel, .mixed)
        XCTAssertEqual(viewModel.trustBadge.title, "Mixed sources")
        XCTAssertEqual(viewModel.trustBadge.detail, "Includes USDA FoodData Central")
        XCTAssertEqual(viewModel.trustBadge.systemImage, "checkmark.seal")
        XCTAssertTrue(recipe.provenance.attributions.contains { $0.isVerified && $0.displayName == "USDA FoodData Central" })
    }

    func testRecipeDetailContentUsesCurrentVersionAndLocalRecipeData() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailContentViewModel(recipe: recipe)

        XCTAssertEqual(viewModel.currentVersionId, recipe.summary.currentVersionId)
        XCTAssertEqual(viewModel.versionText, "Recipe version 1 · recipe_version_20260606")
        XCTAssertEqual(viewModel.baseServings, 4)
        XCTAssertEqual(viewModel.ingredients.map(\.id), ["ingredient_chicken", "ingredient_sauce"])
        XCTAssertEqual(viewModel.ingredients.first?.title, "Chicken Breast")
        XCTAssertEqual(viewModel.ingredients.first?.amountText, "600 · g · boneless skinless")
        XCTAssertEqual(viewModel.instructions.map(\.number), [1, 2])
        XCTAssertEqual(viewModel.instructions.last?.body, "Assemble bowls with rice, chicken, cucumber salad, and sauce.")
    }

    func testRecipeDetailServingSelectorShowsSelectedServingMacrosWithoutChangingVersion() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let base = RecipeDetailContentViewModel(recipe: recipe)
        let scaled = RecipeDetailContentViewModel(recipe: recipe, selectedServings: 2)

        XCTAssertEqual(base.servingOptions, [1, 2, 4, 6, 8])
        XCTAssertTrue(base.servingSelectorHelpText.localizedCaseInsensitiveContains("selected servings"))
        XCTAssertTrue(base.servingSelectorHelpText.localizedCaseInsensitiveContains("frozen version"))
        XCTAssertEqual(scaled.selectedServings, 2)
        XCTAssertEqual(scaled.currentVersionId, "recipe_version_20260606")
        XCTAssertEqual(scaled.macros.map(\.kind), [.calories, .protein, .carbs, .fat])
        XCTAssertEqual(scaled.macros.map(\.value), [1040, 84, 96, 36])
        XCTAssertEqual(recipe.currentVersion.perServingMacros.calories, 520)
        XCTAssertEqual(recipe.currentVersion.id, recipe.summary.currentVersionId)
    }

    func testRecipeDetailHeaderAndContentCopyAvoidPrivateLeakageAndShamingTerms() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let copy = [
            RecipeDetailHeaderViewModel(recipe: recipe).visibleCopy,
            RecipeDetailContentViewModel(recipe: recipe).visibleCopy
        ].joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "body metric", "calorie goal", "share", "community", "friend"]

        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("private log"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("daily goal"))
    }

    func testRecipeDetailSocialContextUsesRecipeFocusedMockData() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailSocialContextViewModel(recipe: recipe)

        XCTAssertEqual(viewModel.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(viewModel.title, "In the community")
        XCTAssertEqual(viewModel.community?.title, "Popular in Weeknight Protein")
        XCTAssertEqual(viewModel.friendContext?.text, "Saved by 3 friends for meal ideas")
        XCTAssertEqual(viewModel.publicNotes.count, 2)
        XCTAssertTrue(viewModel.visibleCopy.localizedCaseInsensitiveContains("public recipe"))
    }

    func testRecipeDetailSocialContextPrivacyContractHasNoPrivateLeakageOrShamingCopy() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let copy = RecipeDetailSocialContextViewModel(recipe: recipe).visibleCopy
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "private log", "food log", "daily goal", "calorie goal", "calorie target", "body metric", "progress"]

        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("personal nutrition details stay private"))
    }

    func testRecipeDetailStickyActionModelLabelsAndMetadata() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailActionBarViewModel(recipe: recipe)

        XCTAssertEqual(viewModel.actions.map(\.label), ["Save", "Fork", "Log", "Share"])
        XCTAssertEqual(viewModel.actions.map(\.accessibilityIdentifier), [
            "recipe-detail-action-save",
            "recipe-detail-action-fork",
            "recipe-detail-action-log",
            "recipe-detail-action-share"
        ])
        XCTAssertEqual(viewModel.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(viewModel.currentVersionId, "recipe_version_20260606")
        XCTAssertGreaterThanOrEqual(viewModel.bottomContentPadding, 96)
    }

    func testRecipeDetailStickyActionRoutesPreserveVersionAndStayScaffolded() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailActionBarViewModel(recipe: recipe)

        XCTAssertNil(viewModel.route(for: .save))
        XCTAssertEqual(viewModel.toast(for: .save)?.title, "Saved to local mock")
        XCTAssertEqual(viewModel.route(for: .fork), .forkRemix(recipeId: "recipe_shawarma_bowl"))
        XCTAssertEqual(viewModel.route(for: .log), .logRecipe(recipeId: "recipe_shawarma_bowl", recipeVersionId: "recipe_version_20260606"))
        XCTAssertEqual(viewModel.route(for: .log)?.id, "log-recipe:recipe_shawarma_bowl:recipe_version_20260606:no-meal")
        XCTAssertEqual(viewModel.route(for: .share), .shareRecipe(recipeId: "recipe_shawarma_bowl"))
    }

    func testRecipeDetailStickyActionCopyIsPrivacySafeAndNoBackendOrPublicPosting() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailActionBarViewModel(recipe: recipe)
        let copy = [viewModel.visibleCopy, viewModel.toast(for: .save)?.message ?? ""].joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "body metric", "calorie goal", "private log", "daily goal"]

        XCTAssertTrue(copy.localizedCaseInsensitiveContains("local mock"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("on this device"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("no backend"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("post"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("nothing is persisted"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testRecipeDetailSocialContextExposesNoSAV62Actions() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let viewModel = RecipeDetailSocialContextViewModel(recipe: recipe)
        let deniedActions = ["Save", "Fork", "Log", "Share"]

        XCTAssertTrue(viewModel.exposedActionLabels.isEmpty)
        XCTAssertTrue(deniedActions.allSatisfy { !viewModel.exposedActionLabels.contains($0) })
    }

    func testRecipeDetailOwnerPrivateStateShowsOwnerCopyAndHidesPublicActionsAndSocialContext() throws {
        let recipe = try recipeDetailVariant(visibility: "private", isOwner: true, canFork: false, canLog: true)
        let accessState = RecipeDetailAccessState.from(recipe: recipe)
        let actionModel = RecipeDetailActionBarViewModel(recipe: recipe)
        let socialModel = RecipeDetailSocialContextViewModel(recipe: recipe)

        XCTAssertEqual(accessState, .recipe(recipe))
        XCTAssertEqual(actionModel.actions, [.edit, .save, .log])
        XCTAssertNil(actionModel.route(for: .share))
        XCTAssertNil(actionModel.route(for: .fork))
        XCTAssertEqual(actionModel.toast(for: .edit)?.title, "Owner edit placeholder")
        XCTAssertNil(socialModel.community)
        XCTAssertTrue(socialModel.publicNotes.isEmpty)
        XCTAssertTrue(socialModel.visibleCopy.localizedCaseInsensitiveContains("hidden for private recipes"))
    }

    func testRecipeDetailPrivateNonOwnerStateDoesNotExposeHiddenDetailsOrActions() throws {
        let hiddenRecipe = try recipeDetailVariant(visibility: "private", isOwner: false, canFork: true, canLog: true)
        let accessState = RecipeDetailAccessState.from(recipe: hiddenRecipe)
        guard case .unavailable(let viewModel) = accessState else { return XCTFail("Expected private unavailable state") }

        let hiddenDetailTerms = [hiddenRecipe.summary.title, hiddenRecipe.currentVersion.id, "Chicken Breast", "Assemble bowls", "USDA FoodData Central"]
        XCTAssertFalse(viewModel.showsRecipeContent)
        XCTAssertFalse(viewModel.showsSocialContext)
        XCTAssertTrue(viewModel.availableActions.isEmpty)
        XCTAssertTrue(hiddenDetailTerms.allSatisfy { !viewModel.visibleCopy.localizedCaseInsensitiveContains($0) })
        XCTAssertTrue(viewModel.visibleCopy.localizedCaseInsensitiveContains("details are visible only to the owner"))
    }

    func testRecipeDetailUnauthorizedStateDoesNotExposeRecipeDetailsOrActions() {
        let accessState = RecipeDetailAccessState.from(recipe: nil, unauthorized: true)
        guard case .unavailable(let viewModel) = accessState else { return XCTFail("Expected unauthorized unavailable state") }

        XCTAssertEqual(viewModel.reason, .unauthorized)
        XCTAssertFalse(viewModel.showsRecipeContent)
        XCTAssertFalse(viewModel.showsSocialContext)
        XCTAssertTrue(viewModel.availableActions.isEmpty)
        XCTAssertFalse(viewModel.visibleCopy.localizedCaseInsensitiveContains("Chicken Shawarma Bowl"))
        XCTAssertFalse(viewModel.visibleCopy.localizedCaseInsensitiveContains("recipe_version"))
    }

    func testRecipeDetailAccessStateCopyAvoidsPrivateLeakageAndShamingTerms() throws {
        let ownerPrivate = try recipeDetailVariant(visibility: "private", isOwner: true, canFork: false, canLog: true)
        let inaccessible = RecipeDetailUnavailableViewModel(reason: .privateRecipe)
        let unauthorized = RecipeDetailUnavailableViewModel(reason: .unauthorized)
        let copy = [
            RecipeDetailActionBarViewModel(recipe: ownerPrivate).visibleCopy,
            RecipeDetailSocialContextViewModel(recipe: ownerPrivate).visibleCopy,
            inaccessible.visibleCopy,
            unauthorized.visibleCopy
        ].joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "calorie goal", "calorie target", "body metric", "food log payload"]

        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
        XCTAssertFalse(inaccessible.visibleCopy.localizedCaseInsensitiveContains("520"))
        XCTAssertFalse(unauthorized.visibleCopy.localizedCaseInsensitiveContains("Maya Reed"))
    }

    func testRecipeDetailPublicRecipeActionsRemainUnaffectedByAccessStates() throws {
        let recipe = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )
        let actionModel = RecipeDetailActionBarViewModel(recipe: recipe)

        XCTAssertEqual(RecipeDetailAccessState.from(recipe: recipe), .recipe(recipe))
        XCTAssertEqual(actionModel.actions.map(\.label), ["Save", "Fork", "Log", "Share"])
        XCTAssertEqual(actionModel.route(for: .fork), .forkRemix(recipeId: "recipe_shawarma_bowl"))
        XCTAssertEqual(actionModel.route(for: .log), .logRecipe(recipeId: "recipe_shawarma_bowl", recipeVersionId: "recipe_version_20260606"))
        XCTAssertEqual(actionModel.route(for: .share), .shareRecipe(recipeId: "recipe_shawarma_bowl"))
    }

    @MainActor
    func testRecipeDetailRouteAndHeaderScreenCanBeConstructed() {
        XCTAssertEqual(SavoroRoute.recipeDetail(id: "recipe_shawarma_bowl").id, "recipe-detail:recipe_shawarma_bowl")
        let recipe = RecipeDetail.mockHeaderFixture
        _ = RecipeDetailHeaderViewModel(recipe: recipe, now: RecipeDetail.mockHeaderNow)
        _ = RecipeDetailContentViewModel(recipe: recipe)
        _ = RecipeDetailHeaderView(viewModel: RecipeDetailHeaderViewModel(recipe: recipe, now: RecipeDetail.mockHeaderNow))
        _ = RecipeDetailContentSectionsView(viewModel: RecipeDetailContentViewModel(recipe: recipe), selectedServings: .constant(recipe.currentVersion.servings))
        _ = RecipeDetailSocialContextBlock(viewModel: RecipeDetailSocialContextViewModel(recipe: recipe))
        _ = RecipeDetailPlaceholderView()
    }

    func testLogPickerDefaultSectionsUseRecentsSavedAndMineFixtures() throws {
        let viewModel = LogPickerViewModel(mealType: .lunch)

        XCTAssertEqual(viewModel.visibleSections.map(\.kind), [.recents, .saved, .mine])
        XCTAssertEqual(viewModel.visibleSections.map(\.title), ["Recent", "Saved", "Mine"])
        XCTAssertEqual(viewModel.mealContextTitle, "Meal context: Lunch")
        XCTAssertEqual(viewModel.allItems.count, 4)
        XCTAssertEqual(viewModel.allItems.first?.title, "Chicken Shawarma Bowl")
        XCTAssertEqual(viewModel.allItems.first?.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(viewModel.allItems.first?.macroValues.map(\.kind), [.calories, .protein, .carbs, .fat])
        XCTAssertTrue(viewModel.showsDefaultSections)
    }

    func testLogPickerItemMetadataKeepsRecipeVersionOnlyForRecipes() {
        let viewModel = LogPickerViewModel()
        let recipeItems = viewModel.allItems.filter { $0.itemType == .recipe }
        let foodItems = viewModel.allItems.filter { $0.itemType == .food }

        XCTAssertFalse(recipeItems.isEmpty)
        XCTAssertTrue(recipeItems.allSatisfy { $0.recipeId != nil && $0.recipeVersionId != nil && $0.foodId == nil })
        XCTAssertTrue(foodItems.allSatisfy { $0.recipeId == nil && $0.recipeVersionId == nil && $0.foodId != nil })
        XCTAssertTrue(viewModel.allItems.allSatisfy { $0.macros.calories > 0 })
        XCTAssertTrue(viewModel.allItems.allSatisfy { !$0.sourceLabel.isEmpty })
    }

    func testLogPickerCopyIsPrivacySafeNonShamingAndNoPrivateLeakage() {
        let viewModel = LogPickerViewModel(mealType: .snack)
        let visibleCopy = ([
            viewModel.title,
            viewModel.searchPlaceholder,
            viewModel.mealContextTitle,
            viewModel.privacyCopy,
            viewModel.scaffoldCopy
        ] + viewModel.visibleSections.flatMap { section in
            [section.title, section.subtitle] + section.items.flatMap { [$0.title, $0.subtitle, $0.sourceLabel] }
        }).joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "daily goal", "body weight", "body metrics"]

        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("private"))
        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("mock"))
        XCTAssertTrue(deniedTerms.allSatisfy { !visibleCopy.localizedCaseInsensitiveContains($0) })
    }

    func testLogPickerNonEmptyQueryFiltersLocalMockResultsDeterministically() {
        let viewModel = LogPickerViewModel(query: "o")

        XCTAssertFalse(viewModel.showsDefaultSections)
        XCTAssertEqual(viewModel.visibleSections.map(\.kind), [.searchResults])
        XCTAssertEqual(viewModel.searchResults.map(\.title), ["Berry Oat Breakfast Bowl", "Chicken Shawarma Bowl", "Lemony Lentil Soup", "Greek Yogurt"])
        XCTAssertEqual(viewModel.searchResults.map(\.sectionKind), Array(repeating: .searchResults, count: 4))
    }

    func testLogPickerSearchResultsClearlyDistinguishRecipesAndFoods() {
        let viewModel = LogPickerViewModel(query: "o")
        let results = viewModel.searchResults
        let recipeResults = results.filter { $0.itemType == .recipe }
        let foodResults = results.filter { $0.itemType == .food }

        XCTAssertEqual(Set(results.map(\.typeLabel)), ["Recipe", "Food"])
        XCTAssertFalse(recipeResults.isEmpty)
        XCTAssertFalse(foodResults.isEmpty)
        XCTAssertTrue(recipeResults.allSatisfy { $0.typeSystemImage.contains("fork.knife") })
        XCTAssertTrue(foodResults.allSatisfy { $0.typeSystemImage.contains("leaf") })
    }

    func testLogPickerSearchRecipeResultsKeepRecipeVersionAndFoodResultsDoNot() {
        let viewModel = LogPickerViewModel(query: "o")
        let recipeResults = viewModel.searchResults.filter { $0.itemType == .recipe }
        let foodResults = viewModel.searchResults.filter { $0.itemType == .food }

        XCTAssertTrue(recipeResults.allSatisfy { $0.recipeId != nil && $0.recipeVersionId != nil && $0.foodId == nil && $0.hasRecipeMetadata })
        XCTAssertTrue(foodResults.allSatisfy { $0.recipeId == nil && $0.recipeVersionId == nil && $0.foodId != nil && !$0.hasRecipeMetadata })
    }

    func testLogPickerNoResultStateUsesWarmClearSearchAction() {
        let viewModel = LogPickerViewModel(query: "dragonfruit toast")

        XCTAssertEqual(viewModel.visibleSections, [])
        if case .noResults(let state) = viewModel.contentState {
            XCTAssertEqual(state.title, "No local matches yet")
            XCTAssertTrue(state.message.localizedCaseInsensitiveContains("Try a saved recipe name"))
            XCTAssertEqual(state.primaryActionTitle, "Clear search")
            XCTAssertEqual(state.primaryActionMetadata, "clear-local-search-query")
            XCTAssertNil(state.secondaryActionTitle)
        } else {
            XCTFail("Expected no-result state for non-empty local search without matches")
        }
    }

    func testLogPickerRecoverableErrorStateIsLocalMockWithRetryAndClearMetadata() {
        let viewModel = LogPickerViewModel(query: "oats", mockIssue: .recoverableLocalSearch)

        XCTAssertEqual(viewModel.visibleSections, [])
        if case .recoverableError(let state) = viewModel.contentState {
            XCTAssertEqual(state.title, "Mock search needs a refresh")
            XCTAssertTrue(state.message.localizedCaseInsensitiveContains("local test state"))
            XCTAssertTrue(state.message.localizedCaseInsensitiveContains("no backend request"))
            XCTAssertEqual(state.primaryActionTitle, "Try again")
            XCTAssertEqual(state.primaryActionMetadata, "retry-local-mock-search")
            XCTAssertEqual(state.secondaryActionTitle, "Clear search")
            XCTAssertEqual(state.secondaryActionMetadata, "clear-local-search-query")
        } else {
            XCTFail("Expected recoverable mock error state")
        }
    }

    func testLogPickerNoResultAndErrorCopyAvoidPrivateLeakageAndOverreach() {
        let noResult = LogPickerViewModel(query: "zzz").noResultsState
        let error = LogPickerViewModel(query: "oats", mockIssue: .recoverableLocalSearch)
        let visibleCopy = [
            noResult.title,
            noResult.message,
            noResult.primaryActionTitle,
            error.scaffoldCopy,
            LogPickerViewModel.recoverableErrorState.title,
            LogPickerViewModel.recoverableErrorState.message,
            LogPickerViewModel.recoverableErrorState.primaryActionMetadata,
            LogPickerViewModel.recoverableErrorState.secondaryActionMetadata ?? ""
        ].joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "body weight", "body metrics", "calorie goal", "publish", "sync"]

        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("local"))
        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("mock"))
        XCTAssertTrue(deniedTerms.allSatisfy { !visibleCopy.localizedCaseInsensitiveContains($0) })
    }

    @MainActor
    func testLogPickerViewCanConstructMockErrorStateForReviewHook() {
        _ = LogPickerPlaceholderView(initialQuery: "oats", mockIssue: .recoverableLocalSearch)
    }

    func testMealPresetPropagatesThroughPickerContextCopy() {
        let picker = LogPickerViewModel(query: "oat", mealType: .breakfast)

        XCTAssertEqual(picker.mealType, .breakfast)
        XCTAssertEqual(picker.mealContextTitle, "Meal context: Breakfast")
        XCTAssertTrue(picker.scaffoldCopy.localizedCaseInsensitiveContains("meal context is preserved"))
        XCTAssertEqual(picker.visibleSections.map(\.kind), [.searchResults])
    }

    func testRecipeHandoffRetainsPickerMealPresetInLogRecipeSheet() throws {
        let picker = LogPickerViewModel(query: "shawarma", mealType: .dinner)
        let recipe = try XCTUnwrap(picker.searchResults.first(where: { $0.itemType == .recipe }))
        let sheet = LogRecipeSheetViewModel(requestedRecipeId: recipe.recipeId, defaultMealType: picker.mealType)

        XCTAssertEqual(recipe.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(sheet.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(sheet.recipeVersionId, recipe.recipeVersionId)
        XCTAssertEqual(sheet.selectedMealType, .dinner)
        XCTAssertEqual(sheet.mealTitle, "Meal: Dinner")
    }

    func testNonDefaultRecipeHandoffPreservesPickerVersionAndMealPreset() throws {
        let picker = LogPickerViewModel(query: "lentil", mealType: .breakfast)
        let recipe = try XCTUnwrap(picker.searchResults.first(where: { $0.itemType == .recipe }))
        let route = SavoroSheetRoute.logRecipe(recipeId: recipe.recipeId, recipeVersionId: recipe.recipeVersionId, mealType: picker.mealType)
        let sheet = LogRecipeSheetViewModel(requestedRecipeId: recipe.recipeId, requestedRecipeVersionId: recipe.recipeVersionId, defaultMealType: picker.mealType)
        let payload = sheet.logRequestPayload(now: Date(timeIntervalSince1970: 0))

        XCTAssertEqual(recipe.title, "Lemony Lentil Soup")
        XCTAssertEqual(recipe.recipeId, "recipe_lentil_soup")
        XCTAssertEqual(recipe.recipeVersionId, "recipe_version_lentil_20260604")
        XCTAssertEqual(route.id, "log-recipe:recipe_lentil_soup:recipe_version_lentil_20260604:breakfast")
        XCTAssertEqual(sheet.recipeId, recipe.recipeId)
        XCTAssertEqual(sheet.recipeVersionId, recipe.recipeVersionId)
        XCTAssertEqual(sheet.selectedMealType, .breakfast)
        XCTAssertEqual(sheet.title, "Lemony Lentil Soup")
        XCTAssertEqual(payload.recipeVersionId, recipe.recipeVersionId)
        XCTAssertEqual(payload.mealType, .breakfast)
        XCTAssertEqual(payload.snapshot.displayName, "Lemony Lentil Soup")
    }

    func testFoodSelectionPreservesMealContextButHasNoRecipeMetadata() throws {
        let picker = LogPickerViewModel(query: "yogurt", mealType: .snack)
        let food = try XCTUnwrap(picker.searchResults.first(where: { $0.itemType == .food }))

        XCTAssertEqual(picker.mealType, .snack)
        XCTAssertEqual(food.foodId, "food_greek_yogurt")
        XCTAssertNil(food.recipeId)
        XCTAssertNil(food.recipeVersionId)
        XCTAssertFalse(food.hasRecipeMetadata)
    }

    func testPickerSelectionModelsDoNotPrematurelyMutateToday() throws {
        let original = DayLog.todayFixture
        let picker = LogPickerViewModel(query: "shawarma", mealType: .breakfast)
        let recipe = try XCTUnwrap(picker.searchResults.first)
        _ = LogRecipeSheetViewModel(requestedRecipeId: recipe.recipeId, defaultMealType: picker.mealType, defaultLogDate: original.logDate)

        XCTAssertEqual(original, DayLog.todayFixture)
        XCTAssertEqual(TodaySummaryViewModel(dayLog: original).totals, TodaySummaryViewModel(dayLog: DayLog.todayFixture).totals)
    }

    @MainActor
    func testLogPickerViewCanBeConstructedForDefaultAndMealContext() {
        _ = LogPickerPlaceholderView()
        _ = LogPickerPlaceholderView(mealType: .dinner)
    }

    private func makeMealLog(macros: MacroTotals) throws -> MealLog {
        try MealLog(mealType: .lunch, entries: [
            try makeFoodLogEntry(id: "test_log", displayName: "Test food", macros: macros, mealType: .lunch)
        ])
    }

    private func makeFoodLogEntry(
        id: String,
        displayName: String,
        calories: Double,
        mealType: MealType
    ) throws -> FoodLogEntry {
        try makeFoodLogEntry(
            id: id,
            displayName: displayName,
            macros: try MacroTotals(calories: calories, proteinGrams: 10, carbsGrams: 10, fatGrams: 1),
            mealType: mealType
        )
    }

    private func makeFoodLogEntry(
        id: String,
        displayName: String,
        macros: MacroTotals,
        mealType: MealType
    ) throws -> FoodLogEntry {
        try FoodLogEntry(
            id: id,
            userId: "user_1",
            date: "2026-06-06",
            mealType: mealType,
            itemType: .food,
            foodId: "food_\(id)",
            quantity: 1,
            quantityUnit: "serving",
            snapshot: NutritionSnapshot(displayName: displayName, macros: macros, capturedAt: Date(timeIntervalSince1970: 0)),
            sourceType: .manual,
            createdAt: Date(timeIntervalSince1970: 0),
            updatedAt: Date(timeIntervalSince1970: 0)
        )
    }

    func testLogRecipeSheetViewModelUsesFrozenMockRecipeNutrition() {
        let viewModel = LogRecipeSheetViewModel(requestedRecipeId: "recipe_shawarma_bowl")

        XCTAssertEqual(viewModel.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(viewModel.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(viewModel.servingText, "1 serving")
        XCTAssertEqual(viewModel.macroPreview.map(\.kind), [.calories, .protein, .carbs, .fat])
        XCTAssertEqual(viewModel.macroPreview.map(\.value), [520, 42, 48, 18])
        XCTAssertTrue(viewModel.versionCopy.localizedCaseInsensitiveContains("version"))
    }

    func testLogRecipeSheetCopyIsMockOnlyPrivateAndNonShaming() {
        let viewModel = LogRecipeSheetViewModel(requestedRecipeId: nil)
        let visibleCopy = [
            viewModel.primaryButtonTitle,
            viewModel.secondaryButtonTitle,
            viewModel.scaffoldNotice,
            viewModel.privacyCopy,
            viewModel.provenanceTitle,
            viewModel.provenanceDetail,
            viewModel.mealTitle,
            viewModel.dateTitle,
            viewModel.sourceLabel
        ].joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food"]

        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("mock"))
        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("private"))
        XCTAssertTrue(visibleCopy.localizedCaseInsensitiveContains("frozen"))
        XCTAssertTrue(deniedTerms.allSatisfy { !visibleCopy.localizedCaseInsensitiveContains($0) })
    }

    func testLogRecipeSheetMockCopyDoesNotImplyBackendOrPublicMutation() {
        let viewModels = [
            LogRecipeSheetViewModel(requestedRecipeId: nil),
            LogRecipeSheetViewModel(requestedRecipeId: "recipe_shawarma_bowl")
        ]
        let publicOrBackendImplicationTerms = ["published", "shared", "backend updated", "synced"]

        for viewModel in viewModels {
            let visibleCopy = [
                viewModel.title,
                viewModel.recipeIdentitySubtitle,
                viewModel.primaryButtonTitle,
                viewModel.scaffoldNotice,
                viewModel.privacyCopy,
                viewModel.provenanceTitle,
                viewModel.provenanceDetail,
                viewModel.macroPreviewTitle
            ].joined(separator: " ")

            XCTAssertTrue(publicOrBackendImplicationTerms.allSatisfy { !visibleCopy.localizedCaseInsensitiveContains($0) })
            XCTAssertTrue(viewModel.scaffoldNotice.localizedCaseInsensitiveContains("in-memory"))
            XCTAssertTrue(viewModel.provenanceTitle.localizedCaseInsensitiveContains("frozen"))
        }
    }

    func testLogRecipeSheetControlMetadataStaysPrivateMockOnly() {
        let viewModel = LogRecipeSheetViewModel(requestedRecipeId: nil)

        XCTAssertEqual(viewModel.servingRange, 0.5...6)
        XCTAssertEqual(viewModel.servingStep, 0.5)
        XCTAssertEqual(viewModel.selectedServings, 1)
        XCTAssertEqual(viewModel.selectedMealType, .lunch)
        XCTAssertEqual(viewModel.mealTitle, "Meal: Lunch")
        XCTAssertEqual(LogRecipeSheetViewModel(requestedRecipeId: nil, defaultMealType: .breakfast).selectedMealType, .breakfast)
        XCTAssertEqual(viewModel.primaryButtonTitle, "Log privately")
        XCTAssertEqual(viewModel.secondaryButtonTitle, "Not now")
        XCTAssertTrue(viewModel.scaffoldNotice.localizedCaseInsensitiveContains("in-memory"))
    }

    func testLogRecipeSheetServingStepperUpdatesMacroPreviewAndBounds() {
        let base = LogRecipeSheetViewModel(requestedRecipeId: nil)
        let halfServing = base.steppingServings(by: -0.5)
        let doubleServing = base.updatingServings(2)
        let belowMinimum = base.updatingServings(-10)
        let aboveMaximum = base.updatingServings(99)

        XCTAssertEqual(halfServing.selectedServings, 0.5)
        XCTAssertEqual(halfServing.servingText, "0.5 servings")
        XCTAssertEqual(halfServing.macroPreview.map(\.value), [260, 21, 24, 9])
        XCTAssertFalse(halfServing.canDecreaseServings)

        XCTAssertEqual(doubleServing.selectedServings, 2)
        XCTAssertEqual(doubleServing.macroPreview.map(\.value), [1040, 84, 96, 36])
        XCTAssertEqual(doubleServing.macroPreviewTitle, "Macro preview for 2 servings")

        XCTAssertEqual(belowMinimum.selectedServings, 0.5)
        XCTAssertEqual(aboveMaximum.selectedServings, 6)
        XCTAssertFalse(aboveMaximum.canIncreaseServings)
    }

    func testLogRecipeRequestPayloadPreservesFrozenSnapshotVersionAndPrivacy() throws {
        let now = ISO8601DateFormatter().date(from: "2026-06-06T16:00:00Z")!
        let viewModel = LogRecipeSheetViewModel(requestedRecipeId: "recipe_shawarma_bowl")
            .updatingServings(2)
            .updatingMealType(.dinner)
        let payload = viewModel.logRequestPayload(now: now)
        let request = LogRecipeRequest(payload: payload)
        let body = try XCTUnwrap(request.body)
        let decoded = try JSONDecoder.savoro.decode(LogRecipeRequestPayload.self, from: body)

        XCTAssertEqual(request.path, "/mock/logs/recipes")
        XCTAssertEqual(request.method, .post)
        XCTAssertEqual(decoded.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(decoded.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(decoded.mealType, .dinner)
        XCTAssertEqual(decoded.servings, 2)
        XCTAssertEqual(decoded.snapshot.displayName, "Chicken Shawarma Bowl")
        XCTAssertEqual(decoded.snapshot.macros.calories, 1040)
        XCTAssertEqual(decoded.snapshot.sourceLabel, "Recipe recipe_version_20260606")
        XCTAssertEqual(decoded.snapshot.capturedAt, now)
        XCTAssertEqual(decoded.privacyDomain, .privateUserData)
    }

    func testDefaultLogRecipeAppFlowDateAppendsToDisplayedTodayFixture() throws {
        let base = DayLog.todayFixture
        let viewModel = LogRecipeSheetViewModel(requestedRecipeId: nil, defaultLogDate: base.logDate).updatingMealType(.dinner)
        let now = ISO8601DateFormatter().date(from: "2026-06-06T18:00:00Z")!
        let payload = viewModel.logRequestPayload(now: now)
        let entry = try FoodLogEntry(
            id: "mock_log_test",
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

        let refreshed = try base.addingEntry(entry)
        let today = TodaySummaryViewModel(dayLog: refreshed)
        let dinner = try XCTUnwrap(today.mealSections.first(where: { $0.mealType == .dinner }))
        let logged = try XCTUnwrap(dinner.entries.first(where: { $0.id == "mock_log_test" }))

        XCTAssertEqual(payload.date, base.date)
        XCTAssertEqual(refreshed.date, base.date)
        XCTAssertEqual(today.dateText, "Saturday, June 6")
        XCTAssertEqual(refreshed.privacyDomain, .privateUserData)
        XCTAssertEqual(logged.privacyDomain, .privateUserData)
        XCTAssertEqual(logged.itemType, .recipe)
        XCTAssertEqual(logged.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(logged.snapshot, payload.snapshot)
        XCTAssertEqual(today.totals.calories, base.totals.calories + payload.snapshot.macros.calories)
        XCTAssertTrue(today.reassuranceText.localizedCaseInsensitiveContains("private"))
    }

    func testLogRecipeSubmissionStatusCopyCoversLoadingSuccessAndError() {
        XCTAssertTrue(LogRecipeSubmissionStatus.submitting.isSubmitting)
        XCTAssertFalse(LogRecipeSubmissionStatus.idle.isSubmitting)
        XCTAssertEqual(LogRecipeSubmissionStatus.succeeded("Added privately."), .succeeded("Added privately."))
        XCTAssertEqual(LogRecipeSubmissionStatus.errored("Today is unchanged."), .errored("Today is unchanged."))
    }

    func testLogRecipeSubmissionStatusDisablesInputsAndDismissOnlyWhileSubmitting() {
        let editableStatuses: [LogRecipeSubmissionStatus] = [
            .idle,
            .succeeded("Added privately."),
            .errored("Today is unchanged.")
        ]

        XCTAssertTrue(LogRecipeSubmissionStatus.submitting.controlsDisabled)
        XCTAssertFalse(LogRecipeSubmissionStatus.submitting.canEditInputs)
        XCTAssertFalse(LogRecipeSubmissionStatus.submitting.canDismiss)

        for status in editableStatuses {
            XCTAssertFalse(status.controlsDisabled)
            XCTAssertTrue(status.canEditInputs)
            XCTAssertTrue(status.canDismiss)
        }
    }

    func testLocalLogRecipeMockSuccessPreservesVersionPrivacyAndFrozenSnapshot() async throws {
        let now = ISO8601DateFormatter().date(from: "2026-06-06T19:00:00Z")!
        let payload = LogRecipeSheetViewModel(requestedRecipeId: nil)
            .updatingServings(1.5)
            .logRequestPayload(now: now)
        let client = MockAPIClient.localLogRecipeSuccess()

        let response = try await client.send(LogRecipeRequest(payload: payload))

        XCTAssertEqual(response.entry.recipeId, payload.recipeId)
        XCTAssertEqual(response.entry.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(response.entry.privacyDomain, .privateUserData)
        XCTAssertEqual(response.entry.snapshot, payload.snapshot)
        XCTAssertEqual(response.entry.snapshot.macros.calories, 780)
        XCTAssertNil(response.dayLog)
    }

    func testLogRecipeMockFailureDoesNotMutateTodayWhenAppliedAfterSuccessOnly() async throws {
        let original = DayLog.todayFixture
        var displayed = original
        let payload = LogRecipeSheetViewModel(requestedRecipeId: nil, defaultLogDate: original.logDate)
            .logRequestPayload(now: Date(timeIntervalSince1970: 0))
        let failingClient = MockAPIClient()

        do {
            let response = try await failingClient.send(LogRecipeRequest(payload: payload))
            displayed = try displayed.addingEntry(response.entry)
            XCTFail("Unexpected mock success")
        } catch {
            XCTAssertEqual(displayed, original)
            XCTAssertEqual(TodaySummaryViewModel(dayLog: displayed).totals, TodaySummaryViewModel(dayLog: original).totals)
        }
    }

    func testFrozenSnapshotStaysUnchangedAfterSourceNutritionChanges() throws {
        let logged = LogRecipeSheetViewModel(requestedRecipeId: nil).logRequestPayload(now: Date(timeIntervalSince1970: 0))
        let changedSourceMacros = try MacroTotals(calories: 610, proteinGrams: 50, carbsGrams: 55, fatGrams: 21)
        let changedSource = LogRecipeRequestPayload(
            userId: logged.userId,
            recipeId: logged.recipeId,
            recipeVersionId: "recipe_version_future",
            date: logged.date,
            mealType: logged.mealType,
            servings: logged.servings,
            snapshot: NutritionSnapshot(displayName: "Chicken Shawarma Bowl", macros: changedSourceMacros, sourceLabel: "Recipe recipe_version_future", capturedAt: Date(timeIntervalSince1970: 60))
        )

        XCTAssertEqual(logged.recipeVersionId, "recipe_version_20260606")
        XCTAssertEqual(logged.snapshot.macros.calories, 520)
        XCTAssertEqual(logged.snapshot.sourceLabel, "Recipe recipe_version_20260606")
        XCTAssertEqual(changedSource.snapshot.macros.calories, 610)
        XCTAssertNotEqual(logged.snapshot, changedSource.snapshot)
    }

    func testMockAPIClientCanReturnLogRecipeResponse() async throws {
        let payload = LogRecipeSheetViewModel(requestedRecipeId: nil).logRequestPayload(now: Date(timeIntervalSince1970: 0))
        let entry = try FoodLogEntry(
            id: "mock_log_api",
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
            createdAt: payload.snapshot.capturedAt,
            updatedAt: payload.snapshot.capturedAt
        )
        let responseData = try JSONEncoder.savoro.encode(LogRecipeResponse(entry: entry, dayLog: nil))
        let client = MockAPIClient(responses: ["/mock/logs/recipes": responseData], decoder: .savoro)

        let response = try await client.send(LogRecipeRequest(payload: payload))

        XCTAssertEqual(response.entry.id, "mock_log_api")
        XCTAssertEqual(response.entry.recipeVersionId, payload.recipeVersionId)
        XCTAssertEqual(response.entry.snapshot, payload.snapshot)
        XCTAssertEqual(response.entry.privacyDomain, .privateUserData)
    }

    func testTodaySummaryDateTextDerivesFromDayLogDateWhenNotOverridden() throws {
        let dayLog = try DayLog(userId: "user_1", date: "2026-06-08", meals: [])
        let viewModel = TodaySummaryViewModel(dayLog: dayLog)

        XCTAssertEqual(viewModel.dateText, "Monday, June 8")
    }

    func testLogRecipeSheetMealAndDateMetadataUpdateLocally() {
        let base = LogRecipeSheetViewModel(requestedRecipeId: nil)
        let dinner = base.updatingMealType(.dinner)
        let tomorrow = base.updatingDate(byAddingDays: 1)
        let yesterday = base.updatingDate(byAddingDays: -1)

        XCTAssertEqual(dinner.selectedMealType, .dinner)
        XCTAssertEqual(dinner.mealTitle, "Meal: Dinner")
        XCTAssertEqual(tomorrow.dateTitle, "Date: Tomorrow")
        XCTAssertEqual(yesterday.dateTitle, "Date: Yesterday")
        XCTAssertEqual(MealType.allCases.map(\.description), ["Breakfast", "Lunch", "Dinner", "Snack"])
    }

    func testFiveTabShellDefinesMVPTabsInOrder() {
        XCTAssertEqual(SavoroTab.allCases.map(\.title), ["Today", "Cookbook", "Discover", "Community", "Profile"])
        XCTAssertEqual(SavoroTab.allCases.count, 5)
        XCTAssertTrue(SavoroTab.allCases.allSatisfy { !$0.systemImage.isEmpty })
    }

    func testSheetRouteMetadataCoversPlannedFutureFlows() {
        let routes: [SavoroSheetRoute] = [
            .addMeal,
            .logRecipe(recipeId: nil),
            .logRecipe(recipeId: "recipe_1"),
            .logPicker(),
            .forkRemix(recipeId: "recipe_1"),
            .shareRecipe(recipeId: "recipe_1"),
            .publishVisibility(recipeId: nil),
            .publishVisibility(recipeId: "recipe_1"),
            .recipeActions(recipeId: "recipe_1")
        ]

        XCTAssertEqual(routes.map(\.id), [
            "add-meal",
            "log-recipe:new:no-meal",
            "log-recipe:recipe_1:no-meal",
            "log-picker:no-meal",
            "fork-remix:recipe_1",
            "share-recipe:recipe_1",
            "publish-visibility:new",
            "publish-visibility:recipe_1",
            "recipe-actions:recipe_1"
        ])
        XCTAssertTrue(routes.allSatisfy { !$0.title.isEmpty })
        XCTAssertTrue(routes.allSatisfy { !$0.placeholderSubtitle.isEmpty })
    }

    func testToastModelSupportsDemoSafeScaffoldMessages() {
        let toast = SavoroToast.scaffoldDemo

        XCTAssertEqual(toast.id, UUID(uuidString: "00000000-0000-0000-0000-000000000039"))
        XCTAssertEqual(toast.style, .info)
        XCTAssertEqual(SavoroToast.Style.allCases.map(\.rawValue), ["info", "success", "warning"])
        XCTAssertFalse(toast.title.isEmpty)
        XCTAssertGreaterThan(toast.duration, 0)
    }

    func testRouteMetadataCoversPlannedPlaceholderDestinations() {
        let routes: [SavoroRoute] = [
            .recipeDetail(id: "recipe_1"),
            .communityDetail(id: "community_1"),
            .publicProfile(userId: "user_1"),
            .recipeEditor(draftId: nil),
            .recipeEditor(draftId: "draft_1")
        ]

        XCTAssertEqual(routes.map(\.title), ["Recipe Detail", "Community Detail", "Public Profile", "Recipe Editor", "Recipe Editor"])
        XCTAssertEqual(routes.map(\.id), [
            "recipe-detail:recipe_1",
            "community-detail:community_1",
            "public-profile:user_1",
            "recipe-editor:new",
            "recipe-editor:draft_1"
        ])
        XCTAssertTrue(routes.allSatisfy { !$0.placeholderSubtitle.isEmpty })
    }

    func testPerTabNavigationStateKeepsIndependentPaths() {
        var state = SavoroTabNavigationState()
        state[.discover].append(.recipeDetail(id: "recipe_discover"))
        state[.community].append(.communityDetail(id: "community_1"))
        state[.profile].append(.publicProfile(userId: "user_1"))

        XCTAssertEqual(state[.discover], [.recipeDetail(id: "recipe_discover")])
        XCTAssertEqual(state[.community], [.communityDetail(id: "community_1")])
        XCTAssertEqual(state[.profile], [.publicProfile(userId: "user_1")])
        XCTAssertTrue(state[.today].isEmpty)
        XCTAssertTrue(state[.cookbook].isEmpty)
    }

    func testNavigationSmokeEvidenceCoversTabSwitchingAndRouteIsolationContracts() {
        let tabs = SavoroTab.allCases
        XCTAssertEqual(tabs, [.today, .cookbook, .discover, .community, .profile])
        XCTAssertEqual(Set(tabs.map(\.id)).count, tabs.count, "TabView tags/ids must remain unique for reliable tab switching.")
        XCTAssertEqual(Set(tabs.map(\.title)).count, tabs.count)
        XCTAssertEqual(Set(tabs.map(\.systemImage)).count, tabs.count)

        var state = SavoroTabNavigationState()
        for tab in tabs {
            XCTAssertTrue(state[tab].isEmpty, "Each tab starts with an isolated empty NavigationStack path.")
        }

        state[.today] = [.recipeDetail(id: "today_recipe")]
        state[.cookbook] = [.recipeEditor(draftId: "draft_cookbook")]
        state[.discover] = [.recipeDetail(id: "discover_recipe"), .publicProfile(userId: "creator_1")]
        state[.community] = [.communityDetail(id: "community_1")]
        state[.profile] = [.publicProfile(userId: "profile_1")]

        XCTAssertEqual(state[.today].map(\.id), ["recipe-detail:today_recipe"])
        XCTAssertEqual(state[.cookbook].map(\.id), ["recipe-editor:draft_cookbook"])
        XCTAssertEqual(state[.discover].map(\.id), ["recipe-detail:discover_recipe", "public-profile:creator_1"])
        XCTAssertEqual(state[.community].map(\.id), ["community-detail:community_1"])
        XCTAssertEqual(state[.profile].map(\.id), ["public-profile:profile_1"])
    }

    @MainActor
    func testSmokeEvidenceConstructsAllPlaceholderScopesWithoutRealFlows() {
        for tab in SavoroTab.allCases {
            XCTAssertFalse(tab.title.isEmpty)
            XCTAssertFalse(tab.systemImage.isEmpty)
        }

        let routeSubtitles = [
            SavoroRoute.recipeDetail(id: "recipe_1").placeholderSubtitle,
            SavoroRoute.communityDetail(id: "community_1").placeholderSubtitle,
            SavoroRoute.publicProfile(userId: "user_1").placeholderSubtitle,
            SavoroRoute.recipeEditor(draftId: nil).placeholderSubtitle
        ]
        XCTAssertTrue(routeSubtitles.allSatisfy { $0.localizedCaseInsensitiveContains("Placeholder route") })

        let placeholderOnlySheetRoutes: [SavoroSheetRoute] = [
            .forkRemix(recipeId: "recipe_1"),
            .shareRecipe(recipeId: "recipe_1"),
            .publishVisibility(recipeId: "recipe_1"),
            .recipeActions(recipeId: "recipe_1")
        ]
        XCTAssertTrue(placeholderOnlySheetRoutes.allSatisfy { $0.placeholderSubtitle.localizedCaseInsensitiveContains("Placeholder sheet route") })
        XCTAssertTrue(SavoroSheetRoute.logPicker().placeholderSubtitle.localizedCaseInsensitiveContains("recents"))
        XCTAssertTrue(SavoroSheetRoute.logPicker().placeholderSubtitle.localizedCaseInsensitiveContains("Search results"))

        let logRecipeRoute = SavoroSheetRoute.logRecipe(recipeId: "recipe_1")
        XCTAssertTrue(logRecipeRoute.placeholderSubtitle.localizedCaseInsensitiveContains("mock recipe logging scaffold"))
        XCTAssertTrue(logRecipeRoute.placeholderSubtitle.localizedCaseInsensitiveContains("private in-memory updates"))
        XCTAssertTrue(logRecipeRoute.placeholderSubtitle.localizedCaseInsensitiveContains("app session only"))
        XCTAssertTrue(logRecipeRoute.placeholderSubtitle.localizedCaseInsensitiveContains("no backend persistence"))
        XCTAssertFalse(logRecipeRoute.placeholderSubtitle.localizedCaseInsensitiveContains("public"))
        XCTAssertFalse(logRecipeRoute.placeholderSubtitle.localizedCaseInsensitiveContains("shared"))

        _ = RootPlaceholderView()
        _ = SavoroTabShellView()
        ([logRecipeRoute] + placeholderOnlySheetRoutes).forEach { _ = SavoroPlaceholderSheetView(route: $0) }
        var toast: SavoroToast? = SavoroToast(title: "Smoke", message: "Structural host only", style: .success)
        _ = EmptyView().savoroToast(Binding(get: { toast }, set: { toast = $0 }))
    }

    func testDesignTokensExposeSavoroFoundations() {
        XCTAssertEqual(SavoroSpacing.md, 16)
        XCTAssertEqual(SavoroRadius.card, 16)
        XCTAssertEqual(SavoroShadow.glass.y, 4)
        XCTAssertEqual(SavoroTypography.fontDesign, .rounded)

        let tokenColors: [Color] = [
            SavoroColor.page,
            SavoroColor.accent,
            SavoroColor.macroProtein,
            SavoroColor.macroCarbs,
            SavoroColor.macroFat,
            SavoroColor.macroCalories
        ]
        XCTAssertEqual(tokenColors.count, 6)
    }

    @MainActor
    func testDesignSystemPrimitivesCanBeConstructed() {
        _ = SavoroCard { Text("Card") }
        _ = SavoroCard(style: .plain) { Text("Plain card") }
        _ = SavoroButton("Log this", variant: .primary) {}
        _ = SavoroButton("Save", variant: .secondary, isDisabled: true) {}
        _ = SavoroButton("Make your version", variant: .ghost) {}
        _ = SavoroChip(title: "high-protein", variant: .positive, isSelected: true)

        var segment = "Saved"
        let segmentBinding = Binding(get: { segment }, set: { segment = $0 })
        _ = SavoroSegmentedControl(options: ["Mine", "Saved", "Drafts"], selection: segmentBinding)

        var query = "oats"
        let queryBinding = Binding(get: { query }, set: { query = $0 })
        _ = SavoroSearchField(placeholder: "Search recipes", text: queryBinding)
    }

    @MainActor
    func testDesignSystemGalleryCanBeConstructed() {
        _ = SavoroDesignSystemGallery()
        XCTAssertEqual(SavoroDesignSystemGallery.sampleMacros.count, 4)
        XCTAssertGreaterThanOrEqual(SavoroDesignSystemGallery.colorSwatches.count, 8)
    }

    @MainActor
    func testNutritionAndTrustPrimitivesCanBeConstructed() {
        let macros = [
            SavoroMacroValue(kind: .calories, value: 520, goal: 2_200),
            SavoroMacroValue(kind: .protein, value: 42, goal: 160),
            SavoroMacroValue(kind: .carbs, value: 48, goal: 220),
            SavoroMacroValue(kind: .fat, value: 18, goal: 70)
        ]

        _ = SavoroMacroPill(macro: macros[1])
        _ = SavoroMacroProgressBar(macro: macros[1])
        _ = SavoroMacroStatBlock(macro: macros[1])
        _ = SavoroMacroRing(value: 1_420, goal: 2_200)
        _ = SavoroNutritionSnapshotCard(title: "Macros per serving", subtitle: "Chicken Shawarma Bowl", macros: macros)
        _ = SavoroTrustBadge(kind: .usdaVerified, detail: "Source attributed")
        _ = SavoroTrustBadge(kind: .creatorRecipe)
        _ = SavoroAvatar(name: "Maya Reed")
    }

    func testMacroProgressIsClampedAndNonShaming() {
        XCTAssertEqual(SavoroMacroValue(kind: .protein, value: 80, goal: 160).fractionComplete, 0.5)
        XCTAssertEqual(SavoroMacroValue(kind: .carbs, value: 260, goal: 220).fractionComplete, 1)
        XCTAssertEqual(SavoroMacroValue(kind: .fat, value: 18, goal: 0).fractionComplete, 0)
        XCTAssertEqual(SavoroTrustKind.savedSnapshot.title, "Nutrition snapshot saved")
    }

    func testNutritionLogFixtureDecodesPrivateFrozenSnapshots() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )

        XCTAssertEqual(dayLog.privacyDomain, .privateUserData)
        XCTAssertEqual(dayLog.meals.count, 2)
        XCTAssertEqual(dayLog.totals.calories, 670)
        XCTAssertEqual(dayLog.totals.proteinGrams, 62)

        let recipeLog = try XCTUnwrap(dayLog.meals.first?.entries.first)
        XCTAssertEqual(recipeLog.itemType, .recipe)
        XCTAssertEqual(recipeLog.recipeId, "recipe_shawarma_bowl")
        XCTAssertEqual(recipeLog.recipeVersionId, "recipe_version_20260606")
        XCTAssertNil(recipeLog.foodId)
        XCTAssertEqual(recipeLog.snapshot.displayName, "Chicken Shawarma Bowl")
        XCTAssertEqual(recipeLog.snapshot.macros.calories, 520)
        XCTAssertEqual(recipeLog.privacyDomain, .privateUserData)
    }

    func testRecipeLogsRequireRecipeVersionForFrozenSnapshotTraceability() throws {
        let capturedAt = Date(timeIntervalSince1970: 0)
        let snapshot = NutritionSnapshot(
            displayName: "Mutable Recipe Name",
            macros: try MacroTotals(calories: 100, proteinGrams: 10, carbsGrams: 12, fatGrams: 2),
            sourceLabel: "Recipe v1",
            capturedAt: capturedAt
        )

        XCTAssertThrowsError(
            try FoodLogEntry(
                id: "log_missing_version",
                userId: "user_1",
                date: "2026-06-06",
                mealType: .dinner,
                itemType: .recipe,
                recipeId: "recipe_1",
                recipeVersionId: nil,
                quantity: 1,
                quantityUnit: "serving",
                snapshot: snapshot,
                sourceType: .recipe,
                createdAt: capturedAt,
                updatedAt: capturedAt
            )
        ) { error in
            XCTAssertEqual(error as? FoodLogEntryValidationError, .invalidRecipeReference)
        }
    }

    func testGoalsArePrivateModelDomain() throws {
        let now = Date(timeIntervalSince1970: 0)
        let goal = try Goal(
            id: "goal_1",
            userId: "user_1",
            dailyTargets: try MacroTotals(calories: 2_200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70),
            startDate: "2026-06-06",
            createdAt: now,
            updatedAt: now
        )

        XCTAssertEqual(goal.privacyDomain, .privateUserData)
    }

    func testInvalidNegativeAndNaNMacrosAreRejected() throws {
        XCTAssertThrowsError(try MacroTotals(calories: -1, proteinGrams: 10, carbsGrams: 10, fatGrams: 10))
        XCTAssertThrowsError(try MacroTotals(calories: .nan, proteinGrams: 10, carbsGrams: 10, fatGrams: 10))
    }

    func testInvalidGoalTargetsAndDateRangeAreRejected() throws {
        let now = Date(timeIntervalSince1970: 0)
        XCTAssertThrowsError(
            try Goal(
                id: "goal_bad_macro",
                userId: "user_1",
                dailyTargets: try MacroTotals(calories: 2_200, proteinGrams: -1, carbsGrams: 220, fatGrams: 70),
                startDate: "2026-06-06",
                createdAt: now,
                updatedAt: now
            )
        )
        XCTAssertThrowsError(
            try Goal(
                id: "goal_bad_dates",
                userId: "user_1",
                dailyTargets: try MacroTotals(calories: 2_200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70),
                startDate: "2026-06-06",
                endDate: "2026-06-05",
                createdAt: now,
                updatedAt: now
            )
        )
    }

    func testMissingRecipeVersionIdIsRejectedOnDecode() throws {
        let json = """
        {
          "id": "log_missing_version",
          "userId": "user_1",
          "date": "2026-06-06",
          "mealType": "dinner",
          "itemType": "recipe",
          "recipeId": "recipe_1",
          "quantity": 1,
          "quantityUnit": "serving",
          "snapshot": {
            "displayName": "Recipe",
            "capturedAt": "2026-06-06T12:00:00Z",
            "macros": { "calories": 100, "proteinGrams": 10, "carbsGrams": 12, "fatGrams": 2 }
          },
          "sourceType": "recipe",
          "createdAt": "2026-06-06T12:00:00Z",
          "updatedAt": "2026-06-06T12:00:00Z"
        }
        """.data(using: .utf8)!

        XCTAssertThrowsError(try JSONDecoder.savoro.decode(FoodLogEntry.self, from: json))
    }

    func testFoodRecipeCrossReferencesAreRejected() throws {
        let now = Date(timeIntervalSince1970: 0)
        let snapshot = NutritionSnapshot(
            displayName: "Greek Yogurt",
            macros: try MacroTotals(calories: 150, proteinGrams: 20, carbsGrams: 8, fatGrams: 4),
            capturedAt: now
        )

        XCTAssertThrowsError(
            try FoodLogEntry(
                id: "log_bad_food",
                userId: "user_1",
                date: "2026-06-06",
                mealType: .snack,
                itemType: .food,
                foodId: "food_1",
                recipeId: "recipe_1",
                quantity: 1,
                quantityUnit: "cup",
                snapshot: snapshot,
                sourceType: .search,
                createdAt: now,
                updatedAt: now
            )
        ) { error in
            XCTAssertEqual(error as? NutritionValidationError, .invalidFoodReference)
        }
    }

    func testMealAndDayLogConsistencyInvariantsAreRejected() throws {
        let now = Date(timeIntervalSince1970: 0)
        let entry = try FoodLogEntry(
            id: "log_1",
            userId: "user_1",
            date: "2026-06-06",
            mealType: .lunch,
            itemType: .food,
            foodId: "food_1",
            quantity: 1,
            quantityUnit: "serving",
            snapshot: NutritionSnapshot(
                displayName: "Food",
                macros: try MacroTotals(calories: 100, proteinGrams: 10, carbsGrams: 10, fatGrams: 1),
                capturedAt: now
            ),
            sourceType: .search,
            createdAt: now,
            updatedAt: now
        )

        XCTAssertThrowsError(try MealLog(mealType: .dinner, entries: [entry])) { error in
            XCTAssertEqual(error as? NutritionValidationError, .mealEntryMismatch)
        }

        let meal = try MealLog(mealType: .lunch, entries: [entry])
        XCTAssertThrowsError(try DayLog(userId: "user_2", date: "2026-06-06", meals: [meal])) { error in
            XCTAssertEqual(error as? NutritionValidationError, .dayEntryMismatch)
        }
    }

    func testOmittedPrivacyDomainsDefaultToPrivateOnDecode() throws {
        let json = """
        {
          "userId": "user_1",
          "date": "2026-06-06",
          "meals": []
        }
        """.data(using: .utf8)!

        let dayLog = try JSONDecoder.savoro.decode(DayLog.self, from: json)
        XCTAssertEqual(dayLog.privacyDomain, .privateUserData)

        let goalJSON = """
        {
          "id": "goal_1",
          "userId": "user_1",
          "dailyTargets": { "calories": 2200, "proteinGrams": 160, "carbsGrams": 220, "fatGrams": 70 },
          "startDate": "2026-06-06",
          "createdAt": "2026-06-06T00:00:00Z",
          "updatedAt": "2026-06-06T00:00:00Z"
        }
        """.data(using: .utf8)!

        let goal = try JSONDecoder.savoro.decode(Goal.self, from: goalJSON)
        XCTAssertEqual(goal.privacyDomain, .privateUserData)
    }

    func testDayLogEncodeDecodeRoundTripWithSavoroDecoder() throws {
        let dayLog = try FixtureLoader.decode(
            DayLog.self,
            named: "day-log",
            bundle: Bundle(for: Self.self)
        )

        let encoded = try JSONEncoder.savoro.encode(dayLog)
        let decoded = try JSONDecoder.savoro.decode(DayLog.self, from: encoded)

        XCTAssertEqual(decoded, dayLog)
    }

    func testRecipeDetailFixtureDecodesExplicitVisibilityStatusAndTrust() throws {
        let detail = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )

        XCTAssertEqual(detail.summary.visibility, .public)
        XCTAssertEqual(detail.summary.status, .published)
        XCTAssertEqual(detail.summary.currentVersionId, detail.currentVersion.id)
        XCTAssertEqual(detail.currentVersion.perServingMacros, detail.summary.perServingMacros)
        XCTAssertEqual(detail.currentVersion.perServingMacros.calories, 520)
        XCTAssertEqual(detail.ingredients.count, 2)
        XCTAssertEqual(detail.summary.forkedFromRecipeId, "recipe_original_shawarma")
        XCTAssertEqual(detail.summary.forkedFromVersionId, "recipe_version_original_20260601")
        XCTAssertEqual(detail.ingredients[0].provenance?.sourceType, .usda)
        XCTAssertNil(detail.ingredients[1].provenance?.url)
        XCTAssertNil(detail.provenance.attributions[1].url)
        XCTAssertEqual(detail.provenance.trustLevel, .mixed)
        XCTAssertTrue(detail.summary.viewerState.canFork)
        XCTAssertTrue(detail.summary.viewerState.canLog)
    }

    func testRecipeDetailRoundTripsWithSavoroEncoderDecoder() throws {
        let detail = try FixtureLoader.decode(
            RecipeDetail.self,
            named: "recipe-detail",
            bundle: Bundle(for: Self.self)
        )

        let encoded = try JSONEncoder.savoro.encode(detail)
        let decoded = try JSONDecoder.savoro.decode(RecipeDetail.self, from: encoded)

        XCTAssertEqual(decoded, detail)
    }

    func testRecipeVisibilityAndStatusDecodeAllExplicitCases() throws {
        XCTAssertEqual(RecipeVisibility.allCases.map(\.rawValue), ["private", "unlisted", "public"])
        XCTAssertEqual(RecipeStatus.allCases.map(\.rawValue), ["draft", "published", "archived"])
    }

    func testRecipeDetailDecodesPrivateDraftUnlistedArchivedAndEmptyCollections() throws {
        let privateDraft = try decodeRecipeDetail(summaryOverrides: ["visibility": "private", "status": "draft"], ingredients: [], steps: [])
        XCTAssertEqual(privateDraft.summary.visibility, .private)
        XCTAssertEqual(privateDraft.summary.status, .draft)
        XCTAssertTrue(privateDraft.ingredients.isEmpty)
        XCTAssertTrue(privateDraft.steps.isEmpty)

        let unlisted = try decodeRecipeDetail(summaryOverrides: ["visibility": "unlisted", "status": "published"])
        XCTAssertEqual(unlisted.summary.visibility, .unlisted)

        let archived = try decodeRecipeDetail(summaryOverrides: ["visibility": "private", "status": "archived"])
        XCTAssertEqual(archived.summary.status, .archived)
    }

    func testRecipeOptionalURLFieldsMayBeNilOrOmitted() throws {
        let detail = try decodeRecipeDetail(
            summaryOverrides: ["imageUrl": NSNull()],
            creatorOverrides: ["avatarUrl": NSNull()],
            attributionOverrides: ["url": NSNull()]
        )

        XCTAssertNil(detail.summary.imageUrl)
        XCTAssertNil(detail.summary.creator.avatarUrl)
        XCTAssertNil(detail.provenance.attributions[0].url)
        XCTAssertNil(detail.ingredients[1].provenance?.url)
    }

    func testInvalidProvenanceEnumIsRejectedOnDecode() throws {
        XCTAssertThrowsError(try decodeRecipeDetail(attributionOverrides: ["sourceType": "spreadsheet_import"]))
    }

    func testRecipeDetailRejectsMismatchedCurrentVersion() throws {
        let json = """
        {
          "summary": {
            "id": "recipe_1",
            "ownerUserId": "user_1",
            "slug": "private-draft",
            "title": "Private Draft",
            "visibility": "private",
            "status": "draft",
            "currentVersionId": "version_expected",
            "creator": { "userId": "user_1", "username": "maya", "displayName": "Maya", "avatarUrl": null },
            "perServingMacros": { "calories": 100, "proteinGrams": 10, "carbsGrams": 12, "fatGrams": 2 },
            "tags": [],
            "viewerState": { "isOwner": true, "isSaved": false, "canFork": false, "canLog": false },
            "createdAt": "2026-06-06T12:00:00Z",
            "updatedAt": "2026-06-06T12:00:00Z"
          },
          "currentVersion": {
            "id": "version_actual",
            "recipeId": "recipe_1",
            "versionNumber": 1,
            "title": "Private Draft",
            "instructionsMarkdown": "Mix.",
            "servings": 1,
            "perServingMacros": { "calories": 100, "proteinGrams": 10, "carbsGrams": 12, "fatGrams": 2 },
            "createdByUserId": "user_1",
            "createdAt": "2026-06-06T12:00:00Z"
          },
          "ingredients": [],
          "steps": [],
          "provenance": { "trustLevel": "creator_provided", "summary": "Creator provided.", "attributions": [] }
        }
        """.data(using: .utf8)!

        XCTAssertThrowsError(try JSONDecoder.savoro.decode(RecipeDetail.self, from: json)) { error in
            XCTAssertEqual(error as? RecipeValidationError, .currentVersionMismatch)
        }
    }

    func testPublicDraftRecipeSummaryIsRejected() throws {
        let json = """
        {
          "id": "recipe_bad_public_draft",
          "ownerUserId": "user_1",
          "slug": "bad-public-draft",
          "title": "Bad Public Draft",
          "visibility": "public",
          "status": "draft",
          "currentVersionId": "version_1",
          "creator": { "userId": "user_1", "username": "maya", "displayName": "Maya", "avatarUrl": null },
          "perServingMacros": { "calories": 100, "proteinGrams": 10, "carbsGrams": 12, "fatGrams": 2 },
          "tags": [],
          "viewerState": { "isOwner": true, "isSaved": false, "canFork": false, "canLog": false },
          "createdAt": "2026-06-06T12:00:00Z",
          "updatedAt": "2026-06-06T12:00:00Z"
        }
        """.data(using: .utf8)!

        XCTAssertThrowsError(try JSONDecoder.savoro.decode(RecipeSummary.self, from: json)) { error in
            XCTAssertEqual(error as? RecipeValidationError, .publicRecipeMustBePublished)
        }
    }

    func testRecipeSummaryAndVersionValidationFailuresAreRejected() throws {
        XCTAssertThrowsError(try decodeRecipeSummary(overrides: ["currentVersionId": ""])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .missingCurrentVersion)
        }
        XCTAssertThrowsError(try decodeRecipeSummary(overrides: ["visibility": "public", "status": "archived"])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .publicRecipeMustBePublished)
        }
        XCTAssertThrowsError(try decodeRecipeVersion(overrides: ["versionNumber": 0])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidVersionNumber)
        }
        for badServings in [0.0, -1.0] {
            XCTAssertThrowsError(try decodeRecipeVersion(overrides: ["servings": badServings])) { error in
                XCTAssertEqual(error as? RecipeValidationError, .invalidServings)
            }
        }
        XCTAssertThrowsError(try decodeRecipeVersionNonConformingFloat(key: "servings")) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidServings)
        }
        XCTAssertThrowsError(try decodeRecipeVersionNonConformingFloat(key: "yieldAmount")) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidYield)
        }
        XCTAssertThrowsError(try decodeRecipeVersion(overrides: ["yieldAmount": 0])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidYield)
        }
        XCTAssertThrowsError(try decodeRecipeVersion(overrides: ["prepTimeMinutes": -1])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidTime)
        }
        XCTAssertThrowsError(try decodeRecipeVersion(overrides: ["cookTimeMinutes": -1])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidTime)
        }
    }

    func testRecipeDetailCrossReferenceValidationFailuresAreRejected() throws {
        XCTAssertThrowsError(try decodeRecipeDetail(versionOverrides: ["recipeId": "recipe_other"])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .versionRecipeMismatch)
        }
        XCTAssertThrowsError(try decodeRecipeDetail(versionMacroOverrides: ["calories": 521])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .summaryMacroMismatch)
        }
        XCTAssertThrowsError(try decodeRecipeDetail(ingredientOverrides: ["recipeVersionId": "version_other"])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .ingredientVersionMismatch)
        }
        XCTAssertThrowsError(try decodeRecipeDetail(stepOverrides: ["recipeVersionId": "version_other"])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .stepVersionMismatch)
        }
    }

    func testRecipeIngredientAndStepInvariantsAreRejected() throws {
        XCTAssertThrowsError(try decodeIngredient(overrides: ["quantity": 0])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidIngredientQuantity)
        }
        XCTAssertThrowsError(try decodeIngredient(overrides: ["quantity": -1])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidIngredientQuantity)
        }
        XCTAssertThrowsError(try decodeIngredientNonConformingQuantity()) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidIngredientQuantity)
        }
        XCTAssertThrowsError(try decodeIngredient(overrides: ["label": "   "])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .emptyIngredientLabel)
        }
        XCTAssertThrowsError(try decodeIngredient(overrides: ["sortOrder": -1])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidSortOrder)
        }
        XCTAssertThrowsError(try decodeStep(overrides: ["body": "   "])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .emptyStepBody)
        }
        XCTAssertThrowsError(try decodeStep(overrides: ["sortOrder": -1])) { error in
            XCTAssertEqual(error as? RecipeValidationError, .invalidSortOrder)
        }
    }

    func testSocialSurfaceFixtureDecodesPrivacySafeModels() throws {
        let surface = try FixtureLoader.decode(
            SocialSurfaceFixture.self,
            named: "social-surface",
            bundle: Bundle(for: Self.self)
        )

        XCTAssertEqual(surface.profile.profile.visibility, .public)
        XCTAssertEqual(surface.profile.followState, .following)
        XCTAssertEqual(surface.profile.publicRecipes.count, 1)
        XCTAssertEqual(surface.profile.publicRecipes[0].visibility, .public)
        XCTAssertEqual(surface.community.joinPolicy, .open)
        XCTAssertEqual(surface.community.viewerMembership, .member)
        XCTAssertEqual(surface.communityShares.count, 1)
        XCTAssertEqual(surface.communityShares[0].recipeVersionId, surface.communityShares[0].recipe.currentVersionId)
        XCTAssertEqual(surface.communityShares[0].recipe.visibility, .public)
        XCTAssertEqual(surface.communityShares[0].recipe.status, .published)
        XCTAssertEqual(surface.activity[0].type, .recipePublished)
        XCTAssertNotNil(surface.activity[0].recipe)
        XCTAssertNil(surface.activity[0].community)
        XCTAssertEqual(surface.activity[1].type, .recipeSharedToCommunity)
        XCTAssertNotNil(surface.activity[1].recipe)
        XCTAssertNotNil(surface.activity[1].community)
        XCTAssertEqual(surface.search.results.map(\.kind), [.profile, .recipe, .community])
    }

    func testSocialSurfaceFixtureRoundTripsWithSavoroEncoderDecoder() throws {
        let surface = try FixtureLoader.decode(
            SocialSurfaceFixture.self,
            named: "social-surface",
            bundle: Bundle(for: Self.self)
        )

        let encoded = try JSONEncoder.savoro.encode(surface)
        let decoded = try JSONDecoder.savoro.decode(SocialSurfaceFixture.self, from: encoded)

        XCTAssertEqual(decoded, surface)
    }

    func testSocialSurfaceFixtureDoesNotCarryPrivateNutritionFields() throws {
        let data = try FixtureLoader.data(named: "social-surface", bundle: Bundle(for: Self.self))
        let text = String(decoding: data, as: UTF8.self)
        let deniedTokens = privacyDeniedTextTokens()

        for token in deniedTokens {
            XCTAssertFalse(text.localizedCaseInsensitiveContains(token), "Social fixture leaked private token: \(token)")
        }
    }

    func testPublicSocialSearchCommunitySurfacesDoNotCarryPrivatePayloadKeys() throws {
        let surfaceObject = try socialFixtureObject()

        try assertNoPrivatePayloadKeys(surfaceObject["profile"] as Any, surfaceName: "public profile")
        try assertNoPrivatePayloadKeys(surfaceObject["community"] as Any, surfaceName: "community summary")
        try assertNoPrivatePayloadKeys(surfaceObject["communityShares"] as Any, surfaceName: "community recipe shares")
        try assertNoPrivatePayloadKeys(surfaceObject["activity"] as Any, surfaceName: "activity feed")
        try assertNoPrivatePayloadKeys(surfaceObject["search"] as Any, surfaceName: "search response")
    }

    func testPublicSurfaceEncodedModelsRemainFreeOfPrivateDomains() throws {
        let surface = try FixtureLoader.decode(
            SocialSurfaceFixture.self,
            named: "social-surface",
            bundle: Bundle(for: Self.self)
        )
        let encodedObject = try JSONSerialization.jsonObject(with: JSONEncoder.savoro.encode(surface))

        try assertNoPrivatePayloadKeys(encodedObject, surfaceName: "encoded social surface")
    }

    func testPrivateOnlyNutritionDomainsRemainPrivateAndOutOfPublicSurfaceFixtures() throws {
        let dayLog = try FixtureLoader.decode(DayLog.self, named: "day-log", bundle: Bundle(for: Self.self))
        let goal = try Goal(
            id: "goal_private_contract",
            userId: "user_maya",
            dailyTargets: try MacroTotals(calories: 2_200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70),
            startDate: "2026-06-06",
            createdAt: Date(timeIntervalSince1970: 0),
            updatedAt: Date(timeIntervalSince1970: 0)
        )

        XCTAssertEqual(dayLog.privacyDomain, .privateUserData)
        XCTAssertTrue(dayLog.meals.flatMap(\.entries).allSatisfy { $0.privacyDomain == .privateUserData })
        XCTAssertEqual(goal.privacyDomain, .privateUserData)
        XCTAssertGreaterThan(goal.dailyTargets.calories, 0)

        let publicSurfaceText = String(decoding: try FixtureLoader.data(named: "social-surface", bundle: Bundle(for: Self.self)), as: UTF8.self)
        XCTAssertFalse(publicSurfaceText.localizedCaseInsensitiveContains("dailyTargets"))
        XCTAssertFalse(publicSurfaceText.localizedCaseInsensitiveContains("private_user_data"))
    }

    func testVisibilityMatrixBasicsForPublicSurfaces() throws {
        _ = try decodeSearchResult(overrides: ["kind": "recipe", "profile": NSNull(), "recipe": try socialRecipeObject(overrides: ["visibility": "public", "status": "published"])])
        _ = try decodeSearchResult(overrides: ["kind": "profile", "profile": try socialUserProfileObject(overrides: ["visibility": "public"])])
        _ = try decodeSearchResult(overrides: ["kind": "community", "profile": NSNull(), "community": try socialCommunityObject(overrides: ["visibility": "public"])])

        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "recipe", "profile": NSNull(), "recipe": try socialRecipeObject(overrides: ["visibility": "private", "status": "draft"])]))
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "profile", "profile": try socialUserProfileObject(overrides: ["visibility": "private"])]))
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "community", "profile": NSNull(), "community": try socialCommunityObject(overrides: ["visibility": "unlisted"])]))
    }

    func testPublicProfileRejectsPrivateProfileAndPrivateOrDraftRecipes() throws {
        XCTAssertThrowsError(try decodePublicProfile(profileOverrides: ["visibility": "private"])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicProfileNotPublic)
        }
        XCTAssertThrowsError(try decodePublicProfileWithRecipe(overrides: ["visibility": "private"])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicRecipeNotPublicPublished)
        }
        XCTAssertThrowsError(try decodePublicProfileWithRecipe(overrides: ["status": "draft", "visibility": "public"]))
    }

    func testCommunityRecipeShareRejectsNonPublicOrNonPublishedRecipes() throws {
        XCTAssertThrowsError(try decodeCommunityRecipeShare(recipeOverrides: ["visibility": "private"])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicRecipeNotPublicPublished)
        }
        XCTAssertThrowsError(try decodeCommunityRecipeShare(recipeOverrides: ["visibility": "unlisted"])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicRecipeNotPublicPublished)
        }
        XCTAssertThrowsError(try decodeCommunityRecipeShare(recipeOverrides: ["status": "draft", "visibility": "public"]))
    }

    func testActivityTypesAreRecipeSocialOnlyAndValidateRequiredTargets() throws {
        XCTAssertEqual(
            ActivityItemType.allCases.map(\.rawValue),
            ["recipe_published", "recipe_saved", "recipe_forked", "joined_community", "created_collection", "recipe_shared_to_community"]
        )
        XCTAssertFalse(ActivityItemType.allCases.map(\.rawValue).contains("food_logged"))
        XCTAssertFalse(ActivityItemType.allCases.map(\.rawValue).contains("recipe_logged_publicly_optional"))

        XCTAssertThrowsError(try decodeActivityItem(overrides: ["recipe": NSNull()])) { error in
            XCTAssertEqual(error as? SocialValidationError, .activityMissingRecipe)
        }
        XCTAssertThrowsError(try decodeActivityItem(overrides: ["community": try socialCommunityObject()])) { error in
            XCTAssertEqual(error as? SocialValidationError, .activityUnexpectedTarget)
        }
        XCTAssertThrowsError(try decodeActivityItem(overrides: ["type": "joined_community", "recipe": NSNull(), "community": NSNull()])) { error in
            XCTAssertEqual(error as? SocialValidationError, .activityMissingCommunity)
        }
        XCTAssertThrowsError(try decodeActivityItem(overrides: ["type": "joined_community", "community": try socialCommunityObject()])) { error in
            XCTAssertEqual(error as? SocialValidationError, .activityUnexpectedTarget)
        }
        XCTAssertThrowsError(try decodeActivityItem(overrides: ["type": "recipe_shared_to_community", "community": NSNull()])) { error in
            XCTAssertEqual(error as? SocialValidationError, .activityMissingCommunity)
        }
        _ = try decodeActivityItem(overrides: ["type": "recipe_shared_to_community", "community": try socialCommunityObject()])
    }

    func testSearchResultWrapperRequiresExactlyMatchingPublicPayload() throws {
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "recipe"])) { error in
            XCTAssertEqual(error as? SocialValidationError, .invalidSearchWrapper)
        }
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "recipe", "profile": NSNull(), "recipe": try socialRecipeObject(overrides: ["visibility": "private"])])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicRecipeNotPublicPublished)
        }
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "recipe", "profile": NSNull(), "recipe": try socialRecipeObject(overrides: ["status": "draft", "visibility": "public"])]))
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["profile": try socialUserProfileObject(overrides: ["visibility": "private"])])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicProfileNotPublic)
        }
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "community", "profile": NSNull(), "community": try socialCommunityObject(overrides: ["visibility": "private"])])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicCommunityNotPublic)
        }
        XCTAssertThrowsError(try decodeSearchResult(overrides: ["kind": "community", "profile": NSNull(), "community": try socialCommunityObject(overrides: ["visibility": "unlisted"])])) { error in
            XCTAssertEqual(error as? SocialValidationError, .publicCommunityNotPublic)
        }
    }

    func testURLSessionAPIClientBuildsAuthenticatedJSONRequest() async throws {
        let client = URLSessionAPIClient(
            baseURL: URL(string: "https://api.example.test/v1")!,
            authTokenProvider: { "test-token" }
        )

        let request = try await client.makeURLRequest(
            for: Endpoint<SampleResponse>(
                path: "/recipes",
                method: .post,
                queryItems: [URLQueryItem(name: "scope", value: "mine")],
                headers: ["X-Savoro-Test": "true"],
                body: Data("{}".utf8)
            )
        )

        XCTAssertEqual(request.url?.absoluteString, "https://api.example.test/v1/recipes?scope=mine")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Savoro-Test"), "true")
    }

    func testRecipeEditorFormDefaultsForCreateAndDraftRoutes() {
        let newDraft = RecipeEditorDraftForm.newDraft()
        XCTAssertNil(newDraft.draftId)
        XCTAssertEqual(newDraft.title, "")
        XCTAssertEqual(newDraft.description, "")
        XCTAssertEqual(newDraft.servingsText, "")
        XCTAssertEqual(newDraft.yieldText, "")

        let existingDraft = RecipeEditorDraftForm.localDraft(id: "draft_green_curry")
        XCTAssertEqual(existingDraft.draftId, "draft_green_curry")
    }

    func testRecipeEditorFormValidationRequiresBasicsForDraftAndCompleteFieldsForPublicPreview() {
        let empty = RecipeEditorDraftForm.newDraft()
        XCTAssertEqual(empty.basicsValidationIssues, [.titleRequired, .servingsRequired, .yieldRequired])
        XCTAssertEqual(empty.publicPublishValidationIssues, [.titleRequired, .servingsRequired, .yieldRequired, .ingredientRequired, .instructionRequired])
        XCTAssertFalse(empty.isValidDraftSlice)
        XCTAssertFalse(empty.canMockPublishPublicly)

        let draftValid = RecipeEditorDraftForm(draftId: nil, title: "Lemony Lentil Soup", description: "Cozy bowl", servingsText: "6", yieldText: "6 bowls", photoHook: .mockPlaceholder)
        XCTAssertTrue(draftValid.basicsValidationIssues.isEmpty)
        XCTAssertTrue(draftValid.isValidDraftSlice)
        XCTAssertEqual(draftValid.publicPublishValidationIssues, [.ingredientRequired, .instructionRequired])

        let publishValid = RecipeEditorDraftForm(
            draftId: nil,
            title: "Lemony Lentil Soup",
            description: "Cozy bowl",
            servingsText: "6",
            yieldText: "6 bowls",
            photoHook: .mockPlaceholder,
            ingredients: [.freeText(id: "lentils", quantityText: "2", unit: "cups", name: "Lentils")],
            instructions: [RecipeEditorInstructionStep(id: "step_1", order: 1, body: "Simmer until tender.")]
        )
        XCTAssertTrue(publishValid.publicPublishValidationIssues.isEmpty)
        XCTAssertTrue(publishValid.canMockPublishPublicly)
    }

    func testRecipeEditorPhotoHookMetadataAndCopyAreMockOnly() {
        let hook = RecipeEditorPhotoHook.mockPlaceholder
        XCTAssertEqual(hook.mockUploadMetadata["mode"], "mock-local-placeholder")
        XCTAssertEqual(hook.mockUploadMetadata["startsBackendUpload"], "false")
        XCTAssertEqual(hook.mockUploadMetadata["storesPrivateImage"], "false")
        XCTAssertTrue(hook.body.localizedCaseInsensitiveContains("Nothing is uploaded"))
        XCTAssertTrue(hook.actionTitle.localizedCaseInsensitiveContains("placeholder"))
    }

    func testRecipeEditorPhotoCommandInvokesVisibleMockOnlyStatus() {
        let command = RecipeEditorPhotoCommand.mockLocalPlaceholder
        let status = command.invoke()

        XCTAssertFalse(command.startsBackendUpload)
        XCTAssertFalse(command.storesPrivateImage)
        XCTAssertEqual(command.identifier, "mock-local-photo-placeholder")
        XCTAssertTrue(status.message.localizedCaseInsensitiveContains("not active"))
        XCTAssertTrue(status.message.localizedCaseInsensitiveContains("mock"))
    }

    func testRecipeEditorPhotoStatusCanBeRecordedWithoutBackendState() {
        var form = RecipeEditorDraftForm.newDraft()
        form.photoStatus = RecipeEditorPhotoCommand.mockLocalPlaceholder.invoke()

        XCTAssertEqual(form.photoHook.mockUploadMetadata["startsBackendUpload"], "false")
        XCTAssertEqual(form.photoHook.mockUploadMetadata["storesPrivateImage"], "false")
        XCTAssertTrue(form.visibleCopy.localizedCaseInsensitiveContains("Picker, upload, and storage are not active"))
    }

    func testRecipeEditorDraftContextAndValidationCopyClarifyScaffoldScope() {
        let existingDraft = RecipeEditorDraftForm.localDraft(id: "draft_green_curry")
        let newDraft = RecipeEditorDraftForm.newDraft()

        XCTAssertTrue(existingDraft.draftContextCopy.contains("draft_green_curry"))
        XCTAssertTrue(existingDraft.draftContextCopy.localizedCaseInsensitiveContains("local in-session draft store"))
        XCTAssertTrue(newDraft.draftContextCopy.localizedCaseInsensitiveContains("Save Draft keeps fields in this app session only"))
    }

    func testRecipeEditorDraftStorePersistsFieldsAcrossViewRecreationInputs() {
        let store = RecipeEditorDraftStore()
        let saved = store.saveDraft(RecipeEditorDraftForm(
            title: "Snack Box",
            description: "Crunchy prep",
            servingsText: "2",
            yieldText: "2 boxes",
            ingredients: [.freeText(id: "carrots", quantityText: "1", unit: "cup", name: "Carrots")],
            instructions: [RecipeEditorInstructionStep(id: "step_1", order: 1, body: "Pack chilled.")]
        ))

        let loaded = store.loadDraft(id: try! XCTUnwrap(saved.draftId))

        XCTAssertEqual(loaded.title, "Snack Box")
        XCTAssertEqual(loaded.ingredients.first?.name, "Carrots")
        XCTAssertEqual(loaded.instructions.first?.body, "Pack chilled.")
        XCTAssertTrue(loaded.draftContextCopy.localizedCaseInsensitiveContains("local in-session"))
    }

    func testRecipeEditorInvalidPublicPublishPreviewIsBlockedWithNonShamingCopy() {
        let form = RecipeEditorDraftForm(title: "Soup", servingsText: "4", yieldText: "4 bowls")
        let copy = ([form.mockPublicPublishResultCopy] + form.publicPublishValidationIssues.map(\.rawValue)).joined(separator: " ")
        let deniedTerms = ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food"]

        XCTAssertFalse(form.canMockPublishPublicly)
        XCTAssertEqual(form.publicPublishValidationIssues, [.ingredientRequired, .instructionRequired])
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("needs a little more detail"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("review the recipe details below"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("does not post publicly"))
        XCTAssertFalse(copy.localizedCaseInsensitiveContains("highlighted"))
        XCTAssertTrue(deniedTerms.allSatisfy { !copy.localizedCaseInsensitiveContains($0) })
    }

    func testRecipeEditorValidPublicPublishPreviewRemainsMockLocalOnly() {
        let form = RecipeEditorDraftForm(
            title: "Snack Box",
            servingsText: "2",
            yieldText: "2 boxes",
            ingredients: [.freeText(id: "almonds", quantityText: "1", unit: "cup", name: "Almonds")],
            instructions: [RecipeEditorInstructionStep(id: "step_1", order: 1, body: "Divide into containers.")]
        )
        let copy = form.mockPublicPublishResultCopy

        XCTAssertTrue(form.canMockPublishPublicly)
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("mock-only"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("no backend"))
        XCTAssertTrue(copy.localizedCaseInsensitiveContains("no") && copy.localizedCaseInsensitiveContains("public listing"))
    }

    func testRecipeEditorCopyAvoidsPrivateLeaksAndShamingLanguage() {
        let copy = RecipeEditorDraftForm.newDraft().visibleCopy.lowercased()
        for denied in ["adherence", "compliance", "failure", "failed", "over limit", "guilt", "cheat", "bad food", "calorie goal", "body metric", "weight"] {
            XCTAssertFalse(copy.contains(denied), "Recipe editor copy should not contain \\(denied)")
        }
        XCTAssertTrue(copy.contains("local"))
        XCTAssertTrue(copy.contains("no image upload"))
    }

    func testRecipeEditorViewConstructsForCreateDraftAndForm() {
        _ = RecipeEditorPlaceholderView()
        _ = RecipeEditorPlaceholderView(draftId: "draft_green_curry")
        _ = RecipeEditorPlaceholderView(form: RecipeEditorDraftForm(draftId: nil, title: "Snack Box", description: "", servingsText: "2", yieldText: "2 boxes", photoHook: .mockPlaceholder))
    }
}

private struct SocialSurfaceFixture: Codable, Equatable {
    let profile: PublicProfile
    let community: Community
    let communityShares: [CommunityRecipeShare]
    let activity: [ActivityItem]
    let search: SearchResponse
}

private func fixtureObject() throws -> [String: Any] {
    let data = try FixtureLoader.data(named: "recipe-detail", bundle: Bundle(for: ScaffoldTests.self))
    return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
}

private func decode<T: Decodable>(_ type: T.Type, from object: Any, decoder: JSONDecoder = .savoro) throws -> T {
    let data = try JSONSerialization.data(withJSONObject: object)
    return try decoder.decode(T.self, from: data)
}

private func decodeRecipeSummary(overrides: [String: Any] = [:]) throws -> RecipeSummary {
    var object = try fixtureObject()
    var summary = try XCTUnwrap(object["summary"] as? [String: Any])
    summary.merge(overrides) { _, new in new }
    return try decode(RecipeSummary.self, from: summary)
}

private func decodeRecipeVersion(overrides: [String: Any] = [:], macroOverrides: [String: Any] = [:]) throws -> RecipeVersion {
    var object = try fixtureObject()
    var version = try XCTUnwrap(object["currentVersion"] as? [String: Any])
    if !macroOverrides.isEmpty {
        var macros = try XCTUnwrap(version["perServingMacros"] as? [String: Any])
        macros.merge(macroOverrides) { _, new in new }
        version["perServingMacros"] = macros
    }
    version.merge(overrides) { _, new in new }
    return try decode(RecipeVersion.self, from: version)
}

private func decodeRecipeDetail(
    summaryOverrides: [String: Any] = [:],
    creatorOverrides: [String: Any] = [:],
    versionOverrides: [String: Any] = [:],
    versionMacroOverrides: [String: Any] = [:],
    ingredientOverrides: [String: Any] = [:],
    stepOverrides: [String: Any] = [:],
    attributionOverrides: [String: Any] = [:],
    ingredients replacementIngredients: [[String: Any]]? = nil,
    steps replacementSteps: [[String: Any]]? = nil
) throws -> RecipeDetail {
    var object = try fixtureObject()
    var summary = try XCTUnwrap(object["summary"] as? [String: Any])
    if !creatorOverrides.isEmpty {
        var creator = try XCTUnwrap(summary["creator"] as? [String: Any])
        creator.merge(creatorOverrides) { _, new in new }
        summary["creator"] = creator
    }
    summary.merge(summaryOverrides) { _, new in new }
    object["summary"] = summary

    var version = try XCTUnwrap(object["currentVersion"] as? [String: Any])
    if !versionMacroOverrides.isEmpty {
        var macros = try XCTUnwrap(version["perServingMacros"] as? [String: Any])
        macros.merge(versionMacroOverrides) { _, new in new }
        version["perServingMacros"] = macros
    }
    version.merge(versionOverrides) { _, new in new }
    object["currentVersion"] = version

    if let replacementIngredients {
        object["ingredients"] = replacementIngredients
    } else if !ingredientOverrides.isEmpty {
        var ingredients = try XCTUnwrap(object["ingredients"] as? [[String: Any]])
        ingredients[0].merge(ingredientOverrides) { _, new in new }
        object["ingredients"] = ingredients
    }

    if let replacementSteps {
        object["steps"] = replacementSteps
    } else if !stepOverrides.isEmpty {
        var steps = try XCTUnwrap(object["steps"] as? [[String: Any]])
        steps[0].merge(stepOverrides) { _, new in new }
        object["steps"] = steps
    }

    if !attributionOverrides.isEmpty {
        var provenance = try XCTUnwrap(object["provenance"] as? [String: Any])
        var attributions = try XCTUnwrap(provenance["attributions"] as? [[String: Any]])
        attributions[0].merge(attributionOverrides) { _, new in new }
        provenance["attributions"] = attributions
        object["provenance"] = provenance
    }

    return try decode(RecipeDetail.self, from: object)
}

private func decodeIngredient(overrides: [String: Any] = [:]) throws -> Ingredient {
    var object = try fixtureObject()
    var ingredients = try XCTUnwrap(object["ingredients"] as? [[String: Any]])
    ingredients[0].merge(overrides) { _, new in new }
    return try decode(Ingredient.self, from: ingredients[0])
}

private func decodeStep(overrides: [String: Any] = [:]) throws -> Step {
    var object = try fixtureObject()
    var steps = try XCTUnwrap(object["steps"] as? [[String: Any]])
    steps[0].merge(overrides) { _, new in new }
    return try decode(Step.self, from: steps[0])
}

private func nonConformingFloatDecoder() -> JSONDecoder {
    let decoder = JSONDecoder.savoro
    decoder.nonConformingFloatDecodingStrategy = .convertFromString(positiveInfinity: "Infinity", negativeInfinity: "-Infinity", nan: "NaN")
    return decoder
}

private func decodeRecipeVersionNonConformingFloat(key: String) throws -> RecipeVersion {
    var object = try fixtureObject()
    var version = try XCTUnwrap(object["currentVersion"] as? [String: Any])
    version[key] = "Infinity"
    return try decode(RecipeVersion.self, from: version, decoder: nonConformingFloatDecoder())
}

private func decodeIngredientNonConformingQuantity() throws -> Ingredient {
    var object = try fixtureObject()
    var ingredients = try XCTUnwrap(object["ingredients"] as? [[String: Any]])
    ingredients[0]["quantity"] = "Infinity"
    return try decode(Ingredient.self, from: ingredients[0], decoder: nonConformingFloatDecoder())
}

private func recipeDetailVariant(visibility: String, isOwner: Bool, canFork: Bool, canLog: Bool) throws -> RecipeDetail {
    var object = try XCTUnwrap(JSONSerialization.jsonObject(with: FixtureLoader.data(named: "recipe-detail", bundle: Bundle(for: ScaffoldTests.self))) as? [String: Any])
    var summary = try XCTUnwrap(object["summary"] as? [String: Any])
    var viewerState = try XCTUnwrap(summary["viewerState"] as? [String: Any])
    summary["visibility"] = visibility
    viewerState["isOwner"] = isOwner
    viewerState["canFork"] = canFork
    viewerState["canLog"] = canLog
    summary["viewerState"] = viewerState
    object["summary"] = summary
    return try decode(RecipeDetail.self, from: object)
}

private func socialFixtureObject() throws -> [String: Any] {
    let data = try FixtureLoader.data(named: "social-surface", bundle: Bundle(for: ScaffoldTests.self))
    return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
}

private func socialUserProfileObject(overrides: [String: Any] = [:]) throws -> [String: Any] {
    var object = try socialFixtureObject()
    var publicProfile = try XCTUnwrap(object["profile"] as? [String: Any])
    var profile = try XCTUnwrap(publicProfile["profile"] as? [String: Any])
    profile.merge(overrides) { _, new in new }
    return profile
}

private func socialRecipeObject(overrides: [String: Any] = [:]) throws -> [String: Any] {
    var object = try socialFixtureObject()
    var publicProfile = try XCTUnwrap(object["profile"] as? [String: Any])
    var recipes = try XCTUnwrap(publicProfile["publicRecipes"] as? [[String: Any]])
    recipes[0].merge(overrides) { _, new in new }
    return recipes[0]
}

private func socialCommunityObject(overrides: [String: Any] = [:]) throws -> [String: Any] {
    var object = try socialFixtureObject()
    var community = try XCTUnwrap(object["community"] as? [String: Any])
    community.merge(overrides) { _, new in new }
    return community
}

private func decodePublicProfile(profileOverrides: [String: Any] = [:]) throws -> PublicProfile {
    var object = try socialFixtureObject()
    var publicProfile = try XCTUnwrap(object["profile"] as? [String: Any])
    if !profileOverrides.isEmpty {
        publicProfile["profile"] = try socialUserProfileObject(overrides: profileOverrides)
    }
    return try decode(PublicProfile.self, from: publicProfile)
}

private func decodePublicProfileWithRecipe(overrides: [String: Any]) throws -> PublicProfile {
    var object = try socialFixtureObject()
    var profile = try XCTUnwrap(object["profile"] as? [String: Any])
    profile["publicRecipes"] = [try socialRecipeObject(overrides: overrides)]
    return try decode(PublicProfile.self, from: profile)
}

private func decodeCommunityRecipeShare(recipeOverrides: [String: Any] = [:]) throws -> CommunityRecipeShare {
    let community = try socialCommunityObject()
    let recipe = try socialRecipeObject(overrides: recipeOverrides)
    let share: [String: Any] = [
        "id": "community_recipe_1",
        "communityId": try XCTUnwrap(community["id"]),
        "recipe": recipe,
        "recipeVersionId": try XCTUnwrap(recipe["currentVersionId"]),
        "sharedBy": try XCTUnwrap(recipe["creator"]),
        "caption": "Try this for meal prep.",
        "pinnedByUserId": NSNull(),
        "pinnedAt": NSNull(),
        "createdAt": "2026-06-06T12:10:00Z"
    ]
    return try decode(CommunityRecipeShare.self, from: share)
}

private func decodeActivityItem(overrides: [String: Any]) throws -> ActivityItem {
    var object = try socialFixtureObject()
    var activities = try XCTUnwrap(object["activity"] as? [[String: Any]])
    activities[0].merge(overrides) { _, new in new }
    return try decode(ActivityItem.self, from: activities[0])
}

private func decodeSearchResult(overrides: [String: Any]) throws -> SearchResult {
    var object = try socialFixtureObject()
    var search = try XCTUnwrap(object["search"] as? [String: Any])
    var results = try XCTUnwrap(search["results"] as? [[String: Any]])
    results[0].merge(overrides) { _, new in new }
    return try decode(SearchResult.self, from: results[0])
}

private func privacyDeniedTextTokens() -> [String] {
    [
        "FoodLogEntry", "foodLog", "foodLogs", "logs", "goal", "goals",
        "dailyTargets", "targetCalories", "calorieGoal", "adherence", "bodyMetric",
        "bodyMetrics", "weight", "weighIn", "privacyDomain", "private_user_data",
        "mealType", "quantityUnit", "snapshot", "sourceType"
    ]
}

private func privacyDeniedJSONKeys() -> Set<String> {
    Set([
        "foodLog", "foodLogs", "logs", "goal", "goals", "dailyTargets", "targetCalories",
        "calorieGoal", "calorieGoals", "adherence", "bodyMetric", "bodyMetrics", "weight",
        "weighIn", "weighIns", "privacyDomain", "mealType", "foodId", "servingId",
        "quantity", "quantityUnit", "snapshot", "sourceType", "date", "meals"
    ])
}

private func assertNoPrivatePayloadKeys(_ object: Any, surfaceName: String, path: String = "$", file: StaticString = #filePath, line: UInt = #line) throws {
    switch object {
    case let dictionary as [String: Any]:
        for (key, value) in dictionary {
            let keyPath = "\(path).\(key)"
            XCTAssertFalse(
                privacyDeniedJSONKeys().contains(key),
                "\(surfaceName) leaked private payload key at \(keyPath)",
                file: file,
                line: line
            )
            try assertNoPrivatePayloadKeys(value, surfaceName: surfaceName, path: keyPath, file: file, line: line)
        }
    case let array as [Any]:
        for (index, value) in array.enumerated() {
            try assertNoPrivatePayloadKeys(value, surfaceName: surfaceName, path: "\(path)[\(index)]", file: file, line: line)
        }
    default:
        return
    }
}

private struct SampleResponse: Codable, Sendable, Equatable {
    let message: String
}
