import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self) private var authViewModel

    var body: some View {
        if authViewModel.isAuthenticated {
            Text("Home")
                .font(SavoroFonts.title)
                .foregroundStyle(SavoroColors.textPrimary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(SavoroColors.canvas)
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
