import { api } from '../../api/client'
import type { RecentPR } from '../../api/types'
import { Card, CardHeader, LoadingSkeleton, Pill } from '../ui'
import { useFetch } from '../../hooks/useFetch'
import { convertWeight, formatDate } from '../../lib/units'

/** Cross-exercise feed of the most recent personal records. */
export function RecentPRsCard({ unit }: { unit: 'lbs' | 'kg' }) {
  const prs = useFetch(() => api.get<RecentPR[]>('/analytics/recent-prs?limit=8'))

  return (
    <Card>
      <CardHeader label="Recent PRs" />
      {prs.loading ? (
        <LoadingSkeleton lines={3} />
      ) : prs.error ? (
        <p className="error">{prs.error}</p>
      ) : prs.data && prs.data.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {prs.data.map((pr) => (
            <div
              key={pr.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                background: 'var(--bg-card-raised)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--text-h)',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pr.exercise_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(pr.achieved_on)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>
                  {convertWeight(pr.value, unit)}
                </span>
                <Pill variant={pr.record_type === 'e1rm' ? 'e1rm' : 'pr'}>
                  {pr.record_type === 'e1rm' ? 'e1RM' : 'weight'}
                </Pill>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No PRs yet — they appear as you set new bests.</p>
      )}
    </Card>
  )
}
