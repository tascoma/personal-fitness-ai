import { api } from '../../api/client'
import type { DashboardResponse } from '../../api/types'
import { AIBadge, Card, CardHeader, LoadingSkeleton } from '../ui'
import { useFetch } from '../../hooks/useFetch'

/** Consolidated "state of training" AI narrative: headline, highlights, watch-items. */
export function AIDashboardInsight() {
  const dash = useFetch(() => api.get<DashboardResponse>('/ai/dashboard'))

  return (
    <Card>
      <CardHeader
        label="State of Training"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={dash.refetch}
              disabled={dash.loading}
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              ↻ refresh
            </button>
            <AIBadge />
          </div>
        }
      />
      {dash.loading ? (
        <LoadingSkeleton lines={4} />
      ) : dash.error ? (
        <p className="error">{dash.error}</p>
      ) : dash.data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-h)', lineHeight: 1.45 }}>
            {dash.data.insight.headline}
          </p>
          {dash.data.insight.highlights.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--green)', marginBottom: 6 }}>
                HIGHLIGHTS
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {dash.data.insight.highlights.map((h, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--green)' }}>▸</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dash.data.insight.watch_items.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--amber)', marginBottom: 6 }}>
                WATCH
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {dash.data.insight.watch_items.map((w, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--amber)' }}>▸</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  )
}
