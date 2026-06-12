import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type {
  Exercise,
  InsightResponse,
  UserSettings,
  WorkoutSession,
  WorkoutSet,
} from '../api/types'
import { AIBadge } from '../components/AIBadge'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { SetRow } from '../components/SetRow'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../lib/units'

export function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editReps, setEditReps] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useFetch(async () => {
    const [session, exercises, settings] = await Promise.all([
      api.get<WorkoutSession>(`/sessions/${id}`),
      api.get<Exercise[]>('/exercises'),
      api.get<UserSettings>('/settings'),
    ])
    return { session, exercises, settings }
  }, [id])

  const insight = useFetch(() => api.get<InsightResponse>(`/ai/insight/${id}`), [id])

  if (loading) return <LoadingSkeleton lines={6} />
  if (error || !data) return <p className="error">{error ?? 'Failed to load'}</p>

  const { session, exercises, settings } = data
  const exerciseIds = [...new Set(session.sets.map((s) => s.exercise_id))]
  const exerciseName = (eid: number) => exercises.find((e) => e.id === eid)?.name ?? `#${eid}`

  async function saveSetEdit() {
    if (!editingSet) return
    setActionError(null)
    try {
      await api.patch(`/sets/${editingSet.id}`, {
        weight: Number(editWeight),
        reps: Number(editReps),
      })
      setEditingSet(null)
      refetch()
      insight.refetch()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  async function deleteSet(setId: number) {
    setActionError(null)
    try {
      await api.delete(`/sets/${setId}`)
      refetch()
      insight.refetch()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  async function deleteSession() {
    if (!window.confirm('Delete this session and all its sets?')) return
    await api.delete(`/sessions/${id}`)
    navigate('/history')
  }

  async function saveNotes() {
    const notes = window.prompt('Session notes', session.notes ?? '')
    if (notes === null) return
    await api.patch(`/sessions/${id}`, { notes })
    refetch()
  }

  return (
    <>
      <div className="row-between">
        <h1>{formatDate(session.date)}</h1>
        <button className="danger" onClick={deleteSession}>
          Delete
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }} onClick={saveNotes}>
        {session.notes ? `“${session.notes}”` : 'Add notes…'}
      </p>
      {actionError ? <p className="error">{actionError}</p> : null}

      {exerciseIds.map((eid) => (
        <div key={eid} className="card stack">
          <h2>{exerciseName(eid)}</h2>
          {session.sets
            .filter((s) => s.exercise_id === eid)
            .map((s) =>
              editingSet?.id === s.id ? (
                <div key={s.id} className="row">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    aria-label="weight"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editReps}
                    onChange={(e) => setEditReps(e.target.value)}
                    aria-label="reps"
                  />
                  <button onClick={saveSetEdit}>Save</button>
                  <button onClick={() => setEditingSet(null)}>✕</button>
                </div>
              ) : (
                <div key={s.id} className="row-between">
                  <div style={{ flex: 1 }}>
                    <SetRow set={s} settings={settings} onDelete={() => deleteSet(s.id)} />
                  </div>
                  <button
                    style={{ padding: '4px 10px', marginLeft: 8 }}
                    onClick={() => {
                      setEditingSet(s)
                      setEditWeight(`${s.weight}`)
                      setEditReps(`${s.reps}`)
                    }}
                  >
                    Edit
                  </button>
                </div>
              ),
            )}
        </div>
      ))}

      <div className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Session insight</h2>
          <AIBadge cached={insight.data?.cached} />
        </div>
        {insight.loading ? <LoadingSkeleton lines={3} /> : null}
        {insight.error ? <p className="error">{insight.error}</p> : null}
        {insight.data ? (
          <div className="stack">
            <p style={{ color: 'var(--text-h)', fontWeight: 600 }}>
              {insight.data.insight.headline}
            </p>
            {insight.data.insight.observations.map((obs, i) => (
              <p key={i} className="muted">
                • {obs}
              </p>
            ))}
            <p>{insight.data.insight.encouragement}</p>
          </div>
        ) : null}
      </div>
    </>
  )
}
