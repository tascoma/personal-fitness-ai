import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var summary: SummaryStats?
    @Published var relativeStrength: RelativeStrength?
    @Published var recentPRs: [RecentPR] = []
    @Published var dashboard: DashboardResponse?
    @Published var mainLifts: [RelativeStrengthLift] = []
    @Published var series: [Int: [E1RMPoint]] = [:]
    @Published var isLoading = false
    @Published var errorMessage: String?

    /// The four headline barbell lifts, shown as their own cards in fixed order.
    private static let mainLiftNames = ["Squat", "Bench Press", "Deadlift", "Overhead Press"]

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            // Deterministic data first so the dashboard renders even if the AI call is slow.
            async let summary: SummaryStats = client.get("/api/analytics/summary")
            async let rs: RelativeStrength = client.get("/api/analytics/relative-strength")
            async let prs: [RecentPR] = client.get("/api/analytics/recent-prs?limit=5")
            self.summary = try await summary
            self.relativeStrength = try await rs
            self.recentPRs = try await prs
            resolveMainLifts()
        } catch {
            errorMessage = error.localizedDescription
        }
        // AI dashboard is best-effort — failure shouldn't blank the KPIs.
        dashboard = try? await client.get("/api/ai/dashboard")
    }

    /// Pick the four headline lifts (in fixed order) from relative-strength and
    /// fetch each one's e1RM history for the card sparkline + trend.
    private func resolveMainLifts() {
        let lifts = relativeStrength?.lifts ?? []
        mainLifts = Self.mainLiftNames.compactMap { name in
            lifts.first { $0.exerciseName == name }
        }
        for lift in mainLifts {
            Task { [weak self] in
                if let points: [E1RMPoint] = try? await self?.client.get(
                    "/api/analytics/e1rm?exercise_id=\(lift.exerciseId)"
                ) {
                    self?.series[lift.exerciseId] = points
                }
            }
        }
    }

    /// The strongest lift by bodyweight ratio, for the relative-strength KPI.
    var topLift: RelativeStrengthLift? {
        relativeStrength?.lifts
            .filter { $0.ratio != nil }
            .max { ($0.ratio ?? 0) < ($1.ratio ?? 0) }
    }

    var weekOverWeekPercent: Double? {
        guard let s = summary, s.lastWeekTonnage > 0 else { return nil }
        return (s.thisWeekTonnage - s.lastWeekTonnage) / s.lastWeekTonnage * 100
    }
}
