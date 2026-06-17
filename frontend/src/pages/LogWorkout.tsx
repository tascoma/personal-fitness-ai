import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Exercise, WorkoutSession } from '../api/types'
import { EditSessionModal } from '../components/EditSessionModal'
import { ExerciseRow, type RowState } from '../components/ExerciseRow'
import { LoadingSkeleton } from '../components/ui'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { formatDate, todayISO } from '../lib/units'

function makeRow(exerciseId: number | null = null): RowState {
  return { key: crypto.randomUUID(), exerciseId, weight: 135, reps: 5, sets: 3, isWarmup: false }
}

function sessionSummary(session: WorkoutSession, exercises: Exercise[]): string {
  const seen = new Set<number>()
  const names: string[] = []
  for (const s of session.sets) {
    if (!seen.has(s.exercise_id)) {
      seen.add(s.exercise_id)
      const ex = exercises.find((e) => e.id === s.exercise_id)
      if (ex) names.push(ex.name)
    }
  }
  return names.join(', ') || 'No exercises'
}

export function LogWorkout() {
  const { settings } = useApp()

  const { data, loading, error } = useFetch(async () => {
    const [exercises, recent] = await Promise.all([
      api.get<Exercise[]>('/exercises'),
      api.get<WorkoutSession[]>('/sessions?limit=10'),
    ])
    return { exercises, recent }
  })

  const [workoutDate, setWorkoutDate] = useState(todayISO())
  const [rows, setRows] = useState<RowState[]>([makeRow()])
  const [dateSession, setDateSession] = useState<WorkoutSession | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([])
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!data || initializedRef.current) return
    initializedRef.current = true
    const initialId = data.recent[0]?.sets[0]?.exercise_id ?? data.exercises[0]?.id ?? null
    setRows([makeRow(initialId)])
    setRecentSessions(data.recent)
  }, [data])

  useEffect(() => {
    let cancelled = false
    api
      .get<WorkoutSession[]>(`/sessions?from=${workoutDate}&to=${workoutDate}&limit=1`)
      .then((sessions) => {
        if (!cancelled) setDateSession(sessions[0] ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [workoutDate])

  if (loading || !settings) return <LoadingSkeleton lines={5} />
  if (error || !data) return <p className="error">{error ?? 'Failed to load'}</p>

  const { exercises } = data

  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow(exercises[0]?.id ?? null)])
  }

  async function logWorkout() {
    if (rows.every((r) => r.exerciseId === null)) return
    setSaving(true)
    setSaveError(null)
    try {
      const session = dateSession ?? (await api.post<WorkoutSession>('/sessions', { date: workoutDate }))
      const setPayloads = rows.flatMap((row) => {
        if (row.exerciseId === null) return []
        const ex = exercises.find((e) => e.id === row.exerciseId)
        const weight = ex?.is_bodyweight ? 0 : row.weight
        return Array.from({ length: row.sets }, () => ({
          exercise_id: row.exerciseId as number,
          weight,
          reps: row.reps,
          is_warmup: row.isWarmup,
        }))
      })
      if (setPayloads.length > 0) {
        await api.post(`/sessions/${session.id}/sets/bulk`, setPayloads)
      }
      const refreshed = await api.get<WorkoutSession>(`/sessions/${session.id}`)
      setDateSession(refreshed)
      setRecentSessions((prev) => {
        const without = prev.filter((s) => s.id !== refreshed.id)
        return [refreshed, ...without].slice(0, 10)
      })
      setFlash(true)
      setTimeout(() => setFlash(false), 400)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function handleSaved(updated: WorkoutSession) {
    setRecentSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    if (dateSession?.id === updated.id) setDateSession(updated)
    setEditingSession(null)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Date picker */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 16px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            Workout Date
          </div>
          <input
            type="date"
            value={workoutDate}
            max={todayISO()}
            onChange={(e) => setWorkoutDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-head)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-h)',
              cursor: 'pointer',
              width: '100%',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Exercise rows */}
        {rows.map((row) => (
          <ExerciseRow
            key={row.key}
            row={row}
            exercises={exercises}
            onUpdate={(patch) => updateRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
            showRemove={rows.length > 1}
          />
        ))}

        {/* Add Exercise */}
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: 10,
            background: 'transparent',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          + Add Exercise
        </button>

        {/* Log Workout */}
        <button
          onClick={logWorkout}
          disabled={saving || rows.every((r) => r.exerciseId === null)}
          style={{
            width: '100%',
            padding: 20,
            background: flash ? 'rgba(249,115,22,0.7)' : 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontFamily: 'var(--font-head)',
            fontSize: 30,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, transform 0.08s',
            boxShadow: '0 4px 28px rgba(249,115,22,0.25)',
            transform: flash ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {saving ? 'Logging…' : 'Log Workout'}
        </button>
        {saveError ? <p className="error">{saveError}</p> : null}

        {/* Recent Workouts */}
        {recentSessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Recent Workouts
            </div>
            {recentSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setEditingSession(session)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-head)',
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-h)',
                    }}
                  >
                    {formatDate(session.date)}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sessionSummary(session, exercises)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  {session.sets.length} sets ›
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editingSession && (
        <EditSessionModal
          session={editingSession}
          exercises={exercises}
          onClose={() => setEditingSession(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
