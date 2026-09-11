import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authRequest, clearSession, getToken, getUser } from '../utils/auth'
import './InvestorHeader.css'

export default function InvestorHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const [open, setOpen] = useState(false)
  const [businessName, setBusinessName] = useState(user?.business_name || user?.businessName || 'Your Business')

  useEffect(() => {
    let active = true
    if (!getToken() || user?.role === 'admin') return undefined
    authRequest('/profile').then(profile => {
      if (active && profile?.business_name) setBusinessName(profile.business_name)
    }).catch(() => {})
    return () => { active = false }
  }, [user?.role])

  const logout = () => {
    clearSession()
    setOpen(false)
    navigate('/')
  }

  const isActive = target => {
    if (target === '/') return location.pathname === '/'
    if (target === '/investment') return location.pathname === '/investment' && !['#invested-leads', '#lead-sales', '#history', '#payouts'].includes(location.hash)
    return location.pathname === '/investment' && location.hash === target
  }

  const nav = [
    { label: 'Home', to: '/' },
    { label: 'Invest', to: '/investment' },
    { label: 'Invested Leads', to: '/investment#invested-leads' },
    { label: 'Lead Sales', to: '/investment#lead-sales' },
    { label: 'Payouts', to: '/investment#payouts' },
    { label: 'History', to: '/investment#history' },
  ]
  const avatar = businessName.trim().charAt(0).toUpperCase() || 'B'

  return <header className="investor-header">
    <Link className="investor-header-brand" to="/" onClick={() => setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business" /></Link>
    <div className="investor-header-label">INVESTOR</div>
    <nav className={`investor-header-nav${open ? ' open' : ''}`}>
      {nav.map(item => <Link key={item.to} className={isActive(item.to.includes('#') ? item.to.slice(item.to.indexOf('#')) : item.to) ? 'active' : ''} to={item.to} onClick={() => setOpen(false)}>{item.label}</Link>)}
      <button className="investor-mobile-logout" onClick={logout}>Logout</button>
    </nav>
    <div className="investor-header-right">
      <Link className="investor-profile" to="/profile" aria-label="Open business profile"><span className="investor-avatar">{avatar}</span><span className="investor-profile-name">{businessName}</span></Link>
      <button className="investor-logout" onClick={logout}>Logout</button>
      <button className="investor-menu" aria-label="Open investor navigation" onClick={() => setOpen(value => !value)}>☰</button>
    </div>
  </header>
}
