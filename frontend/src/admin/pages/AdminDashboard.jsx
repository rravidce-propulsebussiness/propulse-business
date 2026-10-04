import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import './AdminDashboard.css'

const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const count=value=>Number(value||0).toLocaleString('en-IN')
const EMPTY_OBJECT=Object.freeze({})

function MiniBars({tone='blue'}){
  return <span className={`admin-mini-bars ${tone}`} aria-hidden="true">
    <i/><i/><i/><i/><i/><i/>
  </span>
}

function OverviewCard({icon,label,value,note,tone='blue'}){
  return <article className={`admin-overview-card ${tone}`}>
    <span className="admin-overview-card-icon">{icon}</span>
    <div className="admin-overview-card-copy">
      <span>{label}</span>
      <strong>{value}</strong>
      {note&&<small>{note}</small>}
    </div>
    <MiniBars tone={tone}/>
  </article>
}

function MetricCard({icon,label,value,tone='blue',note}){
  return <article className={`admin-panel-metric ${tone}`}>
    <span className="admin-panel-metric-icon">{icon}</span>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {note&&<small>{note}</small>}
    </div>
  </article>
}

function FinanceRow({items}){
  return <div className="admin-finance-row">
    {items.map(item=><div key={item.label}>
      <span>{item.label}</span>
      <strong>{item.display??money(item.value)}</strong>
      {item.note&&<small>{item.note}</small>}
    </div>)}
  </div>
}

function BusinessPanel({tone,badge,eyebrow,title,to,linkLabel,metrics,finance}){
  return <section className={`admin-business-panel ${tone}`}>
    <div className="admin-business-panel-head">
      <div className="admin-business-title">
        <span className="admin-business-badge">{badge}</span>
        <div>
          <span className="admin-business-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <Link to={to}>{linkLabel}<b>→</b></Link>
    </div>

    <div className="admin-business-metrics">
      {metrics.map(item=><MetricCard key={item.label} {...item}/>)}
    </div>

    <FinanceRow items={finance}/>
  </section>
}

function CompactAction({to,label,value}){
  return <Link className="admin-compact-action" to={to}>
    <span>{label}</span>
    <strong>{count(value)}</strong>
    <b>→</b>
  </Link>
}

