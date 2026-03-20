import SwiftUI

struct TodayView: View {
    @Environment(AuthViewModel.self) private var authViewModel
    @State private var viewModel = TodayViewModel()
    @State private var showProfile = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                headerSection
                dailyCardSection
                timelineSection
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 32)
        }
        .background(SavoroColors.canvas)
        .refreshable {
            await viewModel.fetchTodayData()
        }
        .task {
            if viewModel.nutrition == nil {
                await viewModel.fetchTodayData()
            }
        }
        .sheet(isPresented: $showProfile) {
            ProfileSheet(isPresented: $showProfile, authVM: authViewModel)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(greetingText)
                    .font(SavoroFonts.title2)
                    .foregroundStyle(SavoroColors.textPrimary)

                Text(viewModel.formattedDate)
                    .font(SavoroFonts.subheadline)
                    .foregroundStyle(SavoroColors.textSecondary)
            }

            Spacer()

            Button {
                showProfile = true
            } label: {
                avatarView
            }
        }
    }

    private var greetingText: String {
        let name = authViewModel.currentUser?.displayName
            ?? authViewModel.currentUser?.username
            ?? "there"
        return "\(viewModel.greeting), \(name)"
    }

    private var avatarView: some View {
        Circle()
            .fill(SavoroColors.Stone.s200)
            .frame(width: 40, height: 40)
            .overlay(
                Text(avatarInitial)
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.textSecondary)
            )
    }

    private var avatarInitial: String {
        let name = authViewModel.currentUser?.displayName
            ?? authViewModel.currentUser?.username
            ?? "?"
        return String(name.prefix(1)).uppercased()
    }

    // MARK: - Daily Card

    @ViewBuilder
    private var dailyCardSection: some View {
        if viewModel.isLoading && viewModel.nutrition == nil {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
        } else if let error = viewModel.error, viewModel.nutrition == nil {
            VStack(spacing: 8) {
                Text(error)
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
        } else if let nutrition = viewModel.nutrition {
            DailyCardView(nutrition: nutrition)
        }
    }

    // MARK: - Timeline

    private var timelineSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Meals")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            MealTimelineView(entries: viewModel.entries)
        }
    }
}

#Preview {
    TodayView()
        .environment(AuthViewModel())
}
