interface StepperProps {
  label: string
  value: number
  step: number
  min?: number
  onChange: (value: number) => void
  /** Optional display transform (e.g. lbs→kg). Defaults to the raw value. */
  format?: (value: number) => string
}

export function Stepper({ label, value, step, min = 0, onChange, format }: StepperProps) {
  const shown = format ? format(value) : `${value}`
  const btn = (dir: 1 | -1, col: string) => (
    <button
      type="button"
      aria-label={`${dir > 0 ? 'increase' : 'decrease'} ${label}`}
      onClick={() => onChange(dir > 0 ? value + step : Math.max(min, value - step))}
      style={{
        width: 72,
        flexShrink: 0,
        background: 'var(--bg-input)',
        border: 'none',
        color: col,
        fontSize: 32,
        fontWeight: 200,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-raised)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
    >
      {dir > 0 ? '+' : '−'}
    </button>
  )
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {btn(-1, 'var(--text)')}
      <div
        style={{
          flex: 1,
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 0',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: 56,
            fontWeight: 800,
            color: 'var(--text-h)',
            lineHeight: 1,
          }}
        >
          {shown}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          {label}
        </div>
      </div>
      {btn(1, 'var(--accent)')}
    </div>
  )
}
