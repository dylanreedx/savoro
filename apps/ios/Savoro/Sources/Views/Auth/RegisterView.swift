import SwiftUI

struct RegisterView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var username = ""
    @State private var password = ""

    private var isFormValid: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty &&
        username.count >= 3 &&
        password.count >= 8
    }

    private var validationHint: String? {
        if !username.isEmpty && username.count < 3 {
            return "Username must be at least 3 characters."
        }
        if !password.isEmpty && password.count < 8 {
            return "Password must be at least 8 characters."
        }
        return nil
    }

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Header
            VStack(spacing: 8) {
                Text("Create Account")
                    .font(SavoroFonts.title)
                    .foregroundStyle(SavoroColors.textPrimary)

                Text("Join the Savoro community")
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

                TextField("Username", text: $username)
                    .font(SavoroFonts.body)
                    .textContentType(.username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding()
                    .background(SavoroColors.Stone.s100)
                    .clipShape(RoundedRectangle(cornerRadius: SavoroColors.Glass.cornerRadiusSm, style: .continuous))

                SecureField("Password", text: $password)
                    .font(SavoroFonts.body)
                    .textContentType(.newPassword)
                    .padding()
                    .background(SavoroColors.Stone.s100)
                    .clipShape(RoundedRectangle(cornerRadius: SavoroColors.Glass.cornerRadiusSm, style: .continuous))
            }
            .padding(.horizontal, 24)
            .glassCard()
            .padding(.horizontal, 24)

            // Validation hint
            if let hint = validationHint {
                Text(hint)
                    .font(SavoroFonts.footnote)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .padding(.horizontal, 24)
            }

            // Error
            if let error = authViewModel.errorMessage {
                Text(error)
                    .font(SavoroFonts.footnote)
                    .foregroundStyle(SavoroColors.Blush.b400)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Register Button
            Button {
                Task {
                    await authViewModel.register(
                        email: email,
                        username: username,
                        password: password
                    )
                }
            } label: {
                Group {
                    if authViewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Sign Up")
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

            // Back to login
            Button {
                dismiss()
            } label: {
                Text("Already have an account? **Log in**")
                    .font(SavoroFonts.subheadline)
                    .foregroundStyle(SavoroColors.textSecondary)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SavoroColors.canvas)
        .navigationBarBackButtonHidden()
    }
}

#Preview {
    NavigationStack {
        RegisterView()
    }
    .environment(AuthViewModel())
}
