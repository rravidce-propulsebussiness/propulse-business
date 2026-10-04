import { useNavigate } from 'react-router-dom'
import { clearSession, getUser } from '../utils/auth'
import './LeadPartnerApprovalPending.css'

const copyByStatus = {
  pending: {
    kicker: 'APPLICATION UNDER REVIEW',
    title: 'Your Lead Partner account is awaiting approval',
    body: 'Your registration is complete. An Admin must approve the Lead Partner profile before lead inventory, pricing, earnings and payout tools become available.',
    badge: 'Pending review',
  },
  suspended: {
    kicker: 'ACCOUNT REVIEW REQUIRED',
    title: 'Your Lead Partner access is currently suspended',
    body: 'Workspace access is paused. Contact the Propulse team if you need help understanding or resolving the account status.',
    badge: 'Suspended',
  },
  not_applied: {
    kicker: 'APPLICATION REQUIRED',
    title: 'Lead Partner approval is required',
    body: 'This account has the Lead Partner role, but no application record is available yet. Contact Admin to complete activation.',
    badge: 'Not applied',
  },
}

export default function LeadPartnerApprovalPending({ partner, onRefresh, refreshing = false }) {
  const navigate = useNavigate()
  const user = getUser()
  const status = String(partner?.status || 'pending').toLowerCase()
  const copy = copyByStatus[status] || copyByStatus.pending

  async function signOut() {
    await clearSession()
    localStorage.removeItem('propulse_session_mode')
    navigate('/login', { replace: true })
  }

  return <main className="lp-approval-page">
    <section className="lp-approval-card">
      <div className="lp-approval-brand"><span>P</span><div><b>PROPULSE</b><small>LEAD PARTNER</small></div></div>
      <div className="lp-approval-status">{copy.badge}</div>
      <span className="lp-approval-kicker">{copy.kicker}</span>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>

      <div className="lp-approval-details">
        <div><span>Account</span><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Authenticated account'}</small></div>
        <div><span>Current status</span><b>{copy.badge}</b><small>Workspace authorization is enforced on the server.</small></div>
      </div>

      <div className="lp-approval-note">
        <b>What happens next?</b>
        <span>Once Admin marks the Lead Partner profile active, refresh this page and the workspace will open automatically.</span>
      </div>

      <div className="lp-approval-actions">
        <button type="button" className="primary" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Checking…' : 'Check approval status'}</button>
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
    </section>
  </main>
}
