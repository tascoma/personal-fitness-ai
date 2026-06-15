import type { Exercise, ExerciseSeries, LiftTarget, RelativeStrengthLift } from '../../api/types'
import { AnimNum, Sparkline } from '../charts'
import { Card, Pill } from '../ui'
import { convertWeight } from '../../lib/units'

const TREND_GREEN = '#4ade80'
const TREND_RED = '#f87171'
const TREND_AMBER = '#fbbf24'

/** A single hero-lift KPI card: current e1RM, trend vs prior avg, sparkline. */
export function HeroLiftCard({
  exercise,
  series,
  target,
  rel,
  unit,
  accent,
  selected,
  onSelect,
}: {
  exercise: Exercise
  series?: ExerciseSeries
  target?: LiftTarget
  rel?: RelativeStrengthLift
  unit: 'lbs' | 'kg'
  accent: string
  selected: boolean
  onSelect: () => void
}) {
  const points = series?.series ?? []
  const lastE1rm = points.length ? points[points.length - 1].e1rm : 0
  const earlier = points.slice(0, -1)
  const avg = earlier.length ? earlier.reduce((a, p) => a + p.e1rm, 0) / earlier.length : lastE1rm
  const trend = avg > 0 ? ((lastE1rm - avg) / avg) * 100 : 0
  const plateau = target?.plateau ?? false
  const deload = target?.deload ?? false
  const isPr =
    !plateau &&
    !deload &&
    points.length > 1 &&
    lastE1rm >= Math.max(...points.map((p) => p.e1rm)) &&
    trend > 0
  const trendColor = plateau ? TREND_AMBER : deload ? TREND_RED : TREND_GREEN
  const trendLabel = plateau
    ? '→ Plateau'
    : deload
      ? `↓ ${Math.abs(trend).toFixed(1)}%`
      : `↑ +${trend.toFixed(1)}%`

  return (
    <Card
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 52,
        cursor: 'pointer',
        border: selected ? '1px solid var(--accent-border)' : '1px solid var(--border)',
        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
      }}
    >
      <div onClick={onSelect} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 8,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {exercise.name}
      </div>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 56, fontWeight: 800, color: 'var(--text-h)', lineHeight: 1 }}>
        <AnimNum target={convertWeight(lastE1rm, unit)} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{unit} e1RM</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>{trendLabel}</span>
        {isPr && <Pill variant="pr">PR</Pill>}
        {plateau && <Pill variant="hold">plateau</Pill>}
        {deload && <Pill variant="deload">deload</Pill>}
      </div>
      {rel?.ratio != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{rel.ratio.toFixed(2)}× BW</span>
          {rel.tier && <Pill variant="e1rm">{rel.tier}</Pill>}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.5 }}>
        <Sparkline data={points.map((p) => ({ v: p.e1rm }))} color={isPr ? accent : '#22d3ee'} h={44} />
      </div>
    </Card>
  )
}
