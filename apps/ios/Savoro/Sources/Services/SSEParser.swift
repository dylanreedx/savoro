import Foundation

// MARK: - SSEEvent

/// A single Server-Sent Event parsed from the stream.
struct SSEEvent: Sendable {
    var eventType: String
    var data: String
}

// MARK: - SSEParser

/// Accumulates lines from an SSE byte stream and emits complete events
/// on blank-line boundaries per the SSE specification.
struct SSEParser {
    private var currentEventType: String = ""
    private var currentData: String = ""
    private var hasFields = false

    /// Feed a single line (without trailing newline) and return any completed events.
    /// An empty line signals the end of the current event block.
    mutating func feed(_ line: String) -> [SSEEvent] {
        // Blank line = dispatch event
        if line.isEmpty {
            guard hasFields, !currentEventType.isEmpty else {
                reset()
                return []
            }
            let event = SSEEvent(eventType: currentEventType, data: currentData)
            reset()
            return [event]
        }

        // Skip SSE comments (lines starting with ':')
        if line.hasPrefix(":") {
            return []
        }

        // Parse field: value
        if line.hasPrefix("event:") {
            currentEventType = extractValue(from: line, prefix: "event:")
            hasFields = true
        } else if line.hasPrefix("data:") {
            let value = extractValue(from: line, prefix: "data:")
            if currentData.isEmpty {
                currentData = value
            } else {
                // Multi-line data: join with newline per SSE spec
                currentData += "\n" + value
            }
            hasFields = true
        } else if line.hasPrefix("id:") || line.hasPrefix("retry:") {
            // Consumed but not used for POST streams
            hasFields = true
        }

        return []
    }

    /// Flush any buffered event at end-of-stream (in case stream closes without trailing blank line).
    mutating func flush() -> [SSEEvent] {
        guard hasFields, !currentEventType.isEmpty else {
            reset()
            return []
        }
        let event = SSEEvent(eventType: currentEventType, data: currentData)
        reset()
        return [event]
    }

    // MARK: - Private

    private mutating func reset() {
        currentEventType = ""
        currentData = ""
        hasFields = false
    }

    /// Extract value after "field:" prefix, stripping optional leading space.
    private func extractValue(from line: String, prefix: String) -> String {
        var remainder = String(line.dropFirst(prefix.count))
        if remainder.hasPrefix(" ") {
            remainder = String(remainder.dropFirst())
        }
        return remainder
    }
}
