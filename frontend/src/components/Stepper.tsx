interface StepperProps {
  label: string
  value: number
  step: number
  min?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function Stepper({ label, value, step, min = 0, onChange, format }: StepperProps) {
  const shown = format ? format(value) : `${value}`
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} aria-label={`decrease ${label}`}>
        −
      </button>
      <div className="value">
        {shown}
        <small>{label}</small>
      </div>
      <button type="button" onClick={() => onChange(value + step)} aria-label={`increase ${label}`}>
        +
      </button>
    </div>
  )
}
