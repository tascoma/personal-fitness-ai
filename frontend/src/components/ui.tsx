import type { CSSProperties, ReactNode } from 'react'

export function Card({
  children,
  style = {},
  onMouseEnter,
  onMouseLeave,
}: {
  children: ReactNode
  style?: CSSProperties
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}

export function CardHeader({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

export type PillVariant =
  | 'default'
  | 'increase'
  | 'hold'
  | 'deload'
  | 'pr'
  | 'warmup'
  | 'e1rm'

const PILL_STYLES: Record<PillVariant, { color: string; border: string; bg: string }> = {
  default: { color: 'var(--text)', border: 'var(--border)', bg: 'transparent' },
  increase: { color: '#4ade80', border: 'rgba(74,222,128,0.35)', bg: 'rgba(74,222,128,0.08)' },
  hold: { color: '#fbbf24', border: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.08)' },
  deload: { color: '#f87171', border: 'rgba(248,113,113,0.35)', bg: 'rgba(248,113,113,0.08)' },
  pr: { color: 'var(--accent)', border: 'var(--accent-border)', bg: 'var(--accent-dim)' },
  warmup: { color: '#fbbf24', border: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.08)' },
  e1rm: { color: '#22d3ee', border: 'rgba(34,211,238,0.25)', bg: 'rgba(34,211,238,0.08)' },
}

export function Pill({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: PillVariant
}) {
  const c = PILL_STYLES[variant] ?? PILL_STYLES.default
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: c.color,
        border: `1px solid ${c.border}`,
        background: c.bg,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export function AIBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: '#22d3ee',
        background: 'rgba(34,211,238,0.08)',
        border: '1px solid rgba(34,211,238,0.2)',
        borderRadius: 999,
        padding: '2px 8px',
      }}
    >
      ✦ AI
    </span>
  )
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="error">{children}</p>
}
