import Testing
import Foundation
@testable import Savoro

// MARK: - MockChatService

/// Controllable mock: callers push events into the continuation.
final class MockChatService: ChatServiceProtocol, @unchecked Sendable {

    // Closure that produces a stream for sendMessage calls
    var sendMessageHandler: ((String, [ChatAttachment]?) -> AsyncStream<ChatEvent>)?
    // For loadMessages
    var loadMessagesResult: Result<[ChatMessage], Error> = .success([])
    // Track calls
    private(set) var sendMessageCallCount = 0
    private(set) var lastSentContent: String?

    func sendMessage(content: String, attachments: [ChatAttachment]?) -> AsyncStream<ChatEvent> {
        sendMessageCallCount += 1
        lastSentContent = content
        if let handler = sendMessageHandler {
            return handler(content, attachments)
        }
        return AsyncStream { $0.finish() }
    }

    func loadMessages(date: Date) async throws -> [ChatMessage] {
        switch loadMessagesResult {
        case .success(let msgs): return msgs
        case .failure(let err): throw err
        }
    }
}

// MARK: - Helpers

private func makeStream(events: [ChatEvent]) -> AsyncStream<ChatEvent> {
    AsyncStream { continuation in
        for event in events {
            continuation.yield(event)
        }
        continuation.finish()
    }
}

private func makeChatMessage(id: String, role: MessageRole, content: String?) -> ChatMessage {
    ChatMessage(
        id: id,
        userId: role == .user ? "local" : "assistant",
        role: role,
        content: content,
        toolCalls: nil,
        uiComponents: nil,
        attachments: nil,
        date: "2026-03-21",
        createdAt: "2026-03-21T08:00:00Z",
        updatedAt: "2026-03-21T08:00:00Z"
    )
}

// MARK: - ChatViewModelTests

@Suite("ChatViewModel", .serialized)
struct ChatViewModelTests {

    // MARK: - sendMessage happy path

    @Test("sendMessage: text deltas accumulate and produce assistant message on done")
    func sendMessageHappyPath() async throws {
        let mock = MockChatService()
        mock.sendMessageHandler = { _, _ in
            makeStream(events: [
                .textDelta("Hello"),
                .textDelta(", world"),
                .done
            ])
        }
        let vm = await ChatViewModel(chatService: mock)

        await vm.sendMessage(content: "Hi")

        // Stream is synchronous (all events yielded before finish), but the
        // ViewModel processes them inside a Task. Wait for it to drain.
        try await Task.sleep(for: .milliseconds(100))

        let messages = await vm.messages
        #expect(messages.count == 2)
        #expect(messages[0].role == .user)
        #expect(messages[0].content == "Hi")
        #expect(messages[1].role == .assistant)
        #expect(messages[1].content == "Hello, world")

        let isLoading = await vm.isLoading
        let isStreaming = await vm.isStreaming
        let streamingContent = await vm.streamingContent
        #expect(isLoading == false)
        #expect(isStreaming == false)
        #expect(streamingContent == "")
    }

    // MARK: - sendMessage with uiComponents

    @Test("sendMessage: uiComponents event attached to final assistant message")
    func sendMessageWithUIComponents() async throws {
        let component = UIComponent(
            type: .macroSummary,
            props: .macroSummary(MacroSummaryProps(
                calories: 500, protein: 30, carb: 50, fat: 15, goals: nil
            ))
        )
        let mock = MockChatService()
        mock.sendMessageHandler = { _, _ in
            makeStream(events: [
                .textDelta("Here is your data:"),
                .uiComponents([component]),
                .done
            ])
        }
        let vm = await ChatViewModel(chatService: mock)

        await vm.sendMessage(content: "Show macros")
        try await Task.sleep(for: .milliseconds(100))

        let messages = await vm.messages
        #expect(messages.count == 2)
        let assistant = messages[1]
        #expect(assistant.role == .assistant)
        #expect(assistant.content == "Here is your data:")
        #expect(assistant.uiComponents?.count == 1)
        if case .macroSummary(let props) = assistant.uiComponents?.first?.props {
            #expect(props.calories == 500)
            #expect(props.protein == 30)
        } else {
            Issue.record("Expected macroSummary UIComponent props")
        }

        let streamingComponents = await vm.streamingComponents
        #expect(streamingComponents == nil)
    }

