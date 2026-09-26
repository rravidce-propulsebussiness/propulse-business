import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import './AdminDashboard.css'

const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const count=value=>Number(value||0).toLocaleString('en-IN')

function OverviewCard({icon,label,value,note,tone='blue'}){
  return <article className={`admin-overview-card ${tone}`}>
    <span className="admin-overview-card-icon">{icon}</span>
    <div className="admin-overview-card-copy">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
    <span className="admin-overview-card-trend" aria-hidden="true"><i/><i/><i/><i/><i/></span>
  </article>
}

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

function StreamPanel({tone,eyebrow,title,description,to,linkLabel,metrics,revenue,flow}){
  const badge=tone==='partner'?'LP':tone==='investor'?'IN':'P'
  return <section className={`admin-stream-panel ${tone}`}>
    <div className="admin-stream-head">
      <div className="admin-stream-title-wrap">
        <span className="admin-stream-badge">{badge}</span>
        <div>
          <span className="admin-stream-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <Link to={to}>{linkLabel} <b>→</b></Link>
    </div>

    <div className="admin-stream-metrics">
      {metrics.map(item=><MetricCard key={item.label} {...item}/>)}
    </div>

    <div className="admin-stream-finance">
      <div className="admin-stream-revenue">
        <span>PROPULSE REVENUE</span>
        <div>
          <small>Today<strong>{revenue.loading?'—':money(revenue.today)}</strong></small>
          <small>This month<strong>{revenue.loading?'—':money(revenue.month)}</strong></small>
          <small>All time<strong>{revenue.loading?'—':money(revenue.total)}</strong></small>
        </div>
      </div>
      <div className="admin-stream-flow">
        {flow.map((item,index)=><div className="admin-flow-step" key={item.label}>
          <span>{item.label}</span>
          <strong>{revenue.loading?'—':money(item.value)}</strong>
          {item.note&&<small>{item.note}</small>}
          {index<flow.length-1&&<b aria-hidden="true">→</b>}
        </div>)}
      </div>
    </div>
  </section>
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

  const streams=stats?.streams||{}
  const propulse=streams.propulse||{}
  const leadPartner=streams.leadPartner||{}
  const investor=streams.investor||{}
  const revenue=stats?.revenue||{}
  const actions=stats?.actions||{}
  const customers=stats?.customers||{}
  const show=value=>loading?'—':value

  const actionTotal=useMemo(()=>[
    actions.pendingPayments,
    actions.pendingWalletTopups,
    actions.pendingCompanyProofs,
    actions.pendingLeadReports,
    actions.pendingPartnerPayouts,
    actions.pendingInvestorWithdrawals
  ].reduce((sum,value)=>sum+Number(value||0),0),[actions])

  return <main className="admin-dashboard">
    <section className="admin-dashboard-hero">
      <div>
        <span>LIVE BUSINESS SNAPSHOT</span>
        <h1>Overview</h1>
        <p>Propulse-owned, Lead Partner and Investor activity are separated so revenue and operations stay easy to understand.</p>
      </div>
      <div className="admin-dashboard-live"><i/> Live data</div>
    </section>

    {error&&<div className="admin-dashboard__error"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

    <section className="admin-overview-grid">
      <OverviewCard
        icon="₹"
        label="Propulse revenue"
        value={show(money(revenue.total))}
        note="Our lead sales + partner commission + investor commission"
        tone="blue"
      />
      <OverviewCard
        icon="◈"
        label="Our leads"
        value={show(count(propulse.totalLeads))}
        note={loading?'Loading inventory…':`${count(propulse.availableLeads)} available now`}
        tone="orange"
      />
      <OverviewCard
        icon="♙"
        label="Active Lead Partners"
        value={show(count(leadPartner.activePartners))}
        note={loading?'Loading partner activity…':`${count(leadPartner.totalLeads)} partner-originated leads`}
        tone="green"
      />
      <OverviewCard
        icon="↗"
        label="Active investments"
        value={show(count(investor.activeInvestments))}
        note={loading?'Loading investor activity…':`${count(investor.totalLeads)} investor-linked leads`}
        tone="purple"
      />
      <OverviewCard
        icon="!"
        label="Action required"
        value={show(count(actionTotal))}
        note="Pending admin reviews and financial actions"
        tone="red"
      />
    </section>

    <div className="admin-stream-stack">
      <StreamPanel
        tone="propulse"
        eyebrow="PROPULSE-OWNED BUSINESS"
        title="Our leads"
        description="Leads owned directly by Propulse. The full paid sale amount is Propulse revenue."
        to="/admin/leads"
        linkLabel="Manage leads"
        metrics={[
          {label:'Our leads',value:show(count(propulse.totalLeads))},
          {label:'Available',value:show(count(propulse.availableLeads)),accent:'green'},
          {label:'Sold leads',value:show(count(propulse.soldLeads)),accent:'orange'},
          {label:'Sold shares',value:show(count(propulse.soldShares))}
        ]}
        revenue={{loading,today:propulse.revenueToday,month:propulse.revenueMonth,total:propulse.revenueTotal}}
        flow={[
          {label:'Gross lead sales',value:propulse.grossSales,note:'100% belongs to Propulse'}
        ]}
      />

      <StreamPanel
        tone="partner"
        eyebrow="LEAD PARTNER BUSINESS"
        title="Lead Partner performance"
        description="Partner-originated lead sales. Propulse revenue is only the commission retained after the partner earning."
        to="/admin/lead-partners"
        linkLabel="Lead Partners"
        metrics={[
          {label:'Active partners',value:show(count(leadPartner.activePartners))},
          {label:'Partner leads',value:show(count(leadPartner.totalLeads))},
          {label:'Available',value:show(count(leadPartner.availableLeads)),accent:'green'},
          {label:'Sold leads',value:show(count(leadPartner.soldLeads)),accent:'orange'},
          {label:'Sold shares',value:show(count(leadPartner.soldShares))},
          {label:'Pending payouts',value:show(count(actions.pendingPartnerPayouts)),note:loading?'':money(actions.pendingPartnerPayoutAmount)}
        ]}
        revenue={{loading,today:leadPartner.revenueToday,month:leadPartner.revenueMonth,total:leadPartner.revenueTotal}}
        flow={[
          {label:'Gross partner sales',value:leadPartner.grossSales},
          {label:'Partner earnings',value:leadPartner.partnerEarnings,note:'Belongs to Lead Partners'},
          {label:'Propulse commission',value:leadPartner.revenueTotal,note:'Platform revenue'}
        ]}
      />

      <StreamPanel
        tone="investor"
        eyebrow="INVESTOR BUSINESS"
        title="Investor-linked performance"
        description="Investor-linked lead sales. Propulse revenue is the sale amount remaining after the recorded investor allocation."
        to="/admin/investments"
        linkLabel="Investments"
        metrics={[
          {label:'Investors',value:show(count(investor.investors))},
          {label:'Active investments',value:show(count(investor.activeInvestments)),accent:'green'},
          {label:'Investor-linked leads',value:show(count(investor.totalLeads))},
          {label:'Available',value:show(count(investor.availableLeads)),accent:'green'},
          {label:'Sold leads',value:show(count(investor.soldLeads)),accent:'orange'},
          {label:'Pending withdrawals',value:show(count(actions.pendingInvestorWithdrawals)),note:loading?'':money(actions.pendingInvestorWithdrawalAmount)}
        ]}
        revenue={{loading,today:investor.revenueToday,month:investor.revenueMonth,total:investor.revenueTotal}}
        flow={[
          {label:'Gross investor sales',value:investor.grossSales},
          {label:'Investor allocation',value:investor.investorAllocated,note:'Belongs to investors'},
          {label:'Propulse commission',value:investor.revenueTotal,note:'Platform revenue'}
        ]}
      />
    </div>

    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-head compact">
        <div><span>OPERATIONS</span><h2>Action required</h2></div>
        <small>General admin work not already summarized inside the Partner or Investor sections.</small>
      </div>
      <div className="admin-actions-grid four">
        <ActionCard to="/admin/payments" label="Pending payments" value={actions.pendingPayments}/>
        <ActionCard to="/admin/payments" label="Wallet top-ups" value={actions.pendingWalletTopups}/>
        <ActionCard to="/admin/company-proofs" label="Company proofs" value={actions.pendingCompanyProofs}/>
        <ActionCard to="/admin/lead-reports" label="Lead reports" value={actions.pendingLeadReports}/>
      </div>
    </section>

    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-head compact">
        <div><span>CUSTOMERS</span><h2>Customer & membership health</h2></div>
        <Link to="/admin/users">Users <b>→</b></Link>
      </div>
      <div className="admin-customer-grid">
        <MetricCard label="Active businesses" value={show(count(customers.activeBusinesses))}/>
        <MetricCard label="Active memberships" value={show(count(customers.activeMemberships))} accent="green"/>
        <MetricCard label="Pro members" value={show(count(customers.proMembers))} accent="orange"/>
        <MetricCard label="New users this month" value={show(count(customers.newUsersMonth))}/>
      </div>
    </section>
  </main>
}
