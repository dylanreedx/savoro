import SnapshotTesting
import SwiftUI
import UIKit
import XCTest
@testable import Savoro

final class RecipeEditorPrototypeSnapshotTests: XCTestCase {
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
    private static let recordMarkerURL = projectDirectory
        .appendingPathComponent(".snapshot-record-prototypes")
    private static let workingReferenceDirectory = FileManager.default.temporaryDirectory
        .appendingPathComponent("SavoroPrototypeSnapshotReferences", isDirectory: true)
    private static let referenceDirectory = ProcessInfo.processInfo.environment["PROTOTYPE_SNAPSHOT_REFERENCE_DIR"]
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
        if ProcessInfo.processInfo.environment["PROTOTYPE_SNAPSHOT_REFERENCE_DIR"] == nil {
            do {
                let bundledReferences = try XCTUnwrap(
                    Bundle(for: RecipeEditorPrototypeSnapshotTests.self)
                        .url(forResource: "RecipeEditorPrototypeSnapshotTests", withExtension: nil),
                    "Bundled prototype snapshot references are missing"
                )
                try? fileManager.removeItem(at: workingReferenceDirectory)
                try fileManager.copyItem(at: bundledReferences, to: workingReferenceDirectory)
            } catch {
                XCTFail("Could not prepare prototype snapshot references: \(error)")
            }
        }

        let artifactDirectory = fileManager.temporaryDirectory
            .appendingPathComponent("SavoroPrototypeSnapshotArtifacts", isDirectory: true)
        try? fileManager.createDirectory(at: artifactDirectory, withIntermediateDirectories: true)
        setenv("SNAPSHOT_ARTIFACTS", artifactDirectory.path, 1)
    }

    @MainActor
    func testPrototypeComposerEmptySnapshots() {
        assertFullMatrix {
            EditorPrototypeComposerView(contentState: .empty)
        }
    }

    @MainActor
    func testPrototypeComposerPopulatedSnapshots() {
        assertFullMatrix {
            EditorPrototypeComposerView(contentState: .populated)
        }
    }

    @MainActor
    func testPrototypeSheetBuildEmptySnapshots() {
        assertFullMatrix {
            EditorPrototypeSheetBuildView(contentState: .empty)
        }
    }

    @MainActor
    func testPrototypeSheetBuildPopulatedSnapshots() {
        assertFullMatrix {
            EditorPrototypeSheetBuildView(contentState: .populated)
        }
    }

    @MainActor
    func testPrototypeSheetBuildAddSheetOpenSnapshot() {
        assertSnapshot(
            EditorPrototypeSheetBuildView(
                contentState: .populated,
                renderedSheet: .ingredients
            ),
            mode: try! XCTUnwrap(Self.modes.first { $0.name == "light-standard" })
        )
    }

    @MainActor
    private func assertFullMatrix<Content: View>(
        @ViewBuilder screen: () -> Content,
        file: StaticString = #filePath,
        testName: String = #function,
        line: UInt = #line
    ) {
        for mode in Self.modes {
            assertSnapshot(
                screen(),
                mode: mode,
                file: file,
                testName: testName,
                line: line
            )
        }
    }

    @MainActor
    private func assertSnapshot<Content: View>(
        _ screen: Content,
        mode: SnapshotMode,
        file: StaticString = #filePath,
        testName: String = #function,
        line: UInt = #line
    ) {
        let traits = Self.iPhone17Config.traits.modifyingTraits { traits in
            traits.userInterfaceStyle = mode.interfaceStyle
            traits.preferredContentSizeCategory = mode.contentSizeCategory
        }
        let view = screen
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
            record: Self.shouldRecord ? .all : nil,
            snapshotDirectory: Self.referenceDirectory,
            file: file,
            testName: testName,
            line: line
        )
        if let failure {
            XCTFail(failure, file: file, line: line)
        }
    }

    private static var shouldRecord: Bool {
        FileManager.default.fileExists(atPath: recordMarkerURL.path)
    }
}
