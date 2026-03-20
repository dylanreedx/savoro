import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var email = ""
    @State private var password = ""

    private var isFormValid: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty &&
        !password.isEmpty
    }

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Header
            VStack(spacing: 8) {
                Text("Savoro")
                    .font(SavoroFonts.largeTitle)
                    .foregroundStyle(SavoroColors.textPrimary)

                Text("Welcome back")
                    .font(SavoroFonts.body)
                    .foregroundStyle(SavoroColors.textSecondary)
            }

            // Form
            VStack(spacing: 16) {
                TextField("Email", text: $email)
                    .font(SavoroFonts.body)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.emailAddress)
                    .padding()
                    .background(SavoroColors.Stone.s100)
                    .clipShape(RoundedRectangle(cornerRadius: SavoroColors.Glass.cornerRadiusSm, style: .continuous))

                SecureField("Password", text: $password)
                    .font(SavoroFonts.body)
                    .textContentType(.password)
                    .padding()
                    .background(SavoroColors.Stone.s100)
                    .clipShape(RoundedRectangle(cornerRadius: SavoroColors.Glass.cornerRadiusSm, style: .continuous))
            }
            .padding(.horizontal, 24)
            .glassCard()
            .padding(.horizontal, 24)

            // Error
            if let error = authViewModel.errorMessage {
                Text(error)
                    .font(SavoroFonts.footnote)
                    .foregroundStyle(SavoroColors.Blush.b400)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Login Button
            Button {
                Task {
                    await authViewModel.login(email: email, password: password)
                }
            } label: {
                Group {
                    if authViewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Log In")
                            .font(SavoroFonts.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white)
            .background(isFormValid ? SavoroColors.rose : SavoroColors.Stone.s300)
            .clipShape(RoundedRectangle(cornerRadius: SavoroColors.Glass.cornerRadiusSm, style: .continuous))
            .padding(.horizontal, 24)
            .disabled(!isFormValid || authViewModel.isLoading)

            // Register Link
            NavigationLink {
                RegisterView()
            } label: {
                Text("Don't have an account? **Sign up**")
                    .font(SavoroFonts.subheadline)
                    .foregroundStyle(SavoroColors.textSecondary)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SavoroColors.canvas)
    }
}

#Preview {
    NavigationStack {
        LoginView()
    }
    .environment(AuthViewModel())
}
