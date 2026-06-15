import { api } from '../api/client'
import type { Exercise, PersonalRecord, WorkoutSession } from '../api/types'
import { Card, CardHeader, LoadingSkeleton } from '../components/ui'
import { BodyweightCard } from '../components/settings/BodyweightCard'
import { ProfileCard } from '../components/settings/ProfileCard'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'

const FORMULAS: { val: 'epley' | 'brzycki'; label: string; desc: string }[] = [
  { val: 'epley', label: 'Epley', desc: 'w · (1 + r / 30)' },
  { val: 'brzycki', label: 'Brzycki', desc: 'w · 36 / (37 − r)' },
]

export function Settings() {
  const { unit, formula, settings, updateSettings, ready } = useApp()

  const stats = useFetch(async () => {
    const [sessions, exercises] = await Promise.all([
      api.get<WorkoutSession[]>('/sessions?limit=500'),
      api.get<Exercise[]>('/exercises'),
    ])
    const prLists = await Promise.all(
      exercises.map((e) => api.get<PersonalRecord[]>(`/analytics/prs?exercise_id=${e.id}`).catch(() => [])),
    )
    const prCount = prLists.reduce((t, list) => t + list.length, 0)
    return { sessions: sessions.length, exercises: exercises.length, prs: prCount }
  })

  if (!ready) return <LoadingSkeleton lines={4} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {settings && <ProfileCard settings={settings} unit={unit} updateSettings={updateSettings} />}
        <BodyweightCard unit={unit} />
        <Card>
          <CardHeader label="Weight Unit" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['lbs', 'kg'] as const).map((u) => (
              <button
                key={u}
                onClick={() => updateSettings({ unit: u })}
                style={{
                  padding: '18px 0',
                  background: unit === u ? 'var(--accent)' : 'var(--bg-input)',
                  border: unit === u ? 'none' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-head)',
                  fontSize: 26,
                  fontWeight: 800,
                  color: unit === u ? '#fff' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader label="e1RM Formula" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FORMULAS.map((f) => (
              <button
                key={f.val}
                onClick={() => updateSettings({ e1rm_formula: f.val })}
                style={{
                  padding: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: formula === f.val ? 'var(--accent-dim)' : 'var(--bg-input)',
                  border: formula === f.val ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: formula === f.val ? 'var(--accent)' : 'var(--text-h)', marginBottom: 6 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{f.desc}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <CardHeader label="About AI Insights" />
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
            AI insights are generated from your training data. Anything marked{' '}
            <span style={{ color: '#22d3ee', fontWeight: 600 }}>✦ AI</span> was written by the model; all numbers are
            computed locally and deterministically.
          </p>
        </Card>
        <Card>
          <CardHeader label="Data" />
          {stats.data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Total Sessions', value: stats.data.sessions },
                { label: 'Exercises Tracked', value: stats.data.exercises },
                { label: 'PRs Logged', value: stats.data.prs },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-card-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--text-h)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <LoadingSkeleton lines={3} />
          )}
        </Card>
      </div>
    </div>
  )
}
