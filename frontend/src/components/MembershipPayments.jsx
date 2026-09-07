import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../utils/auth'
import './MembershipPayments.css'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const label = (value) => ({ pending: 'Pending approval', paid: 'Approved', rejected: 'Rejected', failed: 'Failed' }[String(value || '').toLowerCase()] || value || '—')

export default function MembershipPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    authRequest('/payments/membership/history').then((data) => {
      if (active) setPayments(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [])
    }).catch(() => {
      if (active) setPayments([])
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const pending = useMemo(() => payments.filter((item) => item.status === 'pending'), [payments])
  const totalPaid = useMemo(() => payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0), [payments])

  if (loading) return <section className="membership-payment-workspace"><div className="membership-payment-loading">Loading membership activity…</div></section>

  return <>
    <section className="membership-payment-workspace">
      <div className="membership-payment-head">
        <div><span className="membership-kicker">MEMBERSHIP ACTIVITY</span><h2>Your membership payments</h2><p>Track wallet usage, direct payment verification and every membership purchase from one place.</p></div>
        <div className="membership-payment-stats"><div><b>{payments.length}</b><span>Payments</span></div><div><b>{pending.length}</b><span>Pending</span></div><div><b>{money(totalPaid)}</b><span>Approved value</span></div></div>
      </div>
      {pending.length > 0 && <div className="membership-payment-pending"><div className="membership-payment-pending-icon">◷</div><div><span>PENDING TRANSACTION</span><h3>{pending.length} membership payment{pending.length === 1 ? ' is' : 's are'} awaiting approval</h3><p>{pending.slice(0, 2).map((item) => `${item.membership_plan_name || 'Membership'} · ${money(item.amount)} · ${item.manual_reference || 'UTR not submitted'}`).join('  •  ')}</p></div><strong>PENDING</strong></div>}
      {!payments.length ? <div className="membership-payment-empty">No membership payment activity yet. Your payment details will appear here after you choose a plan.</div> : <div className="membership-payment-list">
        {payments.map((item) => <button type="button" className="membership-payment-row" key={item.id} onClick={() => setSelected(item)}>
          <div className="membership-payment-plan"><span>{String(item.membership_plan_type || 'membership').toUpperCase()}</span><b>{item.membership_plan_name || 'Membership'}</b><small>Payment #{item.id} · {item.payment_method || 'manual'}</small></div>
          <div><small>AMOUNT</small><b>{money(item.amount)}</b></div>
          <div><small>DATE</small><b>{date(item.created_at)}</b></div>
          <div><small>STATUS</small><em className={`membership-payment-pill ${item.status}`}>{label(item.status)}</em></div>
        </button>)}
      </div>}
    </section>
    {selected && <div className="membership-payment-detail-backdrop" onClick={() => setSelected(null)}><section className="membership-payment-detail" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="membership-payment-close" onClick={() => setSelected(null)}>×</button>
      <span className="membership-kicker">PAYMENT DETAILS</span><h2>{selected.membership_plan_name || 'Membership payment'}</h2>
      <div className="membership-payment-detail-top"><em className={`membership-payment-pill ${selected.status}`}>{label(selected.status)}</em><strong>{money(selected.amount)}</strong></div>
      <div className="membership-payment-detail-grid">
        <div><small>PAYMENT ID</small><b>#{selected.id}</b></div><div><small>DATE</small><b>{date(selected.created_at)}</b></div>
        <div><small>PAYMENT METHOD</small><b>{selected.payment_method || '—'}</b></div><div><small>WALLET APPLIED</small><b>{money(selected.wallet_amount)}</b></div>
        <div><small>DIRECT PAYMENT</small><b>{money(selected.external_amount)}</b></div><div><small>REFERENCE / UTR</small><b>{selected.manual_reference || 'Not submitted'}</b></div>
        {selected.membership_id && <div><small>MEMBERSHIP</small><b>#{selected.membership_id}</b></div>}
        {selected.expires_at && <div><small>EXPIRES</small><b>{date(selected.expires_at)}</b></div>}
      </div>
      {selected.status === 'pending' && <div className="membership-payment-detail-note">This payment is awaiting admin verification. Membership access will be activated after the direct payment is approved.</div>}
      {selected.notes && <div className="membership-payment-notes"><small>NOTE</small><p>{selected.notes}</p></div>}
      <button type="button" className="membership-payment-done" onClick={() => setSelected(null)}>Done</button>
    </section></div>}
  </>
}
