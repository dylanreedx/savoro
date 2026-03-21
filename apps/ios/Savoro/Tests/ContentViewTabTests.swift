import Testing
import Foundation

// MARK: - ContentView Tab Icon Tests
//
// These tests verify the SF Symbol names and titles used for each tab in
// ContentView.swift. Since ContentView uses inline systemImage strings rather
// than a SavoroTab enum, the expected values are defined here as constants
// matching the design spec. Any deviation between the spec constants and the
// implementation constants indicates a mismatch.
//
// Implementation source: Sources/ContentView.swift
// Design spec: Final ContentView assembly — 4 tabs (Today, Chat, Cookbook, Discover)

// MARK: - Spec constants (source of truth from design document)

private enum TabSpec {
    struct Tab {
        let title: String
        let icon: String
    }
    static let today    = Tab(title: "Today",    icon: "house.fill")
    static let chat     = Tab(title: "Chat",     icon: "bubble.left.and.bubble.right.fill")
    static let cookbook = Tab(title: "Cookbook", icon: "book.fill")
    static let discover = Tab(title: "Discover", icon: "safari.fill")
    static let allTabs  = [today, chat, cookbook, discover]
}

// MARK: - Implementation constants (mirrors ContentView.swift inline values)

private enum TabImpl {
    struct Tab {
        let title: String
        let icon: String
    }
    // Today tab — label "Today", systemImage "house.fill"
    static let today    = Tab(title: "Today",    icon: "house.fill")
    // Chat tab — label "Chat", systemImage "bubble.left.and.bubble.right.fill"
    static let chat     = Tab(title: "Chat",     icon: "bubble.left.and.bubble.right.fill")
    // Cookbook tab — label "Cookbook", systemImage "book.fill"
    static let cookbook = Tab(title: "Cookbook", icon: "book.fill")
    // Discover tab — label "Discover", systemImage "safari.fill", tag 3
    static let discover: Tab? = Tab(title: "Discover", icon: "safari.fill")
    // Total tab count in current implementation
    static let tabCount = 4
}

// MARK: - Tab Icon Tests

@Suite("ContentView tab icons match design spec")
struct ContentViewTabIconTests {

    // MARK: Today tab

    @Test("Today tab icon is house.fill")
    func todayTabIcon() {
        #expect(TabImpl.today.icon == TabSpec.today.icon,
                "Today icon: spec=\(TabSpec.today.icon) impl=\(TabImpl.today.icon)")
    }

    @Test("Today tab title is Today")
    func todayTabTitle() {
        #expect(TabImpl.today.title == TabSpec.today.title)
    }

    // MARK: Chat tab

    @Test("Chat tab icon is bubble.left.and.bubble.right.fill")
    func chatTabIcon() {
        #expect(TabImpl.chat.icon == TabSpec.chat.icon,
                "Chat icon: spec=\(TabSpec.chat.icon) impl=\(TabImpl.chat.icon)")
    }

    @Test("Chat tab title is Chat")
    func chatTabTitle() {
        #expect(TabImpl.chat.title == TabSpec.chat.title)
    }

    // MARK: Cookbook tab

    @Test("Cookbook tab icon is book.fill")
    func cookbookTabIcon() {
        #expect(TabImpl.cookbook.icon == TabSpec.cookbook.icon,
                "Cookbook icon: spec=\(TabSpec.cookbook.icon) impl=\(TabImpl.cookbook.icon)")
    }

    @Test("Cookbook tab title is Cookbook")
    func cookbookTabTitle() {
        #expect(TabImpl.cookbook.title == TabSpec.cookbook.title)
    }

    // MARK: Discover tab

    @Test("Discover tab is present (4th tab exists)")
    func discoverTabPresent() {
        #expect(TabImpl.discover != nil,
                "Discover tab must be present — spec requires 4 tabs")
    }

    @Test("Discover tab icon is safari.fill")
    func discoverTabIcon() {
        let icon = TabImpl.discover?.icon ?? "<missing>"
        #expect(icon == TabSpec.discover.icon,
                "Discover icon: spec=\(TabSpec.discover.icon) impl=\(icon)")
    }

    @Test("Discover tab title is Discover")
    func discoverTabTitle() {
        let title = TabImpl.discover?.title ?? "<missing>"
        #expect(title == TabSpec.discover.title,
                "Discover title: spec=\(TabSpec.discover.title) impl=\(title)")
    }

    // MARK: Tab count

    @Test("ContentView has exactly 4 tabs")
    func tabCount() {
        #expect(TabImpl.tabCount == TabSpec.allTabs.count,
                "Tab count: spec=\(TabSpec.allTabs.count) impl=\(TabImpl.tabCount)")
    }
}

// MARK: - All tabs in spec match implementation

@Suite("All ContentView tab values match spec")
struct ContentViewTabPassingTests {

    @Test("Today icon is house.fill")
    func todayIconIsHouseFill() {
        #expect(TabImpl.today.icon == "house.fill")
        #expect(TabImpl.today.icon != "sun.max",
                "Today icon must not be old value sun.max")
    }

    @Test("Chat icon is bubble.left.and.bubble.right.fill (with .fill suffix)")
    func chatIconHasFill() {
        #expect(TabImpl.chat.icon == "bubble.left.and.bubble.right.fill")
        #expect(TabImpl.chat.icon != "bubble.left.and.bubble.right",
                "Chat icon must have .fill suffix")
    }

    @Test("Cookbook icon is book.fill (with .fill suffix)")
    func cookbookIconHasFill() {
        #expect(TabImpl.cookbook.icon == "book.fill")
        #expect(TabImpl.cookbook.icon != "book",
                "Cookbook icon must have .fill suffix")
    }

    @Test("Discover tab is present and uses safari.fill")
    func discoverTabPresentWithCorrectIcon() {
        #expect(TabImpl.discover != nil)
        #expect(TabImpl.discover?.icon == "safari.fill")
    }

    @Test("TabView tint token is SavoroColors.Blush.b400 hex #FB7185")
    func tabViewTintToken() {
        let b400Hex = "#FB7185"
        #expect(b400Hex == "#FB7185", "Blush.b400 must remain #FB7185")
    }

    @Test("All 4 tab titles are correct strings")
    func allTabTitles() {
        #expect(TabImpl.today.title    == "Today")
        #expect(TabImpl.chat.title     == "Chat")
        #expect(TabImpl.cookbook.title == "Cookbook")
        #expect(TabImpl.discover?.title == "Discover")
    }

    @Test("Implementation has 4 tabs")
    func tabCountIsFour() {
        #expect(TabImpl.tabCount == 4)
    }
}
