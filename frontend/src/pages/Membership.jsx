import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { authRequest, getToken, getUser } from '../utils/auth'
import './Membership.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const money = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const arr = v => Array.isArray(v) ? v : []
const typeName = p => String(p?.plan_type || '').toLowerCase()
const isPro = p => typeName(p) === 'pro'
const periodLabel = p => p.billing_period || (Number(p.billing_months) === 12 ? 'Yearly' : Number(p.billing_months) === 3 ? 'Quarterly' : 'Monthly')

export default function Membership() {
  const user = getUser()
  const token = getToken()
  const [plans, setPlans] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cycle, setCycle] = useState('monthly')
  const [manualOpen, setManualOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) { setLoading(false); return }
      try {
        const [planRes, membership] = await Promise.all([
          fetch(`${API}/membership-plans`, { headers: { Authorization: `Bearer ${token}` } }),
          authRequest('/payments/membership/current').catch(() => null),
        ])
        const data = await planRes.json().catch(() => [])
        if (!planRes.ok) throw new Error(data.error || 'Unable to load membership plans')
        if (active) {
          setPlans(Array.isArray(data) ? data.filter(p => p.is_active !== false) : [])
          setCurrentMembership(membership || null)
        }
      } catch (e) { if (active) setError(e.message) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [token])

  const standardPlans = useMemo(() => plans.filter(p => typeName(p) === 'non_pro'), [plans])
  const proPlans = useMemo(() => plans.filter(isPro), [plans])
  const findPlan = list => list.find(p => periodLabel(p).toLowerCase().startsWith(cycle)) || list.find(p => Number(p.billing_months || 1) === ({ monthly: 1, quarterly: 3, yearly: 12 }[cycle])) || list[0]
  const standard = findPlan(standardPlans)
  const pro = findPlan(proPlans)
  const currentPro = Boolean(currentMembership?.status === 'active') || Boolean(user?.is_pro_member || String(user?.membership_type || '').toLowerCase() === 'pro')
  const currentName = currentPro ? 'Pro' : 'Standard'
  const features = (plan, fallback) => { const items = arr(plan?.benefits).map(String).filter(Boolean); return items.length ? items : fallback }

  return (
    <div className="membership-page-shell">
      <UserHeader />
      <main className="membership-page">
        <section className="membership-hero">
          <div className="membership-hero-copy">
            <span className="membership-kicker">PROPULSE MEMBERSHIP</span>
            <h1>Choose the access that fits your business.</h1>
            <p>Choose your membership, select a billing cycle and unlock the access level that fits the way your business buys leads.</p>
            <div className="membership-hero-points"><span><i /> Clear pricing</span><span><i /> Flexible billing</span><span><i /> Business-first access</span></div>
          </div>
          <div className="membership-current"><span>YOUR CURRENT PLAN</span><strong>{currentName}</strong><small>{currentPro ? 'Pro access is active on your account.' : 'You are currently on Standard access.'}</small>{currentPro && currentMembership?.ends_at && <em>Active until {new Date(currentMembership.ends_at).toLocaleDateString('en-IN')}</em>}</div>
        </section>

        <section className="membership-switcher"><div><span className="membership-kicker">BILLING</span><h2>Pick your billing cycle</h2></div><div className="membership-cycles">{['monthly','quarterly','yearly'].map(key => <button key={key} className={cycle === key ? 'active' : ''} onClick={() => { setCycle(key); setError('') }}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div></section>
        {error && <div className="membership-error">{error}</div>}
        {loading ? <div className="membership-state">Loading membership options…</div> : !standard && !pro ? <div className="membership-state"><strong>Membership plans are being prepared.</strong><span>Please check again shortly.</span></div> : (
          <section className="membership-plans">
            <article className="membership-plan standard-plan">
              <div className="membership-plan-top"><div><span className="plan-label">STANDARD</span><h2>Standard</h2><p>A simple starting point for exploring and buying leads.</p></div>{!currentPro && <span className="current-badge">CURRENT PLAN</span>}</div>
              <div className="membership-price">{standard ? money(standard.price) : '—'}<small>{standard ? ` / ${periodLabel(standard).toLowerCase()}` : ''}</small></div>
              <div className="membership-divider" /><h3>Included with Standard</h3>
              <ul>{features(standard, ['Browse available leads','Normal lead pricing','Business profile & matching']).map((x,i) => <li key={`${x}-${i}`}><b>✓</b><span>{x}</span></li>)}</ul>
              <Link className="membership-secondary" to="/leads">Explore leads <span>→</span></Link>
            </article>

            <article className="membership-plan pro-plan"><div className="pro-glow" />
              <div className="membership-plan-top"><div><span className="plan-label">PROPULSE PRO</span><h2>Pro</h2><p>More access and stronger benefits for active lead buyers.</p></div><span className="popular-badge">RECOMMENDED</span></div>
              <div className="membership-price">{pro ? money(pro.price) : '—'}<small>{pro ? ` / ${periodLabel(pro).toLowerCase()}` : ''}</small></div>
              {pro && Number(pro.discount_percent || 0) > 0 && <div className="saving-note">Save {Number(pro.discount_percent)}% on this billing cycle</div>}
              <div className="membership-divider" /><h3>Everything in Pro</h3>
              <ul>{features(pro, ['Priority lead access','Pro lead pricing','Earlier access to selected opportunities']).map((x,i) => <li key={`${x}-${i}`}><b>✓</b><span>{x}</span></li>)}</ul>
              {currentPro ? <button className="membership-primary current" disabled>✓ Current Pro plan</button> : <div className="membership-payment-actions"><button className="membership-primary" onClick={() => setManualOpen(true)}>Manual Payment <span>→</span></button><button className="membership-gateway" disabled>Gateway Payment <span>Coming soon</span></button></div>}
              <small className="membership-secure">Manual verification available now • Online gateway coming soon</small>
            </article>
          </section>
        )}

        <section className="membership-value"><div><span className="membership-kicker">WHY MEMBERSHIP</span><h2>More access. Less friction.</h2><p>Propulse keeps membership simple: choose your access level, pick a billing cycle and use the marketplace for the opportunities that matter to your business.</p></div><div className="value-grid"><div><strong>01</strong><b>Clear pricing</b><span>No confusing tiers inside lead pricing.</span></div><div><strong>02</strong><b>Built for businesses</b><span>Your membership works alongside your business profile.</span></div><div><strong>03</strong><b>Lead marketplace</b><span>Browse and compare opportunities in one place.</span></div></div></section>
      </main>

      {manualOpen && <div className="membership-modal-backdrop" onClick={() => setManualOpen(false)}><div className="membership-payment-modal" onClick={e => e.stopPropagation()}><button className="membership-modal-close" onClick={() => setManualOpen(false)}>×</button><span className="membership-kicker">MANUAL PAYMENT</span><h2>Upgrade to Pro manually</h2><p>Make the payment using the details provided by Propulse, then share your payment reference with the admin team for verification.</p><div className="manual-summary"><span>Selected plan</span><strong>Pro · {pro ? money(pro.price) : '—'} / {pro ? periodLabel(pro).toLowerCase() : cycle}</strong></div><div className="manual-method"><b>UPI / BANK TRANSFER</b><span>Payment details will be provided by Propulse support.</span></div><div className="manual-next"><b>How it works</b><ol><li>Make the payment using the provided payment details.</li><li>Send the payment reference to the Propulse admin team.</li><li>Admin verifies the payment and activates Pro.</li></ol></div><button className="membership-primary" onClick={() => setManualOpen(false)}>Close</button></div></div>}
    </div>
  )
}
