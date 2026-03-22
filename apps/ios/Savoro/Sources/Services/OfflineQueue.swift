import Foundation

// MARK: - QueuedLogEntry

struct QueuedLogEntry: Codable, Sendable {
    let id: UUID
    let enqueuedAt: Date
    let request: LogFoodRequest
}

// MARK: - OfflineQueue

final class OfflineQueue {

    static let defaultsKey = "savoro.offlineQueue"

    private let defaults: UserDefaults
    private let logService: any LogServiceProtocol

    init(defaults: UserDefaults = .standard, logService: any LogServiceProtocol) {
        self.defaults = defaults
        self.logService = logService
    }

    // MARK: - Enqueue

    func enqueue(_ request: LogFoodRequest) {
        var queue = loadQueue()
        let entry = QueuedLogEntry(id: UUID(), enqueuedAt: Date(), request: request)
        queue.append(entry)
        save(queue)
    }

    // MARK: - Load

    func loadQueue() -> [QueuedLogEntry] {
        guard let data = defaults.data(forKey: Self.defaultsKey) else { return [] }
        return (try? JSONDecoder().decode([QueuedLogEntry].self, from: data)) ?? []
    }

    // MARK: - Flush

    func flush() async {
        var queue = loadQueue()

        while !queue.isEmpty {
            let entry = queue[0]
            do {
                _ = try await logService.logFood(entry.request)
                queue.removeFirst()
                save(queue)
            } catch {
                // Stop processing on first failure; keep this and all remaining items.
                break
            }
        }
    }

    // MARK: - Private

    private func save(_ queue: [QueuedLogEntry]) {
        if let data = try? JSONEncoder().encode(queue) {
            defaults.set(data, forKey: Self.defaultsKey)
        }
    }
}
