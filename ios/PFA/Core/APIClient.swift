import Foundation

/// Error surfaced from the API. Carries the HTTP status and a human-readable
/// message (decoded from FastAPI's `{"detail": ...}` body when present).
struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}

/// Lightweight `URLSession` wrapper. All network calls go through here — no raw
/// `URLSession` use in views or view models. The backend speaks snake_case JSON;
/// the shared coders translate to/from Swift's camelCase.
struct APIClient {
    private let base: URL
    private let session: URLSession

    init(base: URL = Config.apiBaseURL, session: URLSession = .shared) {
        self.base = base
        self.session = session
    }

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    // MARK: - Requests

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await send(makeRequest(path, method: "GET"))
    }

    func post<Body: Encodable, Response: Decodable>(_ path: String, body: Body) async throws -> Response {
        var req = makeRequest(path, method: "POST")
        req.httpBody = try Self.encoder.encode(body)
        return try await send(req)
    }

    func patch<Body: Encodable, Response: Decodable>(_ path: String, body: Body) async throws -> Response {
        var req = makeRequest(path, method: "PATCH")
        req.httpBody = try Self.encoder.encode(body)
        return try await send(req)
    }

    func delete(_ path: String) async throws {
        _ = try await sendRaw(makeRequest(path, method: "DELETE"))
    }

    // MARK: - Internals

    private func makeRequest(_ path: String, method: String) -> URLRequest {
        // Paths are passed as "/api/...". Resolve against the base URL.
        let url = URL(string: path, relativeTo: base) ?? base.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        return req
    }

    @discardableResult
    private func sendRaw(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(status: -1, message: "Invalid response")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError(status: http.statusCode, message: Self.detailMessage(from: data, status: http.statusCode))
        }
        return data
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data = try await sendRaw(request)
        do {
            return try Self.decoder.decode(T.self, from: data)
        } catch {
            throw APIError(status: -2, message: "Failed to decode \(T.self): \(error)")
        }
    }

    /// FastAPI returns errors as `{"detail": "..."}` or `{"detail": [{"msg": ...}]}`.
    private static func detailMessage(from data: Data, status: Int) -> String {
        if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let detail = obj["detail"] {
            if let s = detail as? String { return s }
            if let arr = detail as? [[String: Any]], let first = arr.first,
               let msg = first["msg"] as? String { return msg }
        }
        return "Request failed (HTTP \(status))"
    }
}
