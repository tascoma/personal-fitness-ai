import { Link } from 'react-router-dom'
import type { Exercise, WorkoutSession } from '../../api/types'
import { Card, CardHeader } from '../ui'
import { convertWeight, formatDate } from '../../lib/units'

/** Summary of the most recent logged session. */
export function LastSessionCard({
  last,
  exercises,
  unit,
}: {
  last?: WorkoutSession
  exercises: Exercise[]
  unit: 'lbs' | 'kg'
}) {
  return (
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
          No sessions yet.{' '}
          <Link to="/log" style={{ color: 'var(--accent)' }}>
            Log your first workout.
          </Link>
        </p>
      )}
    </Card>
  )
}
