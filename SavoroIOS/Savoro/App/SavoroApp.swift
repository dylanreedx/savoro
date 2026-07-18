import SwiftUI

@main
struct SavoroApp: App {
    private let environment = AppEnvironment.appLaunchEnvironment()

    var body: some Scene {
        WindowGroup {
            RootPlaceholderView(environment: environment)
        }
    }
}
