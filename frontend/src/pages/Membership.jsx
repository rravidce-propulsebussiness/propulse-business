import { useEffect, useMemo, useState } from 'react'
import UserHeader from '../components/UserHeader'
import MembershipPayments from '../components/MembershipPayments'
import { authRequest, getToken, getUser } from '../utils/auth'
import { apiRequest } from '../utils/api'
import './Membership.css'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const asArray = (value) => (Array.isArray(value) ? value : [])
const planType = (plan) => String(plan?.plan_type || '').toLowerCase()
const period = (plan) => {
  if (plan?.billing_period) return plan.billing_period
  const months = Number(plan?.billing_months || 1)
  return months === 12 ? 'Yearly' : months === 6 ? 'Half-Yearly' : months === 3 ? 'Quarterly' : 'Monthly'
}
const displayName = (type) => ({ pro: 'Pro', booster: 'Booster' }[type] || type)
const cycles = ['monthly', 'quarterly', 'halfYearly', 'yearly']
const cycleMonths = { monthly: 1, quarterly: 3, halfYearly: 6, yearly: 12 }
const cycleLabel = (key) => (key === 'halfYearly' ? 'Half-Yearly' : `${key[0].toUpperCase()}${key.slice(1)}`)
const fallbackBenefits = {
  pro: ['Priority lead access', 'Pro lead pricing', 'Earlier access to selected opportunities'],
  booster: ['Boost your lead-buying capacity', 'Flexible booster access', 'Use alongside your active membership']
}

