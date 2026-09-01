import { useEffect, useMemo, useState } from 'react'
import UserHeader from '../components/UserHeader'
import { authRequest, getToken, getUser } from '../utils/auth'
import './Membership.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const money = v => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const arr = v => Array.isArray(v) ? v : []
const typeName = p => String(p?.plan_type || '').toLowerCase()
const groupName = p => String(p?.plan_group || p?.name || '').trim()
const periodLabel = p => p?.billing_period || (Number(p?.billing_months) === 12 ? 'Yearly' : Number(p?.billing_months) === 6 ? 'Half-Yearly' : Number(p?.billing_months) === 3 ? 'Quarterly' : 'Monthly')
const displayType = type => ({ pro: 'Pro', booster: 'Booster', investor: 'Investor', investment: 'Investor' }[type] || type)
const fallbackBenefits = { pro: ['Priority lead access', 'Pro lead pricing', 'Earlier access to selected opportunities'], investor: ['Investor-focused opportunities', 'Investment access and benefits', 'Business growth support'], booster: ['Boost your lead-buying capacity', 'Flexible booster access', 'Use alongside your active membership'] }
const cycles = ['monthly', 'quarterly', 'halfYearly', 'yearly']
const cycleLabel = k => k === 'halfYearly' ? 'Half-Yearly' : k[0].toUpperCase() + k.slice(1)

