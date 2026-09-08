import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authRequest, clearSession, getToken, getUser } from '../utils/auth'
import './InvestorHeader.css'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export default function InvestorHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()
  const [open, setOpen] = useState(false)
  const [businessName, setBusinessName] = useState(user?.business_name || user?.businessName || 'Your Business')
  const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => {
    let active = true
    if (!getToken() || user?.role === 'admin') return undefined
    Promise.all([authRequest('/profile'), authRequest('/wallet')]).then(([profile, wallet]) => {
      if (!active) return
      if (profile?.business_name) setBusinessName(profile.business_name)
      setWalletBalance(Number(wallet?.balance || 0))
    }).catch(() => {})
    return () => { active = false }
  }, [user?.role])

  const logout = () => {
    clearSession()
    setOpen(false)
    navigate('/')
  }

  const active = (path) => location.pathname === path ? ' active' : ''
  const avatar = businessName.trim().charAt(0).toUpperCase() || 'B'

  return <header className="investor-header">
    <Link className="investor-header-brand" to="/" onClick={() => setOpen(false)}><img src="/brand/propulse-logo.png" alt="Propulse Business" /></Link>
    <div className="investor-header-label">INVESTOR</div>
    <nav className={`investor-header-nav${open ? ' open' : ''}`}>
      <Link className={active('/')} to="/" onClick={() => setOpen(false)}>Home</Link>
      <Link className={active('/investment')} to="/investment" onClick={() => setOpen(false)}>Invest</Link>
      <a href="/investment#available" onClick={() => setOpen(false)}>Invested</a>
      <a href="/investment#sold-leads" onClick={() => setOpen(false)}>Sold Leads</a>
      <a href="/investment#history" onClick={() => setOpen(false)}>History</a>
      <a href="/investment#available" onClick={() => setOpen(false)}>Available</a>
      <button className="investor-mobile-logout" onClick={logout}>Logout</button>
    </nav>
    <div className="investor-header-right">
      <a className="investor-available" href="/investment#available" aria-label="Available wallet balance"><span>AVAILABLE</span><strong>{money(walletBalance)}</strong></a>
      <Link className="investor-profile" to="/profile" aria-label="Open business profile"><span className="investor-avatar">{avatar}</span><span className="investor-profile-name">{businessName}</span></Link>
      <button className="investor-logout" onClick={logout}>Logout</button>
      <button className="investor-menu" aria-label="Open investor navigation" onClick={() => setOpen(value => !value)}>☰</button>
    </div>
  </header>
}
