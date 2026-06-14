import { useState } from 'react'
import { api } from '../api/client'
import type { Exercise } from '../api/types'
import { Card, CardHeader, LoadingSkeleton } from '../components/ui'
import { useFetch } from '../hooks/useFetch'

const GROUPS: { key: 'compound' | 'accessory'; label: string }[] = [
  { key: 'compound', label: 'Compound Lifts' },
  { key: 'accessory', label: 'Accessory Lifts' },
]

export function Exercises() {
  const { data, loading, error, refetch } = useFetch(() => api.get<Exercise[]>('/exercises'))
  // Optimistic increment overrides keyed by exercise id, layered over fetched data.
  const [overrides, setOverrides] = useState<Record<number, number>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const exs = (data ?? []).map((e) =>
    overrides[e.id] != null ? { ...e, increment: overrides[e.id] } : e,
  )

  async function changeIncrement(ex: Exercise, delta: number) {
    const next = Math.max(2.5, ex.increment + delta)
    setOverrides((prev) => ({ ...prev, [ex.id]: next }))
    try {
      await api.patch(`/exercises/${ex.id}`, { increment: next })
    } catch (err) {
      setFormError((err as Error).message)
      setOverrides((prev) => {
        const { [ex.id]: _removed, ...rest } = prev
        void _removed
        return rest
      })
      refetch()
    }
  }

  async function addExercise() {
    const name = window.prompt('New exercise name')
    if (!name || !name.trim()) return
    setFormError(null)
    try {
      await api.post('/exercises', { name: name.trim(), increment: 5, is_compound: true })
      refetch()
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  if (loading) return <LoadingSkeleton lines={6} />
  if (error) return <p className="error">{error}</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {formError ? <p className="error">{formError}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {GROUPS.map((group) => {
          const items = exs.filter((e) => (group.key === 'compound' ? e.is_compound : !e.is_compound))
          if (items.length === 0) return null
          return (
            <Card key={group.key}>
              <CardHeader label={group.label} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((ex) => (
                  <div
                    key={ex.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-card-raised)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: 14 }}>{ex.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>increment</span>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <button
                          onClick={() => changeIncrement(ex, -2.5)}
                          style={{ width: 30, height: 30, background: 'var(--bg-input)', border: 'none', color: 'var(--text-h)', fontSize: 18, cursor: 'pointer' }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: 44,
                            textAlign: 'center',
                            fontFamily: 'var(--font-head)',
                            fontSize: 20,
                            fontWeight: 700,
                            color: 'var(--text-h)',
                            background: 'var(--bg-card)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 30,
                          }}
                        >
                          {ex.increment}
                        </span>
                        <button
                          onClick={() => changeIncrement(ex, 2.5)}
                          style={{ width: 30, height: 30, background: 'var(--bg-input)', border: 'none', color: 'var(--accent)', fontSize: 18, cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
      <button
        onClick={addExercise}
        style={{
          padding: '12px 0',
          background: 'transparent',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-muted)',
          fontSize: 13,
          cursor: 'pointer',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.color = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        + Add exercise
      </button>
    </div>
  )
}
