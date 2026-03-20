import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Savoro")
                .font(.custom("PlusJakartaSans-Bold", size: 32))
                .foregroundStyle(Color("stone-900"))

            Text("Your personal food companion")
                .font(.custom("PlusJakartaSans-Regular", size: 16))
                .foregroundStyle(Color("stone-500"))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("stone-50"))
    }
}

#Preview {
    ContentView()
}
