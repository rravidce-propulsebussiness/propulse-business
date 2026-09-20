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
const period = (plan) => {
  if (plan?.billing_period) return normalizeLabel(plan.billing_period)
  const months = Number(plan?.billing_months || 1)
  return months === 12 ? 'Yearly' : months === 6 ? 'Half-Yearly' : months === 3 ? 'Quarterly' : 'Monthly'
}
const starterBenefits = ['Exclusive Leads access', 'Best member pricing']

export default function Membership() {
  const user = getUser()
  const token = getToken()
  const [plans, setPlans] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCycleId, setSelectedCycleId] = useState(null)
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

  const starterPlans = useMemo(() => plans
    .filter((item) => planType(item) === 'pro')
    .sort((a, b) => Number(a?.billing_months || 0) - Number(b?.billing_months || 0) || Number(a?.price || 0) - Number(b?.price || 0)), [plans])

  const selectedStarterPlan = useMemo(() => {
    if (!starterPlans.length) return null
    return starterPlans.find((item) => String(item.id) === String(selectedCycleId)) || starterPlans[0]
  }, [starterPlans, selectedCycleId])

  const currentRaw = String(currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || '').toLowerCase()
  const isProMember = Boolean(currentMembership?.isPro) || currentRaw === 'pro'

  const openPlan = (plan) => {
    if (!plan?.id) {
      setError('The Starter membership plan is unavailable.')
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
          <p>Get exclusive leads at the best member pricing. Choose the billing cycle that works for your business.</p>
        </section>

        <section className="membership-plans membership-plans-single">
          <article className="membership-plan starter-plan">
            <div className="membership-plan-top">
              <div>
                <span className="membership-stage">START</span>
                <h2>Starter</h2>
              </div>
              {isProMember ? <span className="current-badge">CURRENT</span> : <span className="popular-badge">BEST FOR LEADS</span>}
            </div>

            <p className="starter-lead-copy">Exclusive Leads + Best Pricing</p>

            <div className="card-billing">
              <div><span>CHOOSE BILLING</span><small>{starterPlans.length > 1 ? 'Flexible billing cycle' : 'Configured by Admin'}</small></div>
              {starterPlans.length > 0
                ? <div className="membership-cycles membership-cycles-dynamic">
                    {starterPlans.map((item) => <button type="button" key={item.id} className={String(selectedStarterPlan?.id) === String(item.id) ? 'active' : ''} onClick={() => setSelectedCycleId(item.id)}>{period(item)}</button>)}
                  </div>
                : <div className="membership-single-cycle unavailable">No active Starter billing cycle configured</div>}
            </div>

            <div className="membership-price">{selectedStarterPlan ? money(selectedStarterPlan.price) : '—'}<small>{selectedStarterPlan ? ' / ' + period(selectedStarterPlan).toLowerCase() : ''}</small></div>

            <div className="membership-divider" />
            <details className="membership-fold" open>
              <summary><span>Starter membership includes</span><b>+</b></summary>
              <ul>{starterBenefits.map((item) => <li key={item}><b>✓</b><span>{item}</span></li>)}</ul>
            </details>

            {isProMember
              ? <button className="membership-primary current" disabled>✓ Current Starter</button>
              : !selectedStarterPlan
                ? <button className="membership-primary current" disabled>Plan being configured</button>
                : <button className="membership-primary" onClick={() => openPlan(selectedStarterPlan)} disabled={submitting}>Choose Starter <span>→</span></button>}
          </article>
        </section>

        <section className="membership-growth-paths">
          <div className="growth-path-heading">
            <span className="membership-kicker">AFTER START</span>
            <h2>Grow and Scale when you're ready.</h2>
            <p>These are separate Propulse services and programs — they are not included in Starter membership.</p>
          </div>
          <div className="growth-path-grid">
            <article className="growth-path grow-path">
              <span className="growth-stage">GROW</span>
              <h3>Business Services</h3>
              <p>Build a stronger digital presence with services you can add when your business needs them.</p>
              <ul>
                <li>Website development</li>
                <li>SEO services</li>
                <li>Website maintenance</li>
              </ul>
              <a href="/contact">Explore Services <span>→</span></a>
            </article>
            <article className="growth-path scale-path">
              <span className="growth-stage">SCALE</span>
              <h3>Broader Reach & Opportunities</h3>
              <p>Propulse can promote your business profile to broaden reach, support lead generation and provide access to eligible earning programs.</p>
              <ul>
                <li>Business profile promotion</li>
                <li>Broader reach and lead generation</li>
                <li>Eligible earning programs, subject to program terms</li>
              </ul>
              <a href="/investment">Learn More <span>→</span></a>
            </article>
          </div>
        </section>

        <section className="membership-value">
          <div><span className="membership-kicker">THE PROPULSE JOURNEY</span><h2>Start simple. Grow when you need it. Scale when you're ready.</h2><p>Starter keeps membership focused on the two things customers join Propulse for: Exclusive Leads and Best Pricing. Website, SEO and maintenance are optional growth services. Scale focuses on broader reach, lead generation and eligible earning programs.</p></div>
          <div className="value-grid">
            <div><strong>START</strong><b>Exclusive Leads</b><span>Access eligible Exclusive Leads through your Propulse membership.</span></div>
            <div><strong>GROW</strong><b>Optional Services</b><span>Add website, SEO or maintenance services when your business is ready.</span></div>
            <div><strong>SCALE</strong><b>Broader Reach</b><span>Promote your business, generate opportunities and access eligible programs subject to their terms.</span></div>
          </div>
        </section>

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
        <h2>Complete {displayName(planType(selectedPlan))} payment</h2>
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
  </div>
}