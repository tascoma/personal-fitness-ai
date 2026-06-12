import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api/client'
import type {
  E1RMPoint,
  Exercise,
  ExerciseSeries,
  PersonalRecord,
  Prediction,
  TonnageBucket,
  UserSettings,
} from '../api/types'
import { BigNumber } from '../components/BigNumber'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { useFetch } from '../hooks/useFetch'
import { displayWeight, formatDate } from '../lib/units'

const ACCENT = '#c084fc'
const GREEN = '#4ade80'
const GRID = '#2e303a'
const TEXT = '#9ca3af'

const chartMargin = { top: 4, right: 8, bottom: 0, left: -16 }

export function Progress() {
  const base = useFetch(async () => {
    const [exercises, settings] = await Promise.all([
      api.get<Exercise[]>('/exercises'),
      api.get<UserSettings>('/settings'),
    ])
    return { exercises, settings }
  })

  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const [compareId, setCompareId] = useState<number | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const effectiveId = exerciseId ?? base.data?.exercises[0]?.id ?? null

  const e1rm = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<E1RMPoint[]>([])
        : api.get<E1RMPoint[]>(`/analytics/e1rm?exercise_id=${effectiveId}`),
    [effectiveId],
  )
  const tonnage = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<TonnageBucket[]>([])
        : api.get<TonnageBucket[]>(`/analytics/tonnage?exercise_id=${effectiveId}&period=${period}`),
    [effectiveId, period],
  )
  const prs = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<PersonalRecord[]>([])
        : api.get<PersonalRecord[]>(`/analytics/prs?exercise_id=${effectiveId}`),
    [effectiveId],
  )
  const prediction = useFetch(
    () =>
      effectiveId === null
        ? Promise.resolve<Prediction | null>(null)
        : api.get<Prediction>(`/analytics/predictions?exercise_id=${effectiveId}`),
    [effectiveId],
  )
  const compare = useFetch(
    () =>
      effectiveId === null || compareId === null
        ? Promise.resolve<ExerciseSeries[] | null>(null)
        : api.get<ExerciseSeries[]>(`/analytics/compare?exercise_ids=${effectiveId},${compareId}`),
    [effectiveId, compareId],
  )

  if (base.loading) return <LoadingSkeleton lines={6} />
  if (base.error || !base.data) return <p className="error">{base.error ?? 'Failed to load'}</p>

  const { exercises, settings } = base.data
  const unit = settings.unit
  const exercise = exercises.find((e) => e.id === effectiveId)

  const compareRows = (() => {
    if (!compare.data) return []
    const [a, b] = compare.data
    const rows = new Map<string, Record<string, number | string>>()
    for (const series of [a, b]) {
      for (const point of series.series) {
        const row = rows.get(point.date) ?? { date: point.date }
        row[series.exercise_name] = point.e1rm
        rows.set(point.date, row)
      }
    }
    return [...rows.values()].sort((x, y) => `${x.date}`.localeCompare(`${y.date}`))
  })()

  return (
    <>
      <h1>Progress</h1>

      <div className="card stack">
        <select
          value={effectiveId ?? ''}
          onChange={(e) => setExerciseId(Number(e.target.value))}
          aria-label="exercise"
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <h2>e1RM trend</h2>
        {e1rm.data && e1rm.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={e1rm.data} margin={chartMargin}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={TEXT} fontSize={11} />
              <YAxis stroke={TEXT} fontSize={11} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1a1c23', border: `1px solid ${GRID}` }}
                formatter={(value) => [`${displayWeight(Number(value), unit)} ${unit}`, 'e1RM']}
              />
              <Line type="monotone" dataKey="e1rm" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Log working sets of {exercise?.name} to see the trend.</p>
        )}
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Tonnage</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
            style={{ width: 'auto' }}
            aria-label="period"
          >
            <option value="week">weekly</option>
            <option value="month">monthly</option>
          </select>
        </div>
        {tonnage.data && tonnage.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tonnage.data} margin={chartMargin}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="bucket" stroke={TEXT} fontSize={11} />
              <YAxis stroke={TEXT} fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1a1c23', border: `1px solid ${GRID}` }}
                formatter={(value) => [`${Math.round(Number(value)).toLocaleString()} lbs`, 'tonnage']}
              />
              <Bar dataKey="tonnage" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">No working sets logged yet.</p>
        )}
      </div>

      <div className="card">
        <h2>Next milestone</h2>
        {prediction.loading ? <LoadingSkeleton lines={2} /> : null}
        {prediction.data ? (
          prediction.data.status === 'ok' ? (
            <div className="row-between">
              <BigNumber
                value={displayWeight(prediction.data.milestone ?? 0, unit)}
                unit={unit}
                label={`current best e1RM ${displayWeight(prediction.data.current_best, unit)} ${unit}`}
              />
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                  ~{formatDate(prediction.data.projected_date!)}
                </div>
                <div className="muted">
                  95% CI {formatDate(prediction.data.ci_earliest!)} –{' '}
                  {formatDate(prediction.data.ci_latest!)}
                </div>
                <div className="muted">
                  +{prediction.data.slope_per_week} {unit === 'lbs' ? 'lb' : unit}/week trend
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">
              {prediction.data.status === 'insufficient_data'
                ? 'Need at least 4 sessions in the last 8 weeks for a projection.'
                : prediction.data.status === 'no_positive_trend'
                  ? 'No upward trend right now — projection paused.'
                  : 'You are beyond the milestone table. Strong.'}
            </p>
          )
        ) : null}
      </div>

      <div className="card">
        <h2>Compare lifts</h2>
        <select
          value={compareId ?? ''}
          onChange={(e) => setCompareId(e.target.value ? Number(e.target.value) : null)}
          aria-label="compare with"
        >
          <option value="">Choose a second lift…</option>
          {exercises
            .filter((e) => e.id !== effectiveId)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
        </select>
        {compare.data && compareRows.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={compareRows} margin={{ ...chartMargin, top: 12 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={TEXT} fontSize={11} />
              <YAxis stroke={TEXT} fontSize={11} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1a1c23', border: `1px solid ${GRID}` }} />
              <Legend />
              <Line
                type="monotone"
                dataKey={compare.data[0].exercise_name}
                stroke={ACCENT}
                strokeWidth={2}
                connectNulls
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey={compare.data[1].exercise_name}
                stroke={GREEN}
                strokeWidth={2}
                connectNulls
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      <div className="card">
        <h2>PR timeline</h2>
        {prs.data && prs.data.length > 0 ? (
          <div className="stack">
            {[...prs.data].reverse().map((pr) => (
              <div key={pr.id} className="row-between">
                <span className="muted">{formatDate(pr.achieved_on)}</span>
                <span>
                  <span className={`pill ${pr.record_type === 'weight' ? 'green' : ''}`}>
                    {pr.record_type === 'weight' ? 'top weight' : 'e1RM'}
                  </span>{' '}
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-h)', fontWeight: 600 }}>
                    {displayWeight(pr.value, unit)} {unit}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No PRs yet — they'll appear as you log working sets.</p>
        )}
      </div>
    </>
  )
}
