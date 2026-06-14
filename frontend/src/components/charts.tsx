import type { MouseEvent, ReactNode } from 'react'
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
  format = (v: number) => v.toLocaleString(),
}: {
  data: LinePoint[]
  color?: string
  h?: number
  format?: (v: number) => string
}) {
  const id = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
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

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(cx(i) - vx)
      if (dist < best) {
        best = dist
        nearest = i
      }
    }
    setHover(nearest)
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${h}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
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
        {hover !== null && (
          <line
            x1={cx(hover)}
            x2={cx(hover)}
            y1={PT}
            y2={h - PB}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
        )}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={cx(i)}
            cy={cy(d.v)}
            r={i === hover ? 5 : i === data.length - 1 ? 4 : 2.5}
            fill={i === hover || i === data.length - 1 ? color : 'var(--bg-card)'}
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
      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${(cx(hover) / W) * 100}%`,
            transform: `translateX(${hover > data.length / 2 ? '-100%' : '0'}) translateX(${
              hover > data.length / 2 ? -8 : 8
            }px)`,
            pointerEvents: 'none',
            background: 'var(--bg-card-raised)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, color: 'var(--text-h)', lineHeight: 1 }}>
            {format(data[hover].v)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{data[hover].d}</div>
        </div>
      )}
    </div>
  )
}

/** Horizontal progress bar from `value` toward `max`, with optional markers. */
export function ProgressBar({
  value,
  max,
  color = '#f97316',
  h = 10,
}: {
  value: number
  max: number
  color?: string
  h?: number
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div
      style={{
        width: '100%',
        height: h,
        background: 'var(--bg-input)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          background: color,
          borderRadius: 999,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  )
}

/** A single circular progress ring (donut). `value`/`max` fills the arc. */
export function Donut({
  value,
  max,
  color = '#f97316',
  size = 96,
  stroke = 9,
  children,
}: {
  value: number
  max: number
  color?: string
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-input)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export interface HeatCell {
  date: string // ISO yyyy-mm-dd
  value: number
}

/** GitHub-style training calendar: columns = ISO weeks, rows = Mon..Sun.
 *  Cell intensity scales with `value` (e.g. session tonnage that day). */
export function CalendarHeatmap({
  cells,
  weeks = 16,
  color = '#f97316',
}: {
  cells: HeatCell[]
  weeks?: number
  color?: string
}) {
  const byDate = new Map(cells.map((c) => [c.date, c.value]))
  const max = Math.max(1, ...cells.map((c) => c.value))

  // Build a grid ending on the current week's Sunday, going back `weeks` columns.
  const today = new Date()
  const dow = (today.getDay() + 6) % 7 // Mon=0..Sun=6
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - dow)
  const firstMonday = new Date(lastMonday)
  firstMonday.setDate(lastMonday.getDate() - (weeks - 1) * 7)

  const iso = (dt: Date) => {
    const m = `${dt.getMonth() + 1}`.padStart(2, '0')
    const d = `${dt.getDate()}`.padStart(2, '0')
    return `${dt.getFullYear()}-${m}-${d}`
  }

  const columns: { date: string; value: number; future: boolean }[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; value: number; future: boolean }[] = []
    for (let day = 0; day < 7; day++) {
      const dt = new Date(firstMonday)
      dt.setDate(firstMonday.getDate() + w * 7 + day)
      const key = iso(dt)
      col.push({ date: key, value: byDate.get(key) ?? 0, future: dt > today })
    }
    columns.push(col)
  }

  const cellColor = (value: number, future: boolean) => {
    if (future) return 'transparent'
    if (value <= 0) return 'var(--bg-input)'
    const intensity = 0.25 + 0.75 * (value / max)
    return `color-mix(in srgb, ${color} ${Math.round(intensity * 100)}%, transparent)`
  }

  const GAP = 3
  const SIZE = 13
  return (
    <div style={{ display: 'flex', gap: GAP, overflowX: 'auto' }}>
      {columns.map((col, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {col.map((cell) => (
            <div
              key={cell.date}
              title={cell.future ? cell.date : `${cell.date} · ${Math.round(cell.value).toLocaleString()}`}
              style={{
                width: SIZE,
                height: SIZE,
                borderRadius: 3,
                background: cellColor(cell.value, cell.future),
                border: cell.future ? 'none' : '1px solid var(--border-subtle)',
              }}
            />
          ))}
        </div>
      ))}
    </div>
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
