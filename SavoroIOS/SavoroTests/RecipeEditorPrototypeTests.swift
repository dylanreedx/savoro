import SwiftUI
import XCTest
@testable import Savoro

final class RecipeEditorPrototypeTests: XCTestCase {
    func testPrototypeComposerDefaultInteractiveBudget() {
        XCTAssertEqual(EditorPrototypeComposerView.defaultInteractiveControlCount, 11)
        XCTAssertLessThanOrEqual(EditorPrototypeComposerView.defaultInteractiveControlCount, 12)
    }

    func testPrototypeSheetBuildDefaultInteractiveBudget() {
        XCTAssertEqual(EditorPrototypeSheetBuildView.defaultInteractiveControlCount, 11)
        XCTAssertLessThanOrEqual(EditorPrototypeSheetBuildView.defaultInteractiveControlCount, 12)
    }

    func testPopulatedPrototypeFixtureHasEightIngredientsAndFiveSteps() {
        XCTAssertEqual(EditorPrototypeFixture.populated.ingredientLines.count, 8)
        XCTAssertEqual(EditorPrototypeFixture.populated.stepLines.count, 5)
    }

    func testPrototypeIngredientFixturesUseRecipeEditorLineParser() throws {
        let parsed = RecipeEditorIngredientLineParser.parse(
            EditorPrototypeFixture.populated.ingredientLines.joined(separator: "\n")
        )

        XCTAssertEqual(parsed.count, 8)
        XCTAssertEqual(parsed.first?.name, "Chicken breast")
        XCTAssertEqual(parsed.first?.quantityText, "500")
        XCTAssertEqual(parsed.first?.unit, "g")
        XCTAssertTrue(try XCTUnwrap(parsed.first).isNutritionLinked)
    }

    func testPrototypeStepFixturesUseRecipeEditorInstructionParser() {
        let parsed = RecipeEditorInstructionParser.parse(
            EditorPrototypeFixture.populated.stepLines.joined(separator: "\n\n")
        )

        XCTAssertEqual(parsed.count, 5)
        XCTAssertEqual(parsed.compactMap(\.stepNumber), [1, 2, 3, 4, 5])
    }

    func testPrototypeSmartEntryEngineParsesRapidIngredientAndStepSubmissions() {
        XCTAssertEqual(
            EditorPrototypeSmartEntryEngine.ingredientLine(
                from: "2 cups flour",
                lineIndex: 8
            ),
            "2 cups flour"
        )
        XCTAssertEqual(
            EditorPrototypeSmartEntryEngine.stepBody(
                from: "Fold in the herbs, then serve."
            ),
            "Fold in the herbs, then serve."
        )
        XCTAssertNil(EditorPrototypeSmartEntryEngine.ingredientLine(from: "   ", lineIndex: 9))
        XCTAssertNil(EditorPrototypeSmartEntryEngine.stepBody(from: "   "))
    }

    @MainActor
    func testPrototypeViewsAreStandaloneAndConstructibleForEveryRenderedState() {
        _ = EditorPrototypeComposerView(contentState: .empty)
        _ = EditorPrototypeComposerView(contentState: .populated)
        _ = EditorPrototypeSheetBuildView(contentState: .empty)
        _ = EditorPrototypeSheetBuildView(contentState: .populated)
        _ = EditorPrototypeSheetBuildView(
            contentState: .populated,
            renderedSheet: .ingredients
        )
    }
}
