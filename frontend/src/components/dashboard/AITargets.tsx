import type { LiftTarget, RecommendationsResponse } from '../../api/types'
import { AIBadge, Card, CardHeader, LoadingSkeleton, Pill } from '../ui'
import { displayWeight } from '../../lib/units'

const TREND_GREEN = '#4ade80'
const TREND_RED = '#f87171'
const TREND_AMBER = '#fbbf24'
const actionColor: Record<string, string> = {
  increase: TREND_GREEN,
  hold: TREND_AMBER,
  deload: TREND_RED,
}

/** Next-session progressive-overload targets with per-lift rationale. */
export function AITargets({
  recommendations,
  unit,
}: {
  recommendations: { loading: boolean; error: string | null; data: RecommendationsResponse | null }
  unit: 'lbs' | 'kg'
}) {
  const rationaleByName = (name: string) =>
    recommendations.data?.narrative.per_lift.find((l) => l.exercise === name)?.rationale ?? ''

  return (
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
  )
}