export default function Membership() {
  const user = getUser(); const token = getToken()
  const [plans, setPlans] = useState([]), [currentMembership, setCurrentMembership] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [selectedCycles, setSelectedCycles] = useState({ pro: 'monthly', investor: 'monthly', booster: 'monthly' }), [manualOpen, setManualOpen] = useState(false), [selectedPlan, setSelectedPlan] = useState(null), [submitted, setSubmitted] = useState(false), [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!token) { setLoading(false); return }
      try {
        const [r, m] = await Promise.all([fetch(`${API}/membership-plans`, { headers: { Authorization: `Bearer ${token}` } }), authRequest('/payments/membership/current').catch(() => null)])
        const d = await r.json().catch(() => [])
        if (!r.ok) throw Error(d.error || 'Unable to load membership plans')
        if (active) { setPlans(Array.isArray(d) ? d.filter(p => p.is_active !== false) : []); setCurrentMembership(m || null) }
      } catch (e) { if (active) setError(e.message) } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [token])

  const planGroups = useMemo(() => {
    const map = new Map()
    plans.forEach(p => { let type = typeName(p); if (type === 'investment') type = 'investor'; if (!['pro', 'booster', 'investor'].includes(type)) return; if (!map.has(type)) map.set(type, { key: type, type, name: displayType(type), group: groupName(p), plans: [] }); map.get(type).plans.push(p) })
    return ['pro', 'investor', 'booster'].map(key => map.get(key) || ({ key, type: key, name: displayType(key), group: displayType(key), plans: [] }))
  }, [plans])

  const billingMonths = { monthly: 1, quarterly: 3, halfYearly: 6, yearly: 12 }
  const findPlan = (group, selectedCycle) => group?.plans.find(p => periodLabel(p).toLowerCase().replace(/\s+/g, '') === selectedCycle.replace(/\s+/g, '')) || group?.plans.find(p => Number(p.billing_months || 1) === billingMonths[selectedCycle]) || group?.plans[0]
  const selectedByGroup = useMemo(() => Object.fromEntries(planGroups.map(g => [g.key, findPlan(g, selectedCycles[g.key] || 'monthly')])), [planGroups, selectedCycles])
  const currentTypeRaw = String(currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || '').toLowerCase()
  const currentType = currentTypeRaw === 'investment' ? 'investor' : currentTypeRaw
  const currentName = currentType ? displayType(currentType) : (currentMembership?.plan_name || 'No active membership')
  const canAccessInvestor = currentType === 'pro'

  const features = (plan, fallback) => { const x = arr(plan?.benefits).map(String).filter(Boolean); return x.length ? x : fallback }
  const addons = plan => arr(plan?.add_ons || plan?.addons || plan?.booster_add_ons || plan?.booster_addons)
  const addonLabel = x => typeof x === 'string' ? x : String(x?.name || x?.title || x?.label || '')

  const openPayment = plan => {
    const planType = typeName(plan)
    if (planType === 'investor' || planType === 'investment') { setError(canAccessInvestor ? 'Investor access is unlocked by an active Pro membership. It is not purchased separately.' : 'Investor access is available only to customers with an active Pro membership.'); return }
    if (!plan?.id) { setError('The selected membership plan is unavailable.'); return }
    setSelectedPlan(plan); setManualOpen(true); setError(''); setSubmitted(false)
  }

  const submitManual = async () => {
    const ref = document.getElementById('manual-utr')?.value?.trim(), file = document.getElementById('manual-proof')?.files?.[0]
    if (!ref) { setError('Enter the payment reference / UTR first.'); return }; if (!file) { setError('Upload the payment screenshot or PDF first.'); return }; if (file.size > 5 * 1024 * 1024) { setError('Payment proof must be 5 MB or smaller.'); return }; if (!selectedPlan?.id) { setError('The selected membership plan is unavailable.'); return }
    try { setSubmitting(true); setError(''); const proofUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read payment proof')); reader.readAsDataURL(file) }); await authRequest('/payments/manual', { method: 'POST', body: JSON.stringify({ amount: Number(selectedPlan.price), membershipPlanId: selectedPlan.id, manualReference: ref, proofUrl, notes: `${selectedPlan.plan_group || displayType(typeName(selectedPlan))}: ${selectedPlan.name || periodLabel(selectedPlan)}` }) }); setSubmitted(true); setManualOpen(false); document.getElementById('manual-utr').value = ''; document.getElementById('manual-proof').value = '' } catch (e) { setError(e.message || 'Unable to submit payment') } finally { setSubmitting(false) }
  }

  return <div className="membership-page-shell"><UserHeader /><main className="membership-page">
    <section className="membership-hero"><div className="membership-hero-copy"><span className="membership-kicker">PROPULSE MEMBERSHIP</span><h1>Choose the access that fits your business.</h1><p>Compare Pro, Investor and Booster in one place. Pick a billing period directly inside the plan you want.</p><div className="membership-hero-points"><span><i /> Flexible billing</span><span><i /> Clear pricing</span><span><i /> Business-first access</span></div></div><div className="membership-current"><span>YOUR CURRENT PLAN</span><strong>{currentName}</strong><small>{currentType ? `${displayType(currentType)} access is active on your account.` : 'You do not have an active paid membership yet.'}</small>{currentMembership?.expires_at && <em>Active until {new Date(currentMembership.expires_at).toLocaleDateString('en-IN')}</em>}</div></section>
    {submitted && <div className="membership-success">Payment submitted for verification. Access will activate after admin approval.</div>}{error && <div className="membership-error">{error}</div>}
    {loading ? <div className="membership-state">Loading membership options…</div> : <section className="membership-plans membership-plans-three">{planGroups.map(group => { const selectedCycle = selectedCycles[group.key] || 'monthly'; const plan = selectedByGroup[group.key]; const isCurrent = currentType === group.type; const investorLocked = group.type === 'investor' && !canAccessInvestor; const investorUnlocked = group.type === 'investor' && canAccessInvestor; const planAddons = addons(plan).map(addonLabel).filter(Boolean); const boosterAvailableToPro = group.type === 'booster' && currentType === 'pro'; return <article className={`membership-plan ${group.type}-plan ${investorLocked ? 'investor-locked' : ''}`} key={group.key}>
      <div className="membership-plan-top"><div><span className="plan-label">{group.name.toUpperCase()}</span><h2>{group.name}</h2><p>{investorLocked ? 'Reserved for customers with an active Pro membership.' : plan?.description || `${group.name} membership for businesses using the Propulse marketplace.`}</p></div>{isCurrent ? <span className="current-badge">CURRENT PLAN</span> : group.type === 'pro' ? <span className="popular-badge">RECOMMENDED</span> : investorLocked ? <span className="current-badge">PRO REQUIRED</span> : group.type === 'booster' && currentType === 'pro' ? <span className="popular-badge">UNLOCKED FOR PRO</span> : null}</div>
      <div className="card-billing"><div><span>CHOOSE BILLING</span><small>This card only</small></div><div className="membership-cycles">{cycles.map(k => <button type="button" key={k} className={selectedCycle === k ? 'active' : ''} onClick={() => { setSelectedCycles(prev => ({ ...prev, [group.key]: k })); setError(''); setSubmitted(false) }}>{cycleLabel(k)}</button>)}</div></div>
      <div className="membership-price">{plan ? money(plan.price) : '—'}<small>{plan ? ` / ${periodLabel(plan).toLowerCase()}` : ''}</small></div>
      {investorLocked && <div className="saving-note">🔒 Unlock with Pro</div>}{investorUnlocked && <div className="saving-note">✓ Included with active Pro access</div>}{boosterAvailableToPro && <div className="saving-note">✓ Booster available to Pro members</div>}{!investorLocked && Number(plan?.discount_percent || 0) > 0 && <div className="saving-note">Save {Number(plan.discount_percent)}% on this billing cycle</div>}
      <div className="membership-divider" /><h3>Included with {group.name}</h3><ul>{features(plan, fallbackBenefits[group.type]).map((x, i) => <li key={`${x}-${i}`}><b>✓</b><span>{x}</span></li>)}</ul>
      {planAddons.length > 0 && <div className="membership-addons"><div><span>AVAILABLE ADD-ONS</span><small>Configured in Admin</small></div><ul>{planAddons.map((x, i) => <li key={`${x}-${i}`}><b>+</b><span>{x}</span></li>)}</ul></div>}
      {isCurrent ? <button className="membership-primary current" disabled>✓ Current {group.name} plan</button> : investorLocked ? <button className="membership-primary current" disabled>🔒 Pro membership required</button> : investorUnlocked ? <button className="membership-primary current" disabled>✓ Investor access unlocked</button> : !plan ? <button className="membership-primary current" disabled>Plan being configured</button> : <button className="membership-primary" onClick={() => openPayment(plan)}>Choose {group.name} <span>→</span></button>}
      {group.type === 'booster' && planAddons.length > 0 && !isCurrent && <small className="membership-secure">Booster add-ons are linked to the selected billing plan.</small>}
      {plan?.lead_entitlements?.length > 0 && <small className="membership-secure">Plan benefits and lead entitlements are configured by Propulse.</small>}
    </article> })}</section>}
    <section className="membership-value"><div><span className="membership-kicker">WHY MEMBERSHIP</span><h2>Simple plans. Clear access.</h2><p>Each card has its own billing selector, so changing Pro pricing will never change Investor or Booster pricing.</p></div><div className="value-grid"><div><strong>01</strong><b>Pick a plan</b><span>Compare Pro, Investor and Booster side by side.</span></div><div><strong>02</strong><b>Choose billing</b><span>Every card has an independent billing selection.</span></div><div><strong>03</strong><b>Use Booster</b><span>Pro members can access Booster and its configured add-ons.</span></div></div></section>
  </main>
  {manualOpen && selectedPlan && <div className="membership-modal-backdrop" onClick={() => setManualOpen(false)}><div className="membership-payment-modal" onClick={e => e.stopPropagation()}><button className="membership-modal-close" onClick={() => setManualOpen(false)}>×</button><span className="membership-kicker">MANUAL PAYMENT</span><h2>Upgrade to {displayType(typeName(selectedPlan))}</h2><p>Make the payment using the Propulse payment details and submit the reference for admin verification.</p><div className="manual-summary"><span>Selected plan</span><strong>{selectedPlan.name} · {money(selectedPlan.price)} / {periodLabel(selectedPlan).toLowerCase()}</strong></div><div className="manual-method"><b>UPI / BANK TRANSFER</b><span>Payment details will be configured by Propulse admin.</span></div><label className="manual-input-label">Payment reference / UTR<input id="manual-utr" placeholder="Enter UTR or transaction ID" /></label><label className="manual-input-label">Payment proof<input id="manual-proof" type="file" accept="image/*,.pdf" /></label><div className="manual-next"><b>Verification</b><ol><li>Make the payment.</li><li>Enter the UTR / transaction reference.</li><li>Submit for admin verification.</li></ol></div><button className="membership-primary" onClick={submitManual} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for verification'} <span>→</span></button></div></div>}
  </div>
}
