import SwiftUI

struct GroupView: View {
    let kitchen: KitchenGroup

    @State private var showMemberSheet = false
    @State private var showInvite = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    headerSection
                    memberAvatarRow
                    sharedRecipesGrid
                    activityFeed
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 100)
            }
            .background(SavoroColors.canvas)

            inviteButton
        }
        .navigationTitle(kitchen.name)
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showMemberSheet) {
            MemberListSheet(members: kitchen.members)
        }
        .sheet(isPresented: $showInvite) {
            ShareLink(
                item: "Join \(kitchen.name) on Savoro!",
                subject: Text("Kitchen Invite"),
                message: Text("I'd like to invite you to my kitchen.")
            )
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                if let description = kitchen.description {
                    Text(description)
                        .font(SavoroFonts.callout)
                        .foregroundStyle(SavoroColors.textSecondary)
                }
            }

            Spacer()

            Text("\(kitchen.memberCount) members")
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(SavoroColors.Stone.s100)
                .clipShape(Capsule())
        }
    }

    // MARK: - Member Avatar Row

    private var memberAvatarRow: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Members")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(kitchen.members) { member in
                        Button {
                            showMemberSheet = true
                        } label: {
                            VStack(spacing: 4) {
                                CircleAvatar(
                                    name: member.user.displayName ?? member.user.username,
                                    size: 44
                                )
                                Text(member.user.displayName ?? member.user.username)
                                    .font(SavoroFonts.caption2)
                                    .foregroundStyle(SavoroColors.textSecondary)
                                    .lineLimit(1)
                                    .frame(width: 52)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Shared Recipes Grid

    private var sharedRecipesGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Shared Recipes")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            if kitchen.recipes.isEmpty {
                Text("No shared recipes yet.")
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    spacing: 12
                ) {
                    ForEach(kitchen.recipes.sorted { $0.updatedAt > $1.updatedAt }) { recipe in
                        RecipeCardView(recipe: recipe)
                    }
                }
            }
        }
    }

    // MARK: - Activity Feed

    private var activityFeed: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Activity")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            if kitchen.activities.isEmpty {
                Text("No activity yet.")
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .padding(.vertical, 8)
            } else {
                VStack(spacing: 0) {
                    ForEach(kitchen.activities) { activity in
                        ActivityRowView(activity: activity)
                        if activity.id != kitchen.activities.last?.id {
                            Divider()
                                .padding(.leading, 36)
                        }
                    }
                }
                .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusSm)
            }
        }
    }

    // MARK: - Invite FAB

    private var inviteButton: some View {
        Button {
            showInvite = true
        } label: {
            Image(systemName: "person.badge.plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(SavoroColors.rose)
                .clipShape(Circle())
                .shadow(
                    color: SavoroColors.rose.opacity(0.35),
                    radius: 12,
                    y: 6
                )
        }
        .padding(.trailing, 20)
        .padding(.bottom, 24)
    }
}

// MARK: - Circle Avatar

private struct CircleAvatar: View {
    let name: String
    let size: CGFloat

    private var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    var body: some View {
        Text(initials)
            .font(SavoroFonts.caption)
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(SavoroColors.rose)
            .clipShape(Circle())
    }
}

// MARK: - Activity Row View

private struct ActivityRowView: View {
    let activity: KitchenActivity

    private var relativeTime: String {
        let interval = Date().timeIntervalSince(activity.timestamp)
        if interval < 3600 {
            let mins = Int(interval / 60)
            return "\(mins)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "fork.knife")
                .font(.system(size: 14))
                .foregroundStyle(SavoroColors.rose)
                .frame(width: 26, height: 26)

            Text("\(activity.actorName) \(activity.verb) \(activity.recipeName)")
                .font(SavoroFonts.footnote)
                .foregroundStyle(SavoroColors.textPrimary)
                .lineLimit(2)

            Spacer()

            Text(relativeTime)
                .font(SavoroFonts.caption2)
                .foregroundStyle(SavoroColors.textSecondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }
}

// MARK: - Member List Sheet

private struct MemberListSheet: View {
    let members: [KitchenMember]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(members) { member in
                HStack(spacing: 12) {
                    CircleAvatar(
                        name: member.user.displayName ?? member.user.username,
                        size: 38
                    )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(member.user.displayName ?? member.user.username)
                            .font(SavoroFonts.subheadline)
                            .foregroundStyle(SavoroColors.textPrimary)
                        Text("@\(member.user.username)")
                            .font(SavoroFonts.caption)
                            .foregroundStyle(SavoroColors.textSecondary)
                    }

                    Spacer()

                    roleBadge(for: member.role)
                }
                .padding(.vertical, 4)
            }
            .listStyle(.plain)
            .navigationTitle("Members")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(SavoroFonts.callout)
                        .foregroundStyle(SavoroColors.rose)
                }
            }
        }
    }

    @ViewBuilder
    private func roleBadge(for role: MemberRole) -> some View {
        let label: String
        let color: Color
        switch role {
        case .owner:
            label = "Owner"
            color = SavoroColors.rose
        case .admin:
            label = "Admin"
            color = SavoroColors.Stone.s500
        case .member:
            label = "Member"
            color = SavoroColors.Stone.s400
        }
        Text(label)
            .font(SavoroFonts.caption2)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}

#Preview {
    NavigationStack {
        GroupView(kitchen: KitchenGroup.preview)
    }
}
