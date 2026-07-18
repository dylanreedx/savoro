import Foundation
import XCTest

final class SavoroSmokeJourneyTests: XCTestCase {
    private var app: XCUIApplication!

    private var sourceArtifactDirectory: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent(".ui-artifacts", isDirectory: true)
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
        try? FileManager.default.removeItem(at: sourceArtifactDirectory)
        try FileManager.default.createDirectory(at: sourceArtifactDirectory, withIntermediateDirectories: true)

        app = XCUIApplication()
        app.launch()
    }

    func testFiveTabsPrivateLogAndRecipeRemixJourney() throws {
        assertSurface("screen-today")
        XCTAssertTrue(app.staticTexts["Hi, Avery"].waitForExistence(timeout: 5))
        capture("01-launch-today")

        visitTab(identifier: "tab-cookbook", surface: "screen-cookbook", title: "Cookbook", step: "02-tab-cookbook")
        visitTab(identifier: "tab-discover", surface: "screen-discover", title: "Discover", step: "03-tab-discover")
        visitTab(identifier: "tab-community", surface: "screen-community", title: "Community", step: "04-tab-community")
        visitTab(identifier: "tab-profile", surface: "screen-profile", title: "Profile", step: "05-tab-profile")
        visitTab(identifier: "tab-today", surface: "screen-today", title: "Today", step: "06-tab-today")

        let logRecipeAction = element("today-quick-action-logRecipe")
        reveal(logRecipeAction)
        capture("07-today-log-recipe-action")
        logRecipeAction.tap()

        assertSurface("log-picker-screen")
        capture("08-log-picker")
        let pickerRecipe = element("log-picker-item-recent_shawarma_bowl")
        reveal(pickerRecipe)
        pickerRecipe.tap()

        assertSurface("log-recipe-screen")
        XCTAssertTrue(app.staticTexts["Chicken Shawarma Bowl"].waitForExistence(timeout: 5))
        capture("09-log-recipe")
        let confirmLog = element("log-recipe-confirm-button")
        reveal(confirmLog)
        capture("10-log-recipe-confirmation")
        confirmLog.tap()

        XCTAssertTrue(element("log-recipe-screen").waitForNonExistence(timeout: 10))
        assertSurface("screen-today")
        let loggedEntry = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH %@", "today-log-entry-mock_log_"))
            .firstMatch
        reveal(loggedEntry)
        capture("11-log-complete-today")

        visitTab(identifier: "tab-cookbook", surface: "screen-cookbook", title: "Cookbook", step: "12-cookbook-for-recipe")
        let recipeCard = element("cookbook-item-mine_shawarma")
        reveal(recipeCard)
        recipeCard.tap()

        assertSurface("recipe-detail-screen")
        let recipeTitle = element("recipe-detail-title")
        XCTAssertTrue(recipeTitle.waitForExistence(timeout: 5))
        XCTAssertEqual(recipeTitle.label, "Chicken Shawarma Bowl")
        let remixAction = app.buttons["recipe-detail-action-fork"]
        XCTAssertTrue(remixAction.waitForExistence(timeout: 5))
        capture("13-recipe-detail")
        remixAction.tap()

        assertSurface("fork-remix-confirmation-screen")
        let confirmRemix = app.buttons["fork-remix-confirm-button"]
        XCTAssertTrue(confirmRemix.waitForExistence(timeout: 5))
        capture("14-remix-confirmation")
        confirmRemix.tap()

        assertSurface("recipe-editor-screen", timeout: 10)
        let remixContext = element("recipe-editor-draft-context")
        XCTAssertTrue(remixContext.waitForExistence(timeout: 5))
        XCTAssertTrue(remixContext.label.localizedCaseInsensitiveContains("private remix"))
        XCTAssertTrue(remixContext.label.localizedCaseInsensitiveContains("source version"))

        let titleField = element("recipe-editor-field-recipe-title")
        reveal(titleField)
        assertValue("Chicken Shawarma Bowl", for: titleField)
        assertValue(
            "Warm shawarma-spiced chicken, rice, cucumber salad, and garlic yogurt sauce.",
            for: element("recipe-editor-field-short-description")
        )
        assertValue("4", for: element("recipe-editor-field-servings"))
        assertValue("4 bowls", for: element("recipe-editor-field-yield"))
        app.swipeUp()
        capture("15-remix-editor-copied-fields")
    }

    private func visitTab(identifier: String, surface: String, title: String, step: String) {
        let tab = app.buttons[identifier].firstMatch
        XCTAssertTrue(tab.waitForExistence(timeout: 5), "Missing tab identifier: \(identifier)")
        XCTAssertEqual(tab.label, title)
        tab.tap()
        assertSurface(surface)
        XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 5), "Missing tab content: \(title)")
        capture(step)
    }

    private func assertSurface(_ identifier: String, timeout: TimeInterval = 5) {
        XCTAssertTrue(element(identifier).waitForExistence(timeout: timeout), "Missing UI surface: \(identifier)")
    }

    private func element(_ identifier: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }

    private func reveal(_ element: XCUIElement, maxSwipes: Int = 10) {
        _ = element.waitForExistence(timeout: 2)
        for _ in 0..<maxSwipes where !element.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(element.exists, "Expected UI element to exist")
        XCTAssertTrue(element.isHittable, "Expected UI element to be tappable")
    }

    private func assertValue(_ expectedValue: String, for element: XCUIElement) {
        XCTAssertTrue(element.waitForExistence(timeout: 5))
        XCTAssertEqual(element.value as? String, expectedValue)
    }

    private func capture(_ stepName: String, file: StaticString = #filePath, line: UInt = #line) {
        let screenshot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = stepName
        attachment.lifetime = .keepAlways
        add(attachment)

        let artifactURL = sourceArtifactDirectory.appendingPathComponent("\(stepName).png")
        XCTAssertNoThrow(
            try screenshot.pngRepresentation.write(to: artifactURL, options: .atomic),
            "Could not persist screenshot artifact",
            file: file,
            line: line
        )
    }
}
