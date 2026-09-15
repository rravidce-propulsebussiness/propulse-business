import { useNavigate } from 'react-router-dom'
import { getUser, clearSession } from '../utils/auth'
import './LeadPartnerHome.css'

export default function LeadPartnerHome() {
  const navigate = useNavigate()
  const user = getUser()

  function signOut() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <main className="lead-partner-home">
      <section className="lead-partner-card">
        <div className="lead-partner-brand"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></div>
        <p className="lead-partner-kicker">LEAD PARTNER PORTAL</p>
        <h1>Welcome, {user?.name || 'Lead Partner'}</h1>
        <p>Your account is signed in as a Lead Partner. Partner features will live here separately from User and Investor features.</p>
        <div className="lead-partner-actions">
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  )
}
