import { ACCENT_OPTIONS, useApp } from '../context/app'

export function TweaksPanel({ onClose }: { onClose: () => void }) {
  const { accent, setAccent, unit, updateSettings } = useApp()
  return (
    <div
      style={{
        position: 'fixed',
        top: 58,
        right: 16,
        zIndex: 200,
        width: 224,
        background: 'var(--bg-card-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.18s ease forwards',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Tweaks
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Accent Color</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {ACCENT_OPTIONS.map((o) => (
            <button
              key={o.color}
              onClick={() => setAccent(o.color)}
              title={o.label}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: o.color,
                border: accent === o.color ? '3px solid var(--text-h)' : '3px solid transparent',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border 0.15s',
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Units</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['lbs', 'kg'] as const).map((u) => (
            <button
              key={u}
              onClick={() => updateSettings({ unit: u })}
              style={{
                flex: 1,
                padding: 7,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: unit === u ? 'var(--accent)' : 'var(--bg-input)',
                color: unit === u ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
