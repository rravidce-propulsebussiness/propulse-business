import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getToken, getUser } from '../utils/auth'
import './Leads.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function Leads() {
  const [params] = useSearchParams()
  const category = params.get('category')
  const user = getUser()
  const token = getToken()
  const loggedIn = Boolean(token && user)
  const destination = user?.role === 'admin' ? '/admin' : '/dashboard'
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loggedIn || user?.role === 'admin') return

    async function loadLeads() {
      setLoading(true)
      setError('')
      try {
        const query = new URLSearchParams({ status: 'available' })
        const res = await fetch(`${API}/leads?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load leads')
        setLeads(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    loadLeads()
  }, [loggedIn, token, user?.role])

  if (!loggedIn) {
    return (
      <main className="leads-locked-page">
        <div className="leads-locked-card">
          <span className="section-kicker">PROPULSE LEAD MARKETPLACE</span>
          <h1>Sign in to access leads.</h1>
          <p>Lead opportunities are available to registered business owners. Sign in to view and manage your opportunities.</p>
          <div><Link className="leads-primary" to="/login">Login to continue →</Link><Link className="leads-secondary" to="/signup">Create business account</Link></div>
        </div>
      </main>
    )
  }

  if (user?.role === 'admin') {
    return (
      <main className="leads-locked-page">
        <div className="leads-locked-card">
          <span className="section-kicker">ADMIN ACCOUNT</span>
          <h1>Lead management is in the Admin Panel.</h1>
          <p>Use the Admin Leads area to create and manage marketplace leads.</p>
          <div><Link className="leads-primary" to="/admin">Open Admin Panel →</Link></div>
        </div>
      </main>
    )
  }

  const filtered = category
    ? leads.filter((lead) => {
        const text = `${lead.industry_name || ''} ${lead.service_name || ''} ${lead.subservice_name || ''}`.toLowerCase()
        return text.includes(category.replaceAll('-', ' ').toLowerCase())
      })
    : leads

  return (
    <main className="leads-page">
      <header className="leads-header">
        <div>
          <span className="section-kicker">LEAD MARKETPLACE</span>
          <h1>{category ? `${category.replaceAll('-', ' ')} leads` : 'Available leads'}</h1>
          <p>Qualified opportunities matched to your business profile.</p>
        </div>
        <Link to={destination} className="leads-dashboard">Back to dashboard →</Link>
      </header>

      {error && <div className="leads-error">{error}</div>}
      {loading ? (
        <div className="leads-empty">Loading available leads…</div>
      ) : !filtered.length ? (
        <div className="leads-empty">
          <strong>{category ? 'No matching leads yet' : 'No available leads yet'}</strong>
          <span>Complete your business profile with the services and locations you serve to improve matching.</span>
          <Link to="/profile">Update business profile →</Link>
        </div>
      ) : (
        <div className="leads-grid">
          {filtered.map((lead) => (
            <article className="market-lead" key={lead.id}>
              <span className="lead-tag">AVAILABLE</span>
              <h2>{lead.service_name}</h2>
              <p>{lead.requirement}</p>
              <strong>⌖ {lead.city_name}, {lead.state_name}</strong>
              <div className="lead-meta"><span>{lead.industry_name}</span>{lead.budget && <span>Budget: {lead.budget}</span>}</div>
              <Link className="market-lead-action" to={`/leads/${lead.id}`}>View lead →</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

export default Leads
