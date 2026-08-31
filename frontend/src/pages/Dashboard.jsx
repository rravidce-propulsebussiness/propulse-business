import { Link, useNavigate } from 'react-router-dom'
import { clearSession, getUser, getToken } from '../utils/auth'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const user = getUser()

  function logout() {
    clearSession()
    navigate('/')
  }

  if (!getToken() || !user || user.role === 'admin') {
    navigate('/login', { replace: true })
    return null
  }

  const name = user.name || 'Business Owner'

  return (
    <div className="owner-dashboard">
      <header className="owner-header">
        <Link to="/" className="owner-brand"><img src="/brand/propulse-logo.png" alt="Propulse Business" /></Link>
        <nav className="owner-nav">
          <Link className="active" to="/dashboard">Home</Link>
          <Link to="/leads">Leads</Link>
          <Link to="/profile">Business Profile</Link>
          <a href="#services">Services</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="owner-actions"><span className="owner-name">{name}</span><button onClick={logout}>Logout</button></div>
      </header>

      <main className="owner-main">
        <section className="owner-welcome">
          <div><span className="owner-kicker">BUSINESS OWNER HOME</span><h1>Good to see you, {name.split(' ')[0]}.</h1><p>Find relevant leads, manage your business profile and grow with Propulse.</p></div>
          <Link className="owner-primary" to="/leads">Explore leads <span>→</span></Link>
        </section>

        <section className="owner-stats">
          <Link to="/leads" className="owner-stat"><span className="stat-mark">◎</span><div><strong>Available</strong><small>New leads</small></div><b>→</b></Link>
          <Link to="/leads" className="owner-stat"><span className="stat-mark">◷</span><div><strong>0</strong><small>My leads</small></div><b>→</b></Link>
          <Link to="/profile" className="owner-stat"><span className="stat-mark">◇</span><div><strong>Setup</strong><small>Business profile</small></div><b>→</b></Link>
          <Link to="/leads" className="owner-stat"><span className="stat-mark">◆</span><div><strong>0</strong><small>Purchased leads</small></div><b>→</b></Link>
        </section>

        <section className="owner-grid">
          <div className="owner-panel lead-panel">
            <div className="panel-head"><div><span className="owner-kicker">LEAD MARKETPLACE</span><h2>Find opportunities</h2></div><Link to="/leads">View all →</Link></div>
            <div className="owner-lead-list">
              <Link to="/leads?category=Interior%20%26%20Modular" className="owner-lead"><div><span>INTERIOR & MODULAR</span><strong>Interior design · 3 BHK</strong><small>Hyderabad</small></div><b>View →</b></Link>
              <Link to="/leads?category=Construction" className="owner-lead"><div><span>CONSTRUCTION</span><strong>Independent house construction</strong><small>Pune</small></div><b>View →</b></Link>
              <Link to="/leads?category=Home%20Services" className="owner-lead"><div><span>HOME SERVICES</span><strong>Home renovation requirement</strong><small>Bengaluru</small></div><b>View →</b></Link>
            </div>
          </div>

          <aside className="owner-panel profile-panel-mini">
            <span className="owner-kicker">YOUR BUSINESS</span><h2>Complete your profile</h2><p>Add your services and locations so Propulse can match you with better opportunities.</p><div className="progress-track"><span /></div><div className="progress-row"><small>Profile setup</small><b>Start now</b></div><Link className="outline-action" to="/profile">Complete business profile <span>→</span></Link>
          </aside>
        </section>

        <section className="owner-tools" id="services">
          <div className="section-title"><span className="owner-kicker">QUICK ACTIONS</span><h2>Manage your business</h2></div>
          <div className="tool-grid">
            <Link to="/profile" className="tool-card"><span>01</span><strong>Business Profile</strong><small>Business information, services and locations</small><b>→</b></Link>
            <Link to="/leads" className="tool-card"><span>02</span><strong>Lead Marketplace</strong><small>Explore opportunities matched to your business</small><b>→</b></Link>
            <Link to="/profile" className="tool-card"><span>03</span><strong>Services & Locations</strong><small>Control where and what you want leads for</small><b>→</b></Link>
          </div>
        </section>

        <section className="owner-faq" id="faq">
          <div><span className="owner-kicker">NEED HELP?</span><h2>Frequently asked questions</h2></div>
          <details><summary>How do I receive leads?</summary><p>Complete your business profile with the services and locations you serve. Relevant opportunities can then be matched to your business.</p></details>
          <details><summary>Can I choose the services I want leads for?</summary><p>Yes. Your business profile lets you select the industries, services and optional subservices that match your offering.</p></details>
          <details><summary>Where can I manage my business information?</summary><p>Open Business Profile from this dashboard to update your business information, services and locations.</p></details>
        </section>
      </main>

      <footer className="owner-footer"><span>© {new Date().getFullYear()} Propulse Business</span><span>Business Owner Portal</span></footer>
    </div>
  )
}

export default Dashboard