export default function Membership() {
  const user = getUser()
  const token = getToken()
  const [plans, setPlans] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCycles, setSelectedCycles] = useState({ pro: 'monthly', booster: 'monthly' })
  const [manualOpen, setManualOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const [planData, membership] = await Promise.all([
          apiRequest('/membership-plans'),
          authRequest('/payments/membership/current').catch(() => null)
        ])
        if (!active) return
        setPlans(asArray(planData).filter((item) => item?.is_active !== false))
        setCurrentMembership(membership || null)
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load membership options.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [token])

  const groups = useMemo(() => {
    const grouped = new Map()
    plans.forEach((item) => {
      const type = planType(item)
      if (!['pro', 'booster'].includes(type)) return
      if (!grouped.has(type)) grouped.set(type, { key: type, type, name: displayName(type), plans: [] })
      grouped.get(type).plans.push(item)
    })
    return ['pro', 'booster'].map((key) => grouped.get(key) || { key, type: key, name: displayName(key), plans: [] })
  }, [plans])

  const findPlan = (group, selectedCycle) => group.plans.find((item) => Number(item?.billing_months || 0) === cycleMonths[selectedCycle]) || group.plans[0]
  const selectedPlans = useMemo(() => Object.fromEntries(groups.map((group) => [group.key, findPlan(group, selectedCycles[group.key] || 'monthly')])), [groups, selectedCycles])

  const currentRaw = String(currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || '').toLowerCase()
  const currentType = currentRaw === 'investment' ? 'pro' : currentRaw
  const isProMember = Boolean(currentMembership?.isPro) || currentType === 'pro'
  const isBoosterActive = Boolean(currentMembership?.isBoosterActive)
  const currentName = currentType ? displayName(currentType) : (currentMembership?.plan_name || 'No active membership')

  const benefits = (plan, type) => {
    const values = asArray(plan?.benefits).map(String).filter(Boolean)
    return values.length ? values : fallbackBenefits[type]
  }
  const addOns = (plan) => asArray(plan?.add_ons || plan?.addons || plan?.booster_add_ons || plan?.booster_addons)
  const addOnName = (item) => typeof item === 'string' ? item : String(item?.name || item?.title || item?.label || '')

  const openPlan = async (plan, type) => {
    if (type === 'booster' && !isProMember) {
      setError('Booster access is available only after you have an active Pro membership.')
      return
    }
    if (!plan?.id) {
      setError(`The ${displayName(type)} membership plan is unavailable.`)
      return
    }
    try {
      setSelectedPlan(plan)
      setError('')
      setSubmitted(false)
      setSubmitting(true)
      const result = await authRequest('/payments/checkout/membership', {
        method: 'POST',
        body: JSON.stringify({ membershipPlanId: plan.id })
      })
      setCheckout(result)
      if (result.requiresExternalPayment) setManualOpen(true)
      else {
        setSubmitted(true)
        setCurrentMembership(await authRequest('/payments/membership/current').catch(() => currentMembership))
      }
    } catch (err) {
      setError(err?.message || 'Unable to start membership payment.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitManual() {
    const reference = document.getElementById('manual-utr')?.value?.trim()
    const file = document.getElementById('manual-proof')?.files?.[0]
    if (!reference) { setError('Enter the payment reference / UTR first.'); return }
    if (!file) { setError('Upload the payment screenshot or PDF first.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Payment proof must be 5 MB or smaller.'); return }
    if (!checkout?.payment?.id) { setError('Payment session is unavailable. Please try again.'); return }
    try {
      setSubmitting(true)
      setError('')
      const proofUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Unable to read payment proof'))
        reader.readAsDataURL(file)
      })
      await authRequest(`/payments/${checkout.payment.id}/reference`, {
        method: 'POST',
        body: JSON.stringify({
          manualReference: reference,
          proofUrl,
          notes: `${selectedPlan?.name || 'Membership'} direct payment${Number(checkout.walletAmount) > 0 ? ` after wallet payment of ${money(checkout.walletAmount)}` : ''}`
        })
      })
      setSubmitted(true)
      setManualOpen(false)
    } catch (err) {
      setError(err?.message || 'Unable to submit payment.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="membership-page-shell">
    <UserHeader />
    <main className="membership-page">
      <section className="membership-hero">
        <div className="membership-hero-copy">
          <span className="membership-kicker">PROPULSE MEMBERSHIP</span>
          <h1>Choose the access that fits your business.</h1>
          <p>Activate Pro for advanced marketplace access. Investment is a Pro-enabled feature funded from your Propulse wallet, while Booster remains an optional paid add-on.</p>
          <div className="membership-hero-points"><span><i /> Flexible billing</span><span><i /> Clear pricing</span><span><i /> Business-first access</span></div>
        </div>
        <div className="membership-current">
          <span>YOUR CURRENT PLAN</span>
          <strong>{currentName}</strong>
          <small>{currentType ? `${currentName} access is active on your account.` : 'You do not have an active paid membership yet.'}</small>
          {currentMembership?.expires_at && <em>Active until {new Date(currentMembership.expires_at).toLocaleDateString('en-IN')}</em>}
        </div>
      </section>

      {submitted && <div className="membership-success">{checkout?.requiresExternalPayment ? 'Wallet amount was applied and the remaining direct payment was submitted for verification.' : 'Payment completed from your wallet and membership access is active.'}</div>}
      {error && <div className="membership-error">{error}</div>}

      {loading ? <div className="membership-state">Loading membership options…</div> : <>
        <section className="membership-plans membership-plans-three">
          {groups.map((group) => {
            const selectedCycle = selectedCycles[group.key] || 'monthly'
            const plan = selectedPlans[group.key]
            const isCurrent = group.type === 'pro' ? isProMember : isBoosterActive
            const locked = group.type === 'booster' && !isProMember
            const planAddOns = addOns(plan).map(addOnName).filter(Boolean)
            return <article className={`membership-plan ${group.type}-plan ${locked ? 'access-locked' : ''}`} key={group.key}>
              <div className="membership-plan-top">
                <div>
                  <span className="plan-label">{group.name.toUpperCase()}</span>
                  <h2>{group.name}</h2>
                  <p>{locked ? 'Available after activating an active Pro membership.' : plan?.description || `${group.name} membership for businesses using the Propulse marketplace.`}</p>
                </div>
                {isCurrent ? <span className="current-badge">CURRENT</span> : group.type === 'pro' ? <span className="popular-badge">RECOMMENDED</span> : locked ? <span className="current-badge">PRO REQUIRED</span> : <span className="popular-badge">AVAILABLE</span>}
              </div>

              <div className="card-billing">
                <div><span>CHOOSE BILLING</span><small>Cycle length</small></div>
                <div className="membership-cycles">{cycles.map((key) => <button type="button" key={key} className={selectedCycle === key ? 'active' : ''} onClick={() => setSelectedCycles((previous) => ({ ...previous, [group.key]: key }))}>{cycleLabel(key)}</button>)}</div>
              </div>

              <div className="membership-price">{plan ? money(plan.price) : '—'}<small>{plan ? ` / ${period(plan).toLowerCase()}` : ''}</small></div>
              {locked && <div className="saving-note">🔒 Unlock with Pro</div>}
              {group.type === 'booster' && isProMember && <div className="saving-note">✓ Booster unlocked for Pro members</div>}
              <div className="membership-divider" />
              <h3>Included with {group.name}</h3>
              <ul>{benefits(plan, group.type).map((item, index) => <li key={`${item}-${index}`}><b>✓</b><span>{item}</span></li>)}</ul>
              {planAddOns.length > 0 && <div className="membership-addons"><div><span>AVAILABLE ADD-ONS</span><small>Configured in Admin</small></div><ul>{planAddOns.map((item, index) => <li key={`${item}-${index}`}><b>+</b><span>{item}</span></li>)}</ul></div>}
              {isCurrent ? <button className="membership-primary current" disabled>✓ Current {group.name}</button> : locked ? <button className="membership-primary current" disabled>🔒 Pro membership required</button> : !plan ? <button className="membership-primary current" disabled>Plan being configured</button> : <button className="membership-primary" onClick={() => openPlan(plan, group.type)} disabled={submitting}>Choose {group.name} <span>→</span></button>}
            </article>
          })}

          <article className="membership-plan investor-plan investment-access-card">
            <div className="membership-plan-top">
              <div>
                <span className="plan-label">INVESTMENT ACCESS</span>
                <h2>Investment</h2>
                <p>Invest from your Propulse wallet in eligible industries and locations using the limits configured by Admin.</p>
              </div>
              {isProMember ? <span className="popular-badge">UNLOCKED WITH PRO</span> : <span className="current-badge">PRO REQUIRED</span>}
            </div>

            <div className="investor-model">
              <div><b>WALLET FUNDED</b><span>Add money to your Propulse wallet, then choose an eligible investment.</span></div>
              <div><b>ADMIN LIMITS APPLY</b><span>Industry, state/city and investor capacity limits are checked before investing.</span></div>
              <div><b>ACTUAL SALES ONLY</b><span>Returns are based on eligible lead-sale revenue actually realized. No fixed or guaranteed return.</span></div>
            </div>

            <div className="membership-divider" />
            <h3>How Investment works</h3>
            <ul>
              <li><b>01</b><span>Keep enough funds in your Propulse wallet.</span></li>
              <li><b>02</b><span>Select an eligible industry and location.</span></li>
              <li><b>03</b><span>Invest within the Admin-configured limits.</span></li>
              <li><b>04</b><span>At settlement, keep the realized payout or reinvest it.</span></li>
            </ul>

            {isProMember ? <a className="membership-primary" href="/investment">Open Investment <span>→</span></a> : <button className="membership-primary current" disabled>🔒 Activate Pro first</button>}
          </article>
        </section>
      </>}

      <MembershipPayments />

      <section className="membership-value">
        <div><span className="membership-kicker">WHY MEMBERSHIP</span><h2>Simple access. Clear control.</h2><p>Pro controls access to advanced features. Investment uses your wallet and the investment rules configured by Admin — it is not a separate membership plan.</p></div>
        <div className="value-grid">
          <div><strong>01</strong><b>Pick Pro</b><span>Activate Pro to unlock advanced marketplace access and Investment.</span></div>
          <div><strong>02</strong><b>Add wallet funds</b><span>Investment capital comes from your Propulse wallet, not a membership payment.</span></div>
          <div><strong>03</strong><b>Invest when eligible</b><span>Use the Investment page to select an eligible industry and location within Admin limits.</span></div>
        </div>
      </section>
    </main>

    {manualOpen && selectedPlan && checkout && <div className="membership-modal-backdrop" onClick={() => setManualOpen(false)}>
      <div className="membership-payment-modal" onClick={(event) => event.stopPropagation()}>
        <button className="membership-modal-close" onClick={() => setManualOpen(false)}>×</button>
        <span className="membership-kicker">DIRECT PAYMENT</span>
        <h2>Complete {displayName(planType(selectedPlan))} payment</h2>
        <p>{Number(checkout.walletAmount) > 0 ? 'Your wallet balance has been applied automatically. Pay only the remaining amount directly.' : 'Your wallet has no available balance, so the full amount is due directly.'}</p>
        <div className="manual-summary"><span>Total</span><strong>{money(checkout.payment?.amount || selectedPlan.price)} / {period(selectedPlan).toLowerCase()}</strong><span>Wallet applied</span><strong>{money(checkout.walletAmount)}</strong><span>Remaining direct payment</span><strong>{money(checkout.externalAmount)}</strong></div>
        <div className="manual-method"><b>UPI / BANK TRANSFER</b><span>Payment details will be configured by Propulse admin.</span></div>
        <label className="manual-input-label">Payment reference / UTR<input id="manual-utr" placeholder="Enter UTR or transaction ID" /></label>
        <label className="manual-input-label">Payment proof<input id="manual-proof" type="file" accept="image/*,.pdf" /></label>
        <div className="manual-next"><b>Verification</b><ol><li>Make the remaining direct payment.</li><li>Enter the UTR / transaction reference.</li><li>Submit proof for admin verification.</li></ol></div>
        <button className="membership-primary" onClick={submitManual} disabled={submitting}>{submitting ? 'Submitting…' : `Submit ${money(checkout.externalAmount)} payment`} <span>→</span></button>
      </div>
    </div>}
  </div>
}
