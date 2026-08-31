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

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-propulse-razorpay]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.propulseRazorpay = 'true'
    script.onload = resolve
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout'))
    document.body.appendChild(script)
  })
}

export default function Membership() {
  const user = getUser()
  const token = getToken()
  const [plans, setPlans] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cycle, setCycle] = useState('monthly')

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) { setLoading(false); return }
      try {
        const [planRes, membership] = await Promise.all([
          fetch(`${API}/membership-plans`, { headers: { Authorization: `Bearer ${token}` } }),
          authRequest('/payments/membership/current'),
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
  const currentPro = Boolean(currentMembership && currentMembership.status === 'active') || Boolean(user?.is_pro_member || String(user?.membership_type || '').toLowerCase() === 'pro')
  const currentName = currentPro ? 'Pro' : 'Standard'
  const features = (plan, fallback) => { const items = arr(plan?.benefits).map(String).filter(Boolean); return items.length ? items : fallback }

  async function upgradeToPro() {
    if (!pro?.id || paying) return
    setPaying(true); setError(''); setSuccess('')
    try {
      const order = await authRequest('/payments/membership/order', { method: 'POST', body: JSON.stringify({ planId: pro.id }) })
      await loadRazorpayCheckout()
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Propulse Business',
          description: `${order.plan.name} membership`,
          order_id: order.orderId,
          prefill: { name: user?.name || '', email: user?.email || '' },
          theme: { color: '#0b2d63' },
          handler: async response => {
            try {
              const verified = await authRequest('/payments/membership/verify', { method: 'POST', body: JSON.stringify(response) })
              setCurrentMembership(verified.membership || null)
              setSuccess('Pro membership is active. Your account has been upgraded.')
              resolve()
            } catch (e) { reject(e) }
          },
          modal: { ondismiss: () => reject(new Error('Payment was cancelled')) },
        })
        checkout.on('payment.failed', response => reject(new Error(response?.error?.description || 'Payment failed')))
        checkout.open()
      })
    } catch (e) { setError(e.message || 'Unable to start payment') }
    finally { setPaying(false) }
  }

  return (
    <div className="membership-page-shell">
      <UserHeader />
      <main className="membership-page">
        <section className="membership-hero">
          <div className="membership-hero-copy">
            <span className="membership-kicker">PROPULSE MEMBERSHIP</span>
            <h1>Choose the access that fits your business.</h1>
            <p>Get more value from the Propulse marketplace with a membership built around the way you buy leads.</p>
            <div className="membership-hero-points"><span><i /> Transparent pricing</span><span><i /> Flexible billing</span><span><i /> Business-first benefits</span></div>
          </div>
          <div className="membership-current"><span>YOUR CURRENT PLAN</span><strong>{currentName}</strong><small>{currentPro ? 'You have Pro access.' : 'You are currently on Standard access.'}</small>{currentPro && currentMembership?.ends_at && <em>Renews/expires {new Date(currentMembership.ends_at).toLocaleDateString('en-IN')}</em>}</div>
        </section>

        <section className="membership-switcher"><div><span className="membership-kicker">BILLING</span><h2>Pick your billing cycle</h2></div><div className="membership-cycles">{['monthly','quarterly','yearly'].map(key => <button key={key} className={cycle === key ? 'active' : ''} onClick={() => { setCycle(key); setError(''); setSuccess('') }}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div></section>
        {error && <div className="membership-error">{error}</div>}
        {success && <div className="membership-success">{success}</div>}
        {loading ? <div className="membership-state">Loading membership options…</div> : !standard && !pro ? <div className="membership-state"><strong>Membership plans are being prepared.</strong><span>Please check again shortly.</span></div> : (
          <section className="membership-plans">
            <article className="membership-plan standard-plan">
              <div className="membership-plan-top"><div><span className="plan-label">STANDARD</span><h2>Standard</h2><p>A simple starting point for exploring the marketplace.</p></div>{!currentPro && <span className="current-badge">CURRENT PLAN</span>}</div>
              <div className="membership-price">{standard ? money(standard.price) : '—'}<small>{standard ? ` / ${periodLabel(standard).toLowerCase()}` : ''}</small></div>
              <div className="membership-divider" /><h3>Included with Standard</h3>
              <ul>{features(standard, ['Browse available leads','Transparent Normal lead pricing','Business profile & matching']).map((x,i) => <li key={`${x}-${i}`}><b>✓</b><span>{x}</span></li>)}</ul>
              <Link className="membership-secondary" to="/leads">Explore leads <span>→</span></Link>
            </article>

            <article className="membership-plan pro-plan"><div className="pro-glow" />
              <div className="membership-plan-top"><div><span className="plan-label">PROPULSE PRO</span><h2>Pro</h2><p>Priority access and stronger benefits for active buyers.</p></div><span className="popular-badge">RECOMMENDED</span></div>
              <div className="membership-price">{pro ? money(pro.price) : '—'}<small>{pro ? ` / ${periodLabel(pro).toLowerCase()}` : ''}</small></div>
              {pro && Number(pro.discount_percent || 0) > 0 && <div className="saving-note">Save {Number(pro.discount_percent)}% on this billing cycle</div>}
              <div className="membership-divider" /><h3>Everything you need to grow</h3>
              <ul>{features(pro, ['Priority lead access','Pro lead pricing','Earlier access to selected opportunities']).map((x,i) => <li key={`${x}-${i}`}><b>✓</b><span>{x}</span></li>)}</ul>
              {currentPro ? <button className="membership-primary current" disabled>✓ Current Pro plan</button> : <button className="membership-primary" disabled={paying || !pro?.id} onClick={upgradeToPro}>{paying ? 'Opening secure checkout…' : 'Upgrade to Pro'} {!paying && <span>→</span>}</button>}
              <small className="membership-secure">Secure Razorpay billing • Payment verified server-side</small>
            </article>
          </section>
        )}

        <section className="membership-value"><div><span className="membership-kicker">WHY MEMBERSHIP</span><h2>More access. Less friction.</h2><p>Propulse keeps membership simple: choose your access level, pick a billing cycle and use the marketplace for the opportunities that matter to your business.</p></div><div className="value-grid"><div><strong>01</strong><b>Clear pricing</b><span>No confusing tiers inside lead pricing.</span></div><div><strong>02</strong><b>Built for businesses</b><span>Your membership works alongside your business profile.</span></div><div><strong>03</strong><b>Lead marketplace</b><span>Browse and compare opportunities in one place.</span></div></div></section>
      </main>
    </div>
  )
}
