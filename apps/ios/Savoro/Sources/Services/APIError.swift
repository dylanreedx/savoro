import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case notFound
    case serverError(statusCode: Int)
    case networkError(underlying: Error)
    case decodingError(underlying: Error)
    case encodingError(underlying: Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Your session has expired. Please sign in again."
        case .notFound:
            return "The requested resource could not be found."
        case .serverError(let statusCode):
            return "A server error occurred (HTTP \(statusCode)). Please try again later."
        case .networkError(let underlying):
            return "A network error occurred: \(underlying.localizedDescription)"
        case .decodingError(let underlying):
            return "Failed to process the server response: \(underlying.localizedDescription)"
        case .encodingError(let underlying):
            return "Failed to encode the request: \(underlying.localizedDescription)"
        }
    }
}
