import Foundation

// Codable structs mirroring frontend/src/api/types.ts. Snake_case ↔ camelCase is
// handled by APIClient's key strategies, so property names are camelCase here.
// Date fields stay String (backend sends "YYYY-MM-DD"); see Format for display.

struct Exercise: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let isCompound: Bool
    let isCustom: Bool
    let isBodyweight: Bool
    let increment: Double
}

struct WorkoutSet: Codable, Identifiable, Hashable {
    let id: Int
    let sessionId: Int
    let exerciseId: Int
    let setNumber: Int
    let weight: Double
    let reps: Int
    let rpe: Double?
    let isWarmup: Bool
    let notes: String?
    let e1rmEpley: Double
    let e1rmBrzycki: Double
}

struct WorkoutSession: Codable, Identifiable, Hashable {
    let id: Int
    let date: String
    let notes: String?
    let sets: [WorkoutSet]
}

struct UserSettings: Codable {
    let unit: String
    let e1rmFormula: String
    let heightCm: Double?
    let birthDate: String?
    let sex: String?
    let trainingGoal: String?
    let age: Int?
    let currentBodyweight: Double?
}

struct RelativeStrengthLift: Codable, Identifiable, Hashable {
    let exerciseId: Int
    let exerciseName: String
    let e1rm: Double
    let ratio: Double?
    let tier: String?
    var id: Int { exerciseId }
}

struct RelativeStrength: Codable {
    let bodyweight: Double?
    let lifts: [RelativeStrengthLift]
}

struct E1RMPoint: Codable, Hashable {
    let date: String
    let e1rm: Double
}

struct PersonalRecord: Codable, Identifiable, Hashable {
    let id: Int
    let exerciseId: Int
    let setId: Int
    let recordType: String
    let value: Double
    let achievedOn: String
}

struct RecentPR: Codable, Identifiable, Hashable {
    let id: Int
    let exerciseId: Int
    let setId: Int
    let recordType: String
    let value: Double
    let achievedOn: String
    let exerciseName: String
}

struct SummaryStats: Codable {
    let totalSessions: Int
    let totalTonnage: Double
    let trainingDays: Int
    let currentStreakWeeks: Int
    let weeklyFrequency: Double
    let thisWeekTonnage: Double
    let lastWeekTonnage: Double
    let activePrCount: Int
    let sessionsThisWeek: Int
}

// MARK: - AI responses

struct DashboardResponse: Codable {
    struct Insight: Codable {
        let headline: String
        let highlights: [String]
        let watchItems: [String]
    }
    let aiGenerated: Bool
    let cached: Bool
    let model: String
    let insight: Insight
}

struct InsightResponse: Codable {
    struct Insight: Codable {
        let headline: String
        let observations: [String]
        let encouragement: String
    }
    let aiGenerated: Bool
    let cached: Bool
    let model: String
    let sessionId: Int
    let insight: Insight
}

// MARK: - Request bodies

struct WorkoutSessionCreate: Encodable {
    let date: String
    let notes: String?
}

struct WorkoutSetCreate: Encodable {
    let exerciseId: Int
    let weight: Double
    let reps: Int
    let rpe: Double?
    let isWarmup: Bool
    let notes: String?
}

struct WorkoutSetUpdate: Encodable {
    var weight: Double?
    var reps: Int?
    var rpe: Double?
    var isWarmup: Bool?
    var notes: String?
}

struct WorkoutSessionUpdate: Encodable {
    var date: String?
    var notes: String?
}
