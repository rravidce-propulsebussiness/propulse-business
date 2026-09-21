import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { authRequest, getToken, getUser } from '../utils/auth'
import { claimLead, getLead, listLeads, purchaseLead } from '../api/leads'
import UserHeader from '../components/UserHeader'
import './LeadsV2.css'
import './LeadsV2Payment.css'

const money = (v) => {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return ''
  return `₹${Number(v).toLocaleString('en-IN')}`
}
const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '—'
const norm = (v) => String(v ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const label = (k) => String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())
const isContactKey = (k) => /(phone|mobile|whatsapp|contact|email|mail|tel|telephone|alternate|website|url|social|instagram|facebook|linkedin|address|pincode|zipcode|postal)/i.test(String(k || ''))
const isPricingField = (k) => /^(normal|pro)\d+(share|shares)(price)?$/.test(norm(k)) || ['pricing', 'leadpricing', 'leadprice', 'price'].includes(norm(k))
const isCanonicalField = (k) => {
  const n = norm(k)
  return [
    'requirement', 'requirements', 'requirementdetails', 'sharemoredetailsandrequirement',
    'location', 'city', 'state', 'budget', 'budgetrange', 'projectbudget', 'projectbudgetrange', 'budgetfromto', 'expectedbudget',
    'propertytype', 'property', 'interiortype', 'typeofproperty',
    'timeline', 'timeframe', 'projecttimeline', 'expectedtimeline', 'planningdate', 'howsoonrequired', 'when',
    'worknumbers', 'worknumber', 'numberofworks', 'numberofwork', 'noofworks', 'works', 'quantity', 'projectquantity', 'numberofprojects', 'projectcount',
    'buyercapacity', 'customerphone', 'customeremail'
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
  const category = params.get('category')
  const user = getUser()
  const token = getToken()
  const logged = Boolean(token)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [buyModal, setBuyModal] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWallet, setUseWallet] = useState(true)
  const [selectedSharePack, setSelectedSharePack] = useState(null)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasNext: false, hasPrevious: false })
  const [buying, setBuying] = useState(null)
  const [claiming, setClaiming] = useState(null)
  const [notice, setNotice] = useState('')
  const [payment, setPayment] = useState(null)
  const [paymentLead, setPaymentLead] = useState(null)
  const [paymentShares, setPaymentShares] = useState(0)
  const [directSubmitting, setDirectSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentReceiving, setPaymentReceiving] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [couponStatus, setCouponStatus] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponFinalAmount, setCouponFinalAmount] = useState(null)
  const [currentMembership, setCurrentMembership] = useState(null)

  useEffect(() => {
    let live = true
    if (!token) { setCurrentMembership(null); return undefined }
    authRequest('/payments/membership/current')
      .then(data => { if (live) setCurrentMembership(data || null) })
      .catch(() => { if (live) setCurrentMembership(null) })
    return () => { live = false }
  }, [token])

  useEffect(() => {
    let live = true
    if (!buyModal && !payment) { setPaymentReceiving([]); return undefined }
    authRequest('/payment-receiving-details')
      .then(data => { if (live) setPaymentReceiving(Array.isArray(data) ? data.filter(item => item?.is_active !== false) : []) })
      .catch(() => { if (live) setPaymentReceiving([]) })
    return () => { live = false }
  }, [buyModal, payment])
  useEffect(() => { setPage(1) }, [search, category, industryFilter, cityFilter])
  useEffect(() => {
    let live = true
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const terms = [category?.replaceAll('-', ' '), search.trim()].filter(Boolean).join(' ')
        const d = await listLeads({ status: 'available', page, limit: 20, ...(terms ? { search: terms } : {}) }, token)
        if (live) {
          const items = Array.isArray(d) ? d : (d.items || [])
          const availableItems = items.filter(l => !l.is_purchased && !l.purchased && !l.access?.claimed && !l.access?.purchased)
          setLeads(availableItems)
          setPagination(d.pagination ? { ...d.pagination, total: Math.max(0, Number(d.pagination.total || 0) - (items.length - availableItems.length)) } : { page, limit: 20, total: availableItems.length, hasNext: false, hasPrevious: page > 1 })
        }
      } catch (e) { if (live) setError(e.message) }
      finally { if (live) setLoading(false) }
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [token, page, search, category])

  const membershipLabel = norm(currentMembership?.plan_group || currentMembership?.plan?.plan_group || currentMembership?.plan_type || currentMembership?.plan?.plan_type || user?.membership_type || user?.membership?.type || user?.membership?.name || user?.plan || user?.plan_name || user?.subscription_plan || '')
  const activeMembershipGroup = membershipLabel === 'grow' || membershipLabel.includes('grow') || membershipLabel.includes('growth') ? 'growth' : membershipLabel === 'scale' || membershipLabel.includes('scale') ? 'scale' : ''
  const isGrowthScaleMember = Boolean(activeMembershipGroup)
  const isPro = Boolean(user?.is_pro_member || user?.membership_type === 'pro' || currentMembership?.isPro || currentMembership?.plan_type === 'pro')
  const memberBillingMonths = Number(currentMembership?.billing_months || currentMembership?.plan?.billing_months || currentMembership?.billing_months_count || currentMembership?.plan?.billing_months_count || currentMembership?.duration_months || currentMembership?.plan?.duration_months || currentMembership?.plan?.billing_months || 0)
  const memberBillingPeriod = String(currentMembership?.billing_period || currentMembership?.plan?.billing_period || '').trim()
  const memberPeriodLabel = memberBillingMonths === 12 || /year/i.test(memberBillingPeriod) ? 'Year' : memberBillingMonths === 6 || /half/i.test(memberBillingPeriod) ? 'Half-Year' : memberBillingMonths === 3 || /quarter/i.test(memberBillingPeriod) ? 'Quarter' : 'Month'
  const memberSavingsLabel = activeMembershipGroup === 'scale' ? `Scale (${memberPeriodLabel})` : activeMembershipGroup === 'growth' ? `Growth (${memberPeriodLabel})` : 'Growth / Scale'
  const buyModalClaimed = Boolean(buyModal?.access?.claimed || buyModal?.access?.purchased)
  const title = category ? `${category.replaceAll('-', ' ')} leads` : 'Available Leads'
  const visibleLeads = useMemo(() => {
    if (logged) return leads
    const industry = norm(industryFilter)
    const city = norm(cityFilter)
    return leads.filter(lead => {
      const leadIndustry = norm(lead.industry_name)
      const leadCity = norm(lead.city_name)
      return (!industry || leadIndustry === industry) && (!city || leadCity === city)
    })
  }, [leads, logged, industryFilter, cityFilter])

  const topIndustry = useMemo(() => visibleLeads.find(l => hasValue(l.industry_name))?.industry_name || '', [visibleLeads])
  const topLocation = useMemo(() => {
    const lead = visibleLeads.find(l => hasValue(l.state_name) || hasValue(l.city_name))
    return [lead?.city_name, lead?.state_name].filter(hasValue).join(', ')
  }, [visibleLeads])
  const filterOptions = useMemo(() => {
    const industries = [...new Set(leads.map(l => String(l.industry_name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    const cities = [...new Set(leads.map(l => String(l.city_name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return { industries, cities }
  }, [leads])

  const openBuyModal = (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    if (!lead.pricing?.shares?.length) { setError('Pricing is not available for this lead.'); return }
    setError(''); setNotice(''); setPaymentError(''); setCouponCode(''); setCouponStatus(''); setCouponError(''); setCouponDiscount(0); setCouponFinalAmount(null); setUseWallet(true); setWalletBalance(0); setSelectedSharePack(Number(lead.pricing.shares[0]?.shares) || null); setBuyModal(lead)
    authRequest('/wallet').then(data => setWalletBalance(Number(data?.balance ?? data?.wallet?.balance ?? 0))).catch(() => {})
  }
  const validateCouponForSelection = async (code = couponCode, shares = selectedSharePack) => {
    const normalized = String(code || '').trim().toUpperCase()
    setCouponError('')
    if (!normalized) {
      setCouponStatus('')
      setCouponDiscount(0)
      setCouponFinalAmount(null)
      return false
    }
    const row = (buyModal?.pricing?.shares || []).find(p => Number(p.shares) === Number(shares))
    const subtotal = Number(row?.[isPro ? 'pro' : 'normal'] || 0)
    if (!subtotal) {
      setCouponError('Select a share pack first.')
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
      setCouponCode(normalized)
      setCouponDiscount(discount)
      setCouponFinalAmount(finalAmount)
      setCouponStatus(discount > 0 ? `${normalized} applied · You save ${money(discount)}` : `${normalized} applied`)
      return true
    } catch (e) {
      setCouponDiscount(0)
      setCouponFinalAmount(null)
      setCouponStatus('')
      setCouponError(e.message || 'Unable to validate coupon')
      return false
    }
  }
  const applyCoupon = () => validateCouponForSelection()
  const claim = async (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    setClaiming(lead.id); setNotice(''); setError('')
    try {
      await claimLead(lead.id)
      await getLead(lead.id)
      setLeads(current => current.filter(x => x.id !== lead.id))
      setNotice(`Lead #${lead.id} claimed successfully.`); setExpanded(null)
    } catch (e) { setError(e.message) }
    finally { setClaiming(null) }
  }
  const submitLeadCheckout = async (lead, shares, plan = 'normal') => {
    if (!logged) { window.location.href = '/login'; return }
    if (plan === 'pro' && !isPro) { setBuyModal(null); setUpgrade(true); return }
    const row = (lead?.pricing?.shares || []).find(p => Number(p.shares) === Number(shares))
    const selectedPrice = Number(row?.[isPro ? 'pro' : 'normal'] || 0)
    const discountedTotal = Math.max(0, Number(couponFinalAmount != null ? couponFinalAmount : selectedPrice))
    const walletDeduction = useWallet ? Math.min(Math.max(0, Number(walletBalance || 0)), discountedTotal) : 0
    const estimatedExternal = Math.max(0, discountedTotal - walletDeduction)
    if (estimatedExternal > 0) {
      const reference = document.getElementById('lead-payment-utr')?.value?.trim()
      const file = document.getElementById('lead-payment-proof')?.files?.[0]
      if (!reference) return setPaymentError('Enter the payment reference / UTR first.')
      if (!file) return setPaymentError('Upload the payment screenshot or PDF first.')
      if (file.size > 5 * 1024 * 1024) return setPaymentError('Payment proof must be 5 MB or smaller.')
    }
    const key = `${lead.id}-${shares}-${plan}-${useWallet ? 'wallet' : 'direct'}`
    setBuying(key); setPaymentError(''); setNotice(''); setError(''); setCouponError('')
    try {
      const d = await purchaseLead(lead.id, shares, { useWallet, couponCode })
      const needsExternalPayment = Boolean(d?.requires_external_payment || d?.requiresExternalPayment || d?.payment?.status === 'pending')
      if (needsExternalPayment) {
        setPayment(d)
        setPaymentLead(lead)
        setPaymentShares(shares)
        const reference = document.getElementById('lead-payment-utr')?.value?.trim()
        const file = document.getElementById('lead-payment-proof')?.files?.[0]
        if (!reference || !file) {
          setBuying(null)
          return setPaymentError('Enter the UTR and upload payment proof before submitting.')
        }
        setDirectSubmitting(true)
        const proofUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Unable to read payment proof'))
          reader.readAsDataURL(file)
        })
        await authRequest(`/payments/${d.payment.id}/reference`, {
          method: 'POST',
          body: JSON.stringify({
            manualReference: reference,
            proofUrl,
            notes: `Lead #${lead.id} direct payment${Number(d.walletAmount) > 0 ? ` after wallet payment of ${money(d.walletAmount)}` : ''}`
          })
        })
        const submittedMessage = `${Number(d.walletAmount) > 0 ? `Wallet payment of ${money(d.walletAmount)} applied. ` : ''}Remaining ${money(d.externalAmount)} submitted for verification.`
        setPayment(null); setPaymentLead(null); setPaymentShares(0); setPaymentError(''); setPaymentSuccess(submittedMessage); setBuyModal(null)
        setBuying(null)
        return
      }
      await getLead(lead.id)
      setLeads(current => current.filter(x => x.id !== lead.id))
      setBuyModal(null)
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

  const buy = async (lead, shares, plan = 'normal') => {
    if (!logged) { window.location.href = '/login'; return }
    if (plan === 'pro' && !isPro) { setBuyModal(null); setUpgrade(true); return }
    const key = `${lead.id}-${shares}-${plan}-${useWallet ? 'wallet' : 'direct'}`
    setBuying(key); setNotice(''); setError(''); setCouponError('')
    try {
      const d = await purchaseLead(lead.id, shares, { useWallet, couponCode })
      const needsExternalPayment = Boolean(d?.requires_external_payment || d?.requiresExternalPayment || d?.payment?.status === 'pending')
      if (needsExternalPayment) {
        setBuying(null)
        setPaymentError('')
        setPayment(d)
        setPaymentLead(lead)
        setPaymentShares(shares)
        return
      }
      await getLead(lead.id)
      setLeads(current => current.filter(x => x.id !== lead.id))
      setBuyModal(null)
      setNotice(`Lead #${lead.id} purchased successfully from ${plan === 'pro' ? 'Pro' : 'Normal'} pricing.`)
      setExpanded(null)
    } catch (e) {
      if (e.code === 'PRO_REQUIRED') {
        setBuyModal(null)
        setUpgrade(true)
      } else if (String(e.code || '').includes('COUPON') || ['MIN_ORDER', 'PURCHASE_NOT_ELIGIBLE', 'PLAN_NOT_ELIGIBLE', 'USER_NOT_ELIGIBLE', 'INDUSTRY_NOT_ELIGIBLE', 'USAGE_LIMIT', 'USER_USAGE_LIMIT'].includes(e.code)) {
        setCouponError(e.message)
      } else {
        setError(e.message)
      }
    } finally { setBuying(current => current === key ? null : current); }
  }
  const submitDirect = async () => {
    setPaymentError('')
    const reference = document.getElementById('lead-payment-utr')?.value?.trim()
    const file = document.getElementById('lead-payment-proof')?.files?.[0]
    if (!reference) return setPaymentError('Enter the payment reference / UTR first.')
    if (!file) return setPaymentError('Upload the payment screenshot or PDF first.')
    if (file.size > 5 * 1024 * 1024) return setPaymentError('Payment proof must be 5 MB or smaller.')
    if (!payment?.payment?.id) return setPaymentError('Payment session is unavailable. Please try again.')
    try {
      setDirectSubmitting(true)
      const proofUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Unable to read payment proof'))
        reader.readAsDataURL(file)
      })
      await authRequest(`/payments/${payment.payment.id}/reference`, {
        method: 'POST',
        body: JSON.stringify({ manualReference: reference, proofUrl, notes: `Lead #${paymentLead?.id} direct payment${Number(payment.walletAmount) > 0 ? ` after wallet payment of ${money(payment.walletAmount)}` : ''}` })
      })
      const submittedMessage = `${Number(payment.walletAmount) > 0 ? `Wallet payment of ${money(payment.walletAmount)} applied. ` : ''}Remaining ${money(payment.externalAmount)} submitted for verification.`
      setPayment(null); setPaymentLead(null); setPaymentShares(0); setPaymentError(''); setPaymentSuccess(submittedMessage)
    } catch (e) { setPaymentError(e.message || 'Unable to submit payment. Please try again.') }
    finally { setDirectSubmitting(false) }
  }

  if (user?.role === 'admin') return <main className="lv2-page"><section className="lv2-empty"><span>ADMIN ACCOUNT</span><h1>Lead management is in the Admin Panel.</h1><Link to="/admin/leads">Open Admin Leads →</Link></section></main>

  return <div className="lv2-shell">
    <UserHeader />
    <main className="lv2-page">
      {!logged && <section className="lv2-market-head"><div className="lv2-title-block"><span></span><div><h1>{title}</h1><p>High quality, verified leads to grow your business</p></div></div><div className="lv2-controls"><div className="lv2-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by industry, service, location..." aria-label="Search leads"/><b>⌕</b></div>{!logged && <div className="lv2-guest-filters"><select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} aria-label="Filter by industry"><option value="">All Industries</option>{filterOptions.industries.map(item => <option key={item} value={item}>{item}</option>)}</select><select value={cityFilter} onChange={e => setCityFilter(e.target.value)} aria-label="Filter by city"><option value="">All Cities</option>{filterOptions.cities.map(item => <option key={item} value={item}>{item}</option>)}</select></div>}<div className="lv2-sort"><small>Sort by</small><strong>Newest</strong><span>⌄</span></div></div></section>}
      <section className="lv2-stats"><div className="lv2-stat orange"><span>▣</span><div><b>{pagination.total}</b><small>Total Leads</small></div></div><div className="lv2-stat blue"><span>♟</span><div><b>{topIndustry || 'Verified opportunities'}</b><small>Top Industry</small></div></div><div className="lv2-stat green"><span>●</span><div><b>{topLocation || 'India'}</b><small>Top Location</small></div></div><div className="lv2-stat purple"><span>★</span><div><b>4.8</b><small>Avg. Quality Score</small></div></div><div className="lv2-verified">✓ &nbsp; Verified Opportunities Only</div></section>
      {error && <div className="lv2-error">{error}</div>}{notice && <div className="lv2-error">{notice}</div>}
      {loading ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>Loading opportunities...</strong></div> : !visibleLeads.length ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>No matching leads</strong><p>Try another search or filter.</p></div> : <div className="lv2-grid">
        {visibleLeads.map(lead => {
          const shares = lead.pricing?.shares || []
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
          const buyerCapacity = Math.max(2, Number(lead.buyer_capacity) || 3)
          const purchasedBuyers = Math.min(buyerCapacity, Math.max(0, Number(lead.purchased_buyer_count) || 0))
          const initials = String(lead.customer_name || lead.service_name || lead.industry_name || 'L').trim().charAt(0).toUpperCase()
          return <article className={`lv2-card ${lead.lead_type || 'basic'} ${exclusive ? 'has-exclusive' : ''}`} key={lead.id}>
            <div className="lv2-card-top"><span className="lv2-new">New</span><span className="lv2-id">#L-{String(lead.id).padStart(6, '0')}</span><small>{timeAgo(lead.created_at)}</small></div>
            <div className="lv2-person"><div className="lv2-avatar">{initials}</div><div className="lv2-person-copy"><div><h2>{hasValue(lead.customer_name) ? lead.customer_name : (lead.service_name || lead.industry_name || 'Business opportunity')}</h2><span className="lv2-verified-mini">✓ Verified</span></div><p>{lead.requirement || 'Verified business requirement'}</p></div></div>
            <div className="lv2-facts">
              {hasValue(lead.industry_name) && <div><span>▣</span><b>{lead.industry_name}</b></div>}
              {hasValue(lead.service_name) && <div><span>⌁</span><b>{lead.service_name}{hasValue(lead.subservice_name) ? `, ${lead.subservice_name}` : ''}</b></div>}
              {hasValue(location) && <div><span>⌖</span><b>{location}</b></div>}
              {hasValue(budgetDisplay) && <div><span>₹</span><b>{budgetDisplay}</b></div>}
              {hasValue(workNumbers) && <div><span>▦</span><b>{workNumbers} work{norm(workNumbers) === '1' ? '' : 's'}</b></div>}
              {hasValue(property) && <div><span>⌂</span><b>{property}</b></div>}
              {hasValue(timeline) && <div><span>▦</span><b>{timeline}</b></div>}
              <div><span>◉</span><b>Purchased {purchasedBuyers}/{buyerCapacity}</b></div>
            </div>
            <div className="lv2-contact"><span>Contact Details (Masked)</span><div>{hasValue(lead.customer_phone) && <b>⌕ &nbsp; {maskContact(lead.customer_phone)}</b>}{hasValue(workPhone) && <b>⌖ &nbsp; Work {workPhone}</b>}{hasValue(lead.customer_email) && <b>✉ &nbsp; {maskContact(lead.customer_email)}</b>}{!hasValue(lead.customer_phone) && !hasValue(workPhone) && !hasValue(lead.customer_email) && <b>Contact available after purchase</b>}</div></div>
            <div className="lv2-card-actions"><button className="lv2-details-link" onClick={() => setExpanded(open ? null : lead.id)}>{open ? 'Hide Full Details' : 'View Full Details'} <b>→</b></button><button className="lv2-buy" onClick={() => openBuyModal(lead)} disabled={!shares.length}>{claimed ? 'Purchased' : '🛒  Buy Lead'}</button></div>
            {open && <div className="lv2-details"><div className="lv2-details-head"><h3>Lead details</h3><span>{claimed ? 'Access granted' : 'Verified opportunity'}</span></div><div className="lv2-detail-grid">{[['Industry', lead.industry_name], ['Service', lead.service_name], ['Subservice', lead.subservice_name], ['Location', location], ['Property type', property], ['Budget', budgetDisplay], ['Work numbers', workNumbers], ['Work phone', workPhone], ['Purchased', `${purchasedBuyers}/${buyerCapacity}`], ['Source', lead.source], ['Customer', lead.customer_name], ['Phone', lead.customer_phone ? maskContact(lead.customer_phone) : ''], ['Email', lead.customer_email ? maskContact(lead.customer_email) : '']].filter(([, v]) => hasValue(v)).map(([k, v], index) => <div key={`${k}-${index}`}><small>{k}</small><b>{v}</b></div>)}{dynamic.map(([k, v], index) => <div key={`${k}-${index}`}><small>{label(k)}</small><b>{displayValue(k, typeof v === 'object' ? JSON.stringify(v) : v)}</b></div>)}</div>{hasValue(lead.notes) && <p className="lv2-notes"><b>Notes</b>{maskContact(lead.notes)}</p>}</div>}
            {logged && !claimed && leadAccess.canClaim && <div className="lv2-exclusive"><div><b>Membership access</b><span>Included in your current plan{leadAccess.remaining !== undefined ? ` · ${leadAccess.remaining} remaining` : ''}</span></div><button disabled={claiming === lead.id} onClick={() => claim(lead)}>{claiming === lead.id ? 'Claiming…' : 'Claim free →'}</button></div>}
            {logged && !claimed && leadAccess.reason && !leadAccess.canClaim && <div className="lv2-card-cta"><div><b>Membership access</b><span>{leadAccess.reason}</span></div></div>}
            {claimed && <div className="lv2-card-cta"><div><b>Lead access granted</b><span>You can use this lead from your account.</span></div><Link to="/dashboard">Open dashboard →</Link></div>}
            {exclusive && logged && !claimed && <div className="lv2-exclusive"><div><b>Exclusive access</b><span>{lead.exclusive_action === 'upgrade_to_pro' ? 'Pro members get first access' : 'Available for purchase'}</span></div>{lead.exclusive_action === 'upgrade_to_pro' ? <button onClick={() => setUpgrade(true)}>Get Pro →</button> : <button onClick={() => openBuyModal(lead)}>Buy →</button>}</div>}
            {!logged && <div className="lv2-card-cta"><div><b>Interested in this lead?</b><span>Sign in to view purchase options.</span></div><button onClick={() => openBuyModal(lead)}>Login to buy →</button></div>}
          </article>
        })}
      </div>}
      {!loading && (pagination.hasPrevious || pagination.hasNext) && <div className="lv2-pagination"><button disabled={!pagination.hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page {pagination.page} · {pagination.total} leads</span><button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button></div>}
      <section className="lv2-bottom-cta"><div><span className="lv2-kicker">GROW WITH PROPULSE</span><h2>Find the right opportunity for your business.</h2><p>Browse, compare and choose leads with transparent pricing.</p></div>{logged ? <Link to="/dashboard">Go to dashboard →</Link> : <Link to="/signup">Create business account →</Link>}</section>
    </main>
    {buyModal && <div className="lv2-overlay" onClick={() => setBuyModal(null)}><div className="lv2-buy-modal" onClick={e => e.stopPropagation()}>
      <button className="lv2-modal-close" onClick={() => setBuyModal(null)}>×</button>
      <div className="lv2-buy-layout">
        <section className="lv2-buy-main">
          <div className="lv2-modal-lead"><div className="lv2-avatar">{String(buyModal.customer_name || buyModal.service_name || buyModal.industry_name || 'L').trim().charAt(0).toUpperCase()}</div><div className="lv2-modal-lead-copy"><strong>{buyModal.customer_name || buyModal.service_name || buyModal.industry_name || 'Business opportunity'}</strong><small>⌖ {[buyModal.city_name, buyModal.state_name].filter(hasValue).join(' · ') || 'India'}</small>{hasValue(buyModal.service_name) && <small>⌂ {buyModal.service_name}</small>}</div><span className="lv2-lead-id-pill">Lead #${buyModal.id}</span></div>
          <div className="lv2-coupon-box"><div className="lv2-coupon-title"><span>⌑</span><div><strong>COUPON CODE</strong><small>Optional · applied before wallet deduction</small></div></div><div className="lv2-coupon-row"><input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(''); setCouponError(''); setCouponDiscount(0); setCouponFinalAmount(null) }} onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }} maxLength={50} autoComplete="off" placeholder="Enter coupon code"/><button type="button" onClick={applyCoupon}>Apply</button></div>{couponStatus && <small className="lv2-coupon-status">{couponStatus}</small>}{couponError && <small className="lv2-coupon-error">{couponError}</small>}</div>
          <div className="lv2-wallet-choice"><label htmlFor="lv2-wallet-toggle"><span className="lv2-wallet-icon">▣</span><span><b>Use wallet balance</b><small>Available balance: {walletBalance > 0 ? money(walletBalance) : '₹0'}. You can pay the final amount directly.</small></span></label><strong>{walletBalance > 0 ? money(walletBalance) : '₹0'}</strong><input id="lv2-wallet-toggle" type="checkbox" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} /></div>
          <div className="lv2-share-section">
            <div className="lv2-share-selection-title">
              <strong>Select Number of Shares</strong>
              <span>Price per share: <b>{selectedSharePack ? money((buyModal.pricing?.shares || []).find(p => Number(p.shares) === Number(selectedSharePack))?.[isPro ? 'pro' : 'normal']) : '—'}</b></span>
            </div>
            <div className="lv2-pack-grid">
              {(buyModal.pricing?.shares || []).map(p => { const n = Number(p.shares); const normal = Number(p.normal); const pro = Number(p.pro); const price = isPro ? pro : normal; const saving = Number.isFinite(normal) && Number.isFinite(pro) && normal > pro ? normal - pro : 0; const selected = Number(selectedSharePack) === n; const key = buyModal.id + '-' + n + '-' + (isPro ? 'pro' : 'normal') + '-' + (useWallet ? 'wallet' : 'direct'); const growthSavings = saving; const savingText = growthSavings > 0 ? (isGrowthScaleMember ? `Saved ${money(growthSavings)} with ${memberSavingsLabel}` : `Save with Growth ${money(growthSavings)}`) : ''; return <button key={key} type="button" className={"lv2-pack-card" + (selected ? ' selected' : '')} onClick={() => { setSelectedSharePack(n); if (couponCode.trim()) validateCouponForSelection(couponCode, n) }} disabled={buyModalClaimed || Boolean(buying)}><span className="lv2-pack-check">{selected ? '✓' : ''}</span><strong>{n}</strong><small>{n === 1 ? 'Share' : 'Shares'}</small><b>{money(price)}</b>{savingText && <em className={isGrowthScaleMember ? 'lv2-pack-saving-member' : 'lv2-pack-saving-growth'}>{savingText}</em>}{buying === key && <i>Processing…</i>}</button> })}
            </div>
          </div>
          {!isGrowthScaleMember && <div className="lv2-pro-hint"><strong>Growth / Scale members save more</strong><span>Growth and Scale members get the configured member lead pricing.</span><Link to="/membership" onClick={() => setBuyModal(null)} className="lv2-view-plans-link">View Plans →</Link></div>}
          {buyModalClaimed && <div className="lv2-modal-owned">This lead is already purchased and available in your account.</div>}
        </section>
        <aside className={`lv2-purchase-summary${payment && paymentLead && paymentLead.id === buyModal.id ? " payment-ready" : ""}`}>
          {(() => {
            const selectedRow = (buyModal.pricing?.shares || []).find(p => Number(p.shares) === Number(selectedSharePack))
            const selectedPrice = Number(selectedRow?.[isPro ? 'pro' : 'normal'] || 0)
            const discountedTotal = Math.max(0, Number(couponFinalAmount != null ? couponFinalAmount : selectedPrice))
            const walletDeduction = useWallet ? Math.min(Math.max(0, Number(walletBalance || 0)), discountedTotal) : 0
            const amountToPay = Math.max(0, discountedTotal - walletDeduction)
            return <>
              <div className="lv2-summary-head"><div><strong>Order Summary</strong><small>Lead #${buyModal.id}</small></div><span>🛒</span></div>
              <div className="lv2-summary-body">
                <div className="lv2-summary-row"><span>Selected Pack</span><strong>{selectedSharePack ? selectedSharePack + (selectedSharePack === 1 ? ' Share' : ' Shares') : 'Choose a pack'}</strong></div>
                <div className="lv2-summary-row"><span>Price per Share</span><strong>{selectedSharePack ? money(selectedPrice) : '—'}</strong></div>
                <div className="lv2-summary-row"><span>Subtotal</span><strong>{selectedSharePack ? money(selectedPrice) : '₹0'}</strong></div>
                <div className="lv2-summary-row"><span>Coupon Discount</span><strong className={couponDiscount > 0 ? 'lv2-discount-value' : ''}>− {money(couponDiscount)}</strong></div>
                <div className="lv2-summary-row lv2-wallet-deduction"><span>Wallet Balance Used</span><strong>− {money(walletDeduction)}</strong></div>
                <div className="lv2-summary-total"><span>Amount to Pay</span><strong>{money(amountToPay)}</strong></div>
                <div className="lv2-summary-secure"><strong>🛡 Secure & Safe Transaction</strong></div>
              </div>
            </>
          })()}
        </aside>
      </div>

      {(() => {
        const selectedRow = (buyModal.pricing?.shares || []).find(p => Number(p.shares) === Number(selectedSharePack))
        const selectedPrice = Number(selectedRow?.[isPro ? 'pro' : 'normal'] || 0)
        const discountedTotal = Math.max(0, Number(couponFinalAmount != null ? couponFinalAmount : selectedPrice))
        const walletDeduction = useWallet ? Math.min(Math.max(0, Number(walletBalance || 0)), discountedTotal) : 0
        const directAmount = Math.max(0, discountedTotal - walletDeduction)
        const bankAccounts = paymentReceiving.filter(item => ['bank', 'both'].includes(String(item.method_type || '').toLowerCase()))
        const receiving = bankAccounts[0] || paymentReceiving[0] || null
        const copyValue = async value => { if (!value) return; try { await navigator.clipboard.writeText(String(value)) } catch {} }
        return <section className="lv2-buy-payment-section">
          {directAmount > 0 && <section className="lv2-buy-bank-card">
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
          {directAmount > 0 && <div className="lv2-buy-payment-fields">
            <label><span>Payment reference / UTR</span><input id="lead-payment-utr" placeholder="Enter transaction ID / UTR" autoComplete="off" /></label>
            <label><span>Payment proof</span><div className="lv2-buy-proof"><span>⌁</span><div><b>Upload payment proof</b><small>JPG, PNG or PDF · Max 5 MB</small></div><input id="lead-payment-proof" type="file" accept="image/*,.pdf" /></div></label>
          </div>}
          {paymentError && <div className="lv2-payment-error" role="alert">{paymentError}</div>}
          <div className="lv2-buy-checkout-note"><strong>🔒 Secure & Safe Transaction</strong><small>Wallet deduction and coupon discount are applied automatically.</small></div>
          <button type="button" className="lv2-buy-final-submit" disabled={!selectedSharePack || buyModalClaimed || Boolean(buying) || directSubmitting} onClick={() => { const plan = isPro ? 'pro' : 'normal'; submitLeadCheckout(buyModal, Number(selectedSharePack), plan) }}>
            {buying || directSubmitting ? 'Submitting…' : 'Submit Purchase'}
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
      return <div className="lv2-overlay" onClick={() => !directSubmitting && setPayment(null)}>
        <div className="lv2-upgrade lv2-payment-modal" onClick={e => e.stopPropagation()}>
          <button className="lv2-payment-close" onClick={() => !directSubmitting && setPayment(null)} disabled={directSubmitting}>×</button>
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
            <label className="lv2-pay-field"><span>Payment proof</span><div className="lv2-pay-upload"><span>⌁</span><div><b>Upload payment screenshot</b><small>JPG, PNG or PDF · Max 5 MB</small></div><input id="lead-payment-proof" type="file" accept="image/*,.pdf" /></div></label>
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
    {upgrade && <div className="lv2-overlay"><div className="lv2-upgrade"><button onClick={() => setUpgrade(false)}>×</button><span>PRO ACCESS</span><h2>Unlock Exclusive access.</h2><p>Pro members get first access during the configured Pro-first period.</p><div><Link to="/dashboard">View Pro options →</Link><button onClick={() => setUpgrade(false)}>Not now</button></div></div></div>}
  </div>
}
