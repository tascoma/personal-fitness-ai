import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type {
  DigestResponse,
  Exercise,
  RecommendationsResponse,
  UserSettings,
  WorkoutSession,
} from '../api/types'
import { AIBadge } from '../components/AIBadge'
import { BigNumber } from '../components/BigNumber'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { useFetch } from '../hooks/useFetch'
import { displayWeight, formatDate } from '../lib/units'

const actionPill: Record<string, string> = { increase: 'green', hold: 'amber', deload: 'red' }

export function Dashboard() {
  const { data, loading, error } = useFetch(async () => {
    const [settings, exercises, recent] = await Promise.all([
      api.get<UserSettings>('/settings'),
      api.get<Exercise[]>('/exercises'),
      api.get<WorkoutSession[]>('/sessions?limit=1'),
    ])
    return { settings, exercises, recent }
  })
  const recommendations = useFetch(
    () => api.get<RecommendationsResponse>('/ai/recommendations'),
  )
  const digest = useFetch(() => api.get<DigestResponse>('/ai/digest'))

  if (loading) return <LoadingSkeleton lines={6} />
  if (error || !data) return <p className="error">{error ?? 'Failed to load'}</p>

  const { settings, exercises, recent } = data
  const lastSession = recent[0]
  const exerciseName = (id: number) => exercises.find((e) => e.id === id)?.name ?? `#${id}`

  return (
    <>
      <h1>Lift Log</h1>

      {lastSession ? (
        <Link to={`/sessions/${lastSession.id}`} className="card" style={{ display: 'block' }}>
          <div className="row-between">
            <h2>Last session</h2>
            <span className="muted">{formatDate(lastSession.date)}</span>
          </div>
          <div className="stack">
            {[...new Set(lastSession.sets.map((s) => s.exercise_id))].map((id) => {
              const working = lastSession.sets.filter((s) => s.exercise_id === id && !s.is_warmup)
              if (working.length === 0) return null
              const top = working.reduce((a, b) => (b.weight > a.weight ? b : a))
              return (
                <div key={id} className="row-between">
                  <span>{exerciseName(id)}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-h)' }}>
                    {displayWeight(top.weight, settings.unit)} {settings.unit} × {top.reps} ·{' '}
                    {working.length} sets
                  </span>
                </div>
              )
            })}
          </div>
        </Link>
      ) : (
        <div className="card">
          <h2>No sessions yet</h2>
          <p className="muted">
            Head to <Link to="/log">Log</Link> to record your first workout.
          </p>
        </div>
      )}

      <div className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Today's targets</h2>
          <AIBadge cached={recommendations.data?.cached} />
        </div>
        {recommendations.loading ? <LoadingSkeleton lines={3} /> : null}
        {recommendations.error ? <p className="error">{recommendations.error}</p> : null}
        {recommendations.data ? (
          recommendations.data.targets.length === 0 ? (
            <p className="muted">{recommendations.data.narrative.overall_note}</p>
          ) : (
            <div className="stack">
              {recommendations.data.targets.map((target) => (
                <div key={target.exercise_id} className="row-between">
                  <div>
                    <div style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                      {target.exercise_name}
                    </div>
                    <div className="muted">
                      {
                        recommendations.data?.narrative.per_lift.find(
                          (l) => l.exercise === target.exercise_name,
                        )?.rationale
                      }
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <BigNumber
                      value={displayWeight(target.target_weight, settings.unit)}
                      unit={`${settings.unit} · ${target.rep_scheme}`}
                    />
                    <span className={`pill ${actionPill[target.action]}`}>{target.action}</span>
                  </div>
                </div>
              ))}
              <p className="muted">{recommendations.data.narrative.overall_note}</p>
            </div>
          )
        ) : null}
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>This week</h2>
          <AIBadge cached={digest.data?.cached} />
        </div>
        {digest.loading ? <LoadingSkeleton lines={2} /> : null}
        {digest.error ? <p className="error">{digest.error}</p> : null}
        {digest.data ? (
          <div className="stack">
            <p>{digest.data.digest.summary}</p>
            {digest.data.digest.lift_notes.map((note, i) => (
              <p key={i} className="muted">
                • {note}
              </p>
            ))}
            <p>
              <strong style={{ color: 'var(--text-h)' }}>Focus:</strong>{' '}
              {digest.data.digest.focus_next_week}
            </p>
          </div>
        ) : null}
      </div>
    </>
  )
}
