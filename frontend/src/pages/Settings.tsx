import { api } from '../api/client'
import type { UserSettings } from '../api/types'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { useFetch } from '../hooks/useFetch'

export function Settings() {
  const { data: settings, loading, error, refetch } = useFetch(
    () => api.get<UserSettings>('/settings'),
  )

  async function update(patch: Partial<UserSettings>) {
    await api.patch('/settings', patch)
    refetch()
  }

  if (loading) return <LoadingSkeleton lines={4} />
  if (error || !settings) return <p className="error">{error ?? 'Failed to load'}</p>

  return (
    <>
      <h1>Settings</h1>

      <div className="card stack">
        <div>
          <label htmlFor="unit">Display unit</label>
          <select
            id="unit"
            value={settings.unit}
            onChange={(e) => update({ unit: e.target.value as UserSettings['unit'] })}
          >
            <option value="lbs">Pounds (lbs)</option>
            <option value="kg">Kilograms (kg)</option>
          </select>
          <p className="muted">Weights are stored in lbs and converted for display.</p>
        </div>

        <div>
          <label htmlFor="formula">e1RM formula</label>
          <select
            id="formula"
            value={settings.e1rm_formula}
            onChange={(e) =>
              update({ e1rm_formula: e.target.value as UserSettings['e1rm_formula'] })
            }
          >
            <option value="epley">Epley — weight × (1 + reps/30)</option>
            <option value="brzycki">Brzycki — weight × 36 / (37 − reps)</option>
          </select>
          <p className="muted">Switching recalculates your PR timeline.</p>
        </div>
      </div>
    </>
  )
}