    // MARK: - sendMessage error path

    @Test("sendMessage: error event appends error message and sets errorMessage")
    func sendMessageErrorPath() async throws {
        struct TestError: LocalizedError {
            var errorDescription: String? { "Something went wrong" }
        }
        let mock = MockChatService()
        mock.sendMessageHandler = { _, _ in
            makeStream(events: [
                .error(TestError())
            ])
        }
        let vm = await ChatViewModel(chatService: mock)

        await vm.sendMessage(content: "Ping")
        try await Task.sleep(for: .milliseconds(100))

        let messages = await vm.messages
        #expect(messages.count == 2)
        #expect(messages[0].role == .user)
        #expect(messages[1].role == .assistant)
        #expect(messages[1].content == "Something went wrong")

        let errorMessage = await vm.errorMessage
        #expect(errorMessage == "Something went wrong")

        let isLoading = await vm.isLoading
        let isStreaming = await vm.isStreaming
        #expect(isLoading == false)
        #expect(isStreaming == false)
    }

    // MARK: - sendMessage zero-length delta

    @Test("sendMessage: zero-length delta accumulates without crash")
    func sendMessageZeroLengthDelta() async throws {
        let mock = MockChatService()
        mock.sendMessageHandler = { _, _ in
            makeStream(events: [
                .textDelta(""),
                .textDelta("content"),
                .done
            ])
        }
        let vm = await ChatViewModel(chatService: mock)

        await vm.sendMessage(content: "Test")
        try await Task.sleep(for: .milliseconds(100))

        let messages = await vm.messages
        #expect(messages.count == 2)
        #expect(messages[1].content == "content")
    }

    // MARK: - sendMessage done with no text produces nil content

    @Test("sendMessage: done with no text deltas produces nil content assistant message")
    func sendMessageNoTextDelta() async throws {
        let mock = MockChatService()
        mock.sendMessageHandler = { _, _ in
            makeStream(events: [.done])
        }
        let vm = await ChatViewModel(chatService: mock)

        await vm.sendMessage(content: "Silent")
        try await Task.sleep(for: .milliseconds(100))

        let messages = await vm.messages
        #expect(messages.count == 2)
        // streamingContent was empty, so content is nil
        #expect(messages[1].content == nil)
    }

    // MARK: - isLoading / isStreaming state transitions

    @Test("sendMessage: isLoading set to true immediately, then false after done")
    func sendMessageLoadingState() async throws {
        let (stream, continuation) = AsyncStream<ChatEvent>.makeStream()
        let mock = MockChatService()
        mock.sendMessageHandler = { _, _ in stream }

        let vm = await ChatViewModel(chatService: mock)

        // Start send (don't await — it runs a Task internally)
        let sendTask = Task { await vm.sendMessage(content: "Hello") }
        // Give time for sendMessage to set isLoading = true
        try await Task.sleep(for: .milliseconds(20))

        let isLoadingMid = await vm.isLoading
        #expect(isLoadingMid == true)

        // Emit delta — isLoading becomes false, isStreaming true
        continuation.yield(.textDelta("Hi"))
        try await Task.sleep(for: .milliseconds(20))

        let isStreamingMid = await vm.isStreaming
        let isLoadingAfterDelta = await vm.isLoading
        #expect(isStreamingMid == true)
        #expect(isLoadingAfterDelta == false)

        // Finish stream
        continuation.yield(.done)
        continuation.finish()
        try await Task.sleep(for: .milliseconds(50))

        let isStreamingEnd = await vm.isStreaming
        let isLoadingEnd = await vm.isLoading
        #expect(isStreamingEnd == false)
        #expect(isLoadingEnd == false)

        await sendTask.value
    }

    // MARK: - send while streaming (cancels previous)

