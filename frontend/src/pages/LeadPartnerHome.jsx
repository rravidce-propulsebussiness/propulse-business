import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRequest, clearSession, getUser } from '../utils/auth'
import './LeadPartnerHome.css'

export default function LeadPartnerHome() {
  const navigate = useNavigate()
  const user = getUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    authRequest('/lead-partner/dashboard')
      .then(value => mounted && setData(value))
      .catch(err => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const initials = useMemo(() => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'LP', [user?.name])
  const stats = data?.stats || {}

  function signOut() {
    clearSession()
    localStorage.removeItem('propulse_session_mode')
    navigate('/login', { replace: true })
  }

  return (
    <div className="partner-shell">
      <aside className="partner-sidebar">
        <div className="partner-brand"><span className="partner-brand-mark">P</span><span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span></div>
        <div className="partner-nav-label">WORKSPACE</div>
        <nav className="partner-nav">
          <Link className="active" to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
          <Link to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
          <Link to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
          <a href="#account"><i>◎</i><span>Account</span></a>
        </nav>
        <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
      </aside>
      <main className="partner-main">
        <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Overview</strong></div><div className="partner-top-status"><i /> Partner account</div></header>
        <div className="partner-content">
          <section className="partner-intro" id="overview"><div><span className="partner-eyebrow">LEAD PARTNER PORTAL</span><h1>Welcome, {user?.name || 'Lead Partner'}</h1><p>Manage your lead inventory, partner pricing and revenue from one workspace.</p></div><div className="partner-live"><i /> Live account</div></section>
          {error && <div className="partner-alert"><strong>Dashboard unavailable</strong><span>{error}</span></div>}
          <section className="partner-section-head"><div><span>PERFORMANCE</span><h2>Your lead business at a glance</h2></div><small>{loading ? 'Loading current totals…' : 'Current account totals'}</small></section>
          <section className="partner-stats-grid"><article><span>Total leads</span><strong>{loading ? '—' : stats.totalLeads ?? 0}</strong><small>Added to your inventory</small></article><article><span>Active leads</span><strong>{loading ? '—' : stats.activeLeads ?? 0}</strong><small>Available or paused</small></article><article><span>Sold leads</span><strong>{loading ? '—' : stats.soldLeads ?? 0}</strong><small>Successfully sold</small></article><article><span>Closed leads</span><strong>{loading ? '—' : stats.closedLeads ?? 0}</strong><small>Closed or completed</small></article></section>
          <section className="partner-panel partner-panel-account" id="account"><div className="partner-panel-head"><div><span className="partner-kicker">ACCOUNT</span><h2>{data?.partner?.business_name || user?.name || 'Lead Partner'}</h2></div><span className="partner-account-pill">Lead Partner</span></div><div className="partner-account-list"><div><span>Name</span><b>{user?.name || '—'}</b></div><div><span>Email</span><b>{user?.email || '—'}</b></div><div><span>Phone</span><b>{data?.partner?.phone || '—'}</b></div></div></section>
        </div>
      </main>
    </div>
  )
}
