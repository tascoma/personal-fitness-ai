import { useState } from 'react'
import { api } from '../api/client'
import type {
  E1RMPoint,
  Exercise,
  PersonalRecord,
  Prediction,
  TonnageBucket,
} from '../api/types'
import { BarChart, LineChart } from '../components/charts'
import { Card, CardHeader, LoadingSkeleton, Pill } from '../components/ui'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { convertWeight, formatDate } from '../lib/units'

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Progress() {
  const { unit, formula, accent } = useApp()
  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const [tab, setTab] = useState<'e1rm' | 'tonnage'>('e1rm')

  const base = useFetch(() => api.get<Exercise[]>('/exercises'))
  const effectiveId = exerciseId ?? base.data?.[0]?.id ?? null
  const exercise = base.data?.find((e) => e.id === effectiveId)

  const e1rm = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<E1RMPoint[]>([])
        : api.get<E1RMPoint[]>(`/analytics/e1rm?exercise_id=${effectiveId}`),
    [effectiveId, formula],
  )
  const tonnage = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<TonnageBucket[]>([])
        : api.get<TonnageBucket[]>(`/analytics/tonnage?exercise_id=${effectiveId}&period=week`),
    [effectiveId],
  )
  const prs = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<PersonalRecord[]>([])
        : api.get<PersonalRecord[]>(`/analytics/prs?exercise_id=${effectiveId}`),
    [effectiveId, formula],
  )
  const prediction = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<Prediction | null>(null)
        : api.get<Prediction>(`/analytics/predictions?exercise_id=${effectiveId}`),
    [effectiveId, formula],
  )

  if (base.loading) return <LoadingSkeleton lines={6} />
  if (base.error || !base.data) return <p className="error">{base.error ?? 'Failed to load'}</p>

  const lineData = (e1rm.data ?? []).map((p) => ({ d: shortDate(p.date), v: convertWeight(p.e1rm, unit) }))
  const barData = (tonnage.data ?? []).map((b) => ({ b: b.bucket, v: convertWeight(b.tonnage, unit) }))
  const pred = prediction.data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <select value={effectiveId ?? ''} onChange={(e) => setExerciseId(Number(e.target.value))} style={{ flex: 1 }}>
          {base.data.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {(['e1rm', 'tonnage'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px 18px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader label={tab === 'e1rm' ? `${exercise?.name ?? ''} — e1RM Trend` : 'Weekly Tonnage'} />
        {tab === 'e1rm' ? (
          <LineChart data={lineData} color={accent} h={200} />
        ) : (
          <BarChart data={barData} color={accent} h={160} />
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <CardHeader label="Next Milestone" />
          {pred && pred.status === 'ok' && pred.milestone != null ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 64, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                  {convertWeight(pred.milestone, unit)}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', paddingBottom: 8 }}>{unit}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>
                ~{pred.projected_date ? formatDate(pred.projected_date) : ''}
              </div>
              {pred.ci_earliest && pred.ci_latest ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                  95% CI: {formatDate(pred.ci_earliest)} – {formatDate(pred.ci_latest)}
                </div>
              ) : null}
              {pred.slope_per_week != null ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  +{pred.slope_per_week} {unit}/week trend
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
              {pred?.status === 'no_positive_trend'
                ? 'No upward trend — keep pushing and it will appear.'
                : pred?.status === 'no_milestone'
                  ? 'You are beyond the milestone table. Strong.'
                  : 'Log 4+ sessions in 8 weeks for a projection.'}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader label="PR Timeline" />
          {prs.data && prs.data.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...prs.data].reverse().map((pr) => (
                <div
                  key={pr.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'var(--bg-card-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{exercise?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{formatDate(pr.achieved_on)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
                      {convertWeight(pr.value, unit)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{unit}</span>
                    </div>
                    <div style={{ marginTop: 3 }}>
                      <Pill variant={pr.record_type === 'e1rm' ? 'e1rm' : 'pr'}>
                        {pr.record_type === 'e1rm' ? 'e1RM' : 'top weight'}
                      </Pill>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No PRs yet — they'll appear as you log working sets.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
