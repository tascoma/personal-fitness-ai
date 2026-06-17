import { useState } from 'react'
import { api } from '../api/client'
import type { Exercise, WorkoutSession } from '../api/types'
import { ExerciseRow, type RowState } from './ExerciseRow'

interface EditSessionModalProps {
  session: WorkoutSession
  exercises: Exercise[]
  onClose: () => void
  onSaved: (updated: WorkoutSession) => void
}

function setsToRows(session: WorkoutSession): RowState[] {
  const order: string[] = []
  const groups = new Map<string, RowState>()

  for (const s of session.sets) {
    const key = `${s.exercise_id}|${s.is_warmup}|${s.weight}|${s.reps}`
    if (!groups.has(key)) {
      order.push(key)
      groups.set(key, {
        key: crypto.randomUUID(),
        exerciseId: s.exercise_id,
        weight: s.weight,
        reps: s.reps,
        sets: 0,
        isWarmup: s.is_warmup,
      })
    }
    groups.get(key)!.sets++
  }

  return order.map((k) => groups.get(k)!)
}

function makeRow(exerciseId: number | null = null): RowState {
  return { key: crypto.randomUUID(), exerciseId, weight: 135, reps: 5, sets: 3, isWarmup: false }
}

export function EditSessionModal({ session, exercises, onClose, onSaved }: EditSessionModalProps) {
  const [date, setDate] = useState(session.date)
  const [rows, setRows] = useState<RowState[]>(() => setsToRows(session))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow(exercises[0]?.id ?? null)])
  }

  async function saveChanges() {
    setSaving(true)
    setError(null)
    try {
      if (date !== session.date) {
        await api.patch(`/sessions/${session.id}`, { date })
      }

      for (const s of session.sets) {
        await api.delete(`/sets/${s.id}`)
      }

      for (const row of rows) {
        if (row.exerciseId === null) continue
        for (let i = 0; i < row.sets; i++) {
          await api.post(`/sessions/${session.id}/sets`, {
            exercise_id: row.exerciseId,
            weight: row.weight,
            reps: row.reps,
            is_warmup: row.isWarmup,
          })
        }
      }

      const updated = await api.get<WorkoutSession>(`/sessions/${session.id}`)
      onSaved(updated)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 16px 24px',
          width: '100%',
          maxWidth: 600,
          maxHeight: '90dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Edit Workout
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

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
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
            disableAutoFetch
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

        {error ? <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p> : null}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px 0',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-head)',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving || rows.every((r) => r.exerciseId === null)}
            style={{
              flex: 2,
              padding: '14px 0',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              color: '#fff',
              fontFamily: 'var(--font-head)',
              fontSize: 15,
              fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
