import { useEffect, useId, useRef, useState } from 'react'

/** Counts up from 0 to `target` with an ease-out cubic curve. */
export function AnimNum({ target, duration = 700 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0)
  const t0 = useRef<number | null>(null)
  useEffect(() => {
    t0.current = null
    let raf: number
    function tick(ts: number) {
      if (!t0.current) t0.current = ts
      const p = Math.min((ts - t0.current) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return <>{val.toLocaleString()}</>
}

export interface SparkPoint {
  v: number
}

export function Sparkline({
  data,
  color = '#f97316',
  h = 40,
}: {
  data: SparkPoint[]
  color?: string
  h?: number
}) {
  const id = useId().replace(/:/g, '')
  if (!data || data.length < 2) return null
  const W = 100
  const vs = data.map((d) => d.v)
  const mn = Math.min(...vs)
  const mx = Math.max(...vs)
  const rng = mx - mn || 1
  const px = (i: number) => (i / (data.length - 1)) * W
  const py = (v: number) => h - ((v - mn) / rng) * (h - 4) - 2
  const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(d.v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${W},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export interface LinePoint {
  d: string
  v: number
}

export function LineChart({
  data,
  color = '#f97316',
  h = 200,
}: {
  data: LinePoint[]
  color?: string
  h?: number
}) {
  const id = useId().replace(/:/g, '')
  if (!data || data.length < 2)
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40, fontSize: 13 }}>
        Log more sessions to see this chart.
      </div>
    )
  const W = 500
  const PB = 28
  const PT = 10
  const PX = 6
  const vs = data.map((d) => d.v)
  const mn = Math.min(...vs) * 0.97
  const mx = Math.max(...vs) * 1.01
  const rng = mx - mn || 1
  const cx = (i: number) => PX + (i / (data.length - 1)) * (W - PX * 2)
  const cy = (v: number) => PT + (1 - (v - mn) / rng) * (h - PT - PB)
  const pts = data.map((d, i) => `${cx(i).toFixed(1)},${cy(d.v).toFixed(1)}`).join(' ')
  const area = `${cx(0).toFixed(1)},${h - PB} ${pts} ${cx(data.length - 1).toFixed(1)},${h - PB}`
  const step = Math.ceil(data.length / 5)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={PX}
          x2={W - PX}
          y1={PT + (1 - t) * (h - PT - PB)}
          y2={PT + (1 - t) * (h - PT - PB)}
          stroke="var(--border)"
          strokeWidth="1"
        />
      ))}
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={cx(i)}
          cy={cy(d.v)}
          r={i === data.length - 1 ? 4 : 2.5}
          fill={i === data.length - 1 ? color : 'var(--bg-card)'}
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
      {data.map((d, i) =>
        i % step !== 0 && i !== data.length - 1 ? null : (
          <text
            key={i}
            x={cx(i)}
            y={h - 8}
            textAnchor="middle"
            style={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter,sans-serif' }}
          >
            {d.d}
          </text>
        ),
      )}
    </svg>
  )
}

export interface BarPoint {
  b: string
  v: number
}

export function BarChart({
  data,
  color = '#f97316',
  h = 140,
}: {
  data: BarPoint[]
  color?: string
  h?: number
}) {
  if (!data || !data.length)
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40, fontSize: 13 }}>
        No working sets logged yet.
      </div>
    )
  const W = 500
  const PB = 28
  const PT = 8
  const mx = Math.max(...data.map((d) => d.v)) || 1
  const bw = W / data.length
  const bar = bw * 0.6
  const step = Math.ceil(data.length / 6)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.v / mx) * (h - PT - PB)
        return (
          <rect
            key={i}
            x={i * bw + (bw - bar) / 2}
            y={h - PB - bh}
            width={bar}
            height={bh}
            fill={color}
            opacity="0.85"
            rx="2"
          />
        )
      })}
      {data.map((d, i) =>
        i % step !== 0 && i !== data.length - 1 ? null : (
          <text
            key={i}
            x={i * bw + bw / 2}
            y={h - 8}
            textAnchor="middle"
            style={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter,sans-serif' }}
          >
            {d.b}
          </text>
        ),
      )}
    </svg>
  )
}
