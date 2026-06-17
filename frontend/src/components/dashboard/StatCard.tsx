import type { ReactNode } from 'react'
import { Card } from '../ui'
import { AnimNum } from '../charts'

const TREND_GREEN = '#4ade80'
const TREND_RED = '#f87171'

/** Compact KPI tile: big animated number + label + optional sub/trend line. */
export function StatCard({
  label,
  value,
  valueText,
  suffix,
  unit,
  trend,
  sub,
  accent,
}: {
  label: string
  value: number
  /** Renders this instead of the animated number (e.g. a decimal ratio). */
  valueText?: string
  suffix?: string
  unit?: string
  /** Percent change; renders a colored ↑/↓ line when provided. */
  trend?: number | null
  sub?: ReactNode
  accent?: string
}) {
  return (
    <Card style={{ padding: 16 }}>
      <div
        style={{
          fontSize: 10,
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
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-head)',
          fontSize: 38,
          fontWeight: 800,
          color: accent ?? 'var(--text-h)',
          lineHeight: 1,
        }}
      >
        {valueText != null ? valueText : <AnimNum target={value} />}
        {valueText == null && suffix}
      </div>
      {unit && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{unit}</div>}
      {trend != null && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: trend >= 0 ? TREND_GREEN : TREND_RED,
            marginTop: 8,
          }}
        >
          {trend >= 0 ? '↑ +' : '↓ '}
          {Math.abs(trend).toFixed(0)}% vs last wk
        </div>
      )}
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{sub}</div>}
    </Card>
  )
}
