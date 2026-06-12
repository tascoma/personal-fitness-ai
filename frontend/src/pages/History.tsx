import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Exercise, WorkoutSession } from '../api/types'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../lib/units'

export function History() {
  const [q, setQ] = useState('')
  const [exerciseFilter, setExerciseFilter] = useState('')

  const exercises = useFetch(() => api.get<Exercise[]>('/exercises'))
  const sessions = useFetch(() => {
    const params = new URLSearchParams({ limit: '100' })
    if (q.trim()) params.set('q', q.trim())
    if (exerciseFilter) params.set('exercise_id', exerciseFilter)
    return api.get<WorkoutSession[]>(`/sessions?${params}`)
  }, [q, exerciseFilter])

  const exerciseName = (id: number) =>
    exercises.data?.find((e) => e.id === id)?.name ?? `#${id}`

  return (
    <>
      <h1>History</h1>

      <div className="card stack">
        <input
          placeholder="Search notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={exerciseFilter} onChange={(e) => setExerciseFilter(e.target.value)}>
          <option value="">All exercises</option>
          {exercises.data?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {sessions.loading ? <LoadingSkeleton lines={5} /> : null}
      {sessions.error ? <p className="error">{sessions.error}</p> : null}
      {sessions.data?.length === 0 ? <p className="muted">No sessions found.</p> : null}
      {sessions.data?.map((session) => {
        const names = [...new Set(session.sets.map((s) => exerciseName(s.exercise_id)))]
        return (
          <Link
            key={session.id}
            to={`/sessions/${session.id}`}
            className="card"
            style={{ display: 'block' }}
          >
            <div className="row-between">
              <span style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                {formatDate(session.date)}
              </span>
              <span className="muted">{session.sets.length} sets</span>
            </div>
            <div className="muted">{names.join(' · ') || 'empty session'}</div>
            {session.notes ? <div className="muted">“{session.notes}”</div> : null}
          </Link>
        )
      })}
    </>
  )
}
