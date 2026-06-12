import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Exercise, UserSettings, WorkoutSession, WorkoutSet } from '../api/types'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { SetRow } from '../components/SetRow'
import { Stepper } from '../components/Stepper'
import { useFetch } from '../hooks/useFetch'
import { displayWeight, todayISO } from '../lib/units'

export function LogWorkout() {
  const { data, loading, error } = useFetch(async () => {
    const today = todayISO()
    const [exercises, settings, recent, todays] = await Promise.all([
      api.get<Exercise[]>('/exercises'),
      api.get<UserSettings>('/settings'),
      api.get<WorkoutSession[]>('/sessions?limit=1'),
      api.get<WorkoutSession[]>(`/sessions?from=${today}&to=${today}&limit=1`),
    ])
    return { exercises, settings, recent, todays }
  })

  const [chosenExerciseId, setChosenExerciseId] = useState<number | null>(null)
  const [weight, setWeight] = useState(135)
  const [reps, setReps] = useState(5)
  const [isWarmup, setIsWarmup] = useState(false)
  const [sessionState, setSessionState] = useState<WorkoutSession | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Defaults are derived, not synced into state: last-used exercise, today's session.
  const exerciseId =
    chosenExerciseId ?? data?.recent[0]?.sets[0]?.exercise_id ?? data?.exercises[0]?.id ?? null
  const todaySession = sessionState ?? data?.todays[0] ?? null

  // Pre-fill weight/reps from the most recent working set of the chosen lift.
  useEffect(() => {
    if (exerciseId === null) return
    let cancelled = false
    api
      .get<WorkoutSession[]>(`/sessions?exercise_id=${exerciseId}&limit=1`)
      .then((sessions) => {
        if (cancelled) return
        const working = sessions[0]?.sets.filter(
          (s) => s.exercise_id === exerciseId && !s.is_warmup,
        )
        if (working && working.length > 0) {
          const top = working.reduce((a, b) => (b.weight > a.weight ? b : a))
          setWeight(top.weight)
          setReps(top.reps)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  if (loading) return <LoadingSkeleton lines={5} />
  if (error || !data) return <p className="error">{error ?? 'Failed to load'}</p>

  const { exercises, settings } = data
  const exercise = exercises.find((e) => e.id === exerciseId)
  const step = exercise?.increment ?? 5

  async function logSet() {
    if (!exercise) return
    setSaving(true)
    setSaveError(null)
    try {
      const session =
        todaySession ?? (await api.post<WorkoutSession>('/sessions', { date: todayISO() }))
      const set = await api.post<WorkoutSet>(`/sessions/${session.id}/sets`, {
        exercise_id: exercise.id,
        weight,
        reps,
        is_warmup: isWarmup,
      })
      setSessionState({ ...session, sets: [...session.sets, set] })
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSet(setId: number) {
    if (!todaySession) return
    await api.delete(`/sets/${setId}`)
    setSessionState({ ...todaySession, sets: todaySession.sets.filter((s) => s.id !== setId) })
  }

  const todaysSetsForExercise = todaySession?.sets.filter((s) => s.exercise_id === exerciseId) ?? []

  return (
    <>
      <h1>Log workout</h1>

      <div className="card stack">
        <div>
          <label htmlFor="exercise">Exercise</label>
          <select
            id="exercise"
            value={exerciseId ?? ''}
            onChange={(e) => setChosenExerciseId(Number(e.target.value))}
          >
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <Stepper
          label={settings.unit}
          value={weight}
          step={step}
          min={step}
          onChange={setWeight}
          format={(v) => displayWeight(v, settings.unit)}
        />
        <Stepper label="reps" value={reps} step={1} min={1} onChange={setReps} />

        <label className="row" style={{ marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={isWarmup}
            onChange={(e) => setIsWarmup(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Warm-up set
        </label>

        <button className="primary" onClick={logSet} disabled={saving || !exercise}>
          {saving ? 'Logging…' : 'Log set'}
        </button>
        {saveError ? <p className="error">{saveError}</p> : null}
      </div>

      {todaysSetsForExercise.length > 0 ? (
        <div className="card stack">
          <h2>Today — {exercise?.name}</h2>
          {todaysSetsForExercise.map((s) => (
            <SetRow key={s.id} set={s} settings={settings} onDelete={() => deleteSet(s.id)} />
          ))}
        </div>
      ) : null}
    </>
  )
}
