import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getUser, getToken, authRequest } from '../utils/auth'
import { apiRequest } from '../utils/api'
import UserHeader from '../components/UserHeader'
import './Dashboard.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Dashboard() {
  const navigate = useNavigate()
  const user = getUser()
  const token = getToken()
  const [leads, setLeads] = useState([])
  const [purchased, setPurchased] = useState([])
  const [wallet, setWallet] = useState(null)
  const [businessName, setBusinessName] = useState(user?.business_name || user?.businessName || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !user || user.role === 'admin') return
    let active = true

    async function loadDashboard() {
      setError('')

      const results = await Promise.allSettled([
        authRequest('/profile'),
        apiRequest('/leads?status=available'),
        authRequest('/leads/purchased'),
        authRequest('/wallet')
      ])

      if (!active) return

      const [profileResult, availableResult, purchasedResult, walletResult] = results
      const failed = []

      if (profileResult.status === 'fulfilled') {
        if (profileResult.value?.business_name) setBusinessName(profileResult.value.business_name)
      } else {
        failed.push(profileResult.reason)
      }

      if (availableResult.status === 'fulfilled') {
        setLeads(Array.isArray(availableResult.value) ? availableResult.value : [])
      } else {
        failed.push(availableResult.reason)
      }

      if (purchasedResult.status === 'fulfilled') {
        setPurchased(Array.isArray(purchasedResult.value) ? purchasedResult.value : [])
      } else {
        failed.push(purchasedResult.reason)
      }

      if (walletResult.status === 'fulfilled') {
        setWallet(walletResult.value || null)
      } else {
        failed.push(walletResult.reason)
      }

      if (failed.length === results.length) {
        setError('Unable to load dashboard data. Please try again.')
      } else if (failed.length) {
        setError('Some dashboard information could not be loaded.')
      }

      setLoading(false)
    }

    loadDashboard()
    return () => { active = false }
  }, [token, user])

  if (!token || !user || user.role === 'admin') {
    navigate('/login', { replace: true })
    return null
  }

  const displayBusinessName = businessName || 'Your Business'
  const previewLeads = leads.slice(0, 5)

  return (
    <div className="owner-dashboard">
      <UserHeader />

      <main className="owner-main">
        <section className="owner-topbar">
          <div>
            <span className="owner-kicker">PROPULSE BUSINESS · DASHBOARD</span>
            <h1>Hi, {displayBusinessName}</h1>
          </div>
          <Link className="owner-primary" to="/leads">Explore Leads <span>→</span></Link>
        </section>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="owner-actions-grid">
          <Link to="/leads" className="dashboard-action dashboard-action-primary">
            <span className="action-icon">↗</span>
            <div><strong>Buy Leads</strong><small>{loading ? '—' : `${leads.length} available now`}</small></div>
            <b>→</b>
          </Link>
          <Link to="/purchased-leads" className="dashboard-action">
            <span className="action-icon">✓</span>
            <div><strong>My Leads</strong><small>{loading ? '—' : `${purchased.length} purchased`}</small></div>
            <b>→</b>
          </Link>
          <Link to="/wallet" className="dashboard-action">
            <span className="action-icon">₹</span>
            <div><strong>Wallet</strong><small>{loading ? '—' : money(wallet?.balance)}</small></div>
            <b>→</b>
          </Link>
          <Link to="/profile" className="dashboard-action">
            <span className="action-icon">◯</span>
            <div><strong>Profile</strong><small>Business details</small></div>
            <b>→</b>
          </Link>
        </section>

        <section className="owner-panel lead-panel">
          <div className="panel-head">
            <div><span className="owner-kicker">LIVE MARKETPLACE</span><h2>Latest opportunities</h2></div>
            <Link to="/leads">View all →</Link>
          </div>
          <div className="owner-lead-list">
            {loading ? (
              <div className="owner-lead owner-lead-loading" aria-hidden="true">
                <div className="lead-skeleton"><i /><i /><i /></div>
              </div>
            ) : previewLeads.length ? (
              previewLeads.map(lead => (
                <Link to="/leads" className="owner-lead" key={lead.id}>
                  <div>
                    <span>{(lead.industry_name || 'LEAD').toUpperCase()}</span>
                    <strong>{lead.service_name || lead.industry_name || 'Lead opportunity'}{lead.requirement ? ` · ${lead.requirement}` : ''}</strong>
                    <small>{lead.city_name || 'Location available'}</small>
                  </div>
                  <b>View →</b>
                </Link>
              ))
            ) : (
              <div className="owner-lead empty-lead"><div><strong>No leads available</strong><small>Check the marketplace for new opportunities.</small></div><b>→</b></div>
            )}
          </div>
        </section>

        <section className="dashboard-secondary">
          <Link to="/membership" className="dashboard-mini-card">
            <span>MEMBERSHIP</span><strong>Manage plan</strong><small>View your current membership</small><b>→</b>
          </Link>
          <Link to="/history" className="dashboard-mini-card">
            <span>ACTIVITY</span><strong>Purchase history</strong><small>View your account activity</small><b>→</b>
          </Link>
        </section>
      </main>

      <nav className="mobile-dashboard-nav" aria-label="Quick navigation">
        <Link to="/leads"><span>↗</span>Leads</Link>
        <Link to="/purchased-leads"><span>✓</span>My Leads</Link>
        <Link to="/wallet"><span>₹</span>Wallet</Link>
        <Link to="/profile"><span>◯</span>Profile</Link>
      </nav>
    </div>
  )
}

export default Dashboard
