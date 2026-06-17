import Foundation

/// One editable exercise row in the log form. Expands into `setCount` identical
/// sets on submit (mirrors the web app's bulk-set logging).
struct ExerciseEntry: Identifiable {
    let id = UUID()
    var exerciseId: Int?
    var weight: String = ""
    var reps: String = "5"
    var setCount: Int = 3
    var isWarmup: Bool = false
}

@MainActor
final class LogViewModel: ObservableObject {
    @Published var exercises: [Exercise] = []
    @Published var date = Date()
    @Published var entries: [ExerciseEntry] = [ExerciseEntry()]
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var didSave = false
    @Published var recentSessions: [WorkoutSession] = []

    private let client: APIClient
    /// Display unit for weight entry; set by the view from AppState.
    var unit: String = "lbs"

    init(client: APIClient) {
        self.client = client
    }

    func loadInitial() async {
        do {
            exercises = try await client.get("/api/exercises")
        } catch {
            errorMessage = error.localizedDescription
        }
        await loadRecent()
    }

    func loadRecent() async {
        recentSessions = (try? await client.get("/api/sessions?limit=5")) ?? []
    }

    func addRow() { entries.append(ExerciseEntry()) }

    func removeRow(_ entry: ExerciseEntry) {
        entries.removeAll { $0.id == entry.id }
        if entries.isEmpty { entries = [ExerciseEntry()] }
    }

    var canSave: Bool {
        entries.contains { entry in
            entry.exerciseId != nil && Double(entry.weight) != nil && Int(entry.reps) != nil
        }
    }

    /// Expand each valid row into `setCount` `WorkoutSetCreate`s.
    private func buildSets() -> [WorkoutSetCreate] {
        var sets: [WorkoutSetCreate] = []
        for entry in entries {
            guard let exerciseId = entry.exerciseId,
                  let weightDisplay = Double(entry.weight),
                  let reps = Int(entry.reps), entry.setCount > 0 else { continue }
            let weightLbs = Format.weightToLbs(weightDisplay, unit: unit)
            for _ in 0..<entry.setCount {
                sets.append(WorkoutSetCreate(
                    exerciseId: exerciseId, weight: weightLbs, reps: reps,
                    rpe: nil, isWarmup: entry.isWarmup, notes: nil
                ))
            }
        }
        return sets
    }

    /// Creates the session, then bulk-adds the sets. Returns true on success.
    func save() async -> Bool {
        let sets = buildSets()
        guard !sets.isEmpty else {
            errorMessage = "Add at least one exercise with weight and reps."
            return false
        }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let session: WorkoutSession = try await client.post(
                "/api/sessions",
                body: WorkoutSessionCreate(date: Format.apiString(from: date), notes: nil)
            )
            let _: [WorkoutSet] = try await client.post(
                "/api/sessions/\(session.id)/sets/bulk", body: sets
            )
            entries = [ExerciseEntry()]
            didSave = true
            await loadRecent()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func exerciseName(_ id: Int) -> String {
        exercises.first { $0.id == id }?.name ?? "Exercise"
    }
}
