import { useState } from 'react'
import { api } from '../api/client'
import type { Exercise } from '../api/types'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { useFetch } from '../hooks/useFetch'

export function Exercises() {
  const { data: exercises, loading, error, refetch } = useFetch(
    () => api.get<Exercise[]>('/exercises'),
  )
  const [name, setName] = useState('')
  const [increment, setIncrement] = useState('5')
  const [isCompound, setIsCompound] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editIncrement, setEditIncrement] = useState('')

  async function addExercise() {
    setFormError(null)
    try {
      await api.post('/exercises', {
        name: name.trim(),
        increment: Number(increment),
        is_compound: isCompound,
      })
      setName('')
      refetch()
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  async function saveIncrement(exercise: Exercise) {
    try {
      await api.patch(`/exercises/${exercise.id}`, { increment: Number(editIncrement) })
      setEditingId(null)
      refetch()
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  async function remove(exercise: Exercise) {
    if (!window.confirm(`Delete ${exercise.name}?`)) return
    try {
      await api.delete(`/exercises/${exercise.id}`)
      refetch()
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  if (loading) return <LoadingSkeleton lines={6} />
  if (error || !exercises) return <p className="error">{error ?? 'Failed to load'}</p>

  return (
    <>
      <h1>Exercises</h1>

      <div className="card stack">
        <h2>Add exercise</h2>
        <input
          placeholder="Name (e.g. Pause Squat)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="inc">Increment (lbs)</label>
            <input
              id="inc"
              type="number"
              inputMode="decimal"
              value={increment}
              onChange={(e) => setIncrement(e.target.value)}
            />
          </div>
          <label className="row" style={{ marginBottom: 0, marginTop: 18 }}>
            <input
              type="checkbox"
              checked={isCompound}
              onChange={(e) => setIsCompound(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Compound
          </label>
        </div>
        <button className="primary" onClick={addExercise} disabled={!name.trim()}>
          Add
        </button>
        {formError ? <p className="error">{formError}</p> : null}
      </div>

      {exercises.map((exercise) => (
        <div key={exercise.id} className="card row-between">
          <div>
            <div style={{ color: 'var(--text-h)', fontWeight: 600 }}>{exercise.name}</div>
            <div className="muted">
              {exercise.is_compound ? 'compound' : 'accessory'}
              {exercise.is_custom ? ' · custom' : ''} · +{exercise.increment} lb steps
            </div>
          </div>
          <div className="row">
            {editingId === exercise.id ? (
              <>
                <input
                  type="number"
                  inputMode="decimal"
                  value={editIncrement}
                  onChange={(e) => setEditIncrement(e.target.value)}
                  style={{ width: 72 }}
                  aria-label="increment"
                />
                <button onClick={() => saveIncrement(exercise)}>Save</button>
              </>
            ) : (
              <button
                onClick={() => {
                  setEditingId(exercise.id)
                  setEditIncrement(`${exercise.increment}`)
                }}
              >
                Edit
              </button>
            )}
            {exercise.is_custom ? (
              <button className="danger" onClick={() => remove(exercise)}>
                ✕
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </>
  )
}
