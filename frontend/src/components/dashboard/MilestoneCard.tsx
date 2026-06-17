import { api } from '../../api/client'
import type { Prediction } from '../../api/types'
import { ProgressBar } from '../charts'
import { Card, CardHeader, LoadingSkeleton, Pill } from '../ui'
import { useFetch } from '../../hooks/useFetch'
import { convertWeight, formatDate } from '../../lib/units'

const STATUS_MESSAGE: Record<string, string> = {
  insufficient_data: 'Log a few more sessions to project your next milestone.',
  no_positive_trend: 'No upward trend right now — keep pushing to project a milestone.',
  no_milestone: 'You have cleared every tracked milestone. Beast.',
}

/** Milestone projection for one lift: progress toward the next round number,
 *  projected date and confidence band. */
export function MilestoneCard({
  exerciseId,
  exerciseName,
  unit,
  accent,
}: {
  exerciseId: number | null
  exerciseName: string
  unit: 'lbs' | 'kg'
  accent: string
}) {
  const pred = useFetch(
    () =>
      exerciseId == null
        ? Promise.resolve<Prediction | null>(null)
        : api.get<Prediction>(`/analytics/predictions?exercise_id=${exerciseId}`),
    [exerciseId],
  )

  return (
    <Card>
      <CardHeader label={`Next Milestone — ${exerciseName}`} />
      {pred.loading ? (
        <LoadingSkeleton lines={3} />
      ) : pred.error || !pred.data ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {pred.error ?? 'Select a lift to see its projection.'}
        </p>
      ) : pred.data.status !== 'ok' || pred.data.milestone == null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 30, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>
            {convertWeight(pred.data.current_best, unit)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{unit}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>current best e1RM</div>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            {STATUS_MESSAGE[pred.data.status] ?? 'Not enough signal yet.'}
          </p>
        </div>
      ) : (
        (() => {
          const p = pred.data
          const cur = convertWeight(p.current_best, unit)
          const goal = convertWeight(p.milestone!, unit)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 34, fontWeight: 800, color: accent, lineHeight: 1 }}>
                    {goal}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{unit} target</div>
                </div>
                <Pill variant="e1rm">+{(goal - cur).toFixed(0)} {unit} to go</Pill>
              </div>
              <ProgressBar value={cur} max={goal} color={accent} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{cur} {unit} now</span>
                <span>{goal} {unit}</span>
              </div>
              {p.projected_date && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-card-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-h)', fontWeight: 600 }}>
                    Projected {formatDate(p.projected_date)}
                  </div>
                  {p.ci_earliest && p.ci_latest && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      between {formatDate(p.ci_earliest)} and {formatDate(p.ci_latest)}
                      {p.slope_per_week != null && ` · +${convertWeight(p.slope_per_week, unit)} ${unit}/wk`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()
      )}
    </Card>
  )
}