    @Test("sendMessage: second call while first is running appends second user message")
    func sendWhileStreaming() async throws {
        // First stream: stalls (no done emitted)
        let (stream1, _) = AsyncStream<ChatEvent>.makeStream()
        // Second stream: completes immediately
        let mock = MockChatService()
        var callCount = 0
        mock.sendMessageHandler = { _, _ in
            callCount += 1
            if callCount == 1 {
                return stream1
            } else {
                return makeStream(events: [.textDelta("Second response"), .done])
            }
        }

        let vm = await ChatViewModel(chatService: mock)

        let t1 = Task { await vm.sendMessage(content: "First") }
        try await Task.sleep(for: .milliseconds(30))

        // Send second message (cancels first stream internally)
        await vm.sendMessage(content: "Second")
        try await Task.sleep(for: .milliseconds(100))

        await t1.value

        let messages = await vm.messages
        let userMessages = messages.filter { $0.role == .user }
        #expect(userMessages.count == 2)
        #expect(userMessages[0].content == "First")
        #expect(userMessages[1].content == "Second")

        // Second response should be committed
        let assistantMessages = messages.filter { $0.role == .assistant }
        #expect(assistantMessages.last?.content == "Second response")
    }

    // MARK: - retryLast happy path

    @Test("retryLast: removes last assistant message and re-sends last user content")
    func retryLastHappyPath() async throws {
        let mock = MockChatService()
        var callCount = 0
        mock.sendMessageHandler = { _, _ in
            callCount += 1
            if callCount == 1 {
                return makeStream(events: [.textDelta("Original"), .done])
            } else {
                return makeStream(events: [.textDelta("Retry response"), .done])
            }
        }

        let vm = await ChatViewModel(chatService: mock)

        // First send
        await vm.sendMessage(content: "Hello")
        try await Task.sleep(for: .milliseconds(100))

        var messages = await vm.messages
        #expect(messages.count == 2)
        #expect(messages[1].content == "Original")

        // Retry
        await vm.retryLast()
        try await Task.sleep(for: .milliseconds(150))

        messages = await vm.messages
        // After retry: original user "Hello" removed last assistant, then sendMessage appends
        // a new user "Hello" + new assistant "Retry response" = 3 messages total
        // [user("Hello"), user("Hello"), assistant("Retry response")]
        #expect(messages.count == 3)
        #expect(messages[0].role == .user)
        #expect(messages[1].role == .user)
        #expect(messages[1].content == "Hello")
        #expect(messages[2].content == "Retry response")
        #expect(mock.sendMessageCallCount == 2)
        #expect(mock.lastSentContent == "Hello")
    }

    // MARK: - retryLast guard: empty messages

    @Test("retryLast: does nothing when messages is empty")
    func retryLastEmpty() async {
        let mock = MockChatService()
        let vm = await ChatViewModel(chatService: mock)

        await vm.retryLast()

        let messages = await vm.messages
        #expect(messages.isEmpty)
        #expect(mock.sendMessageCallCount == 0)
    }

    // MARK: - retryLast guard: single message

    @Test("retryLast: does nothing when only one message (count < 2)")
    func retryLastSingleMessage() async throws {
        let mock = MockChatService()
        // Stream that never completes so messages stays as [user]
        let (stalled, _) = AsyncStream<ChatEvent>.makeStream()
        mock.sendMessageHandler = { _, _ in stalled }

        let vm = await ChatViewModel(chatService: mock)

        let t = Task { await vm.sendMessage(content: "Solo") }
        try await Task.sleep(for: .milliseconds(50))

        // At this point: messages = [user], stream is stalled
        let msgs = await vm.messages
        #expect(msgs.count == 1)

        // retryLast guard: count >= 2 fails → no-op
        await vm.retryLast()

        let msgsAfter = await vm.messages
        #expect(msgsAfter.count == 1)
        // sendMessage was called once (for "Solo"), not again for retry
        #expect(mock.sendMessageCallCount == 1)

        t.cancel()
    }

    // MARK: - retryLast guard: last is user

