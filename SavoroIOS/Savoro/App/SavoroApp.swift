import SwiftUI

@main
struct SavoroApp: App {
    @State private var environment = AppEnvironment.preview

    var body: some Scene {
        WindowGroup {
            RootPlaceholderView()
                .environment(environment)
        }
    }
}
