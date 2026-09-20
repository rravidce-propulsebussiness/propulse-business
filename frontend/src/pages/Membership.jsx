import { useEffect, useMemo, useState } from 'react'
import UserHeader from '../components/UserHeader'
import { authRequest, getToken, getUser } from '../utils/auth'
import { apiRequest } from '../utils/api'
import './Membership.css'
import './CouponCheckout.css'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const asArray = (value) => (Array.isArray(value) ? value : [])
const planType = (plan) => String(plan?.plan_type || '').toLowerCase()
const normalizeLabel = (value) => String(value || '').trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const daysLeft = (value) => value ? Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)) : null
const period = (plan) => {
  if (plan?.billing_period) return normalizeLabel(plan.billing_period)
  const months = Number(plan?.billing_months || 1)
  return months === 12 ? 'Yearly' : months === 6 ? 'Half-Yearly' : months === 3 ? 'Quarterly' : 'Monthly'
}
const growBenefits = ['Best lead pricing', 'Exclusive Leads access', 'Investment access unlocked for eligible members']
const scaleBenefits = ['Everything in GROW', 'Website development', 'SEO services', 'Website maintenance']

export default function Membership() {
  const user = getUser()
  const token = getToken()
  const [plans, setPlans] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedGrowCycleId, setSelectedGrowCycleId] = useState(null)
  const [selectedScaleCycleId, setSelectedScaleCycleId] = useState(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponChecking, setCouponChecking] = useState(false)

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

  const growPlans = useMemo(() => plans.filter((item) => planType(item) === 'pro' && String(item?.plan_group || '').toLowerCase() === 'grow').sort((a, b) => Number(a?.billing_months || 0) - Number(b?.billing_months || 0) || Number(a?.price || 0) - Number(b?.price || 0)), [plans])
  const scalePlans = useMemo(() => plans.filter((item) => planType(item) === 'pro' && String(item?.plan_group || '').toLowerCase() === 'scale').sort((a, b) => Number(a?.billing_months || 0) - Number(b?.billing_months || 0) || Number(a?.price || 0) - Number(b?.price || 0)), [plans])
  const selectedGrowPlan = useMemo(() => growPlans.find((item) => String(item.id) === String(selectedGrowCycleId)) || growPlans.find((item) => String(item.id) === String(currentMembership?.membership_plan_id)) || growPlans[0] || null, [growPlans, selectedGrowCycleId, currentMembership])
  const selectedScalePlan = useMemo(() => scalePlans.find((item) => String(item.id) === String(selectedScaleCycleId)) || scalePlans.find((item) => String(item.id) === String(currentMembership?.membership_plan_id)) || scalePlans[0] || null, [scalePlans, selectedScaleCycleId, currentMembership])

  const currentRaw = String(currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || '').toLowerCase()
  const currentGroup = String(currentMembership?.plan_group || currentMembership?.plan?.plan_group || (currentMembership?.isPro || currentRaw === 'pro' ? 'grow' : '')).toLowerCase()
  const isProMember = Boolean(currentMembership?.isPro) || currentRaw === 'pro'

  const openPlan = (plan) => {
    if (!plan?.id) {
      setError('The membership plan is unavailable.')
      return
    }
    setSelectedPlan(plan)
    setError('')
    setSubmitted(false)
    setCouponCode('')
    setCouponResult(null)
    setCouponError('')
    setCouponOpen(true)
  }

  const closeCoupon = () => {
    if (couponChecking || submitting) return
    setCouponOpen(false)
    setCouponCode('')
    setCouponResult(null)
    setCouponError('')
    setSelectedPlan(null)
  }

  const validateCoupon = async () => {
    const code = couponCode.trim().toUpperCase()
    if (!selectedPlan?.id) return
    if (!code) {
      setCouponError('Enter a coupon code first.')
      setCouponResult(null)
      return
    }
    try {
      setCouponChecking(true)
      setCouponError('')
      const result = await authRequest('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code,
          subtotal: Number(selectedPlan.price),
          purchaseType: 'membership',
          membershipPlanId: selectedPlan.id
        })
      })
      setCouponCode(code)
      setCouponResult(result)
    } catch (err) {
      setCouponResult(null)
      setCouponError(err?.message || 'Unable to validate this coupon.')
    } finally {
      setCouponChecking(false)
    }
  }

  const checkoutMembership = async (withCoupon) => {
    if (!selectedPlan?.id) return
    try {
      setSubmitting(true)
      setCouponError('')
      setError('')
      const code = withCoupon && couponResult ? couponCode.trim().toUpperCase() : ''
      const result = await authRequest('/payments/checkout/membership', {
        method: 'POST',
        body: JSON.stringify({
          membershipPlanId: selectedPlan.id,
          ...(code ? { couponCode: code } : {})
        })
      })
      setCheckout(result)
      setCouponOpen(false)
      if (result.requiresExternalPayment) {
        setManualOpen(true)
      } else {
        setSubmitted(true)
        setCurrentMembership(await authRequest('/payments/membership/current').catch(() => currentMembership))
        setSelectedPlan(null)
      }
    } catch (err) {
      setCouponError(err?.message || 'Unable to start membership payment.')
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
          notes: `${selectedPlan?.name || checkout?.plan?.name || 'Membership'} direct payment${Number(checkout.walletAmount) > 0 ? ` after wallet payment of ${money(checkout.walletAmount)}` : ''}${checkout?.coupon?.code ? ` with coupon ${checkout.coupon.code}` : ''}`
        })
      })
      setSubmitted(true)
      setManualOpen(false)
      setSelectedPlan(null)
    } catch (err) {
      setError(err?.message || 'Unable to submit payment.')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="membership-page-shell">
    <UserHeader />
    <main className="membership-page">
      {submitted && <div className="membership-success">{checkout?.requiresExternalPayment ? 'Wallet amount was applied and the remaining direct payment was submitted for verification.' : 'Payment completed from your wallet and membership access is active.'}</div>}
      {error && <div className="membership-error">{error}</div>}

      {loading ? <div className="membership-state">Loading membership options…</div> : <>
        <section className="membership-hero">
          <div className="membership-hero-kicker">ONE MEMBERSHIP. REAL GROWTH.</div>
          <h1>Start with <span>Propulse.</span></h1>
          <p>Choose GROW for the core Propulse membership. Upgrade from GROW to SCALE when you want the full growth-service layer.</p>
        </section>

        <section className="membership-plans membership-plans-two">
          {[{ key: 'grow', label: 'GROW', plans: growPlans, selected: selectedGrowPlan, benefits: growBenefits, copy: 'Best Lead Pricing + Exclusive Leads + Investment Unlocked', action: 'Choose GROW' },
            { key: 'scale', label: 'SCALE', plans: scalePlans, selected: selectedScalePlan, benefits: scaleBenefits, copy: 'Everything in GROW + Website + SEO + Maintenance', action: 'Upgrade to SCALE' }].map((level) => {
              const isCurrent = currentGroup === level.key;
              const canUpgrade = level.key === 'scale' && currentGroup === 'grow';
              return <article className={`membership-plan ${level.key === 'grow' ? 'starter-plan grow-plan' : 'scale-membership-plan'}`} key={level.key}>
                <div className="membership-plan-top">
                  <div><span className="membership-stage">{level.label}</span><h2>{level.label}</h2></div>
                  {isCurrent ? <span className="current-badge">CURRENT</span> : level.key === 'grow' ? <span className="popular-badge">CORE GROWTH</span> : <span className="popular-badge">NEXT LEVEL</span>}
                </div>
                <p className="starter-lead-copy">{level.copy}</p>
                <div className="card-billing">
                  <div><span>CHOOSE BILLING</span><small>{level.plans.length > 1 ? 'Flexible billing cycle' : 'Configured by Admin'}</small></div>
                  {level.plans.length > 0 ? <div className="membership-cycles membership-cycles-dynamic">
                    {level.plans.map((item) => <button type="button" key={item.id} className={String(level.selected?.id) === String(item.id) ? 'active' : ''} onClick={() => level.key === 'grow' ? setSelectedGrowCycleId(item.id) : setSelectedScaleCycleId(item.id)}>{period(item)}</button>)}
                  </div> : <div className="membership-single-cycle unavailable">No active {level.label} billing cycle configured</div>}
                </div>
                <div className="membership-price">{level.selected ? money(level.selected.price) : '—'}<small>{level.selected ? ' / ' + period(level.selected).toLowerCase() : ''}</small></div>
                {isCurrent && currentMembership && <div className="membership-current-details"><div><span>Current billing</span><strong>{period(currentMembership)}</strong></div><div><span>Started</span><strong>{dateLabel(currentMembership.starts_at)}</strong></div><div><span>Valid until</span><strong>{dateLabel(currentMembership.expires_at)}</strong></div><div><span>Remaining</span><strong>{daysLeft(currentMembership.expires_at)} days</strong></div></div>}
                <div className="membership-divider" />
                <details className="membership-fold" open><summary><span>{level.label} includes</span><b>+</b></summary>
                  <ul>{level.benefits.map((item) => <li key={item}><b>✓</b><span>{item}</span></li>)}</ul>
                </details>
                {isCurrent
                  ? <button className="membership-primary" onClick={() => openPlan(level.selected)} disabled={submitting}>{String(currentMembership?.membership_plan_id) === String(level.selected?.id) ? `Renew ${level.label}` : `Change to ${period(level.selected)}`} <span>→</span></button>
                  : currentGroup === 'scale' && level.key === 'grow'
                    ? <button className="membership-primary current" disabled>✓ Included in SCALE</button>
                    : !level.selected
                      ? <button className="membership-primary current" disabled>Plan being configured</button>
                      : <button className="membership-primary" onClick={() => openPlan(level.selected)} disabled={submitting}>{canUpgrade ? 'Upgrade to SCALE' : level.action} <span>→</span></button>}
              </article>
            })}
        </section>

        <section className="membership-growth-paths">
          <div className="growth-path-heading">
            <span className="membership-kicker">YOUR PROPULSE MEMBERSHIP</span>
            <h2>GROW → SCALE</h2>
            <p>There are two paid membership plans. GROW includes the START foundation. SCALE upgrades the GROW experience for businesses ready for broader reach.</p>
          </div>
          <div className="growth-path-grid">
            <article className="growth-path grow-path">
              <span className="growth-stage">GROW</span>
              <h3>START + Business Growth</h3>
              <p>Best lead pricing, Exclusive Leads and investment access for eligible members.</p>
              <a href="#grow">View GROW <span>→</span></a>
            </article>
            <article className="growth-path scale-path">
              <span className="growth-stage">SCALE</span>
              <h3>GROW + Broader Reach</h3>
              <p>Everything in GROW, plus website development, SEO services and website maintenance.</p>
              <a href="#scale">View SCALE <span>→</span></a>
            </article>
          </div>
        </section>

        <section className="membership-value">
          <div><span className="membership-kicker">THE PROPULSE JOURNEY</span><h2>Start simple. Grow when you need it. Scale when you're ready.</h2><p>GROW includes Best Lead Pricing, Exclusive Leads and Investment access for eligible members. SCALE builds on GROW with website development, SEO and website maintenance.</p></div>
          <div className="value-grid">
            <div><strong>GROW</strong><b>Core Membership</b><span>Best lead pricing, Exclusive Leads and investment access for eligible members.</span></div><div><strong>SCALE</strong><b>GROW + Services</b><span>Upgrade from GROW to add website, SEO and maintenance services.</span></div>
          </div>
        </section>
      </>}

    {couponOpen && selectedPlan && <div className="membership-modal-backdrop" onClick={closeCoupon}>
      <div className="coupon-checkout-modal" onClick={(event) => event.stopPropagation()}>
        <button className="membership-modal-close" onClick={closeCoupon}>×</button>
        <span className="membership-kicker">COUPON</span>
        <h2>Have a coupon?</h2>
        <p>Apply your coupon before payment. The discount is checked against this membership plan and your account eligibility.</p>
        <div className="coupon-code-row">
          <input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponResult(null); setCouponError('') }} placeholder="Enter coupon code" autoComplete="off" />
          <button type="button" onClick={validateCoupon} disabled={couponChecking || submitting}>{couponChecking ? 'Checking…' : 'Apply'}</button>
        </div>
        {couponError && <div className="coupon-feedback error">{couponError}</div>}
        {couponResult && <div className="coupon-feedback success">Coupon <strong>{couponResult.coupon?.code || couponCode}</strong> applied successfully.</div>}
        {couponResult && <div className="coupon-discount-summary">
          <div><span>Membership price</span><strong>{money(couponResult.subtotalAmount ?? selectedPlan.price)}</strong></div>
          <div className="discount"><span>Coupon discount</span><strong>− {money(couponResult.discountAmount)}</strong></div>
          <div><span>Payable amount</span><strong>{money(couponResult.finalAmount)}</strong></div>
        </div>}
        <div className="coupon-checkout-actions">
          <button type="button" className="coupon-skip" onClick={() => checkoutMembership(false)} disabled={couponChecking || submitting}>Continue without coupon</button>
          <button type="button" className="coupon-continue" onClick={() => checkoutMembership(Boolean(couponResult))} disabled={couponChecking || submitting}>{submitting ? 'Starting…' : couponResult ? 'Continue with coupon' : 'Continue to payment'}</button>
        </div>
      </div>
    </div>}

    {manualOpen && selectedPlan && checkout && <div className="membership-modal-backdrop" onClick={() => setManualOpen(false)}>
      <div className="membership-payment-modal" onClick={(event) => event.stopPropagation()}>
        <button className="membership-modal-close" onClick={() => setManualOpen(false)}>×</button>
        <span className="membership-kicker">DIRECT PAYMENT</span>
        <h2>Complete membership payment</h2>
        <p>{Number(checkout.walletAmount) > 0 ? 'Your wallet balance has been applied automatically. Pay only the remaining amount directly.' : 'Your wallet has no available balance, so the full amount is due directly.'}</p>
        <div className="manual-summary">
          {checkout?.coupon && <><span>Original price</span><strong>{money(checkout.coupon.subtotalAmount)}</strong><span>Coupon discount</span><strong>− {money(checkout.coupon.discountAmount)}</strong></>}
          <span>Total</span><strong>{money(checkout.payment?.amount || selectedPlan.price)} / {period(selectedPlan).toLowerCase()}</strong>
          <span>Wallet applied</span><strong>{money(checkout.walletAmount)}</strong>
          <span>Remaining direct payment</span><strong>{money(checkout.externalAmount)}</strong>
        </div>
        <div className="manual-method"><b>UPI / BANK TRANSFER</b><span>Payment details will be configured by Propulse admin.</span></div>
        <label className="manual-input-label">Payment reference / UTR<input id="manual-utr" placeholder="Enter UTR or transaction ID" /></label>
        <label className="manual-input-label">Payment proof<input id="manual-proof" type="file" accept="image/*,.pdf" /></label>
        <div className="manual-next"><b>Verification</b><ol><li>Make the remaining direct payment.</li><li>Enter the UTR / transaction reference.</li><li>Submit proof for admin verification.</li></ol></div>
        <button className="membership-primary" onClick={submitManual} disabled={submitting}>{submitting ? 'Submitting…' : `Submit ${money(checkout.externalAmount)} payment`} <span>→</span></button>
      </div>
    </div>}
    </main>
  </div>
}