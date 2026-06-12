export function BigNumber({ value, unit, label }: { value: string; unit?: string; label?: string }) {
  return (
    <div>
      <div className="big-number">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {label ? <div className="muted">{label}</div> : null}
    </div>
  )
}
