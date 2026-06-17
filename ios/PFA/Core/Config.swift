import Foundation

/// App-wide configuration. The backend base URL is read from the `API_BASE_URL`
/// scheme environment variable, falling back to the local dev server.
enum Config {
    static var apiBaseURL: URL {
        let raw = ProcessInfo.processInfo.environment["API_BASE_URL"]
            ?? "http://127.0.0.1:8000"
        return URL(string: raw)!
    }
}
