import SnapshotTesting
import SwiftUI
import UIKit
import XCTest
@testable import Savoro

final class SnapshotTests: XCTestCase {
    private struct SnapshotMode {
        let name: String
        let colorScheme: ColorScheme
        let interfaceStyle: UIUserInterfaceStyle
        let dynamicTypeSize: DynamicTypeSize
        let contentSizeCategory: UIContentSizeCategory
    }

    private static let projectDirectory = URL(fileURLWithPath: "\(#filePath)")
        .deletingLastPathComponent()
        .deletingLastPathComponent()
    private static let recordAllMarkerURL = projectDirectory.appendingPathComponent(".snapshot-record-all")
    private static let recordDarkMarkerURL = projectDirectory.appendingPathComponent(".snapshot-record-dark")
    private static let recordAccessibilityXXXLMarkerURL = projectDirectory
        .appendingPathComponent(".snapshot-record-accessibility-xxxl")
    private static let workingReferenceDirectory = FileManager.default.temporaryDirectory
        .appendingPathComponent("SavoroSnapshotReferences", isDirectory: true)
    private static let referenceDirectory = ProcessInfo.processInfo.environment["SNAPSHOT_REFERENCE_DIR"]
        ?? workingReferenceDirectory.path

    private static let modes: [SnapshotMode] = [
        SnapshotMode(
            name: "light-standard",
            colorScheme: .light,
            interfaceStyle: .light,
            dynamicTypeSize: .large,
            contentSizeCategory: .large
        ),
        SnapshotMode(
            name: "light-accessibility-xxxl",
            colorScheme: .light,
            interfaceStyle: .light,
            dynamicTypeSize: .accessibility5,
            contentSizeCategory: .accessibilityExtraExtraExtraLarge
        ),
        SnapshotMode(
            name: "dark-standard",
            colorScheme: .dark,
            interfaceStyle: .dark,
            dynamicTypeSize: .large,
            contentSizeCategory: .large
        ),
        SnapshotMode(
            name: "dark-accessibility-xxxl",
            colorScheme: .dark,
            interfaceStyle: .dark,
            dynamicTypeSize: .accessibility5,
            contentSizeCategory: .accessibilityExtraExtraExtraLarge
        )
    ]

    /// The package does not yet provide an iPhone 17 preset. These are the
    /// iPhone 17 portrait dimensions and safe-area insets in points.
    private static let iPhone17Config = ViewImageConfig(
        safeArea: UIEdgeInsets(top: 62, left: 0, bottom: 34, right: 0),
        size: CGSize(width: 402, height: 874),
        traits: UITraitCollection { traits in
            traits.displayScale = 3
            traits.horizontalSizeClass = .compact
            traits.verticalSizeClass = .regular
            traits.layoutDirection = .leftToRight
            traits.userInterfaceIdiom = .phone
        }
    )

    override class func setUp() {
        super.setUp()

        let fileManager = FileManager.default
        if ProcessInfo.processInfo.environment["SNAPSHOT_REFERENCE_DIR"] == nil {
            do {
                let bundledReferences = try XCTUnwrap(
                    Bundle(for: SnapshotTests.self).url(forResource: "SnapshotTests", withExtension: nil),
                    "Bundled snapshot references are missing"
                )
                try? fileManager.removeItem(at: workingReferenceDirectory)
                try fileManager.copyItem(at: bundledReferences, to: workingReferenceDirectory)
            } catch {
                XCTFail("Could not prepare snapshot references: \(error)")
            }
        }

        let artifactDirectory = fileManager.temporaryDirectory
            .appendingPathComponent("SavoroSnapshotArtifacts", isDirectory: true)
        try? fileManager.createDirectory(at: artifactDirectory, withIntermediateDirectories: true)
        setenv("SNAPSHOT_ARTIFACTS", artifactDirectory.path, 1)
    }