    @Test("retryLast: does nothing when last message is user role")
    func retryLastLastIsUser() async throws {
        let mock = MockChatService()
        // First send completes (2 messages: user + assistant)
        // Second send stalls (user is now last appended immediately)
        var callIndex = 0
        let (stalled, _) = AsyncStream<ChatEvent>.makeStream()
        mock.sendMessageHandler = { _, _ in
            callIndex += 1
            if callIndex == 1 {
                return makeStream(events: [.textDelta("Response"), .done])
            } else {
                return stalled
            }
        }

        let vm = await ChatViewModel(chatService: mock)

        await vm.sendMessage(content: "First")
        try await Task.sleep(for: .milliseconds(100))

        // Start second send (user msg appended immediately, stalls before done)
        let t2 = Task { await vm.sendMessage(content: "Second") }
        try await Task.sleep(for: .milliseconds(30))

        // messages should end with the second user message
        let msgs = await vm.messages
        let lastRole = msgs.last?.role
        #expect(lastRole == .user)

        let countBefore = msgs.count

        // retryLast guard: last?.role == .assistant fails → no-op
        await vm.retryLast()

        let countAfter = await vm.messages.count
        #expect(countAfter == countBefore)

        t2.cancel()
    }

    // MARK: - retryLast guard: isStreaming

    @Test("retryLast: does nothing while isStreaming is true")
    func retryLastWhileStreaming() async throws {
        let mock = MockChatService()
        // First send: get to streaming state (textDelta received, no done)
        let (stream1, cont1) = AsyncStream<ChatEvent>.makeStream()
        // Second send: completes (for after we stop streaming)
        var callIdx = 0
        mock.sendMessageHandler = { _, _ in
            callIdx += 1
            if callIdx == 1 {
                return stream1
            }
            return makeStream(events: [.done])
        }

        let vm = await ChatViewModel(chatService: mock)

        // Start streaming
        let t = Task { await vm.sendMessage(content: "Hello") }
        cont1.yield(.textDelta("Streaming..."))
        try await Task.sleep(for: .milliseconds(50))

        let isStreaming = await vm.isStreaming
        #expect(isStreaming == true)

        let countBefore = await vm.messages.count

        // retryLast guard: isStreaming → no-op
        await vm.retryLast()

        let countAfter = await vm.messages.count
        #expect(countAfter == countBefore)
        // sendMessage was called once (the initial), not again for retry
        #expect(mock.sendMessageCallCount == 1)

        cont1.finish()
        try await Task.sleep(for: .milliseconds(50))
        await t.value
    }

    // MARK: - loadHistory success

    @Test("loadHistory: sets messages from service response")
    func loadHistorySuccess() async throws {
        let expected = [
            makeChatMessage(id: "msg-1", role: .user, content: "What did I eat?"),
            makeChatMessage(id: "msg-2", role: .assistant, content: "You had oatmeal.")
        ]
        let mock = MockChatService()
        mock.loadMessagesResult = .success(expected)
        let vm = await ChatViewModel(chatService: mock)

        await vm.loadHistory(date: Date())

        let messages = await vm.messages
        #expect(messages.count == 2)
        #expect(messages[0].id == "msg-1")
        #expect(messages[0].role == .user)
        #expect(messages[1].id == "msg-2")
        #expect(messages[1].content == "You had oatmeal.")

        let isLoading = await vm.isLoading
        #expect(isLoading == false)

        let errorMessage = await vm.errorMessage
        #expect(errorMessage == nil)
    }

    // MARK: - loadHistory error

    @Test("loadHistory: sets errorMessage on failure")
    func loadHistoryError() async throws {
        struct HistoryError: LocalizedError {
            var errorDescription: String? { "Failed to load history" }
        }
        let mock = MockChatService()
        mock.loadMessagesResult = .failure(HistoryError())
        let vm = await ChatViewModel(chatService: mock)

        await vm.loadHistory(date: Date())

        let errorMessage = await vm.errorMessage
        #expect(errorMessage == "Failed to load history")

        let isLoading = await vm.isLoading
        #expect(isLoading == false)

        let messages = await vm.messages
        #expect(messages.isEmpty)
    }
}
