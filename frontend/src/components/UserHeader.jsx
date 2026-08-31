import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { clearSession, getUser, getToken } from '../utils/auth'
import './UserHeader.css'

export default function UserHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const loggedIn = Boolean(getToken() && user)
  const [open, setOpen] = useState(false)

  function logout() {
    clearSession()
    setOpen(false)
    navigate('/')
  }

  if (!loggedIn || user?.role === 'admin') return null

  const active = (path) => location.pathname === path ? ' active' : ''

  return (
    <header className="user-header">
      <Link className="user-header-brand" to="/" onClick={() => setOpen(false)}>
        <img src="/brand/propulse-logo.png" alt="Propulse Business" />
      </Link>
      <nav className={`user-header-nav${open ? ' open' : ''}`}>
        <Link className={active('/dashboard')} to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
        <Link className={active('/leads')} to="/leads" onClick={() => setOpen(false)}>Leads</Link>
        <Link className="membership-link" to="/dashboard#membership" onClick={() => setOpen(false)}>Membership</Link>
        <Link className={active('/profile')} to="/profile" onClick={() => setOpen(false)}>Profile</Link>
        <button className="user-header-mobile-logout" onClick={logout}>Logout</button>
      </nav>
      <div className="user-header-right">
        <Link className="user-profile-pill" to="/profile" aria-label="Open profile">
          <span className="user-avatar">{(user.name || 'U').trim().charAt(0).toUpperCase()}</span>
          <span className="user-profile-name">{user.name || 'Account'}</span>
        </Link>
        <button className="user-logout" onClick={logout}>Logout</button>
        <button className="user-menu-toggle" aria-label="Open navigation" onClick={() => setOpen(v => !v)}>☰</button>
      </div>
    </header>
  )
}
