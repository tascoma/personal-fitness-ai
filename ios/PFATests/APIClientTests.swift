import XCTest
@testable import PFA

/// Stubs network responses so APIClient can be tested without a live backend.
final class MockURLProtocol: URLProtocol {
    /// Maps the request's full URL string to (status, body JSON).
    nonisolated(unsafe) static var responses: [String: (Int, Data)] = [:]

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let key = request.url?.absoluteString ?? ""
        let (status, data) = MockURLProtocol.responses[key] ?? (404, Data())
        let response = HTTPURLResponse(
            url: request.url!, statusCode: status,
            httpVersion: nil, headerFields: ["Content-Type": "application/json"]
        )!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

final class APIClientTests: XCTestCase {
    private var client: APIClient!
    private let base = URL(string: "http://test.local")!

    override func setUp() {
        super.setUp()
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        client = APIClient(base: base, session: URLSession(configuration: config))
        MockURLProtocol.responses = [:]
    }

    private func stub(_ path: String, status: Int = 200, json: String) {
        MockURLProtocol.responses[base.absoluteString + path] = (status, Data(json.utf8))
    }

    func testDecodeSummaryStats() async throws {
        stub("/api/analytics/summary", json: """
        {"total_sessions": 42, "total_tonnage": 125000.0, "training_days": 30,
         "current_streak_weeks": 4, "weekly_frequency": 3.5, "this_week_tonnage": 12400.0,
         "last_week_tonnage": 11000.0, "active_pr_count": 6, "sessions_this_week": 3}
        """)
        let s: SummaryStats = try await client.get("/api/analytics/summary")
        XCTAssertEqual(s.totalSessions, 42)
        XCTAssertEqual(s.currentStreakWeeks, 4)
        XCTAssertEqual(s.activePrCount, 6)
        XCTAssertEqual(s.thisWeekTonnage, 12400.0)
    }

    func testDecodeWorkoutSessionWithSets() async throws {
        stub("/api/sessions/7", json: """
        {"id": 7, "date": "2026-06-14", "notes": "good day",
         "sets": [
           {"id": 1, "session_id": 7, "exercise_id": 2, "set_number": 1, "weight": 225.0,
            "reps": 5, "rpe": 8.0, "is_warmup": false, "notes": null,
            "e1rm_epley": 262.5, "e1rm_brzycki": 253.1}
         ]}
        """)
        let session: WorkoutSession = try await client.get("/api/sessions/7")
        XCTAssertEqual(session.id, 7)
        XCTAssertEqual(session.date, "2026-06-14")
        XCTAssertEqual(session.sets.count, 1)
        let set = session.sets[0]
        XCTAssertEqual(set.weight, 225.0)
        XCTAssertEqual(set.e1rmEpley, 262.5)
        XCTAssertEqual(set.e1rmBrzycki, 253.1)
        XCTAssertFalse(set.isWarmup)
    }

    func testDecodeDashboardResponse() async throws {
        stub("/api/ai/dashboard", json: """
        {"ai_generated": true, "cached": false, "model": "claude-haiku-4-5-20251001",
         "insight": {"headline": "Strong week",
                     "highlights": ["Bench up 5lb", "Squat PR"],
                     "watch_items": ["Deadlift volume dipping"]}}
        """)
        let dash: DashboardResponse = try await client.get("/api/ai/dashboard")
        XCTAssertTrue(dash.aiGenerated)
        XCTAssertEqual(dash.insight.headline, "Strong week")
        XCTAssertEqual(dash.insight.highlights.count, 2)
        XCTAssertEqual(dash.insight.watchItems.first, "Deadlift volume dipping")
    }

    func testErrorMapsDetailMessage() async {
        stub("/api/sessions/999", status: 404, json: #"{"detail": "Session not found"}"#)
        do {
            let _: WorkoutSession = try await client.get("/api/sessions/999")
            XCTFail("Expected APIError")
        } catch let error as APIError {
            XCTAssertEqual(error.status, 404)
            XCTAssertEqual(error.message, "Session not found")
        } catch {
            XCTFail("Expected APIError, got \(error)")
        }
    }
}

final class FormatTests: XCTestCase {
    func testWeightConversion() {
        XCTAssertEqual(Format.weight(225, unit: "lbs"), "225 lbs")
        // 225 lbs ≈ 102.1 kg
        XCTAssertEqual(Format.weightValue(225, unit: "kg"), 225 / 2.2046226218, accuracy: 0.01)
    }

    func testRoundTripToLbs() {
        let lbs = Format.weightToLbs(Format.weightValue(225, unit: "kg"), unit: "kg")
        XCTAssertEqual(lbs, 225, accuracy: 0.001)
    }

    func testPrettyDate() {
        XCTAssertEqual(Format.prettyDate("2026-06-14"), "Sun, Jun 14")
    }
}
