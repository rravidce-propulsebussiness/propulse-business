import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { authRequest, getToken, getUser } from '../utils/auth'
import './Membership.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const money = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const arr = v => Array.isArray(v) ? v : []
const typeName = p => String(p?.plan_type || '').toLowerCase()
const groupName = p => String(p?.plan_group || p?.name || '').trim()
const periodLabel = p => p?.billing_period || (Number(p?.billing_months) === 12 ? 'Yearly' : Number(p?.billing_months) === 3 ? 'Quarterly' : Number(p?.billing_months) === 6 ? 'Half-Yearly' : 'Monthly')
const displayType = type => ({ pro: 'Pro', booster: 'Booster', investor: 'Investment' }[type] || type)
const fallbackBenefits = {
  pro: ['Priority lead access', 'Pro lead pricing', 'Earlier access to selected opportunities'],
  booster: ['Boost your lead-buying capacity', 'Flexible booster access', 'Use alongside your active membership'],
  investor: ['Investor-focused opportunities', 'Investment access and benefits', 'Business growth support'],
}

export default function Membership() {
  const user = getUser(); const token = getToken()
  const [plans, setPlans] = useState([]), [currentMembership, setCurrentMembership] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [cycle, setCycle] = useState('monthly'), [manualOpen, setManualOpen] = useState(false), [selectedPlan, setSelectedPlan] = useState(null), [submitted, setSubmitted] = useState(false), [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!token) { setLoading(false); return }
      try {
        const [r, m] = await Promise.all([
          fetch(`${API}/membership-plans`, { headers: { Authorization: `Bearer ${token}` } }),
          authRequest('/payments/membership/current').catch(() => null),
        ])
        const d = await r.json().catch(() => [])
        if (!r.ok) throw Error(d.error || 'Unable to load membership plans')
        if (active) {
          setPlans(Array.isArray(d) ? d.filter(p => p.is_active !== false) : [])
          setCurrentMembership(m || null)
        }
      } catch (e) { if (active) setError(e.message) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [token])

  const planGroups = useMemo(() => {
    const map = new Map()
    plans.forEach(p => {
      const type = typeName(p)
      if (!['pro', 'booster', 'investor'].includes(type)) return
      const key = type
      if (!map.has(key)) map.set(key, { key, type, name: displayType(type), group: groupName(p), plans: [] })
      map.get(key).plans.push(p)
    })
    return ['pro', 'booster', 'investor'].map(key => map.get(key)).filter(Boolean)
  }, [plans])

  const findPlan = group => group?.plans.find(p => periodLabel(p).toLowerCase().replace(/\s+/g, '') === cycle.replace(/\s+/g, ''))
    || group?.plans.find(p => Number(p.billing_months || 1) === ({ monthly: 1, quarterly: 3, halfYearly: 6, yearly: 12 }[cycle]))
    || group?.plans[0]

  const selectedByGroup = useMemo(() => Object.fromEntries(planGroups.map(g => [g.key, findPlan(g)])), [planGroups, cycle])
  const currentType = String(currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || '').toLowerCase()
  const currentName = displayType(currentType) || (currentMembership?.plan_name || 'No active membership')

  const features = (plan, fallback) => {
    const x = arr(plan?.benefits).map(String).filter(Boolean)
    return x.length ? x : fallback
  }

  const openPayment = plan => {
    if (!plan?.id) { setError('The selected membership plan is unavailable.'); return }
    setSelectedPlan(plan); setManualOpen(true); setError(''); setSubmitted(false)
  }

  const submitManual = async () => {
    const ref = document.getElementById('manual-utr')?.value?.trim()
    const file = document.getElementById('manual-proof')?.files?.[0]
    if (!ref) { setError('Enter the payment reference / UTR first.'); return }
    if (!file) { setError('Upload the payment screenshot or PDF first.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Payment proof must be 5 MB or smaller.'); return }
    if (!selectedPlan?.id) { setError('The selected membership plan is unavailable.'); return }
    try {
      setSubmitting(true); setError('')
      const proofUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read payment proof')); reader.readAsDataURL(file)
      })
      await authRequest('/payments/manual', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(selectedPlan.price),
          membershipPlanId: selectedPlan.id,
          manualReference: ref,
          proofUrl,
          notes: `${selectedPlan.plan_group || displayType(typeName(selectedPlan))}: ${selectedPlan.name || periodLabel(selectedPlan)}`,
        }),
      })
      setSubmitted(true); setManualOpen(false)
      document.getElementById('manual-utr').value = ''; document.getElementById('manual-proof').value = ''
    } catch (e) { setError(e.message || 'Unable to submit payment') }
    finally { setSubmitting(false) }
  }

  return <div className="membership-page-shell"><UserHeader /><main className="membership-page">
    <section className="membership-hero">
      <div className="membership-hero-copy"><span className="membership-kicker">PROPULSE MEMBERSHIP</span><h1>Choose the access that fits your business.</h1><p>Choose a membership, select a billing cycle and unlock the access level that fits the way your business buys leads.</p><div className="membership-hero-points"><span><i /> Clear pricing</span><span><i /> Flexible billing</span><span><i /> Business-first access</span></div></div>
      <div className="membership-current"><span>YOUR CURRENT PLAN</span><strong>{currentName}</strong><small>{currentType ? `${displayType(currentType)} access is active on your account.` : 'You do not have an active paid membership yet.'}</small>{currentMembership?.expires_at && <em>Active until {new Date(currentMembership.expires_at).toLocaleDateString('en-IN')}</em>}</div>
    </section>

    <section className="membership-switcher"><div><span className="membership-kicker">BILLING</span><h2>Pick your billing cycle</h2></div><div className="membership-cycles">{['monthly', 'quarterly', 'halfYearly', 'yearly'].map(k => <button key={k} className={cycle === k ? 'active' : ''} onClick={() => { setCycle(k); setError(''); setSubmitted(false) }}>{k === 'halfYearly' ? 'Half-Yearly' : k[0].toUpperCase() + k.slice(1)}</button>)}</div></section>
    {submitted && <div className="membership-success">Payment submitted for verification. Access will activate after admin approval.</div>}{error && <div className="membership-error">{error}</div>}

    {loading ? <div className="membership-state">Loading membership options…</div> : !planGroups.length ? <div className="membership-state"><strong>Membership plans are being prepared.</strong><span>Please check again shortly.</span></div> : <section className="membership-plans membership-plans-three">
      {planGroups.map(group => {
        const plan = selectedByGroup[group.key]
        const isCurrent = currentType === group.type
        return <article className={`membership-plan ${group.type}-plan`} key={group.key}>
          <div className="membership-plan-top"><div><span className="plan-label">{group.name.toUpperCase()}</span><h2>{group.name}</h2><p>{plan?.description || `${group.name} membership for businesses using the Propulse marketplace.`}</p></div>{isCurrent ? <span className="current-badge">CURRENT PLAN</span> : group.type === 'pro' ? <span className="popular-badge">RECOMMENDED</span> : null}</div>
          <div className="membership-price">{plan ? money(plan.price) : '—'}<small>{plan ? ` / ${periodLabel(plan).toLowerCase()}` : ''}</small></div>
          {plan && Number(plan.discount_percent || 0) > 0 && <div className="saving-note">Save {Number(plan.discount_percent)}% on this billing cycle</div>}
          <div className="membership-divider" /><h3>Included with {group.name}</h3>
          <ul>{features(plan, fallbackBenefits[group.type]).map((x, i) => <li key={`${x}-${i}`}><b>✓</b><span>{x}</span></li>)}</ul>
          {isCurrent ? <button className="membership-primary current" disabled>✓ Current {group.name} plan</button> : <button className="membership-primary" onClick={() => openPayment(plan)}>Choose {group.name} <span>→</span></button>}
          {plan?.lead_entitlements?.length > 0 && <small className="membership-secure">Plan benefits and lead entitlements are configured by Propulse.</small>}
        </article>
      })}
    </section>}

    <section className="membership-value"><div><span className="membership-kicker">WHY MEMBERSHIP</span><h2>More access. Less friction.</h2><p>Propulse keeps membership configurable: choose the plan and billing cycle that match your business, then use the marketplace for the opportunities that matter to you.</p></div><div className="value-grid"><div><strong>01</strong><b>Clear pricing</b><span>Membership prices come directly from the active plan configuration.</span></div><div><strong>02</strong><b>Flexible plans</b><span>Pro, Booster and Investment plans can be configured without hardcoded prices.</span></div><div><strong>03</strong><b>Lead marketplace</b><span>Browse and compare opportunities in one place.</span></div></div></section>
  </main>

  {manualOpen && selectedPlan && <div className="membership-modal-backdrop" onClick={() => setManualOpen(false)}><div className="membership-payment-modal" onClick={e => e.stopPropagation()}><button className="membership-modal-close" onClick={() => setManualOpen(false)}>×</button><span className="membership-kicker">MANUAL PAYMENT</span><h2>Upgrade to {displayType(typeName(selectedPlan))}</h2><p>Make the payment using the Propulse payment details and submit the reference for admin verification.</p><div className="manual-summary"><span>Selected plan</span><strong>{selectedPlan.name} · {money(selectedPlan.price)} / {periodLabel(selectedPlan).toLowerCase()}</strong></div><div className="manual-method"><b>UPI / BANK TRANSFER</b><span>Payment details will be configured by Propulse admin.</span></div><label className="manual-input-label">Payment reference / UTR<input id="manual-utr" placeholder="Enter UTR or transaction ID" /></label><label className="manual-input-label">Payment proof<input id="manual-proof" type="file" accept="image/*,.pdf" /></label><div className="manual-next"><b>Verification</b><ol><li>Make the payment.</li><li>Enter the UTR / transaction reference.</li><li>Submit for admin verification.</li></ol></div><button className="membership-primary" onClick={submitManual} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for verification'} <span>→</span></button></div></div>}
  </div>
}
