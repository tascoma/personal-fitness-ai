import SwiftUI

struct SessionDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm: SessionDetailViewModel
    @State private var notesDraft = ""
    @State private var editingSet: WorkoutSet?

    init(sessionId: Int) {
        _vm = StateObject(wrappedValue: SessionDetailViewModel(sessionId: sessionId, client: APIClient()))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let msg = vm.errorMessage {
                    ErrorBanner(message: msg).card()
                }
                if let insight = vm.insight {
                    InsightCard(insight: insight.insight)
                }
                ForEach(vm.groupedSets, id: \.exercise) { group in
                    ExerciseGroupCard(
                        title: group.exercise, sets: group.sets, unit: appState.unit,
                        onEdit: { editingSet = $0 },
                        onDelete: { set in Task { await vm.deleteSet(set) } }
                    )
                }
                notesCard
            }
            .padding(16)
        }
        .background(Theme.bg)
        .navigationTitle(vm.session.map { Format.prettyDate($0.date) } ?? "Session")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .destructiveAction) {
                Button(role: .destructive) {
                    Task {
                        await vm.deleteSession()
                        if vm.deleted { appState.dataDidChange(); dismiss() }
                    }
                } label: {
                    Image(systemName: "trash").foregroundStyle(Theme.red)
                }
            }
        }
        .overlay {
            if vm.isLoading && vm.session == nil { ProgressView().tint(Theme.accent) }
        }
        .sheet(item: $editingSet) { set in
            EditSetSheet(set: set, unit: appState.unit) { weightLbs, reps in
                Task {
                    await vm.updateSet(set, weightLbs: weightLbs, reps: reps)
                    appState.dataDidChange()
                }
            }
        }
        .task {
            await vm.load()
            notesDraft = vm.session?.notes ?? ""
        }
    }

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel(text: "Notes")
            TextField("Add notes…", text: $notesDraft, axis: .vertical)
                .font(.ui(14))
                .foregroundStyle(Theme.textH)
                .lineLimit(1...4)
                .padding(10)
                .background(Theme.bgInput, in: RoundedRectangle(cornerRadius: Theme.radius))
                .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.border, lineWidth: 1))
            Button {
                Task { await vm.saveNotes(notesDraft) }
            } label: {
                Text("Save notes").font(.ui(13, .semibold))
            }
            .buttonStyle(AccentButtonStyle())
            .disabled(notesDraft == (vm.session?.notes ?? ""))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

private struct ExerciseGroupCard: View {
    let title: String
    let sets: [WorkoutSet]
    let unit: String
    let onEdit: (WorkoutSet) -> Void
    let onDelete: (WorkoutSet) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.head(20, .bold))
                .foregroundStyle(Theme.textH)
            VStack(spacing: 0) {
                ForEach(Array(sets.enumerated()), id: \.element.id) { idx, set in
                    if idx > 0 { Divider().overlay(Theme.borderSubtle) }
                    SetRow(set: set, unit: unit, onEdit: { onEdit(set) }, onDelete: { onDelete(set) })
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

private struct SetRow: View {
    let set: WorkoutSet
    let unit: String
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Text("SET \(set.setNumber)")
                .font(.ui(11, .bold))
                .tracking(0.6)
                .foregroundStyle(Theme.textMuted)
            if set.isWarmup { Pill(text: "warmup", variant: .warmup) }
            Spacer()
            Text("\(Format.weight(set.weight, unit: unit)) × \(set.reps)")
                .font(.head(20, .bold))
                .foregroundStyle(Theme.textH)
            Button(action: onDelete) {
                Image(systemName: "trash")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.textMuted)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .onTapGesture(perform: onEdit)
    }
}

private struct InsightCard: View {
    let insight: InsightResponse.Insight

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionLabel(text: "Coach")
                Spacer()
                AIBadge()
            }
            Text(insight.headline)
                .font(.head(22, .bold))
                .foregroundStyle(Theme.textH)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(insight.observations, id: \.self) { o in
                    BulletRow(text: o, color: Theme.cyan)
                }
            }
            Text(insight.encouragement)
                .font(.ui(14).italic())
                .foregroundStyle(Theme.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

private struct EditSetSheet: View {
    @Environment(\.dismiss) private var dismiss
    let set: WorkoutSet
    let unit: String
    let onSave: (Double, Int) -> Void

    @State private var weight: String
    @State private var reps: String

    init(set: WorkoutSet, unit: String, onSave: @escaping (Double, Int) -> Void) {
        self.set = set
        self.unit = unit
        self.onSave = onSave
        _weight = State(initialValue: Format.trim(Format.weightValue(set.weight, unit: unit)))
        _reps = State(initialValue: String(set.reps))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                VStack(spacing: 14) {
                    FieldRow(label: "Weight (\(unit))", text: $weight, keyboard: .decimalPad)
                    FieldRow(label: "Reps", text: $reps, keyboard: .numberPad)
                    Spacer()
                }
                .padding(16)
            }
            .navigationTitle("Edit Set")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.tint(Theme.text)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let w = Double(weight), let r = Int(reps) {
                            onSave(Format.weightToLbs(w, unit: unit), r)
                        }
                        dismiss()
                    }
                    .tint(Theme.accent)
                }
            }
        }
        .presentationDetents([.height(220)])
    }
}
