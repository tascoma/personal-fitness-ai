import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type {
  DigestResponse,
  Exercise,
  ExerciseSeries,
  LiftTarget,
  RecommendationsResponse,
  TonnageBucket,
  WorkoutSession,
} from '../api/types'
import { AnimNum, Sparkline } from '../components/charts'
import { AIBadge, Card, CardHeader, LoadingSkeleton, Pill } from '../components/ui'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { convertWeight, displayWeight, formatDate } from '../lib/units'

const TREND_GREEN = '#4ade80'
const TREND_RED = '#f87171'
const TREND_AMBER = '#fbbf24'
const actionColor: Record<string, string> = { increase: TREND_GREEN, hold: TREND_AMBER, deload: TREND_RED }

export function Dashboard() {
  const { unit, formula, accent } = useApp()

  const core = useFetch(async () => {
    const [exercises, recent, tonnage] = await Promise.all([
      api.get<Exercise[]>('/exercises'),
      api.get<WorkoutSession[]>('/sessions?limit=1'),
      api.get<TonnageBucket[]>('/analytics/tonnage?period=week'),
    ])
    return { exercises, recent, tonnage }
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

  if (core.loading) return <LoadingSkeleton lines={6} />
  if (core.error || !core.data) return <p className="error">{core.error ?? 'Failed to load'}</p>

  const { exercises, recent, tonnage } = core.data
  const last = recent[0]
  const targetByName = (name: string) =>
    recommendations.data?.targets.find((t) => t.exercise_name === name)
  const rationaleByName = (name: string) =>
    recommendations.data?.narrative.per_lift.find((l) => l.exercise === name)?.rationale ?? ''
  const seriesFor = (exId: number) => series.data?.find((s) => s.exercise_id === exId)

  // Weekly volume from the latest two tonnage buckets.
  const lastBucket = tonnage[tonnage.length - 1]
  const prevBucket = tonnage[tonnage.length - 2]
  const weeklyValue = lastBucket ? convertWeight(lastBucket.tonnage, unit) : 0
  const weeklyTrend =
    lastBucket && prevBucket && prevBucket.tonnage > 0
      ? ((lastBucket.tonnage - prevBucket.tonnage) / prevBucket.tonnage) * 100
      : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {heroIds.map((exId) => {
          const exercise = exercises.find((e) => e.id === exId)
          if (!exercise) return null
          const s = seriesFor(exId)
          const points = s?.series ?? []
          const lastE1rm = points.length ? points[points.length - 1].e1rm : 0
          const earlier = points.slice(0, -1)
          const avg = earlier.length ? earlier.reduce((a, p) => a + p.e1rm, 0) / earlier.length : lastE1rm
          const trend = avg > 0 ? ((lastE1rm - avg) / avg) * 100 : 0
          const target = targetByName(exercise.name)
          const plateau = target?.plateau ?? false
          const deload = target?.deload ?? false
          const isPr = !plateau && !deload && points.length > 1 && lastE1rm >= Math.max(...points.map((p) => p.e1rm)) && trend > 0
          const trendColor = plateau ? TREND_AMBER : deload ? TREND_RED : TREND_GREEN
          const trendLabel = plateau
            ? '→ Plateau'
            : deload
              ? `↓ ${Math.abs(trend).toFixed(1)}%`
              : `↑ +${trend.toFixed(1)}%`
          return (
            <Card key={exId} style={{ position: 'relative', overflow: 'hidden', paddingBottom: 52 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {exercise.name}
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 62, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>
                <AnimNum target={convertWeight(lastE1rm, unit)} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{unit} e1RM</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>{trendLabel}</span>
                {isPr && <Pill variant="pr">PR</Pill>}
                {plateau && <Pill variant="hold">plateau</Pill>}
                {deload && <Pill variant="deload">deload</Pill>}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.5 }}>
                <Sparkline data={points.map((p) => ({ v: p.e1rm }))} color={isPr ? accent : '#22d3ee'} h={44} />
              </div>
            </Card>
          )
        })}
        <Card>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            Weekly Volume
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 62, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>
            <AnimNum target={Math.round(weeklyValue / 1000)} />K
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{unit} lifted</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: weeklyTrend >= 0 ? TREND_GREEN : TREND_RED, marginTop: 10 }}>
            {weeklyTrend >= 0 ? '↑ +' : '↓ '}
            {Math.abs(weeklyTrend).toFixed(0)}% vs last week
          </div>
        </Card>
      </div>

      {/* AI targets + last session + digest */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
        <Card>
          <CardHeader label="AI Targets — Next Session" right={<AIBadge />} />
          {recommendations.loading ? (
            <LoadingSkeleton lines={3} />
          ) : recommendations.error ? (
            <p className="error">{recommendations.error}</p>
          ) : recommendations.data && recommendations.data.targets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recommendations.data.targets.map((r: LiftTarget) => (
                <div
                  key={r.exercise_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-card-raised)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: 14, marginBottom: 3 }}>
                      {r.exercise_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {rationaleByName(r.exercise_name)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 30, fontWeight: 800, color: actionColor[r.action], lineHeight: 1 }}>
                      {displayWeight(r.target_weight, unit)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {unit} · {r.rep_scheme}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Pill variant={r.action}>{r.action}</Pill>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {recommendations.data?.narrative.overall_note ?? 'Log a few sessions to unlock AI targets.'}
            </p>
          )}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <CardHeader label="Last Session" />
            {last ? (
              <Link to={`/sessions/${last.id}`} style={{ display: 'block' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>
                  {formatDate(last.date)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                  {last.sets.length} sets ·{' '}
                  {convertWeight(
                    last.sets.filter((s) => !s.is_warmup).reduce((t, s) => t + s.weight * s.reps, 0),
                    unit,
                  ).toLocaleString()}{' '}
                  {unit}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...new Set(last.sets.map((s) => exercises.find((e) => e.id === s.exercise_id)?.name ?? `#${s.exercise_id}`))].map(
                    (name) => (
                      <div
                        key={name}
                        style={{
                          fontSize: 13,
                          color: 'var(--text)',
                          padding: '6px 10px',
                          background: 'var(--bg-card-raised)',
                          borderRadius: 8,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {name}
                      </div>
                    ),
                  )}
                </div>
              </Link>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No sessions yet. <Link to="/log" style={{ color: 'var(--accent)' }}>Log your first workout.</Link>
              </p>
            )}
          </Card>
          <Card>
            <CardHeader label="Weekly Digest" right={<AIBadge />} />
            {digest.loading ? (
              <LoadingSkeleton lines={2} />
            ) : digest.error ? (
              <p className="error">{digest.error}</p>
            ) : digest.data ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-h)', lineHeight: 1.6, marginBottom: 12 }}>
                  {digest.data.digest.summary}
                </p>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>FOCUS: </span>
                  <span style={{ fontSize: 12, color: 'var(--text-h)' }}>{digest.data.digest.focus_next_week}</span>
                </div>
              </>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}
