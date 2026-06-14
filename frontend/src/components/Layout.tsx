import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icons } from './icons'
import { TweaksPanel } from './TweaksPanel'

interface NavItem {
  to: string
  id: keyof typeof Icons
  label: string
}

const NAV: (NavItem | null)[] = [
  { to: '/', id: 'dashboard', label: 'Dashboard' },
  { to: '/log', id: 'log', label: 'Log Workout' },
  { to: '/history', id: 'history', label: 'History' },
  { to: '/progress', id: 'progress', label: 'Progress' },
  null,
  { to: '/exercises', id: 'exercises', label: 'Exercises' },
  { to: '/settings', id: 'settings', label: 'Settings' },
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/log': 'Log Workout',
  '/history': 'History',
  '/progress': 'Progress',
  '/exercises': 'Exercises',
  '/settings': 'Settings',
}

function Sidebar() {
  return (
    <div
      style={{
        width: 'var(--sidebar-w)',
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <svg width="22" height="22" viewBox="0 0 22 22">
            <rect x="4" y="4" width="14" height="14" rx="2" fill="var(--accent)" transform="rotate(45 11 11)" />
          </svg>
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text-h)',
              letterSpacing: '0.04em',
              lineHeight: 1.15,
            }}
          >
            PERSONAL
            <br />
            FITNESS AI
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: 10, overflowY: 'auto' }}>
        {NAV.map((item, i) => {
          if (!item)
            return <div key={i} style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 4px' }} />
          const Icon = Icons[item.id]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                marginBottom: 2,
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 0.12s',
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                    <Icon />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Personal Fitness AI · v1</div>
      </div>
    </div>
  )
}

export function Layout() {
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'Personal Fitness AI'
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'var(--bg)' }}>
      <Sidebar />
      <div
        style={{
          marginLeft: 'var(--sidebar-w)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
        }}
      >
        <div
          style={{
            height: 'var(--header-h)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--text-h)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{today}</span>
            <button
              onClick={() => setTweaksOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: tweaksOpen ? 'var(--accent-dim)' : 'var(--bg-card)',
                border: tweaksOpen ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                color: tweaksOpen ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icons.tweaks />
              Tweaks
            </button>
          </div>
        </div>
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, scrollbarGutter: 'stable' }}>
          <div key={location.pathname} className="fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      {tweaksOpen && <TweaksPanel onClose={() => setTweaksOpen(false)} />}
    </div>
  )
}
