import Foundation

// MARK: - ChatServiceProtocol

protocol ChatServiceProtocol: Sendable {
    func sendMessage(content: String, attachments: [ChatAttachment]?) -> AsyncStream<ChatEvent>
    func loadMessages(date: Date) async throws -> [ChatMessage]
}

// MARK: - ChatService

/// Handles chat messaging (SSE streaming + JSON smart-route) and history loading.
/// Stateless struct — each call is self-contained. The `AsyncStream` manages its own lifetime.
struct ChatService: ChatServiceProtocol {
    let apiClient: APIClient

    private static let timeoutSeconds: TimeInterval = 30

    // MARK: - Send Message

    /// Send a chat message and receive a stream of `ChatEvent`s.
    ///
    /// The server may respond with either:
    /// 1. **SSE stream** (`text/event-stream`) — events arrive incrementally
    /// 2. **JSON** (`application/json`) — single smart-routed response
    ///
    /// Both modes are unified into one `AsyncStream<ChatEvent>`.
    func sendMessage(
        content: String,
        attachments: [ChatAttachment]? = nil
    ) -> AsyncStream<ChatEvent> {
        AsyncStream { continuation in
            let task = Task {
                do {
                    let urlRequest = try await apiClient.buildStreamingRequest(
                        "/chat/message",
                        method: .post,
                        body: SendMessageBody(content: content, attachments: attachments),
                        timeoutInterval: Self.timeoutSeconds
                    )

                    let (response, bytes) = try await apiClient.streamingRequest(urlRequest)

                    let contentType = (response as? HTTPURLResponse)?
                        .value(forHTTPHeaderField: "Content-Type") ?? ""

                    if contentType.contains("application/json") {
                        try await handleJSONResponse(bytes: bytes, continuation: continuation)
                    } else {
                        await handleSSEStream(bytes: bytes, continuation: continuation)
                    }
                } catch {
                    continuation.yield(.error(error))
                    continuation.finish()
                }
            }

            // Watchdog: cancel if the stream stalls beyond timeout
            let watchdog = Task {
                try? await Task.sleep(for: .seconds(Self.timeoutSeconds))
                if !Task.isCancelled {
                    continuation.yield(.error(ChatServiceError.timeout))
                    continuation.finish()
                    task.cancel()
                }
            }

            continuation.onTermination = { _ in
                task.cancel()
                watchdog.cancel()
            }
        }
    }

    // MARK: - Load History

    /// Fetch chat messages for a given date.
    func loadMessages(date: Date) async throws -> [ChatMessage] {
        let dateString = Self.dateFormatter.string(from: date)
        let response: ChatHistoryResponse = try await apiClient.request(
            "/chat/messages?date=\(dateString)"
        )
        return response.messages
    }

    // MARK: - Private: JSON Smart-Route Handler

    private func handleJSONResponse(
        bytes: URLSession.AsyncBytes,
        continuation: AsyncStream<ChatEvent>.Continuation
    ) async throws {
        var data = Data()
        for try await byte in bytes {
            data.append(byte)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let response = try decoder.decode(SmartRouteResponse.self, from: data)

        // Emit text from the last assistant message
        if let assistant = response.messages.last(where: { $0.role == .assistant }),
           let text = assistant.content {
            continuation.yield(.textDelta(text))
        }

        // Emit UI components if present
        if let components = response.uiComponents, !components.isEmpty {
            continuation.yield(.uiComponents(components))
        }

        continuation.yield(.done)
        continuation.finish()
    }

    // MARK: - Private: SSE Stream Handler

    private func handleSSEStream(
        bytes: URLSession.AsyncBytes,
        continuation: AsyncStream<ChatEvent>.Continuation
    ) async {
        var parser = SSEParser()
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        do {
            for try await line in bytes.lines {
                let events = parser.feed(line)
                for event in events {
                    if let chatEvent = Self.mapSSEEvent(event, decoder: decoder) {
                        continuation.yield(chatEvent)
                        if case .done = chatEvent {
                            continuation.finish()
                            return
                        }
                    }
                }
            }

            // Stream ended — flush any remaining buffered event
            for event in parser.flush() {
                if let chatEvent = Self.mapSSEEvent(event, decoder: decoder) {
                    continuation.yield(chatEvent)
                }
            }

            continuation.finish()
        } catch {
            continuation.yield(.error(error))
            continuation.finish()
        }
    }

    // MARK: - Private: SSE Event Mapping

    private static func mapSSEEvent(_ event: SSEEvent, decoder: JSONDecoder) -> ChatEvent? {
        switch event.eventType {
        case "text-delta":
            // data: {"delta":"..."}
            if let json = event.data.data(using: .utf8),
               let payload = try? decoder.decode(TextDeltaPayload.self, from: json) {
                return .textDelta(payload.delta)
            }
            // Fallback: treat raw data as text
            return .textDelta(event.data)

        case "tool-calls":
            if let json = event.data.data(using: .utf8),
               let payload = try? decoder.decode([String: AnyCodable].self, from: json) {
                return .toolCalls(payload)
            }
            return nil

        case "ui-components":
            if let json = event.data.data(using: .utf8),
               let components = try? decoder.decode([UIComponent].self, from: json) {
                return .uiComponents(components)
            }
            return nil

        case "done":
            return .done

        default:
            return nil
        }
    }

    // MARK: - Date Formatter

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        return f
    }()
}

// MARK: - Request Body

private struct SendMessageBody: Encodable {
    let content: String
    let attachments: [ChatAttachment]?
}

// MARK: - SSE Payload Types

private struct TextDeltaPayload: Decodable {
    let delta: String
}

// MARK: - ChatServiceError

enum ChatServiceError: Error, LocalizedError {
    case timeout

    var errorDescription: String? {
        switch self {
        case .timeout:
            return "The assistant is taking too long. Tap retry to try again."
        }
    }
}
