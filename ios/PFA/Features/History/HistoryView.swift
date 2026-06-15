import SwiftUI

struct HistoryView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = HistoryViewModel(client: APIClient())

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 12) {
                    if let msg = vm.errorMessage {
                        ErrorBanner(message: msg).card()
                    }
                    ForEach(vm.sessions) { session in
                        NavigationLink {
                            SessionDetailView(sessionId: session.id)
                        } label: {
                            SessionSummaryRow(session: session, unit: appState.unit)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .background(Theme.bg)
            .navigationTitle("History")
            .searchable(text: $vm.search, prompt: "Search notes")
            .onSubmit(of: .search) { Task { await vm.load() } }
            .overlay {
                if vm.isLoading && vm.sessions.isEmpty {
                    ProgressView().tint(Theme.accent)
                } else if vm.sessions.isEmpty && vm.errorMessage == nil {
                    ContentUnavailableView("No sessions yet", systemImage: "clock")
                }
            }
            .refreshable { await vm.load() }
            .task(id: appState.dataVersion) { await vm.load() }
        }
    }
}

private struct SessionSummaryRow: View {
    let session: WorkoutSession
    let unit: String

    private var liftCount: Int { Set(session.sets.map(\.exerciseId)).count }
    private var totalVolume: Double {
        session.sets.reduce(0) { $0 + $1.weight * Double($1.reps) }
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(Format.prettyDate(session.date))
                    .font(.head(20, .bold))
                    .foregroundStyle(Theme.textH)
                HStack(spacing: 14) {
                    Stat(icon: "list.number", text: "\(session.sets.count) sets")
                    Stat(icon: "dumbbell", text: "\(liftCount) lifts")
                    Stat(icon: "scalemass", text: Format.tonnage(totalVolume, unit: unit))
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(padding: 16)
    }

    private struct Stat: View {
        let icon: String
        let text: String
        var body: some View {
            HStack(spacing: 4) {
                Image(systemName: icon).font(.system(size: 11))
                Text(text).font(.ui(12, .medium))
            }
            .foregroundStyle(Theme.text)
        }
    }
}
