import SwiftUI

@main
struct SavoroApp: App {
    @State private var environment = AppEnvironment.localMock

    var body: some Scene {
        WindowGroup {
            RootPlaceholderView()
                .environment(environment)
        }
    }
}
