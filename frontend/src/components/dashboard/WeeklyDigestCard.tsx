import type { DigestResponse } from '../../api/types'
import { AIBadge, Card, CardHeader, LoadingSkeleton } from '../ui'

/** AI weekly digest: summary plus a single focus for next week. */
export function WeeklyDigestCard({
  digest,
}: {
  digest: { loading: boolean; error: string | null; data: DigestResponse | null }
}) {
  return (
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
  )
}
