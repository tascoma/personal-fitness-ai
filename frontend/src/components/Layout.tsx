import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/log', icon: '➕', label: 'Log' },
  { to: '/history', icon: '📅', label: 'History' },
  { to: '/progress', icon: '📈', label: 'Progress' },
  { to: '/more', icon: '⚙️', label: 'More' },
]

export function Layout() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <nav className="tab-bar">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
