import { Link, useSearchParams } from 'react-router-dom'
import { getToken, getUser } from '../utils/auth'
import './Leads.css'

const leadPreviews = [
  { service: 'Interior Design', location: 'Hyderabad', requirement: '3 BHK complete interior design', tag: 'HIGH INTENT' },
  { service: 'Modular Kitchen', location: 'Bengaluru', requirement: 'Modular kitchen for new apartment', tag: 'NEW' },
  { service: 'Home Construction', location: 'Pune', requirement: 'Independent house construction', tag: 'ACTIVE' },
]

function Leads() {
  const [params] = useSearchParams()
  const category = params.get('category')
  const user = getUser()
  const loggedIn = Boolean(getToken() && user)
  const destination = user?.role === 'admin' ? '/admin' : '/dashboard'

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

  const visible = category ? leadPreviews.filter((lead) => `${lead.service} ${lead.requirement}`.toLowerCase().includes(category.replace('-', ' '))) : leadPreviews

  return (
    <main className="leads-page">
      <header className="leads-header"><div><span className="section-kicker">LEAD MARKETPLACE</span><h1>{category ? `${category.replaceAll('-', ' ')} leads` : 'Available leads'}</h1><p>Opportunities for business owners on Propulse.</p></div><Link to={destination} className="leads-dashboard">Back to dashboard →</Link></header>
      <div className="leads-grid">
        {(visible.length ? visible : leadPreviews).map((lead) => <article className="market-lead" key={`${lead.service}-${lead.location}`}><span className="lead-tag">{lead.tag}</span><h2>{lead.service}</h2><p>{lead.requirement}</p><strong>⌖ {lead.location}</strong><button type="button">View lead →</button></article>)}
      </div>
    </main>
  )
}

export default Leads
