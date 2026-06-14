import { useState } from 'react'
import { api } from '../api/client'
import type {
  DigestResponse,
  Exercise,
  ExerciseSeries,
  RecommendationsResponse,
  SummaryStats,
  WorkoutSession,
} from '../api/types'
import { LoadingSkeleton } from '../components/ui'
import { AIDashboardInsight } from '../components/dashboard/AIDashboardInsight'
import { AITargets } from '../components/dashboard/AITargets'
import { ConsistencyHeatmap } from '../components/dashboard/ConsistencyHeatmap'
import { HeroLiftCard } from '../components/dashboard/HeroLiftCard'
import { LastSessionCard } from '../components/dashboard/LastSessionCard'
import { MilestoneCard } from '../components/dashboard/MilestoneCard'
import { PrimaryTrendChart } from '../components/dashboard/PrimaryTrendChart'
import { RecentPRsCard } from '../components/dashboard/RecentPRsCard'
import { StatCard } from '../components/dashboard/StatCard'
import { WeeklyDigestCard } from '../components/dashboard/WeeklyDigestCard'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { convertWeight } from '../lib/units'

export function Dashboard() {
  const { unit, formula, accent } = useApp()
  // null = follow the default (first hero); a number = a user-pinned selection.
  const [pinnedHeroId, setPinnedHeroId] = useState<number | null>(null)

  const core = useFetch(async () => {
    const [exercises, recent, summary] = await Promise.all([
      api.get<Exercise[]>('/exercises'),
      api.get<WorkoutSession[]>('/sessions?limit=1'),
      api.get<SummaryStats>('/analytics/summary'),
    ])
    return { exercises, recent, summary }
  })

  const recommendations = useFetch(() => api.get<RecommendationsResponse>('/ai/recommendations'))
  const digest = useFetch(() => api.get<DigestResponse>('/ai/digest'))

  // Hero lifts come from the AI recommendation targets; fall back to the first
  // few exercises so the grid is never empty.
  const heroIds = (() => {
    const fromTargets = (recommendations.data?.targets ?? []).map((t) => t.exercise_id)
    if (fromTargets.length > 0) return fromTargets.slice(0, 4)
    return (core.data?.exercises ?? []).slice(0, 4).map((e) => e.id)
  })()

  const series = useFetch(
    () =>
      heroIds.length === 0
        ? Promise.resolve<ExerciseSeries[]>([])
        : api.get<ExerciseSeries[]>(`/analytics/compare?exercise_ids=${heroIds.join(',')}`),
    [heroIds.join(','), formula],
  )

  // Derive the active hero: the user's pin if still valid, else the first hero.
  const selectedHeroId =
    pinnedHeroId != null && heroIds.includes(pinnedHeroId) ? pinnedHeroId : (heroIds[0] ?? null)

  if (core.loading) return <LoadingSkeleton lines={6} />
  if (core.error || !core.data) return <p className="error">{core.error ?? 'Failed to load'}</p>

  const { exercises, recent, summary } = core.data
  const last = recent[0]
  const targetByExId = (id: number) =>
    recommendations.data?.targets.find((t) => t.exercise_id === id)
  const seriesFor = (exId: number) => series.data?.find((s) => s.exercise_id === exId)

  const heroExercises = heroIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => Boolean(e))
  const selectedExercise = exercises.find((e) => e.id === selectedHeroId)

  const weekTrend =
    summary.last_week_tonnage > 0
      ? ((summary.this_week_tonnage - summary.last_week_tonnage) / summary.last_week_tonnage) * 100
      : null

  const k = (lbs: number) => Math.round(convertWeight(lbs, unit) / 1000)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatCard
          label="This Week Volume"
          value={k(summary.this_week_tonnage)}
          suffix="K"
          unit={`${unit} lifted`}
          trend={weekTrend}
        />
        <StatCard
          label="Current Streak"
          value={summary.current_streak_weeks}
          unit={summary.current_streak_weeks === 1 ? 'week' : 'weeks'}
          accent={summary.current_streak_weeks > 0 ? 'var(--accent)' : undefined}
        />
        <StatCard
          label="Sessions This Week"
          value={summary.sessions_this_week}
          sub={`${summary.weekly_frequency}/wk avg`}
        />
        <StatCard label="All-Time Volume" value={k(summary.total_tonnage)} suffix="K" unit={`${unit} lifted`} />
        <StatCard label="Active PRs" value={summary.active_pr_count} unit="last 30 days" />
        <StatCard
          label="Total Sessions"
          value={summary.total_sessions}
          sub={`${summary.training_days} days trained`}
        />
      </div>

      {/* Primary trend + milestone */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <PrimaryTrendChart
          heroExercises={heroExercises}
          series={series.data ?? []}
          selectedId={selectedHeroId}
          onSelect={setPinnedHeroId}
          unit={unit}
          accent={accent}
        />
        <MilestoneCard
          exerciseId={selectedHeroId}
          exerciseName={selectedExercise?.name ?? ''}
          unit={unit}
          accent={accent}
        />
      </div>

      {/* Hero lifts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {heroExercises.map((exercise) => (
          <HeroLiftCard
            key={exercise.id}
            exercise={exercise}
            series={seriesFor(exercise.id)}
            target={targetByExId(exercise.id)}
            unit={unit}
            accent={accent}
            selected={exercise.id === selectedHeroId}
            onSelect={() => setPinnedHeroId(exercise.id)}
          />
        ))}
      </div>

      {/* AI insight + consistency */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <AIDashboardInsight />
        <ConsistencyHeatmap accent={accent} />
      </div>

      {/* AI targets + side column */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
        <AITargets recommendations={recommendations} unit={unit} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <LastSessionCard last={last} exercises={exercises} unit={unit} />
          <RecentPRsCard unit={unit} />
          <WeeklyDigestCard digest={digest} />
        </div>
      </div>
    </div>
  )
}
