import Testing
import Foundation
@testable import Savoro

// MARK: - Mock

private final class MockLogService: LogServiceProtocol {
    var callCount = 0
    var failAtCallIndex: Int? = nil
    var stubbedResponse: LogFoodResponse = LogFoodResponse(log: LoggedEntry(
        id: "mock-id",
        foodId: "food-1",
        foodName: nil,
        servingId: nil,
        servingDescription: nil,
        quantity: 1,
        meal: .breakfast,
        date: "2026-03-22",
        calories: 100,
        protein: 10,
        carb: 10,
        fat: 5
    ))

    func logFood(_ request: LogFoodRequest) async throws -> LogFoodResponse {
        let index = callCount
        callCount += 1
        if let failIndex = failAtCallIndex, index == failIndex {
            throw URLError(.notConnectedToInternet)
        }
        return stubbedResponse
    }
}

// MARK: - Helper

private func makeDefaults() -> UserDefaults {
    let suiteName = "test.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suiteName)!
    defaults.removePersistentDomain(forName: suiteName)
    return defaults
}

private func makeRequest(foodId: String = "food-1") -> LogFoodRequest {
    LogFoodRequest(foodId: foodId, servingId: "srv-1", quantity: 1)
}

// MARK: - Tests

@Suite("OfflineQueue", .serialized)
struct OfflineQueueTests {

    @Test("enqueueStoresItems — enqueue 3 items, loadQueue returns 3 in order")
    func enqueueStoresItems() {
        let defaults = makeDefaults()
        let service = MockLogService()
        let queue = OfflineQueue(defaults: defaults, logService: service)

        queue.enqueue(makeRequest(foodId: "food-a"))
        queue.enqueue(makeRequest(foodId: "food-b"))
        queue.enqueue(makeRequest(foodId: "food-c"))

        let items = queue.loadQueue()
        #expect(items.count == 3)
        #expect(items[0].request.foodId == "food-a")
        #expect(items[1].request.foodId == "food-b")
        #expect(items[2].request.foodId == "food-c")
    }

    @Test("flushSuccessClears — enqueue 3, mock succeeds all, queue is empty after flush")
    func flushSuccessClears() async {
        let defaults = makeDefaults()
        let service = MockLogService()
        let queue = OfflineQueue(defaults: defaults, logService: service)

        queue.enqueue(makeRequest(foodId: "food-a"))
        queue.enqueue(makeRequest(foodId: "food-b"))
        queue.enqueue(makeRequest(foodId: "food-c"))

        await queue.flush()

        #expect(queue.loadQueue().isEmpty)
        #expect(service.callCount == 3)
    }

    @Test("flushPartialFailureKeepsRemaining — enqueue 3, mock fails index 1, items 2+3 remain")
    func flushPartialFailureKeepsRemaining() async {
        let defaults = makeDefaults()
        let service = MockLogService()
        service.failAtCallIndex = 1
        let queue = OfflineQueue(defaults: defaults, logService: service)

        queue.enqueue(makeRequest(foodId: "food-a"))
        queue.enqueue(makeRequest(foodId: "food-b"))
        queue.enqueue(makeRequest(foodId: "food-c"))

        await queue.flush()

        let remaining = queue.loadQueue()
        #expect(remaining.count == 2)
        #expect(remaining[0].request.foodId == "food-b")
        #expect(remaining[1].request.foodId == "food-c")
    }

    @Test("persistsAcrossRestart — enqueue 2, new instance sees same items with matching IDs")
    func persistsAcrossRestart() {
        let defaults = makeDefaults()
        let service = MockLogService()
        let queue1 = OfflineQueue(defaults: defaults, logService: service)

        queue1.enqueue(makeRequest(foodId: "food-x"))
        queue1.enqueue(makeRequest(foodId: "food-y"))

        let items1 = queue1.loadQueue()

        // Simulate app restart with new instance sharing same UserDefaults
        let queue2 = OfflineQueue(defaults: defaults, logService: service)
        let items2 = queue2.loadQueue()

        #expect(items2.count == 2)
        #expect(items2[0].id == items1[0].id)
        #expect(items2[1].id == items1[1].id)
    }

    @Test("enqueueAppendsToExistingQueue — enqueue 2 then 1 more, all 3 preserved in order")
    func enqueueAppendsToExistingQueue() {
        let defaults = makeDefaults()
        let service = MockLogService()
        let queue = OfflineQueue(defaults: defaults, logService: service)

        queue.enqueue(makeRequest(foodId: "food-1"))
        queue.enqueue(makeRequest(foodId: "food-2"))
        queue.enqueue(makeRequest(foodId: "food-3"))

        let items = queue.loadQueue()
        #expect(items.count == 3)
        #expect(items[0].request.foodId == "food-1")
        #expect(items[1].request.foodId == "food-2")
        #expect(items[2].request.foodId == "food-3")
    }
}
