import { Link, useLocation } from 'react-router-dom'

const navItems = [
  {
    id: 'home', label: 'Home', link: '/',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    id: 'dashboard', label: 'Dashboard', link: '/dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
  },
  {
    id: 'forecast', label: 'Forecasting', link: '/forecast',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
  },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen }) {
  const location = useLocation()

  return (
    <aside
      className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
      aria-label="Dashboard navigation"
    >
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" aria-hidden="true">
          <span>BP3</span>
        </div>
        <span className="sidebar-logo-text">DE-BP3</span>
      </div>

      <nav className="sidebar-nav" role="navigation" aria-label="Sidebar">
        {navItems.map(item => {
          const isActive = item.link ? location.pathname === item.link : false
          const content = (
            <>
              {item.icon}
              <span className="sidebar-item-label">{item.label}</span>
            </>
          )
          return item.link ? (
            <Link
              key={item.id}
              to={item.link}
              className={`sidebar-item${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          ) : (
            <button
              key={item.id}
              className="sidebar-item"
              title={collapsed ? item.label : undefined}
              aria-disabled="true"
            >
              {content}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-toggle">
        <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand' : 'Collapse'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16" aria-hidden="true"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="sidebar-item-label">{collapsed ? '' : 'Collapse'}</span>
        </button>
      </div>
    </aside>
  )
}
