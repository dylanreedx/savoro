import Foundation

enum Constants {
    #if DEBUG
    static let baseURL = "http://localhost:3001"
    #else
    static let baseURL = "https://api.savoro.app"
    #endif
}
