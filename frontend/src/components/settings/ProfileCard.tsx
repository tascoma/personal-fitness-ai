import { useState, type CSSProperties } from 'react'
import type { UserSettings } from '../../api/types'
import { Card, CardHeader } from '../ui'
import { cmToFtIn, ftInToCm } from '../../lib/units'

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
}

/** Athlete profile editor: height, birth date, sex, training goal. */
export function ProfileCard({
  settings,
  unit,
  updateSettings,
}: {
  settings: UserSettings
  unit: 'lbs' | 'kg'
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
}) {
  const initialFtIn = settings.height_cm ? cmToFtIn(settings.height_cm) : { ft: 0, inches: 0 }
  const [ft, setFt] = useState(initialFtIn.ft || '')
  const [inches, setInches] = useState(initialFtIn.inches || '')
  const [cm, setCm] = useState(settings.height_cm ?? '')
  const [birthDate, setBirthDate] = useState(settings.birth_date ?? '')
  const [sex, setSex] = useState<'male' | 'female' | null>(settings.sex)
  const [goal, setGoal] = useState(settings.training_goal ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    const height_cm =
      unit === 'kg'
        ? cm === ''
          ? null
          : Number(cm)
        : ft === '' && inches === ''
          ? null
          : ftInToCm(Number(ft) || 0, Number(inches) || 0)
    await updateSettings({
      height_cm,
      birth_date: birthDate || null,
      sex,
      training_goal: goal.trim() || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader label="Profile" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={labelStyle}>Height</div>
          {unit === 'kg' ? (
            <input
              type="number"
              value={cm}
              placeholder="cm"
              onChange={(e) => setCm(e.target.value)}
              style={{ width: '100%' }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="number" value={ft} placeholder="ft" onChange={(e) => setFt(e.target.value)} />
              <input type="number" value={inches} placeholder="in" onChange={(e) => setInches(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <div style={labelStyle}>Birth Date</div>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ width: '100%' }} />
          {settings.age != null && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Age {settings.age}</div>
          )}
        </div>

        <div>
          <div style={labelStyle}>Biological Sex</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['male', 'female'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(sex === s ? null : s)}
                style={{
                  padding: '10px 0',
                  textTransform: 'capitalize',
                  background: sex === s ? 'var(--accent-dim)' : 'var(--bg-input)',
                  border: sex === s ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: sex === s ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={labelStyle}>Training Goal</div>
          <textarea
            value={goal}
            placeholder="e.g. Squat 405, cut to 180lb…"
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            maxLength={500}
            style={{
              width: '100%',
              resize: 'vertical',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              background: 'var(--bg-input)',
              color: 'var(--text-h)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '9px 12px',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '11px 0',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Profile'}
        </button>
      </div>
    </Card>
  )
}