    @MainActor
    func testTodaySnapshots() {
        assertFullMatrix {
            TodayPlaceholderView(viewModel: TodaySummaryViewModel(dayLog: .todayFixture))
        }
    }

    @MainActor
    func testCookbookSnapshots() {
        assertFullMatrix {
            CookbookPlaceholderView(
                selectedSegment: .mine,
                localStore: CookbookMockLocalStore()
            )
        }
    }

    @MainActor
    func testRecipeDetailSnapshots() {
        assertFullMatrix {
            RecipeDetailPlaceholderView(
                recipe: .mockHeaderFixture,
                now: RecipeDetail.mockHeaderNow
            )
        }
    }

    @MainActor
    func testRecipeEditorSnapshots() {
        assertFullMatrix {
            RecipeEditorPlaceholderView(
                form: RecipeEditorDraftForm(
                    servingsText: "2",
                    ingredientText: "1 cup Chicken breast\n1 cup Greek yogurt",
                    instructionText: "Whisk until smooth.\n\nServe right away."
                )
            )
        }
    }

    @MainActor
    func testLoggingSheetSnapshots() {
        assertFullMatrix {
            LogRecipeSheetView(
                viewModel: LogRecipeSheetViewModel(
                    requestedRecipeId: "recipe_shawarma_bowl",
                    requestedRecipeVersionId: "recipe_version_20260606",
                    defaultMealType: .lunch,
                    defaultLogDate: DayLog.todayFixture.logDate
                )
            )
        }
    }

    @MainActor
    func testLogPickerSnapshots() {
        assertFullMatrix {
            LogPickerPlaceholderView(mealType: .lunch)
        }
    }

    @MainActor
    func testDiscoverSnapshots() {
        assertFullMatrix {
            DiscoverPlaceholderView()
        }
    }

    @MainActor
    func testCommunitySnapshots() {
        assertFullMatrix {
            CommunityPlaceholderView()
        }
    }

    @MainActor
    func testProfileSnapshots() {
        assertFullMatrix {
            ProfilePlaceholderView()
        }
    }

    /// `Scripts/record-snapshots.sh` enables Point-Free's `.all` record mode
    /// for Accessibility XXXL cases only, removes its marker, and verifies the full matrix.
    @MainActor
    private func assertFullMatrix<Content: View>(
        @ViewBuilder screen: () -> Content,
        file: StaticString = #filePath,
        testName: String = #function,
        line: UInt = #line
    ) {
        for mode in Self.modes {
            let traits = Self.iPhone17Config.traits.modifyingTraits { traits in
                traits.userInterfaceStyle = mode.interfaceStyle
                traits.preferredContentSizeCategory = mode.contentSizeCategory
            }
            let view = NavigationStack {
                screen()
            }
            .environment(\.locale, Locale(identifier: "en_US_POSIX"))
            .environment(\.dynamicTypeSize, mode.dynamicTypeSize)
            .preferredColorScheme(mode.colorScheme)
            .transaction { transaction in
                transaction.animation = nil
            }

            let failure = verifySnapshot(
                of: view,
                as: .image(
                    layout: .device(config: Self.iPhone17Config),
                    traits: traits
                ),
                named: mode.name,
                record: Self.shouldRecord(mode) ? .all : nil,
                snapshotDirectory: Self.referenceDirectory,
                file: file,
                testName: testName,
                line: line
            )
            if let failure {
                XCTFail(failure, file: file, line: line)
            }
        }
    }

    private static func shouldRecord(_ mode: SnapshotMode) -> Bool {
        let fileManager = FileManager.default
        return fileManager.fileExists(atPath: recordAllMarkerURL.path)
            || (mode.colorScheme == .dark && fileManager.fileExists(atPath: recordDarkMarkerURL.path))
            || (mode.dynamicTypeSize == .accessibility5
                && fileManager.fileExists(atPath: recordAccessibilityXXXLMarkerURL.path))
    }
}
