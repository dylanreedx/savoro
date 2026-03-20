import SwiftUI

struct ProfileSheet: View {
    @Binding var isPresented: Bool
    var authVM: AuthViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Avatar
                Circle()
                    .fill(SavoroColors.Stone.s200)
                    .frame(width: 80, height: 80)
                    .overlay(
                        Text(avatarInitial)
                            .font(SavoroFonts.title)
                            .foregroundStyle(SavoroColors.textSecondary)
                    )

                // User info
                VStack(spacing: 4) {
                    Text(displayName)
                        .font(SavoroFonts.title3)
                        .foregroundStyle(SavoroColors.textPrimary)

                    if let email = authVM.currentUser?.email {
                        Text(email)
                            .font(SavoroFonts.subheadline)
                            .foregroundStyle(SavoroColors.textSecondary)
                    }
                }

                Spacer()

                // Logout
                Button(role: .destructive) {
                    authVM.logout()
                    isPresented = false
                } label: {
                    Text("Log Out")
                        .font(SavoroFonts.callout)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(SavoroColors.Blush.b50)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(SavoroColors.canvas)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        isPresented = false
                    }
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.rose)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    private var displayName: String {
        authVM.currentUser?.displayName
            ?? authVM.currentUser?.username
            ?? "User"
    }

    private var avatarInitial: String {
        String(displayName.prefix(1)).uppercased()
    }
}
