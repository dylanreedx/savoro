import SwiftUI

struct ContentView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var selectedTab = 0
    @State private var showBarcodeScanner = false

    private let chatService = ChatService(apiClient: .shared)

    var body: some View {
        if authViewModel.isAuthenticated {
            TabView(selection: $selectedTab) {
                TodayView()
                    .tabItem {
                        Label("Today", systemImage: "sun.max")
                    }
                    .tag(0)

                ChatView(onSend: { _ in })
                    .tabItem {
                        Label("Chat", systemImage: "bubble.left.and.bubble.right")
                    }
                    .tag(1)

                CookbookView()
                    .tabItem {
                        Label("Cookbook", systemImage: "book")
                    }
                    .tag(2)
            }
            .tint(SavoroColors.rose)
            .fullScreenCover(isPresented: $showBarcodeScanner) {
                BarcodeScannerView(
                    onScan: { barcode in
                        showBarcodeScanner = false
                        sendBarcodeToChat(barcode)
                    },
                    onDismiss: {
                        showBarcodeScanner = false
                    }
                )
            }
        } else {
            NavigationStack {
                LoginView()
            }
        }
    }

    // MARK: - Barcode → Chat

    private func sendBarcodeToChat(_ barcode: String) {
        let attachment = ChatAttachment(type: "barcode", url: nil, data: barcode)
        Task {
            for await _ in chatService.sendMessage(
                content: barcode,
                attachments: [attachment]
            ) {}
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthViewModel())
}
