import type { UserSettings, WorkoutSet } from '../api/types'
import { displayWeight } from '../lib/units'
import { Pill } from './ui'

interface SetRowProps {
  set: WorkoutSet
  settings: UserSettings
  isPr?: boolean
  onDelete?: () => void
}

export function SetRow({ set, settings, isPr, onDelete }: SetRowProps) {
  const e1rm = settings.e1rm_formula === 'brzycki' ? set.e1rm_brzycki : set.e1rm_epley
  const unit = settings.unit
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
        animation: 'rowIn 0.2s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>
          {displayWeight(set.weight, unit)}{' '}
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{unit}</span>
          {' × '}
          {set.reps}
        </span>
        {set.is_warmup && <Pill variant="warmup">warm-up</Pill>}
        {isPr && <Pill variant="pr">★ PR</Pill>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {!set.is_warmup && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            e1RM {displayWeight(e1rm, unit)} {unit}
          </span>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label="delete set"
            onClick={onDelete}
            style={{
              padding: '3px 9px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
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
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
