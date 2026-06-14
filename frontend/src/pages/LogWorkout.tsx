import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type {
  Exercise,
  RecommendationsResponse,
  WorkoutSession,
  WorkoutSet,
} from '../api/types'
import { SetRow } from '../components/SetRow'
import { Stepper } from '../components/Stepper'
import { AIBadge, Card, CardHeader, LoadingSkeleton, Pill } from '../components/ui'
import { useApp } from '../context/app'
import { useFetch } from '../hooks/useFetch'
import { convertWeight, displayWeight, todayISO } from '../lib/units'

export function LogWorkout() {
  const { settings, unit, formula } = useApp()

  const { data, loading, error } = useFetch(async () => {
    const today = todayISO()
    const [exercises, recent, todays] = await Promise.all([
      api.get<Exercise[]>('/exercises'),
      api.get<WorkoutSession[]>('/sessions?limit=1'),
      api.get<WorkoutSession[]>(`/sessions?from=${today}&to=${today}&limit=1`),
    ])
    return { exercises, recent, todays }
  })
  const recommendations = useFetch(() => api.get<RecommendationsResponse>('/ai/recommendations'))

  const [chosenExerciseId, setChosenExerciseId] = useState<number | null>(null)
  const [weight, setWeight] = useState(135)
  const [reps, setReps] = useState(5)
  const [isWarmup, setIsWarmup] = useState(false)
  const [flash, setFlash] = useState(false)
  const [sessionState, setSessionState] = useState<WorkoutSession | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
        const working = sessions[0]?.sets.filter((s) => s.exercise_id === exerciseId && !s.is_warmup)
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

  if (loading || !settings) return <LoadingSkeleton lines={5} />
  if (error || !data) return <p className="error">{error ?? 'Failed to load'}</p>

  const { exercises } = data
  const exercise = exercises.find((e) => e.id === exerciseId)
  const step = exercise?.increment ?? 5

  async function logSet() {
    if (!exercise) return
    setSaving(true)
    setSaveError(null)
    try {
      const session = todaySession ?? (await api.post<WorkoutSession>('/sessions', { date: todayISO() }))
      const set = await api.post<WorkoutSet>(`/sessions/${session.id}/sets`, {
        exercise_id: exercise.id,
        weight,
        reps,
        is_warmup: isWarmup,
      })
      setSessionState({ ...session, sets: [...session.sets, set] })
      setFlash(true)
      setTimeout(() => setFlash(false), 400)
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

  const todaysSets = todaySession?.sets.filter((s) => s.exercise_id === exerciseId) ?? []
  const e1rmOf = (s: WorkoutSet) => (formula === 'brzycki' ? s.e1rm_brzycki : s.e1rm_epley)
  const workingSets = todaysSets.filter((s) => !s.is_warmup)
  const sessionVol = workingSets.reduce((t, s) => t + s.weight * s.reps, 0)
  const topSet = workingSets.reduce((m, s) => Math.max(m, e1rmOf(s)), 0)

  // A working set is a PR when its e1RM beats every earlier working set today.
  const prSetIds = new Set<number>()
  let runningMax = 0
  for (const s of todaysSets) {
    if (!s.is_warmup) {
      if (e1rmOf(s) > runningMax) {
        prSetIds.add(s.id)
        runningMax = e1rmOf(s)
      }
    }
  }

  const target = recommendations.data?.targets.find((t) => t.exercise_name === exercise?.name)
  const targetRationale = recommendations.data?.narrative.per_lift.find(
    (l) => l.exercise === exercise?.name,
  )?.rationale

  const summaryStats = [
    { label: 'Sets', value: todaysSets.length.toString() },
    { label: 'Working Sets', value: workingSets.length.toString() },
    { label: `Volume (${unit})`, value: convertWeight(sessionVol, unit).toLocaleString() },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* Left — controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 16px' }}>
          <select
            value={exerciseId ?? ''}
            onChange={(e) => setChosenExerciseId(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-head)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-h)',
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            {exercises.map((e) => (
              <option key={e.id} value={e.id} style={{ background: '#16161d', fontFamily: 'Inter,sans-serif', fontSize: 16 }}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <Stepper label={unit} value={weight} step={step} min={step} onChange={setWeight} format={(v) => displayWeight(v, unit)} />
        <Stepper label="reps" value={reps} step={1} min={1} onChange={setReps} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setIsWarmup((w) => !w)}
            style={{
              padding: '8px 24px',
              borderRadius: 999,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
              background: isWarmup ? 'rgba(251,191,36,0.1)' : 'var(--bg-input)',
              border: isWarmup ? '1px solid rgba(251,191,36,0.4)' : '1px solid var(--border)',
              color: isWarmup ? '#fbbf24' : 'var(--text-muted)',
            }}
          >
            {isWarmup ? '◉ warm-up set' : '◎ working set'}
          </button>
        </div>

        <button
          onClick={logSet}
          disabled={saving || !exercise}
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
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.08s',
            boxShadow: '0 4px 28px rgba(249,115,22,0.25)',
            transform: flash ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {saving ? 'Logging…' : 'Log Set'}
        </button>
        {saveError ? <p className="error">{saveError}</p> : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {summaryStats.map((stat) => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — logged sets + AI target */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {todaysSets.length > 0 ? (
          <Card>
            <CardHeader
              label={`Today — ${exercise?.name ?? ''}`}
              right={topSet > 0 ? <Pill variant="e1rm">e1RM {convertWeight(topSet, unit)} {unit}</Pill> : undefined}
            />
            {todaysSets.map((s) => (
              <SetRow key={s.id} set={s} settings={settings} isPr={prSetIds.has(s.id)} onDelete={() => deleteSet(s.id)} />
            ))}
          </Card>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              background: 'var(--bg-card)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            Logged sets will appear here
          </div>
        )}
        <Card>
          <CardHeader label="AI Target" right={<AIBadge />} />
          {target ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-card-raised)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: 14, marginBottom: 3 }}>{target.exercise_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{targetRationale}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 30, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                  {displayWeight(target.target_weight, unit)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {unit} · {target.rep_scheme}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Pill variant={target.action}>{target.action}</Pill>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Select an exercise with AI targets to see a recommendation.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
