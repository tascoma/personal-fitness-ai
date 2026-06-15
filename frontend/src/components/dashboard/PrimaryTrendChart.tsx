import type { Exercise, ExerciseSeries } from '../../api/types'
import { LineChart } from '../charts'
import { Card, CardHeader } from '../ui'
import { convertWeight, formatDate } from '../../lib/units'

/** Large e1RM progression chart with a chip selector to switch hero lifts. */
export function PrimaryTrendChart({
  heroExercises,
  series,
  selectedId,
  onSelect,
  unit,
  accent,
}: {
  heroExercises: Exercise[]
  series: ExerciseSeries[]
  selectedId: number | null
  onSelect: (id: number) => void
  unit: 'lbs' | 'kg'
  accent: string
}) {
  const selected = series.find((s) => s.exercise_id === selectedId)
  const data = (selected?.series ?? []).map((p) => ({
    d: formatDate(p.date).replace(/, \d{4}$/, ''),
    v: convertWeight(p.e1rm, unit),
  }))

  return (
    <Card>
      <CardHeader
        label="e1RM Progression"
        right={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {heroExercises.map((ex) => {
              const active = ex.id === selectedId
              return (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    color: active ? accent : 'var(--text)',
                    border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    borderRadius: 999,
                    padding: '3px 10px',
                  }}
                >
                  {ex.name}
                </button>
              )
            })}
          </div>
        }
      />
      <LineChart data={data} color={accent} h={240} format={(v) => `${v.toLocaleString()} ${unit}`} />
    </Card>
  )
}
