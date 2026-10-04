import { useEffect, useMemo, useState } from 'react'
import UserHeader from '../components/UserHeader'
import { authRequest, getToken, getUser, saveSession } from '../utils/auth'
import { apiRequest } from '../utils/api'
import PaymentMethodSelector from '../components/PaymentMethodSelector'
import { loadPaymentOptions, runRazorpayCheckout } from '../utils/paymentGateway'
import './Membership.css'
import './CouponCheckout.css'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const asArray = (value) => (Array.isArray(value) ? value : [])
const membershipRecord = (value) => value?.membership_plan_id ? value : null
const planType = (plan) => String(plan?.plan_type || '').toLowerCase()
const normalizeLabel = (value) => String(value || '').trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const pad2 = (value) => String(Math.max(0, Number(value) || 0)).padStart(2, '0')
function OfferCountdown({ until, compact = false }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return undefined
    const end = new Date(until).getTime()
    if (!Number.isFinite(end) || end <= Date.now()) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [until])
  if (!until) return null
  const end = new Date(until).getTime()
  if (!Number.isFinite(end)) return null
  const remaining = Math.max(0, end - now)
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (remaining <= 0) return <div className={`membership-offer-countdown ${compact ? 'compact' : ''} expired`}><span>Offer expired</span></div>
  return <div className={`membership-offer-countdown ${compact ? 'compact' : ''}`}>
    <span className="membership-countdown-label">Offer ends in</span>
    <div className="membership-countdown-time">
      {days > 0 && <span><b>{pad2(days)}</b><small>D</small></span>}
      <span><b>{pad2(hours)}</b><small>H</small></span>
      <i>:</i>
      <span><b>{pad2(minutes)}</b><small>M</small></span>
      <i>:</i>
      <span><b>{pad2(seconds)}</b><small>S</small></span>
    </div>
  </div>
}
const offerMeta = (plan) => {
  if (!plan) return null
  const price = Number(plan.price || 0)
  if (plan.targeted_pricing) {
    const base = Number(plan.base_price || 0)
    const savings = Math.max(0, Number(plan.offer_savings ?? (base - price)) || 0)
    const discount = Math.max(0, Number(plan.offer_discount_percent || (base > 0 ? savings / base * 100 : 0)) || 0)
    const eligibility = plan.offer_new_customer_days
      ? `First membership within ${plan.offer_new_customer_days} day${Number(plan.offer_new_customer_days) === 1 ? '' : 's'} of registration`
      : null
    return {
      base,
      price,
      savings,
      discount,
      label: plan.offer_label || plan.pricing_rule_name || 'Special offer',
      eligibility,
      validUntil: plan.offer_valid_until || null
    }
  }
  const billingDiscount = Math.max(0, Number(plan.discount_percent || 0))
  const billingMonths = Math.max(1, Number(plan.billing_months || 1))
  const monthlyBase = Math.max(0, Number(plan.monthly_base_price || 0))
  const base = monthlyBase * billingMonths
  const savings = Math.max(0, base - price)
  if (billingDiscount <= 0 || savings <= 0) return null
  return { base, price, savings, discount: billingDiscount, label: 'Billing discount', eligibility: null, validUntil: null }
}
const daysLeft = (value) => value ? Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)) : null
const localProration = (current, target) => {
  if (!current || !target || String(current.membership_plan_id) === String(target.id)) return null
  const remainingDays = daysLeft(current.expires_at) || 0
  const currentPrice = Number(current.price || 0)
  const currentDuration = Math.max(1, Number(current.duration_days || 30))
  const credit = Math.min(currentPrice, Math.max(0, Number((currentPrice * remainingDays / currentDuration).toFixed(2))))
  const payable = Math.max(0, Number((Number(target.price || 0) - credit).toFixed(2)))
  const targetExpiry = new Date()
  targetExpiry.setDate(targetExpiry.getDate() + Math.max(1, Number(target.duration_days || 30)))
  return { credit, payable, remainingDays, targetExpiry }
}
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
  const [investmentAccess, setInvestmentAccess] = useState(null)
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
  const [paymentOptions, setPaymentOptions] = useState({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon'})
  const [paymentMode, setPaymentMode] = useState('offline')

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const [planData, membership, access, options] = await Promise.all([
          apiRequest('/membership-plans'),
          authRequest('/payments/membership/current').catch(() => null),
          authRequest('/investments/access').catch(() => null),
          loadPaymentOptions().catch(() => ({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon'}))
        ])
        if (!active) return
        setPlans(asArray(planData).filter((item) => item?.is_active !== false))
        setCurrentMembership(membershipRecord(membership))
        setInvestmentAccess(access || null)
        setPaymentOptions(options || {})
        setPaymentMode(options?.onlineEnabled&&options?.onlineDisplayMode==='live'?'online':options?.offlineEnabled!==false?'offline':'')
        if (user && access && typeof access.isPro === 'boolean') saveSession({ user: { ...user, is_pro_member: access.isPro } })
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load membership options.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [token, user])

  const growPlans = useMemo(() => plans.filter((item) => planType(item) === 'pro' && String(item?.plan_group || '').toLowerCase() === 'grow').sort((a, b) => Number(a?.billing_months || 0) - Number(b?.billing_months || 0) || Number(a?.price || 0) - Number(b?.price || 0)), [plans])
  const scalePlans = useMemo(() => plans.filter((item) => planType(item) === 'pro' && String(item?.plan_group || '').toLowerCase() === 'scale').sort((a, b) => Number(a?.billing_months || 0) - Number(b?.billing_months || 0) || Number(a?.price || 0) - Number(b?.price || 0)), [plans])
  const selectedGrowPlan = useMemo(() => growPlans.find((item) => String(item.id) === String(selectedGrowCycleId)) || growPlans.find((item) => String(item.id) === String(currentMembership?.membership_plan_id)) || growPlans[0] || null, [growPlans, selectedGrowCycleId, currentMembership])
  const selectedScalePlan = useMemo(() => scalePlans.find((item) => String(item.id) === String(selectedScaleCycleId)) || scalePlans.find((item) => String(item.id) === String(currentMembership?.membership_plan_id)) || scalePlans[0] || null, [scalePlans, selectedScaleCycleId, currentMembership])
  const selectedProration = useMemo(() => localProration(currentMembership, selectedPlan), [currentMembership, selectedPlan])
  const selectedOffer = useMemo(() => offerMeta(selectedPlan), [selectedPlan])

  const currentRaw = String(currentMembership?.plan_type || currentMembership?.plan?.plan_type || '').toLowerCase()
  const isProMember = Boolean(investmentAccess?.isPro || currentMembership?.isPro || currentRaw === 'pro')
  const currentGroup = currentMembership?.membership_plan_id
    ? String(currentMembership?.plan_group || currentMembership?.plan?.plan_group || '').toLowerCase()
    : ''

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
        idempotency: true,
        body: JSON.stringify({
          membershipPlanId: selectedPlan.id,
          ...(code ? { couponCode: code } : {})
        })
      })
      setCheckout(result)
      setCouponOpen(false)
      if (result.requiresExternalPayment) {
        setPaymentMode(paymentOptions?.onlineEnabled&&paymentOptions?.onlineDisplayMode==='live'?'online':paymentOptions?.offlineEnabled!==false?'offline':'')
        setManualOpen(true)
      } else {
        setSubmitted(true)
        const refreshedMembership = await authRequest('/payments/membership/current').catch(() => currentMembership)
        setCurrentMembership(membershipRecord(refreshedMembership))
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

  async function payOnline() {
    if (!checkout?.payment?.id) { setError('Payment session is unavailable. Please try again.'); return }
    try {
      setSubmitting(true)
      setError('')
      await runRazorpayCheckout({
        paymentId: checkout.payment.id,
        description: selectedPlan?.name ? `${selectedPlan.name} membership` : 'ProPulse membership'
      })
      setSubmitted(true)
      setManualOpen(false)
      const refreshedMembership = await authRequest('/payments/membership/current').catch(() => currentMembership)
      setCurrentMembership(membershipRecord(refreshedMembership))
      setSelectedPlan(null)
    } catch (err) {
      if (err?.code !== 'PAYMENT_CANCELLED') setError(err?.message || 'Unable to complete online payment.')
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
        <section className="membership-plans membership-plans-two">
          {[{ key: 'grow', label: 'GROW', plans: growPlans, selected: selectedGrowPlan, benefits: growBenefits, copy: 'Best Lead Pricing + Exclusive Leads + Investment Unlocked', action: 'Choose GROW' },
            { key: 'scale', label: 'SCALE', plans: scalePlans, selected: selectedScalePlan, benefits: scaleBenefits, copy: 'Everything in GROW + Website + SEO + Maintenance', action: 'Upgrade to SCALE' }].map((level) => {
              const isCurrent = Boolean(currentMembership?.membership_plan_id) && currentGroup === level.key;
              const canUpgrade = Boolean(currentMembership?.membership_plan_id) && level.key === 'scale' && currentGroup === 'grow';
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
                {level.selected && offerMeta(level.selected) ? (() => {
                  const offer = offerMeta(level.selected)
                  return <div className="membership-offer-price-block">
                    <div className="membership-offer-badge"><span>{offer.label}</span>{offer.discount > 0 && <b>{Math.round(offer.discount)}% OFF</b>}</div>
                    <div className="membership-price">{money(level.selected.price)}<small>{' / ' + period(level.selected).toLowerCase()}</small></div>
                    {offer.savings > 0 && <div className="membership-offer-saving"><del>{money(offer.base)}</del><strong>Save {money(offer.savings)}</strong></div>}
                    {offer.eligibility && <div className="membership-offer-validity">{offer.eligibility}</div>}
                    {offer.validUntil && <OfferCountdown until={offer.validUntil} />}
                  </div>
                })() : <div className="membership-price">{level.selected ? money(level.selected.price) : '—'}<small>{level.selected ? ' / ' + period(level.selected).toLowerCase() : ''}</small></div>}
                {isCurrent && level.selected && String(currentMembership?.membership_plan_id) !== String(level.selected.id) && (() => { const p = localProration(currentMembership, level.selected); return p ? <div className="membership-proration-preview"><span>Unused current-plan credit</span><strong>− {money(p.credit)}</strong><span>You pay to change</span><strong>{money(p.payable)}</strong><small>New validity ends {dateLabel(p.targetExpiry)}</small></div> : null })()}
                {isCurrent && currentMembership && <div className="membership-current-details"><div><span>Current billing</span><strong>{period(currentMembership)}</strong></div><div><span>Started</span><strong>{dateLabel(currentMembership.starts_at)}</strong></div><div><span>Valid until</span><strong>{dateLabel(currentMembership.expires_at)}</strong></div><div><span>Remaining</span><strong>{daysLeft(currentMembership.expires_at)} days</strong></div></div>}
                <div className="membership-divider" />
                <details className="membership-fold" open><summary><span>{level.label} includes</span><b>+</b></summary>
                  <ul>{level.benefits.map((item) => <li key={item}><b>✓</b><span>{item}</span></li>)}</ul>
                </details>
                {isCurrent
                  ? (String(currentMembership?.membership_plan_id) === String(level.selected?.id) || period(currentMembership).toLowerCase() === period(level.selected).toLowerCase())
                    ? <button className="membership-primary current" disabled>✓ Current {period(level.selected)}</button>
                    : <button className="membership-primary" onClick={() => openPlan(level.selected)} disabled={submitting}>{`Change to ${period(level.selected)}`} <span>→</span></button>
                  : currentGroup === 'scale' && level.key === 'grow'
                    ? <button className="membership-primary current" disabled>✓ Included in SCALE</button>
                    : !level.selected
                      ? <button className="membership-primary current" disabled>Plan being configured</button>
                      : <button className="membership-primary" onClick={() => openPlan(level.selected)} disabled={submitting}>{canUpgrade ? 'Upgrade to SCALE' : level.action} <span>→</span></button>}
              </article>
            })}
        </section>

        <section className="membership-plans membership-investor-access">
          <article className="membership-plan investor-plan investment-access-card">
            <div className="membership-plan-top">
              <div>
                <span className="membership-stage">INVESTOR</span>
                <h2>Investor</h2>
                <p>Put capital behind lead generation, track your investment cycle, generated funds, linked leads and payouts from one workspace.</p>
              </div>
              {isProMember ? <span className="popular-badge">UNLOCKED WITH PRO</span> : <span className="current-badge">PRO REQUIRED</span>}
            </div>

            <div className="investor-model">
              <div><b>INVEST</b><span>Deploy capital within the investment limits configured by Propulse.</span></div>
              <div><b>TRACK LEADS</b><span>Follow assigned and sold leads linked to your investor activity.</span></div>
              <div><b>MANAGE EARNINGS</b><span>Review generated funds, cycle history and eligible payout requests.</span></div>
            </div>

            <div className="membership-divider" />
            <ul>
              <li><b>01</b><span>Active Pro membership unlocks the Investor workspace.</span></li>
              <li><b>02</b><span>Investment availability still follows admin limits, industries and locations.</span></li>
              <li><b>03</b><span>Returns depend on realized lead-sale activity and are not fixed or guaranteed.</span></li>
            </ul>

            {isProMember
              ? <a className="membership-primary" href="/investment">Open Investor <span>→</span></a>
              : <button className="membership-primary current" disabled>🔒 Activate Pro first</button>}
          </article>
        </section>

      </>}

    {couponOpen && selectedPlan && <div className="membership-modal-backdrop" onClick={closeCoupon}>
      <div className="coupon-checkout-modal" onClick={(event) => event.stopPropagation()}>
        <button className="membership-modal-close" onClick={closeCoupon}>×</button>
        <span className="membership-kicker">COUPON</span>
        <h2>Have a coupon?</h2>
        <p>Apply your coupon before payment. Your unused current membership value is credited before any coupon discount.</p>
        {selectedOffer && <div className="membership-checkout-offer">
          <div><span>{selectedOffer.label}</span>{selectedOffer.discount>0&&<b>{Math.round(selectedOffer.discount)}% OFF</b>}</div>
          <div><del>{money(selectedOffer.base)}</del><strong>{money(selectedOffer.price)}</strong>{selectedOffer.savings>0&&<small>You save {money(selectedOffer.savings)}</small>}</div>
          {selectedOffer.eligibility&&<p>{selectedOffer.eligibility}</p>}
          {selectedOffer.validUntil&&<OfferCountdown until={selectedOffer.validUntil} compact/>}
        </div>}
        {selectedProration && <div className="coupon-proration-summary"><div><span>New plan price</span><strong>{money(selectedPlan.price)}</strong></div><div><span>Unused current-plan credit</span><strong>− {money(selectedProration.credit)}</strong></div><div className="total"><span>Upgrade payable</span><strong>{money(selectedProration.payable)}</strong></div><small>New validity starts today and runs through {dateLabel(selectedProration.targetExpiry)}.</small></div>}
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
        <span className="membership-kicker">PAYMENT</span>
        <h2>Complete membership payment</h2>
        <p>{Number(checkout.walletAmount) > 0 ? 'Your wallet balance has been applied automatically. Choose how to pay the remaining amount.' : 'Choose your preferred payment method below.'}</p>
        <div className="manual-summary">
          {checkout?.coupon && <><span>Original price</span><strong>{money(checkout.coupon.subtotalAmount)}</strong><span>Coupon discount</span><strong>− {money(checkout.coupon.discountAmount)}</strong></>}
          <span>Total</span><strong>{money(checkout.payment?.amount || selectedPlan.price)} / {period(selectedPlan).toLowerCase()}</strong>
          <span>Wallet applied</span><strong>{money(checkout.walletAmount)}</strong>
          <span>Remaining payment</span><strong>{money(checkout.externalAmount)}</strong>
        </div>
        <PaymentMethodSelector options={paymentOptions} value={paymentMode} onChange={setPaymentMode} disabled={submitting}/>
        {paymentMode==='offline'&&paymentOptions?.offlineEnabled!==false&&<>
          <div className="manual-method"><b>{paymentOptions?.offlineLabel||'UPI / BANK TRANSFER'}</b><span>Pay using a configured Propulse receiving account, then submit the UTR and proof.</span></div>
          <label className="manual-input-label">Payment reference / UTR<input id="manual-utr" placeholder="Enter UTR or transaction ID" /></label>
          <label className="manual-input-label">Payment proof<input id="manual-proof" type="file" accept="image/*,.pdf" /></label>
          <div className="manual-next"><b>Verification</b><ol><li>Make the remaining direct payment.</li><li>Enter the UTR / transaction reference.</li><li>Submit proof for admin verification.</li></ol></div>
          <button className="membership-primary" onClick={submitManual} disabled={submitting}>{submitting ? 'Submitting…' : `Submit ${money(checkout.externalAmount)} payment`} <span>→</span></button>
        </>}
        {paymentMode==='online'&&paymentOptions?.onlineEnabled&&<button className="membership-primary" onClick={payOnline} disabled={submitting}>{submitting?'Opening secure checkout…':`Pay ${money(checkout.externalAmount)} online`} <span>→</span></button>}
      </div>
    </div>}
    </main>
  </div>
}