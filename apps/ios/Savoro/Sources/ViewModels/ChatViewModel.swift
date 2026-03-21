import Foundation
import Observation

@MainActor
@Observable
final class ChatViewModel {

    // MARK: - State

    var messages: [ChatMessage] = []
    var isLoading = false
    var isStreaming = false
    var streamingContent: String = ""
    var streamingComponents: [UIComponent]? = nil
    var errorMessage: String? = nil

    // MARK: - Private

    nonisolated(unsafe) private var streamTask: Task<Void, Never>?
    private let chatService: any ChatServiceProtocol

    // MARK: - Init

    init(chatService: any ChatServiceProtocol = ChatService(apiClient: APIClient.shared)) {
        self.chatService = chatService
    }

    deinit {
        streamTask?.cancel()
    }

    // MARK: - Send Message

    func sendMessage(content: String, attachments: [ChatAttachment]? = nil) async {
        streamTask?.cancel()

        let userMessage = ChatMessage(
            id: UUID().uuidString,
            userId: "local",
            role: .user,
            content: content,
            toolCalls: nil,
            uiComponents: nil,
            attachments: nil,
            date: Self.dateString(from: Date()),
            createdAt: Self.isoString(from: Date()),
            updatedAt: Self.isoString(from: Date())
        )
        messages.append(userMessage)

        isLoading = true
        isStreaming = false
        streamingContent = ""
        streamingComponents = nil
        errorMessage = nil

        streamTask = Task {
            let stream = chatService.sendMessage(content: content, attachments: attachments)
            for await event in stream {
                guard !Task.isCancelled else { break }
                switch event {
                case .textDelta(let delta):
                    isLoading = false
                    isStreaming = true
                    streamingContent += delta

                case .uiComponents(let components):
                    streamingComponents = components

                case .done:
                    let assistantMessage = ChatMessage(
                        id: UUID().uuidString,
                        userId: "assistant",
                        role: .assistant,
                        content: streamingContent.isEmpty ? nil : streamingContent,
                        toolCalls: nil,
                        uiComponents: streamingComponents,
                        attachments: nil,
                        date: Self.dateString(from: Date()),
                        createdAt: Self.isoString(from: Date()),
                        updatedAt: Self.isoString(from: Date())
                    )
                    messages.append(assistantMessage)
                    resetStreamingState()

                case .error(let error):
                    let errorMsg = error.localizedDescription
                    let errorMessage = ChatMessage(
                        id: UUID().uuidString,
                        userId: "assistant",
                        role: .assistant,
                        content: errorMsg,
                        toolCalls: nil,
                        uiComponents: nil,
                        attachments: nil,
                        date: Self.dateString(from: Date()),
                        createdAt: Self.isoString(from: Date()),
                        updatedAt: Self.isoString(from: Date())
                    )
                    messages.append(errorMessage)
                    self.errorMessage = errorMsg
                    resetStreamingState()

                case .toolCalls:
                    break
                }
            }
        }
    }

    // MARK: - Retry

    func retryLast() {
        guard !isStreaming,
              messages.count >= 2,
              messages.last?.role == .assistant else { return }

        messages.removeLast()

        guard let userMessage = messages.last,
              userMessage.role == .user,
              let content = userMessage.content else { return }

        Task {
            await sendMessage(content: content, attachments: nil)
        }
    }

    // MARK: - Load History

    func loadHistory(date: Date) async {
        isLoading = true
        errorMessage = nil
        do {
            let loaded = try await chatService.loadMessages(date: date)
            messages = loaded
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Private Helpers

    private func resetStreamingState() {
        isLoading = false
        isStreaming = false
        streamingContent = ""
        streamingComponents = nil
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        return f
    }()

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static func dateString(from date: Date) -> String {
        dateFormatter.string(from: date)
    }

    private static func isoString(from date: Date) -> String {
        isoFormatter.string(from: date)
    }
}
