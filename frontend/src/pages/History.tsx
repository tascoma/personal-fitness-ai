import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Exercise, WorkoutSession } from '../api/types'
import { Card, LoadingSkeleton } from '../components/ui'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { convertWeight, formatDate } from '../lib/units'

export function History() {
  const { unit } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [exerciseFilter, setExerciseFilter] = useState('')

  const exercises = useFetch(() => api.get<Exercise[]>('/exercises'))
  const sessions = useFetch(() => {
    const params = new URLSearchParams({ limit: '100' })
    if (q.trim()) params.set('q', q.trim())
    if (exerciseFilter) params.set('exercise_id', exerciseFilter)
    return api.get<WorkoutSession[]>(`/sessions?${params}`)
  }, [q, exerciseFilter])

  const exerciseName = (id: number) => exercises.data?.find((e) => e.id === id)?.name ?? `#${id}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%' }} />
          <select value={exerciseFilter} onChange={(e) => setExerciseFilter(e.target.value)} style={{ width: '100%' }}>
            <option value="">All exercises</option>
            {exercises.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {sessions.loading ? <LoadingSkeleton lines={5} /> : null}
      {sessions.error ? <p className="error">{sessions.error}</p> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.data?.map((s) => {
          const names = [...new Set(s.sets.map((set) => exerciseName(set.exercise_id)))]
          const volume = s.sets.filter((set) => !set.is_warmup).reduce((t, set) => t + set.weight * set.reps, 0)
          return (
            <Card
              key={s.id}
              style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div
                onClick={() => navigate(`/sessions/${s.id}`)}
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
                    {formatDate(s.date)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {names.length > 0 ? (
                      names.map((name) => (
                        <span
                          key={name}
                          style={{
                            fontSize: 12,
                            padding: '3px 9px',
                            background: 'var(--bg-card-raised)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 6,
                            color: 'var(--text)',
                          }}
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>empty session</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--text-h)' }}>{s.sets.length}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 5 }}>sets</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {convertWeight(volume, unit).toLocaleString()} {unit}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
        {sessions.data && sessions.data.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48, fontSize: 13 }}>No sessions found.</div>
        ) : null}
      </div>
    </div>
  )
}
