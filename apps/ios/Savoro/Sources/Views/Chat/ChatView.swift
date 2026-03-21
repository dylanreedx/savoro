import SwiftUI

// MARK: - ChatView

struct ChatView: View {
    let onSend: (String) -> Void

    @State private var chatVM = ChatViewModel()
    @State private var isHeaderCollapsed = false

    // Placeholder nutrition for header until TodayViewModel is wired in
    private let placeholderNutrition = DailyNutrition(
        totals: DailyTotals(calories: 0, protein: 0, carb: 0, fat: 0, fiber: 0),
        goal: nil
    )

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                // Scroll content
                ScrollViewReader { proxy in
                    ScrollView {
                        // Offset tracker anchor
                        GeometryReader { geo in
                            Color.clear
                                .preference(
                                    key: ScrollOffsetKey.self,
                                    value: geo.frame(in: .named("chatScroll")).minY
                                )
                        }
                        .frame(height: 0)

                        // Collapsible header spacer
                        Color.clear
                            .frame(height: isHeaderCollapsed ? 56 : 100)
                            .animation(.easeInOut(duration: 0.25), value: isHeaderCollapsed)

                        // Message thread or empty state
                        if chatVM.messages.isEmpty && !chatVM.isStreaming {
                            emptyStateView
                                .padding(.top, 40)
                        } else {
                            LazyVStack(spacing: 8) {
                                ForEach(chatVM.messages) { message in
                                    MessageBubbleView(message: message)
                                        .id(message.id)
                                }

                                // Streaming bubble
                                if chatVM.isStreaming || chatVM.isLoading {
                                    streamingBubbleView
                                        .id("streaming")
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 100)
                        }
                    }
                    .coordinateSpace(name: "chatScroll")
                    .onPreferenceChange(ScrollOffsetKey.self) { offset in
                        let shouldCollapse = offset < -40
                        if shouldCollapse != isHeaderCollapsed {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                isHeaderCollapsed = shouldCollapse
                            }
                        }
                    }
                    .onChange(of: chatVM.messages.count) {
                        scrollToBottom(proxy: proxy)
                    }
                    .onChange(of: chatVM.streamingContent) {
                        if chatVM.isStreaming {
                            withAnimation {
                                proxy.scrollTo("streaming", anchor: .bottom)
                            }
                        }
                    }
                }

                // Floating header overlay
                VStack(spacing: 0) {
                    if isHeaderCollapsed {
                        DailyCardView(nutrition: placeholderNutrition, isCompact: true)
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    } else {
                        DailyCardView(nutrition: placeholderNutrition, isCompact: true)
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                            .transition(.opacity)
                    }
                    Spacer()
                }
                .animation(.easeInOut(duration: 0.25), value: isHeaderCollapsed)
            }
            .background(SavoroColors.canvas)
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await chatVM.loadHistory(date: Date())
            }
        }
    }

    // MARK: - Empty State (inline DailySnapshotView)

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(SavoroColors.Stone.s300)

            Text("Ask me about food")
                .font(SavoroFonts.title3)
                .foregroundStyle(SavoroColors.textPrimary)

            Text("Log meals, get nutrition info, or discover recipes.")
                .font(SavoroFonts.body)
                .foregroundStyle(SavoroColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 48)

            // Daily snapshot card
            VStack(alignment: .leading, spacing: 12) {
                Text("Today's Summary")
                    .font(SavoroFonts.caption)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .textCase(.uppercase)

                HStack(spacing: 16) {
                    snapshotMacroChip(
                        label: "Calories",
                        value: "—",
                        color: SavoroColors.Macro.calories
                    )
                    snapshotMacroChip(
                        label: "Protein",
                        value: "—",
                        color: SavoroColors.Macro.protein
                    )
                    snapshotMacroChip(
                        label: "Carbs",
                        value: "—",
                        color: SavoroColors.Macro.carb
                    )
                    snapshotMacroChip(
                        label: "Fat",
                        value: "—",
                        color: SavoroColors.Macro.fat
                    )
                }
            }
            .padding(16)
            .glassCard(cornerRadius: SavoroColors.Glass.cornerRadius)
            .padding(.horizontal, 32)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
    }

    private func snapshotMacroChip(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(SavoroFonts.caption)
                .foregroundStyle(color)
            Text(label)
                .font(SavoroFonts.caption2)
                .foregroundStyle(SavoroColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Streaming Bubble

    private var streamingBubbleView: some View {
        HStack(alignment: .bottom, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                if chatVM.isLoading && streamingContent.isEmpty {
                    loadingDotsView
                } else {
                    Text(chatVM.streamingContent)
                        .font(SavoroFonts.body)
                        .foregroundStyle(SavoroColors.textPrimary)
                        .textSelection(.enabled)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .glassCard(cornerRadius: 18)
            .frame(maxWidth: UIScreen.main.bounds.width * 0.75, alignment: .leading)

            Spacer()
        }
    }

    private var streamingContent: String {
        chatVM.streamingContent
    }

    private var loadingDotsView: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(SavoroColors.Stone.s400)
                    .frame(width: 6, height: 6)
                    .opacity(0.6)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Auto-scroll

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let lastId = chatVM.messages.last?.id else { return }
        withAnimation {
            proxy.scrollTo(lastId, anchor: .bottom)
        }
    }
}

// MARK: - MessageBubbleView

private struct MessageBubbleView: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == .user }

    var body: some View {
        VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
            HStack(alignment: .bottom, spacing: 8) {
                if isUser { Spacer() }

                VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                    if let content = message.content, !content.isEmpty {
                        Text(content)
                            .font(SavoroFonts.body)
                            .foregroundStyle(isUser ? Color.white : SavoroColors.textPrimary)
                            .textSelection(.enabled)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(isUser ? AnyShapeStyle(SavoroColors.rose) : AnyShapeStyle(.ultraThinMaterial))
                            .clipShape(
                                RoundedRectangle(
                                    cornerRadius: 18,
                                    style: .continuous
                                )
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(
                                        isUser ? Color.clear : SavoroColors.Glass.border,
                                        lineWidth: 0.5
                                    )
                            )
                    }

                    // Rich UI components placeholder
                    if let components = message.uiComponents, !components.isEmpty {
                        Text("[Rich content — \(components.count) component(s)]")
                            .font(SavoroFonts.caption)
                            .foregroundStyle(SavoroColors.textSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusSm, variant: .subtle)
                    }
                }
                .frame(
                    maxWidth: UIScreen.main.bounds.width * 0.75,
                    alignment: isUser ? .trailing : .leading
                )

                if !isUser { Spacer() }
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Scroll Offset Preference Key

private struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

// MARK: - Preview

#Preview {
    ChatView(onSend: { _ in })
}
