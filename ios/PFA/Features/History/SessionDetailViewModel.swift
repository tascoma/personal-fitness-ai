import Foundation

@MainActor
final class SessionDetailViewModel: ObservableObject {
    @Published var session: WorkoutSession?
    @Published var exercises: [Exercise] = []
    @Published var insight: InsightResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var deleted = false

    let sessionId: Int
    private let client: APIClient

    init(sessionId: Int, client: APIClient) {
        self.sessionId = sessionId
        self.client = client
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let session: WorkoutSession = client.get("/api/sessions/\(sessionId)")
            async let exercises: [Exercise] = client.get("/api/exercises")
            self.session = try await session
            self.exercises = try await exercises
        } catch {
            errorMessage = error.localizedDescription
        }
        // AI insight is best-effort.
        insight = try? await client.get("/api/ai/insight/\(sessionId)")
    }

    /// Sets grouped by exercise, in stable order.
    var groupedSets: [(exercise: String, sets: [WorkoutSet])] {
        guard let session else { return [] }
        var order: [Int] = []
        var byExercise: [Int: [WorkoutSet]] = [:]
        for set in session.sets {
            if byExercise[set.exerciseId] == nil { order.append(set.exerciseId) }
            byExercise[set.exerciseId, default: []].append(set)
        }
        return order.map { id in
            (exerciseName(id), byExercise[id] ?? [])
        }
    }

    func exerciseName(_ id: Int) -> String {
        exercises.first { $0.id == id }?.name ?? "Exercise"
    }

    func updateSet(_ set: WorkoutSet, weightLbs: Double, reps: Int) async {
        do {
            let _: WorkoutSet = try await client.patch(
                "/api/sets/\(set.id)",
                body: WorkoutSetUpdate(weight: weightLbs, reps: reps, rpe: nil, isWarmup: nil, notes: nil)
            )
            await reloadSession()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteSet(_ set: WorkoutSet) async {
        do {
            try await client.delete("/api/sets/\(set.id)")
            await reloadSession()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveNotes(_ notes: String) async {
        do {
            let trimmed = notes.trimmingCharacters(in: .whitespacesAndNewlines)
            let _: WorkoutSession = try await client.patch(
                "/api/sessions/\(sessionId)",
                body: WorkoutSessionUpdate(date: nil, notes: trimmed.isEmpty ? nil : trimmed)
            )
            await reloadSession()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteSession() async {
        do {
            try await client.delete("/api/sessions/\(sessionId)")
            deleted = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func reloadSession() async {
        session = try? await client.get("/api/sessions/\(sessionId)")
    }
}