export default function AdminDashboard(){
  const [stats,setStats]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [revenuePeriod,setRevenuePeriod]=useState('month')

  useEffect(()=>{
    let mounted=true
    apiRequest('/admin/dashboard/stats')
      .then(data=>mounted&&setStats(data))
      .catch(err=>mounted&&setError(err.message))
      .finally(()=>mounted&&setLoading(false))
    return()=>{mounted=false}
  },[])

  const streams=stats?.streams||EMPTY_OBJECT
  const propulse=streams.propulse||EMPTY_OBJECT
  const leadPartner=streams.leadPartner||EMPTY_OBJECT
  const investor=streams.investor||EMPTY_OBJECT
  const revenue=stats?.revenue||EMPTY_OBJECT
  const actions=stats?.actions||EMPTY_OBJECT
  const customers=stats?.customers||EMPTY_OBJECT
  const show=value=>loading?'—':value

  const revenuePeriods=useMemo(()=>({
    today:{
      label:'Today',
      total:revenue.today,
      ownGross:propulse.revenueToday,
      partnerCommission:leadPartner.revenueToday,
      investorCommission:investor.revenueToday
    },
    week:{
      label:'This Week',
      total:revenue.week,
      ownGross:propulse.revenueWeek,
      partnerCommission:leadPartner.revenueWeek,
      investorCommission:investor.revenueWeek
    },
    month:{
      label:'This Month',
      total:revenue.month,
      ownGross:propulse.revenueMonth,
      partnerCommission:leadPartner.revenueMonth,
      investorCommission:investor.revenueMonth
    },
    all:{
      label:'All Time',
      total:revenue.total,
      ownGross:propulse.revenueTotal,
      partnerCommission:leadPartner.revenueTotal,
      investorCommission:investor.revenueTotal
    }
  }),[revenue,propulse,leadPartner,investor])
  const selectedRevenue=revenuePeriods[revenuePeriod]||revenuePeriods.month

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
      </div>
    </section>

    {error&&<div className="admin-dashboard__error"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

    <section className="admin-revenue-command">
      <div className="admin-revenue-command-head">
        <div>
          <span>REVENUE COMMAND CENTER</span>
          <h2>Total earnings</h2>
          <p>Propulse-owned lead gross + Lead Partner commission + Investor commission</p>
        </div>
        <div className="admin-revenue-periods" role="tablist" aria-label="Revenue period">
          {[
            ['today','Today'],
            ['week','This Week'],
            ['month','This Month'],
            ['all','All Time']
          ].map(([key,label])=><button type="button" key={key} className={revenuePeriod===key?'active':''} onClick={()=>setRevenuePeriod(key)}>{label}</button>)}
        </div>
      </div>

      <div className="admin-revenue-command-body">
        <div className="admin-total-earnings">
          <span>{selectedRevenue.label}</span>
          <strong>{show(money(selectedRevenue.total))}</strong>
          <small>Platform earnings from lead marketplace activity</small>
        </div>
        <div className="admin-revenue-breakdown">
          <article className="own">
            <span>Our gross</span>
            <strong>{show(money(selectedRevenue.ownGross))}</strong>
            <small>Propulse-owned lead sales</small>
          </article>
          <div className="admin-revenue-plus">+</div>
          <article className="partner">
            <span>Partner commission</span>
            <strong>{show(money(selectedRevenue.partnerCommission))}</strong>
            <small>Propulse share from Lead Partners</small>
          </article>
          <div className="admin-revenue-plus">+</div>
          <article className="investor">
            <span>Investor commission</span>
            <strong>{show(money(selectedRevenue.investorCommission))}</strong>
            <small>Propulse share from investor-linked sales</small>
          </article>
        </div>
      </div>
    </section>

    <section className="admin-overview-grid">
      <OverviewCard
        icon="◎"
        label="Active businesses"
        value={show(count(customers.activeBusinesses))}
        note={loading?'':`${count(customers.activeMemberships)} active memberships`}
        tone="blue"
      />
      <OverviewCard
        icon="◈"
        label="Our leads"
        value={show(count(propulse.totalLeads))}
        note={loading?'':`${count(propulse.availableLeads)} available now`}
        tone="orange"
      />
      <OverviewCard
        icon="♙"
        label="Active Lead Partners"
        value={show(count(leadPartner.activePartners))}
        note={loading?'':`${count(leadPartner.totalLeads)} partner leads`}
        tone="green"
      />
      <OverviewCard
        icon="↗"
        label="Active investments"
        value={show(count(investor.activeInvestments))}
        note={loading?'':`${count(investor.totalLeads)} investor-linked leads`}
        tone="purple"
      />
    </section>

    <section className="admin-business-grid">
      <BusinessPanel
        tone="propulse"
        badge="P"
        eyebrow="PROPULSE-OWNED BUSINESS"
        title="Our leads"
        to="/admin/leads"
        linkLabel="Manage leads"
        metrics={[
          {icon:'◇',label:'Total leads',value:show(count(propulse.totalLeads)),tone:'blue'},
          {icon:'✓',label:'Sold leads',value:show(count(propulse.soldLeads)),tone:'green'},
          {icon:'₹',label:'Revenue',value:show(money(propulse.revenueTotal)),tone:'purple'}
        ]}
        finance={[
          {label:'Available',value:propulse.availableLeads||0,display:show(count(propulse.availableLeads)),note:'leads'},
          {label:'Sold shares',value:propulse.soldShares||0,display:show(count(propulse.soldShares)),note:'shares'},
          {label:'Gross sales',value:propulse.grossSales||0}
        ]}
      />

      <BusinessPanel
        tone="partner"
        badge="LP"
        eyebrow="LEAD PARTNER PERFORMANCE"
        title="Lead Partners"
        to="/admin/lead-partners"
        linkLabel="View partners"
        metrics={[
          {icon:'♙',label:'Active partners',value:show(count(leadPartner.activePartners)),tone:'blue'},
          {icon:'◇',label:'Partner leads',value:show(count(leadPartner.totalLeads)),tone:'green'},
          {icon:'₹',label:'Propulse revenue',value:show(money(leadPartner.revenueTotal)),tone:'purple'}
        ]}
        finance={[
          {label:'Gross sales',value:leadPartner.grossSales||0},
          {label:'Partner earnings',value:leadPartner.partnerEarnings||0},
          {label:'Propulse commission',value:leadPartner.revenueTotal||0}
        ]}
      />
    </section>

    <section className="admin-investor-panel">
      <div className="admin-business-panel-head">
        <div className="admin-business-title">
          <span className="admin-business-badge">IN</span>
          <div>
            <span className="admin-business-eyebrow">INVESTOR-LINKED PERFORMANCE</span>
            <h2>Investor activity</h2>
          </div>
        </div>
        <Link to="/admin/investments">View investments<b>→</b></Link>
      </div>

      <div className="admin-investor-content">
        <div className="admin-business-metrics">
          <MetricCard icon="↗" label="Active investments" value={show(count(investor.activeInvestments))} tone="purple"/>
          <MetricCard icon="◇" label="Investor-linked leads" value={show(count(investor.totalLeads))} tone="blue"/>
          <MetricCard icon="₹" label="Propulse revenue" value={show(money(investor.revenueTotal))} tone="green"/>
        </div>
        <FinanceRow items={[
          {label:'Gross sales',value:investor.grossSales||0},
          {label:'Investor allocation',value:investor.investorAllocated||0},
          {label:'Propulse commission',value:investor.revenueTotal||0}
        ]}/>
      </div>
    </section>

    <section className="admin-bottom-grid">
      <div className="admin-compact-panel">
        <div className="admin-compact-panel-head"><span>OPERATIONS</span><strong>Action required</strong><b>{show(count(actionTotal))}</b></div>
        <div className="admin-compact-actions">
          <CompactAction to="/admin/payments" label="Payments" value={actions.pendingPayments}/>
          <CompactAction to="/admin/company-proofs" label="Company proofs" value={actions.pendingCompanyProofs}/>
          <CompactAction to="/admin/lead-reports" label="Lead reports" value={actions.pendingLeadReports}/>
          <CompactAction to="/admin/lead-partner-payouts" label="Partner payouts" value={actions.pendingPartnerPayouts}/>
        </div>
      </div>

      <div className="admin-compact-panel">
        <div className="admin-compact-panel-head"><span>CUSTOMERS</span><strong>Account health</strong></div>
        <div className="admin-health-grid">
          <div><span>Active businesses</span><strong>{show(count(customers.activeBusinesses))}</strong></div>
          <div><span>Memberships</span><strong>{show(count(customers.activeMemberships))}</strong></div>
          <div><span>Pro members</span><strong>{show(count(customers.proMembers))}</strong></div>
          <div><span>New this month</span><strong>{show(count(customers.newUsersMonth))}</strong></div>
        </div>
      </div>
    </section>
  </main>
}
