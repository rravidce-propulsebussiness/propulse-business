import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import './AdminDashboard.css'

const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const count=value=>Number(value||0).toLocaleString('en-IN')

function MetricCard({label,value,note,accent='navy'}){
  return <article className={`admin-metric-card ${accent}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {note&&<small>{note}</small>}
  </article>
}

function ActionCard({to,label,value,amount}){
  return <Link className="admin-action-card" to={to}>
    <div><span>{label}</span>{amount!==undefined&&<small>{money(amount)}</small>}</div>
    <strong>{count(value)}</strong>
    <b>→</b>
  </Link>
}

export default function AdminDashboard(){
  const [stats,setStats]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    let mounted=true
    apiRequest('/admin/dashboard/stats')
      .then(data=>mounted&&setStats(data))
      .catch(err=>mounted&&setError(err.message))
      .finally(()=>mounted&&setLoading(false))
    return()=>{mounted=false}
  },[])

  const revenue=stats?.revenue||{}
  const leads=stats?.leads||{}
  const actions=stats?.actions||{}
  const customers=stats?.customers||{}
  const ecosystem=stats?.ecosystem||{}

  const revenueMix=useMemo(()=>{
    const lead=Number(revenue.lead||0)
    const membership=Number(revenue.membership||0)
    const total=lead+membership
    return {
      lead,
      membership,
      leadPercent:total?Math.round((lead/total)*100):0,
      membershipPercent:total?Math.round((membership/total)*100):0
    }
  },[revenue.lead,revenue.membership])

  const show=value=>loading?'—':value

  return <main className="admin-dashboard">
    {error&&<div className="admin-dashboard__error"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-head">
        <div><span>FINANCIAL PERFORMANCE</span><h1>Revenue & sales</h1></div>
        <small>Gross paid lead + membership sales. Wallet top-ups and investment principal are excluded.</small>
      </div>

      <div className="admin-revenue-grid">
        <MetricCard label="Revenue today" value={show(money(revenue.today))} note="Paid sales today" accent="orange"/>
        <MetricCard label="Last 7 days" value={show(money(revenue.last7Days))} note="Rolling seven-day gross sales"/>
        <MetricCard label="This month" value={show(money(revenue.month))} note="Current calendar month"/>
        <MetricCard label="All-time revenue" value={show(money(revenue.total))} note="Current paid sales after refunds" accent="dark"/>
      </div>

      <div className="admin-revenue-breakdown">
        <div className="admin-breakdown-copy"><span>REVENUE MIX</span><h2>Where paid sales come from</h2></div>
        <div className="admin-breakdown-item">
          <div><span>Lead sales</span><strong>{show(money(revenueMix.lead))}</strong></div>
          <div className="admin-breakdown-track"><i style={{width:`${revenueMix.leadPercent}%`}}/></div>
          <small>{revenueMix.leadPercent}% of gross revenue</small>
        </div>
        <div className="admin-breakdown-item membership">
          <div><span>Membership sales</span><strong>{show(money(revenueMix.membership))}</strong></div>
          <div className="admin-breakdown-track"><i style={{width:`${revenueMix.membershipPercent}%`}}/></div>
          <small>{revenueMix.membershipPercent}% of gross revenue</small>
        </div>
      </div>
    </section>

    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-head compact">
        <div><span>LEAD MARKETPLACE</span><h2>Lead performance</h2></div>
        <Link to="/admin/leads">Manage leads <b>→</b></Link>
      </div>
      <div className="admin-performance-grid">
        <MetricCard label="Total leads" value={show(count(leads.total))}/>
        <MetricCard label="Available" value={show(count(leads.available))} accent="green"/>
        <MetricCard label="Purchased leads" value={show(count(leads.purchased))} accent="orange"/>
        <MetricCard label="Sold shares" value={show(count(leads.soldShares))}/>
        <MetricCard label="Uploaded today" value={show(count(leads.uploadedToday))}/>
        <MetricCard label="Purchases today" value={show(count(leads.purchasesToday))} accent="green"/>
      </div>
    </section>

    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-head compact">
        <div><span>OPERATIONS</span><h2>Action required</h2></div>
        <small>Open the relevant admin workflow directly.</small>
      </div>
      <div className="admin-actions-grid">
        <ActionCard to="/admin/payments" label="Pending payments" value={actions.pendingPayments}/>
        <ActionCard to="/admin/payments" label="Wallet top-ups" value={actions.pendingWalletTopups}/>
        <ActionCard to="/admin/company-proofs" label="Company proofs" value={actions.pendingCompanyProofs}/>
        <ActionCard to="/admin/lead-reports" label="Lead reports" value={actions.pendingLeadReports}/>
        <ActionCard to="/admin/lead-partner-payouts" label="Partner payouts" value={actions.pendingPartnerPayouts} amount={actions.pendingPartnerPayoutAmount}/>
        <ActionCard to="/admin/investor-withdrawals" label="Investor withdrawals" value={actions.pendingInvestorWithdrawals} amount={actions.pendingInvestorWithdrawalAmount}/>
      </div>
    </section>

    <div className="admin-dashboard-split">
      <section className="admin-dashboard-section">
        <div className="admin-dashboard-section-head compact">
          <div><span>CUSTOMERS</span><h2>Customer & membership health</h2></div>
          <Link to="/admin/users">Users <b>→</b></Link>
        </div>
        <div className="admin-compact-grid">
          <MetricCard label="Active businesses" value={show(count(customers.activeBusinesses))}/>
          <MetricCard label="Active memberships" value={show(count(customers.activeMemberships))} accent="green"/>
          <MetricCard label="Pro members" value={show(count(customers.proMembers))} accent="orange"/>
          <MetricCard label="New users this month" value={show(count(customers.newUsersMonth))}/>
        </div>
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-dashboard-section-head compact">
          <div><span>PARTNER ECOSYSTEM</span><h2>Lead Partners & investors</h2></div>
          <Link to="/admin/lead-partners">Manage <b>→</b></Link>
        </div>
        <div className="admin-compact-grid">
          <MetricCard label="Active Lead Partners" value={show(count(ecosystem.activePartners))}/>
          <MetricCard label="Partner leads" value={show(count(ecosystem.partnerLeads))}/>
          <MetricCard label="Investors" value={show(count(ecosystem.investors))} accent="orange"/>
          <MetricCard label="Active investments" value={show(count(ecosystem.activeInvestments))} accent="green"/>
        </div>
        <div className="admin-ecosystem-money">
          <div><span>Partner earnings generated</span><strong>{show(money(ecosystem.partnerEarningsGenerated))}</strong></div>
          <div><span>Partner payouts paid</span><strong>{show(money(ecosystem.partnerPayoutsPaid))}</strong></div>
        </div>
      </section>
    </div>
  </main>
}
