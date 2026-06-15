import { api } from '../../api/client'
import type { WorkoutSession } from '../../api/types'
import { CalendarHeatmap, type HeatCell } from '../charts'
import { Card, CardHeader, LoadingSkeleton } from '../ui'
import { useFetch } from '../../hooks/useFetch'

const WEEKS = 16

function fromISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - WEEKS * 7)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Training-consistency calendar: per-day non-warmup tonnage over ~16 weeks. */
export function ConsistencyHeatmap({ accent }: { accent: string }) {
  const sessions = useFetch(() =>
    api.get<WorkoutSession[]>(`/sessions?from=${fromISO()}&limit=500`),
  )

  const byDate = new Map<string, number>()
  for (const s of sessions.data ?? []) {
    const tonnage = s.sets
      .filter((set) => !set.is_warmup)
      .reduce((t, set) => t + set.weight * set.reps, 0)
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + tonnage)
  }
  const cells: HeatCell[] = [...byDate.entries()].map(([date, value]) => ({ date, value }))
  const activeDays = cells.filter((c) => c.value > 0).length

  return (
    <Card>
      <CardHeader label="Training Consistency" right={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeDays} days · {WEEKS} wks</span>} />
      {sessions.loading ? (
        <LoadingSkeleton lines={3} />
      ) : sessions.error ? (
        <p className="error">{sessions.error}</p>
      ) : (
        <CalendarHeatmap cells={cells} weeks={WEEKS} color={accent} />
      )}
    </Card>
  )
}
