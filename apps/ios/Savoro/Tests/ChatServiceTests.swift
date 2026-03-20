import Testing
import Foundation
@testable import Savoro

// MARK: - SSEParser Tests

@Suite("SSEParser")
struct SSEParserTests {

    @Test("basic event: event + data + blank line emits one event")
    func basicEvent() {
        var parser = SSEParser()
        #expect(parser.feed("event: text-delta").isEmpty)
        #expect(parser.feed("data: {\"delta\":\"hello\"}").isEmpty)
        let events = parser.feed("")
        #expect(events.count == 1)
        #expect(events[0].eventType == "text-delta")
        #expect(events[0].data == "{\"delta\":\"hello\"}")
    }

    @Test("multiple events in sequence")
    func multipleEvents() {
        var parser = SSEParser()
        _ = parser.feed("event: text-delta")
        _ = parser.feed("data: {\"delta\":\"a\"}")
        let first = parser.feed("")
        #expect(first.count == 1)
        #expect(first[0].eventType == "text-delta")

        _ = parser.feed("event: done")
        _ = parser.feed("data: {}")
        let second = parser.feed("")
        #expect(second.count == 1)
        #expect(second[0].eventType == "done")
    }

    @Test("ignores SSE comments (lines starting with ':')")
    func comments() {
        var parser = SSEParser()
        #expect(parser.feed(": this is a comment").isEmpty)
        _ = parser.feed("event: text-delta")
        _ = parser.feed(": another comment")
        _ = parser.feed("data: hello")
        let events = parser.feed("")
        #expect(events.count == 1)
        #expect(events[0].data == "hello")
    }

    @Test("blank line without prior fields emits nothing")
    func blankWithoutFields() {
        var parser = SSEParser()
        let events = parser.feed("")
        #expect(events.isEmpty)
    }

    @Test("multi-line data joined with newline")
    func multiLineData() {
        var parser = SSEParser()
        _ = parser.feed("event: text-delta")
        _ = parser.feed("data: line one")
        _ = parser.feed("data: line two")
        let events = parser.feed("")
        #expect(events.count == 1)
        #expect(events[0].data == "line one\nline two")
    }

    @Test("handles optional space after colon")
    func optionalSpace() {
        var parser = SSEParser()
        _ = parser.feed("event:text-delta")
        _ = parser.feed("data:no-space")
        let events = parser.feed("")
        #expect(events.count == 1)
        #expect(events[0].eventType == "text-delta")
        #expect(events[0].data == "no-space")
    }

    @Test("flush emits buffered event at end-of-stream")
    func flushEmitsBuffered() {
        var parser = SSEParser()
        _ = parser.feed("event: done")
        _ = parser.feed("data: {}")
        let events = parser.flush()
        #expect(events.count == 1)
        #expect(events[0].eventType == "done")
    }

    @Test("flush with no buffered data returns empty")
    func flushEmpty() {
        var parser = SSEParser()
        #expect(parser.flush().isEmpty)
    }

    @Test("data-only without event type is not emitted")
    func dataOnlyNoEvent() {
        var parser = SSEParser()
        _ = parser.feed("data: orphaned data")
        let events = parser.feed("")
        #expect(events.isEmpty)
    }

    @Test("ui-components event type parsed correctly")
    func uiComponentsEvent() {
        var parser = SSEParser()
        _ = parser.feed("event: ui-components")
        _ = parser.feed("data: [{\"type\":\"food_card\",\"props\":{}}]")
        let events = parser.feed("")
        #expect(events.count == 1)
        #expect(events[0].eventType == "ui-components")
    }

    @Test("consecutive blank lines do not emit duplicate events")
    func consecutiveBlanks() {
        var parser = SSEParser()
        _ = parser.feed("event: text-delta")
        _ = parser.feed("data: hello")
        let first = parser.feed("")
        #expect(first.count == 1)
        let second = parser.feed("")
        #expect(second.isEmpty)
    }
}

// MARK: - ChatHistoryResponse Tests

@Suite("ChatHistoryResponse")
struct ChatHistoryResponseTests {

    @Test("decodes from JSON with snake_case keys")
    func decodesSnakeCase() throws {
        let json = """
        {
            "messages": [
                {
                    "id": "msg_123",
                    "user_id": "user_1",
                    "role": "assistant",
                    "content": "Hello there!",
                    "date": "2026-03-20",
                    "created_at": "2026-03-20T10:00:00Z",
                    "updated_at": "2026-03-20T10:00:00Z"
                }
            ]
        }
        """.data(using: .utf8)!

        // ChatMessage has explicit CodingKeys with raw snake_case values,
        // so the default decoder (no key strategy) is correct.
        let decoder = JSONDecoder()
        let response = try decoder.decode(ChatHistoryResponse.self, from: json)

        #expect(response.messages.count == 1)
        #expect(response.messages[0].id == "msg_123")
        #expect(response.messages[0].role == .assistant)
        #expect(response.messages[0].content == "Hello there!")
    }
}
