export interface Exercise {
  id: number
  name: string
  is_compound: boolean
  is_custom: boolean
  is_bodyweight: boolean
  increment: number
}

export interface WorkoutSet {
  id: number
  session_id: number
  exercise_id: number
  set_number: number
  weight: number
  reps: number
  rpe: number | null
  is_warmup: boolean
  notes: string | null
  e1rm_epley: number
  e1rm_brzycki: number
}

export interface WorkoutSession {
  id: number
  date: string
  notes: string | null
  sets: WorkoutSet[]
}

export interface UserSettings {
  unit: 'lbs' | 'kg'
  e1rm_formula: 'epley' | 'brzycki'
  height_cm: number | null
  birth_date: string | null
  sex: 'male' | 'female' | null
  training_goal: string | null
  // Derived, read-only.
  age: number | null
  current_bodyweight: number | null
}

export interface BodyweightEntry {
  id: number
  date: string
  weight: number
}

export interface RelativeStrengthLift {
  exercise_id: number
  exercise_name: string
  e1rm: number
  ratio: number | null
  tier: string | null
}

export interface RelativeStrength {
  bodyweight: number | null
  lifts: RelativeStrengthLift[]
}

export interface TonnageBucket {
  bucket: string
  tonnage: number
}

export interface E1RMPoint {
  date: string
  e1rm: number
}

export interface PersonalRecord {
  id: number
  exercise_id: number
  set_id: number
  record_type: 'weight' | 'e1rm'
  value: number
  achieved_on: string
}

export interface ExerciseSeries {
  exercise_id: number
  exercise_name: string
  series: E1RMPoint[]
}

export interface SummaryStats {
  total_sessions: number
  total_tonnage: number
  training_days: number
  current_streak_weeks: number
  weekly_frequency: number
  this_week_tonnage: number
  last_week_tonnage: number
  active_pr_count: number
  sessions_this_week: number
}

export interface RecentPR extends PersonalRecord {
  exercise_name: string
}

export interface Prediction {
  exercise_id: number
  status: 'ok' | 'insufficient_data' | 'no_positive_trend' | 'no_milestone'
  current_best: number
  milestone: number | null
  slope_per_week: number | null
  projected_date: string | null
  ci_earliest: string | null
  ci_latest: string | null
  n_points: number
}

interface AIEnvelope {
  ai_generated: boolean
  cached: boolean
  model: string
}

export interface InsightResponse extends AIEnvelope {
  session_id: number
  insight: {
    headline: string
    observations: string[]
    encouragement: string
  }
}

export interface LiftTarget {
  exercise_id: number
  exercise_name: string
  last_session_date: string
  last_top_weight: number
  target_weight: number
  rep_scheme: string
  action: 'increase' | 'hold' | 'deload'
  plateau: boolean
  deload: boolean
}

export interface RecommendationsResponse extends AIEnvelope {
  targets: LiftTarget[]
  narrative: {
    per_lift: { exercise: string; rationale: string }[]
    overall_note: string
  }
}

export interface DigestResponse extends AIEnvelope {
  week: string
  digest: {
    summary: string
    lift_notes: string[]
    focus_next_week: string
  }
}

export interface DashboardResponse extends AIEnvelope {
  insight: {
    headline: string
    highlights: string[]
    watch_items: string[]
  }
}
