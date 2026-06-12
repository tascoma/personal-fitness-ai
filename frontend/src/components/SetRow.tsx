import type { UserSettings, WorkoutSet } from '../api/types'
import { displayWeight } from '../lib/units'

interface SetRowProps {
  set: WorkoutSet
  settings: UserSettings
  exerciseName?: string
  onDelete?: () => void
}

export function SetRow({ set, settings, exerciseName, onDelete }: SetRowProps) {
  const e1rm = settings.e1rm_formula === 'brzycki' ? set.e1rm_brzycki : set.e1rm_epley
  return (
    <div className="row-between">
      <div className="row" style={{ gap: 8 }}>
        <span style={{ color: 'var(--text-h)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
          {displayWeight(set.weight, settings.unit)} {settings.unit} × {set.reps}
        </span>
        {exerciseName ? <span className="muted">{exerciseName}</span> : null}
        {set.is_warmup ? <span className="pill amber">warm-up</span> : null}
        {set.rpe != null ? <span className="pill">RPE {set.rpe}</span> : null}
      </div>
      <div className="row">
        {!set.is_warmup ? (
          <span className="muted">
            e1RM {displayWeight(e1rm, settings.unit)}
          </span>
        ) : null}
        {onDelete ? (
          <button type="button" onClick={onDelete} aria-label="delete set" style={{ padding: '4px 10px' }}>
            ✕
          </button>
        ) : null}
      </div>
    </div>
  )
}
