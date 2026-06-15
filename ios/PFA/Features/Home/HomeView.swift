import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = HomeViewModel(client: APIClient())

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let msg = vm.errorMessage {
                        ErrorBanner(message: msg).card()
                    }
                    kpiGrid
                    if !vm.mainLifts.isEmpty {
                        mainLiftsSection
                    }
                    if let dash = vm.dashboard {
                        StateOfTrainingCard(insight: dash.insight)
                    }
                    if !vm.recentPRs.isEmpty {
                        recentPRsCard
                    }
                }
                .padding(16)
            }
            .background(Theme.bg)
            .navigationTitle("Training")
            .overlay {
                if vm.isLoading && vm.summary == nil {
                    ProgressView().tint(Theme.accent)
                }
            }
            .refreshable { await vm.load() }
            .task(id: appState.dataVersion) { await vm.load() }
        }
    }

    private var kpiGrid: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            if let s = vm.summary {
                StatCard(
                    label: "This Week",
                    value: Format.tonnage(s.thisWeekTonnage, unit: appState.unit),
                    unit: "volume",
                    trend: vm.weekOverWeekPercent
                )
                StatCard(label: "Streak", value: "\(s.currentStreakWeeks)", unit: "weeks current")
                StatCard(
                    label: "Sessions",
                    value: "\(s.sessionsThisWeek)",
                    unit: String(format: "%.1f/wk avg", s.weeklyFrequency)
                )
                if let top = vm.topLift, let ratio = top.ratio {
                    StatCard(
                        label: "Rel. Strength",
                        value: String(format: "%.2f×", ratio),
                        unit: top.tier ?? top.exerciseName,
                        accent: Theme.accent
                    )
                }
                StatCard(label: "All-Time", value: Format.tonnage(s.totalTonnage, unit: appState.unit), unit: "volume")
                StatCard(label: "Active PRs", value: "\(s.activePrCount)", unit: "last 30 days")
            }
        }
    }

    private var mainLiftsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel(text: "Main Lifts")
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(vm.mainLifts) { lift in
                    MainLiftCard(
                        lift: lift,
                        points: vm.series[lift.exerciseId] ?? [],
                        unit: appState.unit
                    )
                }
            }
        }
    }

    private var recentPRsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionLabel(text: "Recent PRs")
            ForEach(vm.recentPRs) { pr in
                HStack {
                    Text(pr.exerciseName)
                        .font(.ui(14, .medium))
                        .foregroundStyle(Theme.textH)
                    Spacer()
                    Text(Format.weight(pr.value, unit: appState.unit))
                        .font(.head(18, .bold))
                        .foregroundStyle(Theme.textH)
                    Pill(text: pr.recordType, variant: pr.recordType == "e1rm" ? .e1rm : .pr)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

/// Compact KPI tile. Mirrors frontend StatCard.tsx.
private struct StatCard: View {
    let label: String
    let value: String
    var unit: String?
    var trend: Double?
    var accent: Color?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionLabel(text: label)
                .padding(.bottom, 8)
            Text(value)
                .font(.head(38, .heavy))
                .foregroundStyle(accent ?? Theme.textH)
            if let unit {
                Text(unit)
                    .font(.ui(11))
                    .foregroundStyle(Theme.textMuted)
                    .padding(.top, 3)
                    .lineLimit(1)
            }
            if let trend {
                Text("\(trend >= 0 ? "↑ +" : "↓ ")\(String(format: "%.0f", abs(trend)))% vs last wk")
                    .font(.ui(11, .semibold))
                    .foregroundStyle(trend >= 0 ? Theme.green : Theme.red)
                    .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
        .card(padding: 16)
    }
}

/// A single headline-lift card: current e1RM, trend vs prior avg, ratio, sparkline.
/// Mirrors frontend HeroLiftCard.tsx.
private struct MainLiftCard: View {
    let lift: RelativeStrengthLift
    let points: [E1RMPoint]
    let unit: String

    private var e1rmValues: [Double] { points.map(\.e1rm) }

    private var trend: Double {
        guard let last = e1rmValues.last, e1rmValues.count > 1 else { return 0 }
        let earlier = e1rmValues.dropLast()
        let avg = earlier.reduce(0, +) / Double(earlier.count)
        return avg > 0 ? (last - avg) / avg * 100 : 0
    }

    private var isPR: Bool {
        guard let last = e1rmValues.last, e1rmValues.count > 1 else { return false }
        return last >= (e1rmValues.max() ?? last) && trend > 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SectionLabel(text: lift.exerciseName)
                .padding(.bottom, 8)
            Text(Format.trim(Format.weightValue(lift.e1rm, unit: unit)))
                .font(.head(40, .heavy))
                .foregroundStyle(Theme.textH)
            Text("\(unit) e1RM")
                .font(.ui(11))
                .foregroundStyle(Theme.textMuted)
                .padding(.top, 3)

            if e1rmValues.count > 1 {
                HStack(spacing: 6) {
                    Text(trend >= 0 ? "↑ +\(String(format: "%.1f", trend))%" : "↓ \(String(format: "%.1f", abs(trend)))%")
                        .font(.ui(12, .semibold))
                        .foregroundStyle(trend >= 0 ? Theme.green : Theme.red)
                    if isPR { Pill(text: "PR", variant: .pr) }
                }
                .padding(.top, 10)
            }

            HStack(spacing: 6) {
                Text(lift.ratio.map { String(format: "%.2f×", $0) } ?? "—")
                    .font(.ui(12, .semibold))
                    .foregroundStyle(Theme.text)
                    .fixedSize()
                if let tier = lift.tier { Pill(text: tier, variant: .e1rm) }
                Spacer(minLength: 0)
            }
            .padding(.top, 8)

            if e1rmValues.count > 1 {
                Sparkline(values: e1rmValues, color: isPR ? Theme.accent : Theme.cyan)
                    .frame(height: 32)
                    .opacity(0.6)
                    .padding(.top, 10)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(padding: 16)
    }
}

private struct StateOfTrainingCard: View {
    let insight: DashboardResponse.Insight

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionLabel(text: "State of Training")
                Spacer()
                AIBadge()
            }
            Text(insight.headline)
                .font(.head(22, .bold))
                .foregroundStyle(Theme.textH)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(insight.highlights, id: \.self) { h in
                    BulletRow(text: h, color: Theme.green, symbol: "checkmark.circle.fill")
                }
                ForEach(insight.watchItems, id: \.self) { w in
                    BulletRow(text: w, color: Theme.amber, symbol: "exclamationmark.triangle.fill")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

struct BulletRow: View {
    let text: String
    let color: Color
    var symbol: String = "circle.fill"

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 12))
                .foregroundStyle(color)
                .padding(.top, 2)
            Text(text)
                .font(.ui(14))
                .foregroundStyle(Theme.text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
