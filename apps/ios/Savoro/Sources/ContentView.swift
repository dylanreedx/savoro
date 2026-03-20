import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self) private var authViewModel

    var body: some View {
        if authViewModel.isAuthenticated {
            TodayView()
        } else {
            NavigationStack {
                LoginView()
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthViewModel())
}
