import SwiftUI

struct ProfileView: View {

    @Binding var isPresented: Bool
    @Bindable var viewModel: ProfileViewModel
    var authVM: AuthViewModel

    private static let memberSinceDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f
    }()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    headerSection
                    goalEditorSection
                    consistencySection
                    trendsSection
                    settingsSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
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
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task {
            await viewModel.loadAll()
        }
    }

    // MARK: - Header (Avatar + Name + Member Since)

    private var headerSection: some View {
        VStack(spacing: 12) {
            Circle()
                .fill(SavoroColors.Stone.s200)
                .frame(width: 80, height: 80)
                .overlay(
                    Text(avatarInitial)
                        .font(SavoroFonts.title)
                        .foregroundStyle(SavoroColors.textSecondary)
                )

            VStack(spacing: 4) {
                Text(displayName)
                    .font(SavoroFonts.title3)
                    .foregroundStyle(SavoroColors.textPrimary)

                Text(memberSinceText)
                    .font(SavoroFonts.footnote)
                    .foregroundStyle(SavoroColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Goal Editor

    private var goalEditorSection: some View {
        GoalEditorView(viewModel: viewModel)
    }

    // MARK: - Consistency Grid

    private var consistencySection: some View {
        ConsistencyGridView(
            consistencyMap: viewModel.consistencyMap,
            isLoading: viewModel.isLoadingConsistency
        )
    }

    // MARK: - Weekly Trends

    private var trendsSection: some View {
        WeeklyTrendsView(
            calories: viewModel.weeklyCalories,
            protein: viewModel.weeklyProtein,
            carb: viewModel.weeklyCarb,
            fat: viewModel.weeklyFat,
            isLoading: viewModel.isLoadingTrends
        )
    }

    // MARK: - Settings Links

    private var settingsSection: some View {
        VStack(spacing: 0) {
            settingsRow(icon: "bell", label: "Notifications")
            Divider().padding(.leading, 44)
            settingsRow(icon: "lock.shield", label: "Privacy")
            Divider().padding(.leading, 44)
            settingsRow(icon: "questionmark.circle", label: "Help & Support")
            Divider().padding(.leading, 44)

            Button {
                authVM.logout()
                isPresented = false
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 16))
                        .frame(width: 24)
                        .foregroundStyle(.red.opacity(0.8))

                    Text("Log Out")
                        .font(SavoroFonts.callout)
                        .foregroundStyle(.red.opacity(0.8))

                    Spacer()
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 4)
            }
        }
        .padding(16)
        .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusSm)
    }

    @ViewBuilder
    private func settingsRow(icon: String, label: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .frame(width: 24)
                .foregroundStyle(SavoroColors.textSecondary)

            Text(label)
                .font(SavoroFonts.callout)
                .foregroundStyle(SavoroColors.textPrimary)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(SavoroColors.Stone.s400)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 4)
    }

    // MARK: - Helpers

    private var displayName: String {
        authVM.currentUser?.displayName
            ?? authVM.currentUser?.username
            ?? "User"
    }

    private var avatarInitial: String {
        String(displayName.prefix(1)).uppercased()
    }

    private var memberSinceText: String {
        guard let createdAt = authVM.currentUser?.createdAt else {
            return "Member"
        }

        // Try parsing ISO 8601 variants
        if let date = Self.memberSinceDateFormatter.date(from: String(createdAt.prefix(19))) {
            return "Member since \(Self.displayDateFormatter.string(from: date))"
        }

        return "Member"
    }
}
