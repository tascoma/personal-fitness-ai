import { useState } from 'react'
import { api } from '../../api/client'
import type { BodyweightEntry } from '../../api/types'
import { Card, CardHeader, LoadingSkeleton } from '../ui'
import { useFetch } from '../../hooks/useFetch'
import { convertWeight, formatDate, toLbs, todayISO } from '../../lib/units'

/** Log and review bodyweight over time. Weight is stored in lbs. */
export function BodyweightCard({
  unit,
  onChange,
}: {
  unit: 'lbs' | 'kg'
  onChange?: () => void
}) {
  const entries = useFetch(() => api.get<BodyweightEntry[]>('/bodyweight'))
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function log() {
    if (!value) return
    setBusy(true)
    await api.post('/bodyweight', { date: todayISO(), weight: toLbs(Number(value), unit) })
    setValue('')
    setBusy(false)
    entries.refetch()
    onChange?.()
  }

  async function remove(id: number) {
    await api.delete(`/bodyweight/${id}`)
    entries.refetch()
    onChange?.()
  }

  return (
    <Card>
      <CardHeader label="Bodyweight" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          type="number"
          value={value}
          placeholder={`Today's weight (${unit})`}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && log()}
          style={{ flex: 1 }}
        />
        <button
          onClick={log}
          disabled={busy || !value}
          style={{
            padding: '0 18px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Log
        </button>
      </div>
      {entries.loading ? (
        <LoadingSkeleton lines={3} />
      ) : entries.data && entries.data.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.data.slice(0, 8).map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-card-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{formatDate(e.date)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>
                  {convertWeight(e.weight, unit)} {unit}
                </span>
                <button
                  onClick={() => remove(e.id)}
                  aria-label="Delete entry"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No bodyweight logged yet.</p>
      )}
    </Card>
  )
}
