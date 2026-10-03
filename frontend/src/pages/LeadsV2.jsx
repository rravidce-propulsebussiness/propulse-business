import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { authRequest, publicRequest, getToken, getUser } from '../utils/auth'
import { claimLead, getLead, listLeads, purchaseLead } from '../api/leads'
import UserHeader from '../components/UserHeader'
import PaymentProofPicker from '../components/PaymentProofPicker'
import PaymentMethodSelector from '../components/PaymentMethodSelector'
import { loadPaymentOptions, runRazorpayCheckout } from '../utils/paymentGateway'
import { paymentProofError } from '../components/paymentProofValidation'
import './LeadsV2.css'
import './LeadsV2Payment.css'

const money = (v) => {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return ''
  return `₹${Number(v).toLocaleString('en-IN')}`
}
const promotionBenefitText = (offer) => {
  const type = String(offer?.benefit_type || offer?.reward?.type || 'discount')
  if (type === 'lead_bonus') {
    const qty = Number(offer?.bonus_lead_quantity ?? offer?.reward?.quantity ?? 0)
    const leadType = String(offer?.bonus_lead_type ?? offer?.reward?.leadType ?? 'shared') === 'premium' ? 'Premium' : 'Basic'
    return `Get ${qty} bonus ${leadType} lead${qty === 1 ? '' : 's'}`
  }
  if (type === 'wallet_bonus') {
    const valueType = offer?.reward_value_type
    if (valueType === 'percent') return `${Number(offer?.reward_value || 0)}% bonus wallet balance`
    const amount = Number(offer?.reward_value ?? offer?.reward?.amount ?? 0)
    return `Get ${money(amount)} bonus wallet balance`
  }
  return offer?.discount_type === 'percent'
    ? `${Number(offer?.discount_value || 0)}% off`
    : `${money(offer?.discount_value || 0)} off`
}
const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '—'
const norm = (v) => String(v ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const label = (k) => String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())
const isContactKey = (k) => /(phone|mobile|whatsapp|contact|email|mail|tel|telephone|alternate|website|url|social|instagram|facebook|linkedin|address|pincode|zipcode|postal)/i.test(String(k || ''))
const isPricingField = (k) => /^(normal|pro)\d+(share|shares|buyer|buyers)(price)?$/.test(norm(k)) || ['pricing', 'leadpricing', 'leadprice', 'price'].includes(norm(k))
const isCanonicalField = (k) => {
  const n = norm(k)
  return [
    'requirement', 'requirements', 'requirementdetails', 'sharemoredetailsandrequirement',
    'location', 'city', 'state', 'budget', 'budgetrange', 'projectbudget', 'projectbudgetrange', 'budgetfromto', 'expectedbudget',
    'propertytype', 'property', 'interiortype', 'typeofproperty',
    'timeline', 'timeframe', 'projecttimeline', 'expectedtimeline', 'planningdate', 'howsoonrequired', 'when',
    'worknumbers', 'worknumber', 'numberofworks', 'numberofwork', 'noofworks', 'works', 'quantity', 'projectquantity', 'numberofprojects', 'projectcount',
    'buyercapacity', 'customerphone', 'customeremail', 'pincode', 'pin', 'zipcode', 'zip', 'postalcode'
  ].includes(n) || n.includes('requirement') || n.includes('budget') || n.includes('workphone') || n.includes('officephone') || n.includes('businessphone')
}
const maskContact = (value) => {
  if (!hasValue(value)) return ''
  let text = String(value)
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'xxxx@xxxx.com')
  text = text.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, match => {
    const digits = match.replace(/\D/g, '')
    if (digits.length < 8) return 'xxxx'
    const tail = digits.length >= 10 ? 2 : 1
    return `${digits.slice(0, 2)}${'x'.repeat(Math.max(4, digits.length - 2 - tail))}${digits.slice(-tail)}`
  })
  return text.replace(/https?:\/\/\S+|www\.\S+/gi, 'xxxx')
}
const displayValue = (key, value) => isContactKey(key) ? maskContact(value) : maskContact(value)
const visibleCustomFields = (fields) => Object.entries(fields || {}).filter(([k, v]) => !isPricingField(k) && !isCanonicalField(k) && hasValue(v))
const getCustom = (fields, names, contains = []) => {
  const entries = Object.entries(fields || {}).filter(([, value]) => hasValue(value))
  const wanted = names.map(norm)
  const exact = entries.find(([key]) => wanted.includes(norm(key)))
  if (exact) return displayValue(exact[0], exact[1])
  const patterns = contains.map(norm).filter(Boolean)
  const fuzzy = entries.find(([key]) => {
    const n = norm(key)
    return patterns.some(pattern => n.includes(pattern))
  })
  return fuzzy ? displayValue(fuzzy[0], fuzzy[1]) : ''
}
const timeAgo = (value) => {
  const time = new Date(value || 0).getTime()
  if (!time) return ''
  const diff = Math.max(0, Date.now() - time)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function LeadsV2() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const category = params.get('category')
  const user = getUser()
  const token = getToken()
  const logged = Boolean(token)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marketplaceUnavailable, setMarketplaceUnavailable] = useState(false)
  const [upgrade, setUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [buyModal, setBuyModal] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWallet, setUseWallet] = useState(true)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [filterCatalog, setFilterCatalog] = useState({ industries: [], cities: [] })
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasNext: false, hasPrevious: false })
  const [buying, setBuying] = useState(null)
  const [claiming, setClaiming] = useState(null)
  const [notice, setNotice] = useState('')
  const [payment, setPayment] = useState(null)
  const [paymentLead, setPaymentLead] = useState(null)
  const [directSubmitting, setDirectSubmitting] = useState(false)
  const [paymentProof, setPaymentProof] = useState(null)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentReceiving, setPaymentReceiving] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [couponStatus, setCouponStatus] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponFinalAmount, setCouponFinalAmount] = useState(null)
  const [couponReward, setCouponReward] = useState(null)
  const [publicLeadOffers, setPublicLeadOffers] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)
  const [paymentOptions, setPaymentOptions] = useState({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon'})
  const [paymentMode, setPaymentMode] = useState('offline')

  useEffect(() => {
    let live = true
    if (!token) {
      queueMicrotask(() => { if (live) setCurrentMembership(null) })
      return () => { live = false }
    }
    authRequest('/payments/membership/current')
      .then(data => { if (live) setCurrentMembership(data || null) })
      .catch(() => { if (live) setCurrentMembership(null) })
    return () => { live = false }
  }, [token])

  useEffect(() => {
    let live = true
    if (!buyModal && !payment) {
      queueMicrotask(() => { if (live) setPaymentReceiving([]) })
      return () => { live = false }
    }
    Promise.all([
      authRequest('/payment-receiving-details').catch(() => []),
      loadPaymentOptions().catch(() => ({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon'}))
    ]).then(([data,options]) => {
      if (!live) return
      setPaymentReceiving(Array.isArray(data) ? data.filter(item => item?.is_active !== false) : [])
      setPaymentOptions(options || {})
      setPaymentMode(options?.onlineEnabled&&options?.onlineDisplayMode==='live'?'online':options?.offlineEnabled!==false?'offline':'')
    }).catch(() => { if (live) setPaymentReceiving([]) })
    return () => { live = false }
  }, [buyModal, payment])
  useEffect(() => { let live=true; queueMicrotask(()=>{if(live)setPage(1)}); return()=>{live=false} }, [search, category, industryFilter, cityFilter])
  useEffect(() => {
    let live = true
    Promise.all([
      publicRequest('/industries'),
      publicRequest('/cities')
    ])
      .then(([industryData, cityData]) => {
        if (!live) return
        const industryRows = Array.isArray(industryData) ? industryData : (industryData?.items || industryData?.industries || [])
        const cityRows = Array.isArray(cityData) ? cityData : (cityData?.items || cityData?.cities || [])
        const industries = industryRows
          .map(x => ({ id: x?.id ?? x?.industry_id, name: String(x?.name || x?.label || x?.industry_name || '').trim() }))
          .filter(x => x.name)
          .sort((a,b) => a.name.localeCompare(b.name))
        const cities = cityRows
          .map(x => ({ id: x?.id ?? x?.city_id, name: String(x?.name || x?.label || x?.city_name || '').trim() }))
          .filter(x => x.name)
          .sort((a,b) => a.name.localeCompare(b.name))
        setFilterCatalog({ industries, cities })
      })
      .catch(() => { if (live) setFilterCatalog({ industries: [], cities: [] }) })
    return () => { live = false }
  }, [])
  useEffect(() => {
    let live = true
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const terms = [category?.replaceAll('-', ' '), search.trim()].filter(Boolean).join(' ')
        const d = await listLeads({
          status: 'available',
          page,
          limit: 20,
          ...(terms ? { search: terms } : {}),
          ...(industryFilter ? { industryId: industryFilter } : {}),
          ...(cityFilter ? { cityId: cityFilter } : {})
        }, token)
        if (live) {
          if (d?.degraded && d?.unavailable) {
            setMarketplaceUnavailable(true)
            setLeads([])
            setPagination({ page: 1, limit: 20, total: 0, hasNext: false, hasPrevious: false })
            return
          }
          setMarketplaceUnavailable(false)
          const items = Array.isArray(d) ? d : (d.items || [])
          const availableItems = items.filter(l => !l.is_purchased && !l.purchased && !l.access?.claimed && !l.access?.purchased)
          setLeads(availableItems)
          setPagination(d.pagination ? { ...d.pagination, total: Math.max(0, Number(d.pagination.total || 0) - (items.length - availableItems.length)) } : { page, limit: 20, total: availableItems.length, hasNext: false, hasPrevious: page > 1 })
        }
      } catch (e) { if (live) { setMarketplaceUnavailable(false); setError(e.message) } }
      finally { if (live) setLoading(false) }
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [token, page, search, category, industryFilter, cityFilter])

  const membershipLabel = norm(currentMembership?.plan_group || currentMembership?.plan?.plan_group || currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || user?.membership?.type || user?.membership?.name || user?.plan || user?.plan_name || user?.subscription_plan || '')
  const activeMembershipGroup = membershipLabel === 'grow' || membershipLabel.includes('grow') || membershipLabel.includes('growth') ? 'growth' : membershipLabel === 'scale' || membershipLabel.includes('scale') ? 'scale' : ''
  const isGrowthScaleMember = Boolean(activeMembershipGroup)
  const isPro = Boolean(user?.is_pro_member || user?.membership_type === 'pro' || currentMembership?.isPro || currentMembership?.plan_type === 'pro')
  const memberBillingMonths = Number(currentMembership?.billing_months || currentMembership?.plan?.billing_months || currentMembership?.billing_months_count || currentMembership?.plan?.billing_months_count || currentMembership?.duration_months || currentMembership?.plan?.duration_months || currentMembership?.plan?.billing_months || 0)
  const memberBillingPeriod = String(currentMembership?.billing_period || currentMembership?.plan?.billing_period || '').trim()
  const memberPeriodLabel = memberBillingMonths === 12 || /year/i.test(memberBillingPeriod) ? 'Year' : memberBillingMonths === 6 || /half/i.test(memberBillingPeriod) ? 'Half-Year' : memberBillingMonths === 3 || /quarter/i.test(memberBillingPeriod) ? 'Quarter' : 'Month'
  const memberSavingsLabel = activeMembershipGroup === 'scale' ? `Scale (${memberPeriodLabel})` : activeMembershipGroup === 'growth' ? `Growth (${memberPeriodLabel})` : 'Growth / Scale'
  const buyModalClaimed = Boolean(buyModal?.access?.claimed || buyModal?.access?.purchased)
  const currentPricingRow = buyModal?.pricing?.shares?.[0] || null
  const currentBuyerAccess = Number(currentPricingRow?.shares || buyModal?.effective_buyer_capacity || 0) || null
  const title = category ? `${category.replaceAll('-', ' ')} leads` : 'Available Leads'
  const visibleLeads = useMemo(() => leads, [leads])

  const filterOptions = filterCatalog

  const openBuyModal = (lead) => {
    if (!logged) { navigate('/login'); return }
    if (!lead.pricing?.shares?.length) { setError('Pricing is not available for this lead.'); return }
    setError(''); setNotice(''); setPaymentError(''); setCouponCode(''); setCouponStatus(''); setCouponError(''); setCouponDiscount(0); setCouponFinalAmount(null); setCouponReward(null); setPublicLeadOffers([]); setUseWallet(true); setWalletBalance(0); setPaymentProof(null); setBuyModal(lead)
    authRequest('/wallet?summary=1').then(data => setWalletBalance(Number(data?.balance ?? data?.wallet?.balance ?? 0))).catch(() => {})
    const industryId = lead?.industry_id ? `&industryId=${encodeURIComponent(lead.industry_id)}` : ''
    const leadRow = lead?.pricing?.shares?.[0] || null
    const offerSubtotal = Number(leadRow?.[isPro ? 'pro' : 'normal'] || 0)
    const subtotalParam = offerSubtotal > 0 ? `&subtotal=${encodeURIComponent(offerSubtotal)}` : ''
    authRequest(`/coupons/offers?purchaseType=lead${industryId}${subtotalParam}`).then(data => setPublicLeadOffers(Array.isArray(data) ? data : [])).catch(() => setPublicLeadOffers([]))
  }
  const validateCouponForCurrentAccess = async (code = couponCode) => {
    const normalized = String(code || '').trim().toUpperCase()
    setCouponError('')
    if (!normalized) {
      setCouponStatus('')
      setCouponDiscount(0)
      setCouponFinalAmount(null)
      setCouponReward(null)
      return false
    }
    const subtotal = Number(currentPricingRow?.[isPro ? 'pro' : 'normal'] || 0)
    if (!subtotal) {
      setCouponError('Lead price is unavailable.')
      return false
    }
    try {
      const result = await authRequest('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: normalized,
          subtotal,
          purchaseType: 'lead',
          industryId: buyModal?.industry_id || null
        })
      })
      const discount = Number(result?.discountAmount || 0)
      const finalAmount = Number(result?.finalAmount ?? Math.max(0, subtotal - discount))
      const reward = result?.reward || null
      setCouponCode(normalized)
      setCouponDiscount(discount)
      setCouponFinalAmount(finalAmount)
      setCouponReward(reward)
      setCouponStatus(
        reward?.type === 'lead_bonus'
          ? `${normalized} applied · ${promotionBenefitText({ reward, benefit_type: 'lead_bonus' })} after successful payment`
          : reward?.type === 'wallet_bonus'
            ? `${normalized} applied · ${promotionBenefitText({ reward, benefit_type: 'wallet_bonus' })} after successful payment`
            : discount > 0
              ? `${normalized} applied · You save ${money(discount)}`
              : `${normalized} applied`
      )
      return true
    } catch (e) {
      setCouponDiscount(0)
      setCouponFinalAmount(null)
      setCouponReward(null)
      setCouponStatus('')
      setCouponError(e.message || 'Unable to validate coupon')
      return false
    }
  }
  const applyCoupon = () => validateCouponForCurrentAccess()
  const claim = async (lead) => {
    if (!logged) { navigate('/login'); return }
    setClaiming(lead.id); setNotice(''); setError('')
    try {
      await claimLead(lead.id)
      await getLead(lead.id)
      setLeads(current => current.filter(x => x.id !== lead.id))
      setNotice(`Lead #${lead.id} claimed successfully.`); setExpanded(null)
    } catch (e) { setError(e.message) }
    finally { setClaiming(null) }
  }
  const submitLeadCheckout = async (lead, plan = 'normal') => {
    if (!logged) { navigate('/login'); return }
    if (plan === 'pro' && !isPro) { setBuyModal(null); setUpgrade(true); return }
    const row = lead?.pricing?.shares?.[0] || null
    const shares = Number(row?.shares || lead?.effective_buyer_capacity || 0)
    const selectedPrice = Number(row?.[isPro ? 'pro' : 'normal'] || 0)
    if (!shares || !selectedPrice) return setPaymentError('Current buyer access pricing is unavailable.')
    const discountedTotal = Math.max(0, Number(couponFinalAmount != null ? couponFinalAmount : selectedPrice))
    const walletDeduction = useWallet ? Math.min(Math.max(0, Number(walletBalance || 0)), discountedTotal) : 0
    const estimatedExternal = Math.max(0, discountedTotal - walletDeduction)
    if (estimatedExternal > 0 && paymentMode === 'offline') {
      const reference = document.getElementById('lead-payment-utr')?.value?.trim()
      if (!reference) return setPaymentError('Enter the payment reference / UTR first.')
      const proofValidation = paymentProofError(paymentProof?.file)
      if (proofValidation) return setPaymentError(proofValidation)
    }
    if (estimatedExternal > 0 && !paymentMode) return setPaymentError('No external payment method is currently available.')
    const key = `${lead.id}-${shares}-${plan}-${useWallet ? 'wallet' : 'direct'}`
    setBuying(key); setPaymentError(''); setNotice(''); setError(''); setCouponError('')
    try {
      const d = await purchaseLead(lead.id, shares, { useWallet, couponCode })
      const needsExternalPayment = Boolean(d?.requires_external_payment || d?.requiresExternalPayment || d?.payment?.status === 'pending')
      if (needsExternalPayment) {
        setPayment(d)
        setPaymentLead(lead)
        if (paymentMode === 'online') {
          setDirectSubmitting(true)
          await runRazorpayCheckout({paymentId:d.payment.id,description:`Lead #${lead.id} purchase`})
          setPayment(null);setPaymentLead(null);setPaymentProof(null);setPaymentError('');setPaymentSuccess(`Lead #${lead.id} payment completed successfully.`);setBuyModal(null)
          setBuying(null)
          return
        }
        const reference = document.getElementById('lead-payment-utr')?.value?.trim()
        const proofValidation = paymentProofError(paymentProof?.file)
        if (!reference || proofValidation) {
          setBuying(null)
          return setPaymentError(!reference ? 'Enter the payment reference / UTR first.' : proofValidation)
        }
        setDirectSubmitting(true)
        const proofUrl = paymentProof.dataUrl
        await authRequest(`/payments/${d.payment.id}/reference`, {
          method: 'POST',
          body: JSON.stringify({
            manualReference: reference,
            proofUrl,
            notes: `Lead #${lead.id} direct payment${Number(d.walletAmount) > 0 ? ` after wallet payment of ${money(d.walletAmount)}` : ''}`
          })
        })
        const submittedMessage = `${Number(d.walletAmount) > 0 ? `Wallet payment of ${money(d.walletAmount)} applied. ` : ''}Remaining ${money(d.externalAmount)} submitted for verification.`
        setPayment(null); setPaymentLead(null);  setPaymentProof(null); setPaymentError(''); setPaymentSuccess(submittedMessage); setBuyModal(null)
        setBuying(null)
        return
      }
      await getLead(lead.id)
      setLeads(current => current.filter(x => x.id !== lead.id))
      setBuyModal(null)
      setPaymentProof(null)
      setNotice(`Lead #${lead.id} purchased successfully from ${plan === 'pro' ? 'Pro' : 'Normal'} pricing.`)
      setExpanded(null)
    } catch (e) {
      if (e.code === 'PRO_REQUIRED') {
        setBuyModal(null); setUpgrade(true)
      } else if (String(e.code || '').includes('COUPON') || ['MIN_ORDER', 'PURCHASE_NOT_ELIGIBLE', 'PLAN_NOT_ELIGIBLE', 'USER_NOT_ELIGIBLE', 'INDUSTRY_NOT_ELIGIBLE', 'USAGE_LIMIT', 'USER_USAGE_LIMIT'].includes(e.code)) {
        setCouponError(e.message)
      } else {
        setPaymentError(e.message || 'Unable to submit purchase.')
      }
    } finally {
      setDirectSubmitting(false)
      setBuying(current => current === key ? null : current)
    }
  }


  const submitDirect = async () => {
    setPaymentError('')
    const reference = document.getElementById('lead-payment-utr')?.value?.trim()
    if (!reference) return setPaymentError('Enter the payment reference / UTR first.')
    const proofValidation = paymentProofError(paymentProof?.file)
    if (proofValidation) return setPaymentError(proofValidation)
    if (!payment?.payment?.id) return setPaymentError('Payment session is unavailable. Please try again.')
    try {
      setDirectSubmitting(true)
      const proofUrl = paymentProof.dataUrl
      await authRequest(`/payments/${payment.payment.id}/reference`, {
        method: 'POST',
        body: JSON.stringify({ manualReference: reference, proofUrl, notes: `Lead #${paymentLead?.id} direct payment${Number(payment.walletAmount) > 0 ? ` after wallet payment of ${money(payment.walletAmount)}` : ''}` })
      })
      const submittedMessage = `${Number(payment.walletAmount) > 0 ? `Wallet payment of ${money(payment.walletAmount)} applied. ` : ''}Remaining ${money(payment.externalAmount)} submitted for verification.`
      setPayment(null); setPaymentLead(null);  setPaymentProof(null); setPaymentError(''); setPaymentSuccess(submittedMessage)
    } catch (e) { setPaymentError(e.message || 'Unable to submit payment. Please try again.') }
    finally { setDirectSubmitting(false) }
  }

  if (user?.role === 'admin') return <main className="lv2-page"><section className="lv2-empty"><span>ADMIN ACCOUNT</span><h1>Lead management is in the Admin Panel.</h1><Link to="/admin/leads">Open Admin Leads →</Link></section></main>

  return <div className="lv2-shell">
    <UserHeader />
    <main className="lv2-page">
      <section className="lv2-market-head"><div className="lv2-title-block"><span></span><div><h1>{title}</h1><p>All available leads are shown by default.</p></div></div><div className="lv2-controls"><div className="lv2-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by industry, service, location..." aria-label="Search leads"/><b>⌕</b></div><div className="lv2-guest-filters"><select value={industryFilter} onChange={e => { setIndustryFilter(e.target.value); setCityFilter('') }} aria-label="Filter by industry"><option value="">All Industries</option>{filterOptions.industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={cityFilter} onChange={e => setCityFilter(e.target.value)} aria-label="Filter by city"><option value="">All Cities</option>{filterOptions.cities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div></section>
      {error && <div className="lv2-error">{error}</div>}{notice && <div className="lv2-error">{notice}</div>}
      {loading ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>Loading opportunities...</strong></div> : marketplaceUnavailable ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>Marketplace temporarily unavailable</strong><p>We are reconnecting to the service. Please try again shortly.</p></div> : !visibleLeads.length ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>No matching leads</strong><p>Try another search or filter.</p></div> : <div className="lv2-grid">
        {visibleLeads.map(lead => {
          const shares = lead.pricing?.shares || []
          const cardPricingRow = shares[0] || null
          const cardLeadPrice = Number(cardPricingRow?.[isPro ? 'pro' : 'normal'] || 0)
          const cardNormalPrice = Number(cardPricingRow?.normal || 0)
          const cardProPrice = Number(cardPricingRow?.pro || 0)
          const dynamic = visibleCustomFields(lead.custom_fields)
          const open = expanded === lead.id
          const exclusive = Boolean(lead.has_exclusive_option)
          const leadAccess = lead.access || {}
          const claimed = Boolean(leadAccess.claimed || leadAccess.purchased)
          const location = [lead.city_name, lead.state_name].filter(hasValue).join(', ')
          const timeline = getCustom(lead.custom_fields, ['Timeline', 'Timeframe', 'Project Timeline', 'Expected Timeline', 'When'], ['timeline', 'timeframe'])
          const property = hasValue(lead.property_type) ? lead.property_type : getCustom(lead.custom_fields, ['Property Type', 'Property'], ['property'])
          const workNumbers = getCustom(lead.custom_fields, ['Work Numbers', 'Work Number', 'Number of Works', 'Number of Work', 'No. of Works', 'No of Works', 'Works', 'Quantity', 'Project Quantity'], ['worknumber', 'worknumbers', 'numberofworks', 'noofworks', 'quantity', 'projectquantity'])
          const workPhone = getCustom(lead.custom_fields, ['Work Phone Number', 'Work Phone', 'Office Phone Number', 'Office Phone', 'Business Phone', 'Business Phone Number', 'Alternate Work Phone', 'Alternate Phone'], ['workphone', 'officephone', 'businessphone'])
          const budgetRange = getCustom(lead.custom_fields, ['Budget', 'Budget Range', 'Project Budget', 'Project Budget Range', 'Budget From To', 'Expected Budget'], ['budget'])
          const budgetDisplay = budgetRange || (hasValue(lead.budget) ? money(lead.budget) : '')
          const buyerCapacity = Math.max(1, Math.min(3, Number(lead.effective_buyer_capacity || lead.buyer_capacity) || 3))
          const purchasedBuyers = Math.min(buyerCapacity, Math.max(0, Number(lead.purchased_buyer_count) || 0))
          const fastBasic = String(lead.source || '').toLowerCase() === 'homepage_consultation'
          const initials = String(lead.customer_name || lead.service_name || lead.industry_name || 'L').trim().charAt(0).toUpperCase()
          return <article className={`lv2-card ${lead.lead_type || 'basic'} ${exclusive ? 'has-exclusive' : ''}`} key={lead.id}>
            <div className="lv2-card-top"><span className="lv2-id">#L-{String(lead.id).padStart(6, '0')}</span>{fastBasic && <span className="lv2-basic-detail-pill">Basic details · Shared 3</span>}<small>{timeAgo(lead.created_at)}</small></div>
            <div className="lv2-person"><div className="lv2-avatar">{initials}</div><div className="lv2-person-copy"><div><h2>{hasValue(lead.customer_name) ? lead.customer_name : (lead.service_name || lead.industry_name || 'Business opportunity')}</h2><span className="lv2-verified-mini">✓ Verified</span></div></div></div>
            <div className="lv2-facts">
              {hasValue(lead.industry_name) && <div><span>▣</span><b>{lead.industry_name}</b></div>}
              {hasValue(lead.service_name) && <div><span>⌁</span><b>{lead.service_name}{hasValue(lead.subservice_name) ? `, ${lead.subservice_name}` : ''}</b></div>}
              {hasValue(location) && <div><span>⌖</span><b>{location}</b></div>}
              {hasValue(property) && <div><span>⌂</span><b>{property}</b></div>}
              {hasValue(budgetDisplay) && <div><span>₹</span><b>{budgetDisplay}</b></div>}
              <div><span>◉</span><b>Purchased {purchasedBuyers}/{buyerCapacity}</b></div>
            </div>
            <div className="lv2-card-price">
              <div><small>LEAD PRICE</small><strong>{cardLeadPrice > 0 ? money(cardLeadPrice) : 'Price unavailable'}</strong></div>
              {logged && isPro && cardNormalPrice > cardProPrice && cardProPrice > 0 && <em>You save {money(cardNormalPrice-cardProPrice)}</em>}
            </div>
            <div className="lv2-contact"><span>Contact Details (Masked)</span><div>{hasValue(lead.customer_phone) && <b>⌕ &nbsp; {maskContact(lead.customer_phone)}</b>}{hasValue(workPhone) && <b>⌖ &nbsp; Work {workPhone}</b>}{hasValue(lead.customer_email) && <b>✉ &nbsp; {maskContact(lead.customer_email)}</b>}{!hasValue(lead.customer_phone) && !hasValue(workPhone) && !hasValue(lead.customer_email) && <b>Contact available after purchase</b>}</div></div>
            <div className="lv2-card-actions"><button className="lv2-details-link" onClick={() => setExpanded(open ? null : lead.id)}>{open ? 'Hide Full Details' : 'View Full Details'} <b>→</b></button><button className="lv2-buy" onClick={() => openBuyModal(lead)} disabled={!shares.length}>{claimed ? 'Purchased' : '🛒  Buy Lead'}</button></div>
            {open && <div className="lv2-details"><div className="lv2-details-head"><h3>Lead details</h3><span>{claimed ? 'Access granted' : 'Verified opportunity'}</span></div><div className="lv2-detail-grid">{[['Industry', lead.industry_name], ['Service', lead.service_name], ['Subservice', lead.subservice_name], ['Location', location], ['PIN code', lead.pincode], ['Property type', property], ['Budget', budgetDisplay], ['Timeline', timeline], ['Lead price', cardLeadPrice > 0 ? money(cardLeadPrice) : 'Price unavailable'], ['Work numbers', workNumbers], ['Work phone', workPhone], ['Purchased', `${purchasedBuyers}/${buyerCapacity}`], ['Source', fastBasic ? 'Basic homeowner enquiry' : lead.source], ['Customer', lead.customer_name], ['Phone', lead.customer_phone ? maskContact(lead.customer_phone) : ''], ['Email', lead.customer_email ? maskContact(lead.customer_email) : '']].filter(([, v]) => hasValue(v)).map(([k, v], index) => <div key={`${k}-${index}`}><small>{k}</small><b>{v}</b></div>)}{dynamic.map(([k, v], index) => <div key={`${k}-${index}`}><small>{label(k)}</small><b>{displayValue(k, typeof v === 'object' ? JSON.stringify(v) : v)}</b></div>)}</div>{hasValue(lead.requirement) && <p className="lv2-requirement-full"><b>Requirement</b>{maskContact(lead.requirement)}</p>}{hasValue(lead.notes) && <p className="lv2-notes"><b>Notes</b>{maskContact(lead.notes)}</p>}</div>}
            {logged && !claimed && leadAccess.canClaim && <div className="lv2-exclusive"><div><b>{leadAccess.entitlementSource==='new_business'?'Welcome lead entitlement':leadAccess.entitlementSource==='campaign'?'Business entitlement':leadAccess.entitlementSource==='admin'?'Propulse lead entitlement':'Membership access'}</b><span>{leadAccess.entitlementSource==='new_business'?'Included by your registration entitlement rule':leadAccess.entitlementSource==='campaign'?'Included in a Propulse business entitlement':leadAccess.entitlementSource==='admin'?'Granted directly to your business':'Included in your current plan'}{leadAccess.remaining !== undefined ? ` · ${leadAccess.remaining} remaining` : ''}</span></div><button disabled={claiming === lead.id} onClick={() => claim(lead)}>{claiming === lead.id ? 'Claiming…' : 'Claim free →'}</button></div>}
            {logged && !claimed && leadAccess.reason && !leadAccess.canClaim && <div className="lv2-card-cta"><div><b>Lead entitlement</b><span>{leadAccess.reason}</span></div></div>}
            {claimed && <div className="lv2-card-cta"><div><b>Lead access granted</b><span>You can use this lead from your account.</span></div><Link to="/dashboard">Open dashboard →</Link></div>}
            {exclusive && logged && !claimed && <div className="lv2-exclusive"><div><b>Pro Early Access</b><span>{lead.exclusive_action === 'upgrade_to_pro' ? 'Pro members get first access' : 'Available for purchase'}</span></div>{lead.exclusive_action === 'upgrade_to_pro' ? <button onClick={() => setUpgrade(true)}>Get Pro →</button> : <button onClick={() => openBuyModal(lead)}>Buy →</button>}</div>}
            {!logged && <div className="lv2-card-cta"><div><b>Interested in this lead?</b><span>Sign in to view purchase options.</span></div><button onClick={() => openBuyModal(lead)}>Login to buy →</button></div>}
          </article>
        })}
      </div>}
      {!loading && (pagination.hasPrevious || pagination.hasNext) && <div className="lv2-pagination"><button disabled={!pagination.hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page {pagination.page} · {pagination.total} leads</span><button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button></div>}
      <section className="lv2-bottom-cta"><div><span className="lv2-kicker">GROW WITH PROPULSE</span><h2>Find the right opportunity for your business.</h2><p>Browse, compare and choose leads with transparent pricing.</p></div>{logged ? <Link to="/dashboard">Go to dashboard →</Link> : <Link to="/signup">Create business account →</Link>}</section>
    </main>
    {buyModal && <div className="lv2-overlay" onClick={() => { setBuyModal(null); setPaymentProof(null) }}><div className="lv2-buy-modal" onClick={e => e.stopPropagation()}>
      <button className="lv2-modal-close" onClick={() => { setBuyModal(null); setPaymentProof(null) }}>×</button>
      <div className="lv2-buy-layout">
        <section className="lv2-buy-main">
          <div className="lv2-modal-lead"><div className="lv2-avatar">{String(buyModal.customer_name || buyModal.service_name || buyModal.industry_name || 'L').trim().charAt(0).toUpperCase()}</div><div className="lv2-modal-lead-copy"><strong>{buyModal.customer_name || buyModal.service_name || buyModal.industry_name || 'Business opportunity'}</strong><small>⌖ {[buyModal.city_name, buyModal.state_name].filter(hasValue).join(' · ') || 'India'}</small>{hasValue(buyModal.service_name) && <small>⌂ {buyModal.service_name}</small>}</div><span className="lv2-lead-id-pill">Lead #${buyModal.id}</span></div>
          <div className="lv2-coupon-box"><div className="lv2-coupon-title"><span>⌑</span><div><strong>PROMOTION / COUPON</strong><small>Optional · discounts or rewards are confirmed before payment</small></div></div>{publicLeadOffers.length>0&&<div className="lv2-public-offers">{publicLeadOffers.map(offer=><button type="button" key={offer.id} className={String(couponCode).trim().toUpperCase()===String(offer.code).toUpperCase()?'selected':''} onClick={()=>{setCouponCode(offer.code);queueMicrotask(()=>validateCouponForCurrentAccess(offer.code))}}><span>{String(offer.benefit_type)==='lead_bonus'?'◈+':String(offer.benefit_type)==='wallet_bonus'?'₹+':'%'}</span><div><strong>{promotionBenefitText(offer)}</strong><small>{offer.description||`Use code ${offer.code}`}{Number(offer.min_order_amount)>0?` · Min ${money(offer.min_order_amount)}`:''}</small></div><b>{offer.meets_minimum===false?'Min not met':'Use offer'}</b></button>)}</div>}<div className="lv2-coupon-row"><input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(''); setCouponError(''); setCouponDiscount(0); setCouponFinalAmount(null); setCouponReward(null) }} onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }} maxLength={50} autoComplete="off" placeholder="Enter promotion code"/><button type="button" onClick={applyCoupon}>Apply</button></div>{couponStatus && <small className="lv2-coupon-status">{couponStatus}</small>}{couponError && <small className="lv2-coupon-error">{couponError}</small>}</div>
          <div className="lv2-wallet-choice"><label htmlFor="lv2-wallet-toggle"><span className="lv2-wallet-icon">▣</span><span><b>Use wallet balance</b><small>Available balance: {walletBalance > 0 ? money(walletBalance) : '₹0'}. You can pay the final amount directly.</small></span></label><strong>{walletBalance > 0 ? money(walletBalance) : '₹0'}</strong><input id="lv2-wallet-toggle" type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} /></div>
          <div className="lv2-share-section">
            <div className="lv2-share-selection-title">
              <strong>Current Buyer Access</strong>
              <span>Lead price: <b>{currentBuyerAccess ? money((buyModal.pricing?.shares || []).find(p => Number(p.shares) === Number(currentBuyerAccess))?.[isPro ? 'pro' : 'normal']) : '—'}</b></span>
            </div>
            <div className="lv2-pack-grid">
              {(buyModal.pricing?.shares || []).map(p => { const n = Number(p.shares); const normal = Number(p.normal); const pro = Number(p.pro); const price = isPro ? pro : normal; const saving = Number.isFinite(normal) && Number.isFinite(pro) && normal > pro ? normal - pro : 0; const key = buyModal.id + '-' + n + '-' + (isPro ? 'pro' : 'normal') + '-' + (useWallet ? 'wallet' : 'direct'); const growthSavings = saving; const savingText = growthSavings > 0 ? (isGrowthScaleMember ? `Saved ${money(growthSavings)} with ${memberSavingsLabel}` : `Save with Growth ${money(growthSavings)}`) : ''; return <div key={key} className="lv2-pack-card selected"><span className="lv2-pack-check">✓</span><strong>{n}</strong><small>{n === 1 ? 'Single Buyer' : `Max ${n} Buyers`}</small><b>{money(price)}</b>{savingText && <em className={isGrowthScaleMember ? 'lv2-pack-saving-member' : 'lv2-pack-saving-growth'}>{savingText}</em>}{buying === key && <i>Processing…</i>}</div> })}
            </div>
          </div>
          {!isGrowthScaleMember && <div className="lv2-pro-hint"><strong>Growth / Scale members save more</strong><span>Growth and Scale members get the configured member lead pricing.</span><Link to="/membership" onClick={() => setBuyModal(null)} className="lv2-view-plans-link">View Plans →</Link></div>}
          {buyModalClaimed && <div className="lv2-modal-owned">This lead is already purchased and available in your account.</div>}
        </section>
        <aside className={`lv2-purchase-summary${payment && paymentLead && paymentLead.id === buyModal.id ? " payment-ready" : ""}`}>
          {(() => {
            const selectedRow = currentPricingRow
            const selectedPrice = Number(selectedRow?.[isPro ? 'pro' : 'normal'] || 0)
            const discountedTotal = Math.max(0, Number(couponFinalAmount != null ? couponFinalAmount : selectedPrice))
            const walletDeduction = useWallet ? Math.min(Math.max(0, Number(walletBalance || 0)), discountedTotal) : 0
            const amountToPay = Math.max(0, discountedTotal - walletDeduction)
            return <>
              <div className="lv2-summary-head"><div><strong>Order Summary</strong><small>Lead #${buyModal.id}</small></div><span>🛒</span></div>
              <div className="lv2-summary-body">
                <div className="lv2-summary-row"><span>Buyer Access</span><strong>{currentBuyerAccess ? (currentBuyerAccess === 1 ? 'Single Buyer' : `Max ${currentBuyerAccess} Buyers`) : 'Current stage'}</strong></div>
                <div className="lv2-summary-row"><span>Lead Price</span><strong>{currentBuyerAccess ? money(selectedPrice) : '—'}</strong></div>
                <div className="lv2-summary-row"><span>Subtotal</span><strong>{currentBuyerAccess ? money(selectedPrice) : '₹0'}</strong></div>
                <div className="lv2-summary-row"><span>Promotion Discount</span><strong className={couponDiscount > 0 ? 'lv2-discount-value' : ''}>− {money(couponDiscount)}</strong></div>
                {couponReward&&<div className="lv2-summary-row lv2-promotion-reward"><span>Reward after payment</span><strong>{promotionBenefitText({reward:couponReward,benefit_type:couponReward.type})}</strong></div>}
                <div className="lv2-summary-row lv2-wallet-deduction"><span>Wallet Balance Used</span><strong>− {money(walletDeduction)}</strong></div>
                <div className="lv2-summary-total"><span>Amount to Pay</span><strong>{money(amountToPay)}</strong></div>
                <div className="lv2-summary-secure"><strong>🛡 Secure & Safe Transaction</strong></div>
              </div>
            </>
          })()}
        </aside>
      </div>

      {(() => {
        const selectedRow = currentPricingRow
        const selectedPrice = Number(selectedRow?.[isPro ? 'pro' : 'normal'] || 0)
        const discountedTotal = Math.max(0, Number(couponFinalAmount != null ? couponFinalAmount : selectedPrice))
        const walletDeduction = useWallet ? Math.min(Math.max(0, Number(walletBalance || 0)), discountedTotal) : 0
        const directAmount = Math.max(0, discountedTotal - walletDeduction)
        const bankAccounts = paymentReceiving.filter(item => ['bank', 'both'].includes(String(item.method_type || '').toLowerCase()))
        const receiving = bankAccounts[0] || paymentReceiving[0] || null
        const copyValue = async value => { if (!value) return; try { await navigator.clipboard.writeText(String(value)) } catch {} }
        return <section className="lv2-buy-payment-section">
          {directAmount > 0 && <PaymentMethodSelector options={paymentOptions} value={paymentMode} onChange={setPaymentMode} disabled={Boolean(buying)||directSubmitting}/>}
          {directAmount > 0 && paymentMode==='offline' && <section className="lv2-buy-bank-card">
            <div className="lv2-buy-payment-section-title"><span>🏦</span><div><strong>Bank Account Details</strong><small>Transfer exactly {money(directAmount)} to the account below.</small></div></div>
            {receiving ? <div className="lv2-buy-bank-grid">
              {receiving.bank_name && <div><span>Bank Name</span><b>{receiving.bank_name}</b><button type="button" onClick={() => copyValue(receiving.bank_name)}>Copy</button></div>}
              {receiving.account_name && <div><span>Account Name</span><b>{receiving.account_name}</b><button type="button" onClick={() => copyValue(receiving.account_name)}>Copy</button></div>}
              {receiving.account_number && <div><span>Account Number</span><b>{receiving.account_number}</b><button type="button" onClick={() => copyValue(receiving.account_number)}>Copy</button></div>}
              {receiving.ifsc_code && <div><span>IFSC Code</span><b>{receiving.ifsc_code}</b><button type="button" onClick={() => copyValue(receiving.ifsc_code)}>Copy</button></div>}
              {receiving.branch_name && <div><span>Branch</span><b>{receiving.branch_name}</b><button type="button" onClick={() => copyValue(receiving.branch_name)}>Copy</button></div>}
              {receiving.upi_id && <div><span>UPI ID</span><b>{receiving.upi_id}</b><button type="button" onClick={() => copyValue(receiving.upi_id)}>Copy</button></div>}
            </div> : <div className="lv2-buy-bank-empty">Payment receiving details are not configured yet. Please contact support.</div>}
            {receiving?.instructions && <div className="lv2-buy-payment-instructions">{receiving.instructions}</div>}
          </section>}
          {directAmount > 0 && paymentMode==='offline' && <div className="lv2-buy-payment-fields">
            <label><span>Payment reference / UTR</span><input id="lead-payment-utr" placeholder="Enter transaction ID / UTR" autoComplete="off" /></label>
            <div className="lv2-proof-field"><span className="lv2-proof-field-label">Payment proof</span><PaymentProofPicker id="lead-payment-proof" value={paymentProof} onChange={setPaymentProof} onError={setPaymentError} /></div>
          </div>}
          {paymentError && <div className="lv2-payment-error" role="alert">{paymentError}</div>}
          <div className="lv2-buy-checkout-note"><strong>🔒 Secure & Safe Transaction</strong><small>Wallet deduction and coupon discount are applied automatically.</small></div>
          <button type="button" className="lv2-buy-final-submit" disabled={!currentBuyerAccess || buyModalClaimed || Boolean(buying) || directSubmitting} onClick={() => { const plan = isPro ? 'pro' : 'normal'; submitLeadCheckout(buyModal, plan) }}>
            {buying || directSubmitting ? 'Processing…' : directAmount > 0 && paymentMode==='online' ? 'Pay Online & Purchase' : 'Submit Purchase'}
          </button>

        </section>
      })()}
    </div></div>}
    {payment && paymentLead && !buyModal && (() => {
      const paymentRow = payment.payment || {}
      const subtotal = Number(paymentRow.subtotal_amount ?? payment.coupon?.subtotalAmount ?? paymentRow.amount ?? 0)
      const discount = Number(paymentRow.discount_amount ?? payment.coupon?.discountAmount ?? 0)
      const finalAmount = Number(paymentRow.amount ?? payment.coupon?.finalAmount ?? Math.max(0, subtotal - discount))
      const walletPaid = Number(payment.walletAmount ?? paymentRow.wallet_amount ?? 0)
      const directAmount = Number(payment.externalAmount ?? paymentRow.external_amount ?? Math.max(0, finalAmount - walletPaid))
      const appliedCoupon = String(paymentRow.coupon_code || payment.coupon?.code || '').trim()
      const bankAccounts = paymentReceiving.filter(item => ['bank', 'both'].includes(String(item.method_type || '').toLowerCase()))
      const receiving = bankAccounts[0] || paymentReceiving[0] || null
      const copyValue = async value => { if (!value) return; try { await navigator.clipboard.writeText(String(value)) } catch {} }
      return <div className="lv2-overlay" onClick={() => { if (!directSubmitting) { setPayment(null); setPaymentProof(null) } }}>
        <div className="lv2-upgrade lv2-payment-modal" onClick={e => e.stopPropagation()}>
          <button className="lv2-payment-close" onClick={() => { if (!directSubmitting) { setPayment(null); setPaymentProof(null) } }} disabled={directSubmitting}>×</button>
          <span className="lv2-payment-kicker">PAYMENT</span>
          <section className="lv2-pay-amount-card">
            <div><span>Amount to Pay Now</span><strong>{money(directAmount)}</strong></div>
          </section>

          <section className="lv2-pay-breakdown">
            <div><span>Original Amount</span><strong>{money(subtotal)}</strong></div>
            {discount > 0 && <div><span>{appliedCoupon ? 'Coupon Discount' : 'Discount'}</span><strong className="positive">− {money(discount)}</strong></div>}
            <div><span>Wallet Deduction</span><strong>− {money(walletPaid)}</strong></div>
            <div className="highlight"><span>Pay Now</span><strong>{money(directAmount)}</strong></div>
          </section>

          {directAmount > 0 && <section className="lv2-pay-bank-card">
            <div className="lv2-pay-section-head"><span>🏦</span><div><strong>Bank Account Details</strong><small>Transfer the exact amount and enter the UTR below.</small></div></div>
            {receiving ? <div className="lv2-pay-bank-box">
              {receiving.bank_name && <div><span>Bank Name</span><b>{receiving.bank_name}</b><button type="button" onClick={() => copyValue(receiving.bank_name)}>Copy</button></div>}
              {receiving.account_name && <div><span>Account Name</span><b>{receiving.account_name}</b><button type="button" onClick={() => copyValue(receiving.account_name)}>Copy</button></div>}
              {receiving.account_number && <div><span>Account Number</span><b>{receiving.account_number}</b><button type="button" onClick={() => copyValue(receiving.account_number)}>Copy</button></div>}
              {receiving.ifsc_code && <div><span>IFSC Code</span><b>{receiving.ifsc_code}</b><button type="button" onClick={() => copyValue(receiving.ifsc_code)}>Copy</button></div>}
              {receiving.branch_name && <div><span>Branch</span><b>{receiving.branch_name}</b><button type="button" onClick={() => copyValue(receiving.branch_name)}>Copy</button></div>}
              {receiving.upi_id && <div><span>UPI ID</span><b>{receiving.upi_id}</b><button type="button" onClick={() => copyValue(receiving.upi_id)}>Copy</button></div>}
            </div> : <div className="lv2-pay-bank-empty">Payment receiving details are not configured yet. Please contact support.</div>}
            {receiving?.instructions && <div className="lv2-pay-instructions">{receiving.instructions}</div>}
          </section>}

          {directAmount > 0 && <>
            <label className="lv2-pay-field"><span>Payment reference / UTR</span><input id="lead-payment-utr" placeholder="Enter UTR or transaction ID" autoComplete="off" /></label>
            <div className="lv2-pay-field"><span>Payment proof</span><PaymentProofPicker id="lead-payment-proof" value={paymentProof} onChange={setPaymentProof} onError={setPaymentError} /></div>
            {paymentError && <div className="lv2-payment-error" role="alert">{paymentError}</div>}
            <div className="lv2-payment-submit"><button type="button" className="lv2-more" onClick={submitDirect} disabled={directSubmitting}>{directSubmitting ? 'Submitting…' : `Submit ${money(directAmount)} payment →`}</button><small>🔒 Your payment information is always protected.</small></div>
          </>}
        </div>
      </div>
    })()}
    {paymentSuccess && <div className="lv2-overlay" onClick={() => setPaymentSuccess('')}><div className="lv2-upgrade lv2-payment-success" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
      <header className="lv2-success-header"><span className="lv2-success-header-icon">✓</span><strong>Done</strong><button type="button" aria-label="Close" onClick={() => setPaymentSuccess('')}>×</button></header>
      <div className="lv2-success-hero"><div className="lv2-success-confetti" aria-hidden="true"><i>•</i><i>•</i><i>✦</i><i>•</i><i>•</i></div><div className="lv2-success-icon">✓</div></div>
      <span>PAYMENT SUBMITTED</span><h2>Submitted successfully!</h2><p>{paymentSuccess}</p>
      <div className="lv2-success-info"><span>◷</span><div><strong>We’ll verify your payment and update you soon.</strong><small>You’ll get a notification once it’s confirmed.</small></div></div>
      <button className="lv2-success-done" onClick={() => setPaymentSuccess('')}>Great!</button>
    </div></div>}
    {upgrade && <div className="lv2-overlay"><div className="lv2-upgrade"><button onClick={() => setUpgrade(false)}>×</button><span>PRO ACCESS</span><h2>Unlock Pro Early Access.</h2><p>Pro members get first access during the configured early-access period.</p><div><Link to="/dashboard">View Pro options →</Link><button onClick={() => setUpgrade(false)}>Not now</button></div></div></div>}
  </div>
}
