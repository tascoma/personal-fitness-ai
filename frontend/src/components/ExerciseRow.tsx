import { useEffect, useRef } from 'react'
import { api } from '../api/client'
import type { Exercise, WorkoutSession } from '../api/types'
import { useApp } from '../context/app'
import { displayWeight } from '../lib/units'
import { Stepper } from './Stepper'

export interface RowState {
  key: string
  exerciseId: number | null
  weight: number
  reps: number
  sets: number
  isWarmup: boolean
}

interface ExerciseRowProps {
  row: RowState
  exercises: Exercise[]
  onUpdate: (patch: Partial<RowState>) => void
  onRemove: () => void
  showRemove: boolean
  disableAutoFetch?: boolean
}

export function ExerciseRow({ row, exercises, onUpdate, onRemove, showRemove, disableAutoFetch }: ExerciseRowProps) {
  const { unit } = useApp()
  const exercise = exercises.find((e) => e.id === row.exerciseId)
  const step = exercise?.increment ?? 5
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (disableAutoFetch || row.exerciseId === null) return
    if (exercise?.is_bodyweight) {
      onUpdateRef.current({ weight: 0 })
      return
    }
    let cancelled = false
    api
      .get<WorkoutSession[]>(`/sessions?exercise_id=${row.exerciseId}&limit=1`)
      .then((sessions) => {
        if (cancelled) return
        const working = sessions[0]?.sets.filter((s) => s.exercise_id === row.exerciseId && !s.is_warmup)
        if (working && working.length > 0) {
          const top = working.reduce((a, b) => (b.weight > a.weight ? b : a))
          onUpdateRef.current({ weight: top.weight, reps: top.reps })
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [row.exerciseId, disableAutoFetch, exercise?.is_bodyweight])

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <select
          value={row.exerciseId ?? ''}
          onChange={(e) => onUpdate({ exerciseId: Number(e.target.value) })}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-head)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-h)',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          {exercises.map((e) => (
            <option
              key={e.id}
              value={e.id}
              style={{ background: '#16161d', fontFamily: 'Inter,sans-serif', fontSize: 16 }}
            >
              {e.name}
            </option>
          ))}
        </select>
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f87171'
              e.currentTarget.style.color = '#f87171'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {exercise?.is_bodyweight ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '6px 0',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              weight
            </span>
            <span
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              BW
            </span>
          </div>
        ) : (
          <Stepper
            label={unit}
            value={row.weight}
            step={step}
            min={step}
            onChange={(weight) => onUpdate({ weight })}
            format={(v) => displayWeight(v, unit)}
          />
        )}
        <Stepper label="sets" value={row.sets} step={1} min={1} onChange={(sets) => onUpdate({ sets })} />
        <Stepper label="reps" value={row.reps} step={1} min={1} onChange={(reps) => onUpdate({ reps })} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => onUpdate({ isWarmup: !row.isWarmup })}
          style={{
            padding: '7px 20px',
            borderRadius: 999,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.04em',
            transition: 'all 0.15s',
            background: row.isWarmup ? 'rgba(251,191,36,0.1)' : 'var(--bg-input)',
            border: row.isWarmup ? '1px solid rgba(251,191,36,0.4)' : '1px solid var(--border)',
            color: row.isWarmup ? '#fbbf24' : 'var(--text-muted)',
          }}
        >
          {row.isWarmup ? '◉ warm-up sets' : '◎ working sets'}
        </button>
      </div>
    </div>
  )
}
