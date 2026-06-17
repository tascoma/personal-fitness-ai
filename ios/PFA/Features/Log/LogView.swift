import SwiftUI

struct LogView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = LogViewModel(client: APIClient())
    @State private var started = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    dateCard
                    ForEach($vm.entries) { $entry in
                        ExerciseEntryCard(
                            entry: $entry, exercises: vm.exercises, unit: appState.unit,
                            canRemove: vm.entries.count > 1,
                            onRemove: { vm.removeRow(entry) }
                        )
                    }
                    Button { vm.addRow() } label: {
                        Label("Add exercise", systemImage: "plus")
                            .font(.ui(14, .semibold))
                            .foregroundStyle(Theme.accent)
                            .frame(maxWidth: .infinity)
                    }
                    .card(padding: 14)

                    if let msg = vm.errorMessage {
                        ErrorBanner(message: msg).card()
                    }
                    if !vm.recentSessions.isEmpty {
                        recentCard
                    }
                }
                .padding(16)
            }
            .background(Theme.bg)
            .navigationTitle("Log Workout")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { if await vm.save() { appState.dataDidChange() } }
                    }
                    .font(.ui(15, .semibold))
                    .tint(Theme.accent)
                    .disabled(!vm.canSave || vm.isSaving)
                }
            }
            .task {
                guard !started else { return }
                started = true
                vm.unit = appState.unit
                await vm.loadInitial()
            }
        }
    }

    private var dateCard: some View {
        HStack {
            SectionLabel(text: "Date")
            Spacer()
            DatePicker("", selection: $vm.date, in: ...Date(), displayedComponents: .date)
                .labelsHidden()
                .tint(Theme.accent)
        }
        .card(padding: 16)
    }

    private var recentCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionLabel(text: "Recent")
            ForEach(vm.recentSessions) { session in
                NavigationLink {
                    SessionDetailView(sessionId: session.id)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(Format.prettyDate(session.date))
                                .font(.ui(14, .semibold))
                                .foregroundStyle(Theme.textH)
                            Text("\(session.sets.count) sets")
                                .font(.ui(12))
                                .foregroundStyle(Theme.textMuted)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.textMuted)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

private struct ExerciseEntryCard: View {
    @Binding var entry: ExerciseEntry
    let exercises: [Exercise]
    let unit: String
    let canRemove: Bool
    let onRemove: () -> Void

    private var selectedName: String {
        exercises.first { $0.id == entry.exerciseId }?.name ?? "Select exercise…"
    }

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                Menu {
                    ForEach(exercises) { ex in
                        Button(ex.name) { entry.exerciseId = ex.id }
                    }
                } label: {
                    HStack {
                        Text(selectedName)
                            .font(.ui(15, .medium))
                            .foregroundStyle(entry.exerciseId == nil ? Theme.textMuted : Theme.textH)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .padding(12)
                    .background(Theme.bgInput, in: RoundedRectangle(cornerRadius: Theme.radius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.border, lineWidth: 1))
                }
                if canRemove {
                    Button(action: onRemove) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Theme.textMuted)
                    }
                    .buttonStyle(.plain)
                }
            }
            FieldRow(label: "Weight (\(unit))", text: $entry.weight, keyboard: .decimalPad)
            FieldRow(label: "Reps", text: $entry.reps, keyboard: .numberPad)
            HStack {
                Stepper("Sets: \(entry.setCount)", value: $entry.setCount, in: 1...20)
                    .font(.ui(14))
                    .foregroundStyle(Theme.text)
                    .tint(Theme.accent)
            }
            Toggle(isOn: $entry.isWarmup) {
                Text("Warmup").font(.ui(14)).foregroundStyle(Theme.text)
            }
            .tint(Theme.accent)
        }
        .card()
    }
}
