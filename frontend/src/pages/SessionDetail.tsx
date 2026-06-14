import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Exercise, InsightResponse, WorkoutSession, WorkoutSet } from '../api/types'
import { SetRow } from '../components/SetRow'
import { AIBadge, Card, CardHeader, LoadingSkeleton } from '../components/ui'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../lib/units'

export function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useApp()
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editReps, setEditReps] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useFetch(async () => {
    const [session, exercises] = await Promise.all([
      api.get<WorkoutSession>(`/sessions/${id}`),
      api.get<Exercise[]>('/exercises'),
    ])
    return { session, exercises }
  }, [id])

  const insight = useFetch(() => api.get<InsightResponse>(`/ai/insight/${id}`), [id])

  if (loading || !settings) return <LoadingSkeleton lines={6} />
  if (error || !data) return <p className="error">{error ?? 'Failed to load'}</p>

  const { session, exercises } = data
  const exerciseIds = [...new Set(session.sets.map((s) => s.exercise_id))]
  const exerciseName = (eid: number) => exercises.find((e) => e.id === eid)?.name ?? `#${eid}`

  async function saveSetEdit() {
    if (!editingSet) return
    setActionError(null)
    try {
      await api.patch(`/sets/${editingSet.id}`, { weight: Number(editWeight), reps: Number(editReps) })
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--text-h)', textTransform: 'uppercase' }}>
          {formatDate(session.date)}
        </div>
        <button
          onClick={deleteSession}
          style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--red)', fontSize: 13, cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={saveNotes}>
        {session.notes ? `"${session.notes}"` : 'Add notes…'}
      </p>
      {actionError ? <p className="error">{actionError}</p> : null}

      {exerciseIds.map((eid) => (
        <Card key={eid}>
          <CardHeader label={exerciseName(eid)} />
          {session.sets
            .filter((s) => s.exercise_id === eid)
            .map((s) =>
              editingSet?.id === s.id ? (
                <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
                  <input type="number" inputMode="decimal" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} aria-label="weight" style={{ width: 90 }} />
                  <input type="number" inputMode="numeric" value={editReps} onChange={(e) => setEditReps(e.target.value)} aria-label="reps" style={{ width: 70 }} />
                  <button onClick={saveSetEdit} style={{ padding: '8px 12px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Save
                  </button>
                  <button onClick={() => setEditingSet(null)} style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <SetRow set={s} settings={settings} onDelete={() => deleteSet(s.id)} />
                  </div>
                  <button
                    onClick={() => {
                      setEditingSet(s)
                      setEditWeight(`${s.weight}`)
                      setEditReps(`${s.reps}`)
                    }}
                    style={{ padding: '3px 9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </div>
              ),
            )}
        </Card>
      ))}

      <Card>
        <CardHeader label="Session Insight" right={<AIBadge />} />
        {insight.loading ? <LoadingSkeleton lines={3} /> : null}
        {insight.error ? <p className="error">{insight.error}</p> : null}
        {insight.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ color: 'var(--text-h)', fontWeight: 600, fontSize: 14 }}>{insight.data.insight.headline}</p>
            {insight.data.insight.observations.map((obs, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                • {obs}
              </p>
            ))}
            <p style={{ fontSize: 13, color: 'var(--text)' }}>{insight.data.insight.encouragement}</p>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
