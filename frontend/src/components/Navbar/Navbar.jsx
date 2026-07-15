import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/forecast', label: 'Forecast' },
    ...(!user ? [{ to: '/login', label: 'Login' }] : [])
  ]

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo" aria-label="DE-BP3 Home">
          <div className="navbar-logo-mark" aria-hidden="true">
            <span>BP3</span>
          </div>
          <div>
            <div className="navbar-logo-text">DE-BP3</div>
            <div className="navbar-logo-sub">Digital Enterprise</div>
          </div>
        </Link>

        <ul className="navbar-nav" role="list">
          {links.map(l => (
            <li key={l.label}>
              <Link
                to={l.to}
                className={`${location.pathname === l.to ? 'active' : ''} ${l.label === 'Dashboard' ? 'navbar-cta' : ''}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="navbar-hamburger"
          aria-label="Toggle mobile menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          <span style={{ transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
          <span style={{ opacity: menuOpen ? 0 : 1 }} />
          <span style={{ transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu" role="menu">
          {links.map(l => (
            <Link
              key={l.label}
              to={l.to}
              role="menuitem"
              className={location.pathname === l.to ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
