import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRequest, clearSession, getUser } from '../utils/auth'
import './LeadPartnerHome.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const date = value => value ? new Date(value).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function Icon({ children }) { return <span className="lp-icon" aria-hidden="true">{children}</span> }

export default function LeadPartnerHome(){
  const navigate=useNavigate()
  const user=getUser()
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [period,setPeriod]=useState('month')
  const [periodOpen,setPeriodOpen]=useState(false)

  useEffect(()=>{
    let mounted=true
    authRequest(`/lead-partner/dashboard?period=${period}`)
      .then(v=>mounted&&setData(v))
      .catch(e=>mounted&&setError(e.message||'Unable to load dashboard'))
      .finally(()=>mounted&&setLoading(false))
    return()=>{mounted=false}
  },[period])

  const initials=useMemo(()=>(user?.name||'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'LP',[user?.name])
  const stats=data?.stats||{}
  const chart=data?.charts?.earnings||[]
  const status=data?.charts?.leadStatus||{}
  const recentLeads=data?.recentLeads||[]
  const recentPayouts=data?.recentPayouts||[]
  const periodLabels={month:'This Month',last_month:'Last Month',last_3_months:'Last 3 Months',last_6_months:'Last 6 Months',all:'All Time'}

  const chartMax=Math.max(1,...chart.flatMap(x=>[Number(x.earnings||0),Number(x.received||0)]))
  const chartPoints=(key)=>{
    if(!chart.length)return ''
    const width=650,height=170
    return chart.map((x,i)=>{
      const px=24+(i*Math.max(0,(width-48)/Math.max(1,chart.length-1)))
      const py=height-18-(Number(x[key]||0)/chartMax)*(height-38)
      return `${px},${py}`
    }).join(' ')
  }
  const totalStatus=Object.values(status).reduce((sum,v)=>sum+Number(v||0),0)
  const statusSegments=[
    ['available','Available'],['sold','Sold'],['closed','Closed'],['paused','Paused']
  ].map(([key,label])=>({key,label,value:Number(status[key]||0)})).filter(x=>x.value>0)
  const statusGradient=(()=>{
    if(!totalStatus)return 'conic-gradient(#dfe6ef 0 100%)'
    let cursor=0
    const stops=statusSegments.map((x,i)=>{
      const start=cursor
      cursor+=(x.value/totalStatus)*100
      const end=cursor
      const cls=['available','sold','closed','paused'][i]
      const color={available:'#12b76a',sold:'#377dff',closed:'#f6ad12',paused:'#8392a8'}[cls]
      return `${color} ${start}% ${end}%`
    })
    return `conic-gradient(${stops.join(',')})`
  })()

  function signOut(){
    clearSession()
    localStorage.removeItem('propulse_session_mode')
    navigate('/login',{replace:true})
  }

  return <div className="lp-shell">
    <aside className="lp-sidebar">
      <div className="lp-brand"><span className="lp-brand-mark">P</span><span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span></div>
      <div className="lp-nav-label">WORKSPACE</div>
      <nav className="lp-nav">
        <Link className="active" to="/lead-partner"><Icon>⌂</Icon><span>Overview</span></Link>
        <Link to="/lead-partner/inventory"><Icon>▤</Icon><span>Lead Inventory</span></Link>
        <Link to="/lead-partner/pricing"><Icon>₹</Icon><span>Pricing & Revenue</span></Link>
        <Link to="/lead-partner/withdrawals"><Icon>▣</Icon><span>Earnings & Withdrawals</span></Link>
      </nav>
      <div className="lp-sidebar-bottom">
        <div className="lp-sidebar-user"><span>{initials}</span><div><b>{user?.name||'Lead Partner'}</b><small>{user?.email||'Partner account'}</small></div></div>
        <button onClick={signOut}>↪ <span>Log out</span></button>
      </div>
    </aside>

    <main className="lp-main">
      <header className="lp-topbar">
        <div className="lp-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Overview</strong></div>
        <div className="lp-top-status"><i/> Partner account</div>
      </header>

      <div className="lp-content">
        <section className="lp-hero">
          <div><span className="lp-eyebrow">WELCOME BACK</span><h1>{user?.name||'Lead Partner'}</h1><p>Here's your lead business overview. Keep growing!</p></div>
          <div className="lp-period-wrap"><button className={`lp-period ${periodOpen?'open':''}`} type="button" onClick={()=>setPeriodOpen(v=>!v)} aria-expanded={periodOpen}><span>▣</span> {periodLabels[period]} <b>⌄</b></button>{periodOpen&&<div className="lp-period-menu">{Object.entries(periodLabels).map(([key,label])=><button key={key} type="button" className={period===key?'selected':''} onClick={()=>{setPeriod(key);setPeriodOpen(false)}}>{label}{period===key&&<span>✓</span>}</button>)}</div>}</div>
        </section>

        {error&&<div className="lp-alert"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

        <section className="lp-kpi-grid">
          <article className="lp-kpi"><div className="lp-kpi-icon blue"><Icon>♙</Icon></div><div><span>Leads Uploaded</span><strong>{loading?'—':stats.totalLeads??0}</strong><small>↗ {loading?'—':stats.activeLeads??0} active now</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon green"><Icon>🛒</Icon></div><div><span>Leads Sold</span><strong>{loading?'—':stats.soldLeads??0}</strong><small>Completed paid purchases</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon red"><Icon>⚠</Icon></div><div><span>Verified Fake Leads</span><strong>{loading?'—':stats.verifiedFakeLeads??0}</strong><small>Confirmed by Admin review</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon orange"><Icon>↩</Icon></div><div><span>Refunded Leads</span><strong>{loading?'—':stats.refundedLeads??0}</strong><small>Purchases refunded</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon yellow"><Icon>◷</Icon></div><div><span>Expired Access</span><strong>{loading?'—':stats.expiredAccessLeads??0}</strong><small>Buyer access that has expired</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon orange"><Icon>₹</Icon></div><div><span>Gross Sales Generated</span><strong>{loading?'—':money(stats.grossSales)}</strong><small>Total paid lead value</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon purple"><Icon>↗</Icon></div><div><span>Your Earnings</span><strong>{loading?'—':money(stats.earningsGenerated)}</strong><small>After 5% commission</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon green"><Icon>✓</Icon></div><div><span>Amount Received</span><strong>{loading?'—':money(stats.amountReceived)}</strong><small>Withdrawn & paid</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon blue"><Icon>◷</Icon></div><div><span>Pending Withdrawals</span><strong>{loading?'—':money(stats.pendingWithdrawals)}</strong><small>Awaiting approval</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon red"><Icon>▰</Icon></div><div><span>Available to Withdraw</span><strong>{loading?'—':money(stats.availableEarnings)}</strong><small>Eligible earnings</small></div></article>
          <article className="lp-kpi"><div className="lp-kpi-icon yellow"><Icon>↻</Icon></div><div><span>Recovery Outstanding</span><strong>{loading?'—':money(stats.recoveryOutstanding)}</strong><small>From verified fake leads</small></div></article>
        </section>

        <section className="lp-chart-grid">
          <article className="lp-card lp-earnings-card">
            <div className="lp-card-head"><div><h2>Earnings Overview</h2><p>Your earnings and withdrawals over time</p></div><div className="lp-legend"><span><i className="earnings"/> Earnings</span><span><i className="received"/> Received</span></div></div>
            <div className="lp-line-chart">
              <div className="lp-y-axis"><span>{money(chartMax)}</span><span>{money(chartMax*.75)}</span><span>{money(chartMax*.5)}</span><span>{money(chartMax*.25)}</span><span>₹0</span></div>
              <svg viewBox="0 0 650 190" preserveAspectRatio="none" aria-label="Earnings and received trend">
                {[18,55,92,129,166].map(y=><line key={y} x1="24" x2="626" y1={y} y2={y} className="chart-gridline"/>)} 
                <polyline points={chartPoints('earnings')} className="chart-area-line earnings-line"/>
                <polyline points={chartPoints('received')} className="chart-area-line received-line"/>
                {chart.map((x,i)=>{
                  const px=24+(i*Math.max(0,602/Math.max(1,chart.length-1)))
                  const ey=172-(Number(x.earnings||0)/chartMax)*134
                  const ry=172-(Number(x.received||0)/chartMax)*134
                  return <g key={`${x.label}-${i}`}><circle cx={px} cy={ey} r="4" className="earnings-dot"/><circle cx={px} cy={ry} r="4" className="received-dot"/></g>
                })}
              </svg>
              <div className="lp-x-axis">{chart.map((x,i)=><span key={`${x.label}-x-${i}`}>{x.label}</span>)}</div>
            </div>
          </article>

          <article className="lp-card lp-status-card">
            <div className="lp-card-head"><div><h2>Lead Status</h2><p>Current status of your uploaded leads</p></div></div>
            <div className="lp-donut-wrap">
              <div className="lp-donut" style={{background:statusGradient}}><div><strong>{loading?'—':totalStatus}</strong><span>Total Leads</span></div></div>
              <div className="lp-status-list">{statusSegments.map(x=><div key={x.key}><i className={x.key}/><span>{x.label}</span><b>{x.value}</b></div>)}{!statusSegments.length&&<div className="lp-empty-mini">No lead status data yet.</div>}</div>
            </div>
          </article>
        </section>

        <section className="lp-bottom-grid">
          <article className="lp-card lp-table-card">
            <div className="lp-card-head"><div><h2>Recent Leads</h2><p>Your latest uploaded leads</p></div><Link to="/lead-partner/inventory">View all</Link></div>
            <div className="lp-table-wrap"><table className="lp-table"><thead><tr><th>ID</th><th>LEAD</th><th>SERVICE</th><th>LOCATION</th><th>STATUS</th></tr></thead><tbody>
              {recentLeads.map(lead=><tr key={lead.id}><td>#{lead.id}</td><td><b>{lead.customer_name||'—'}</b></td><td>{lead.service_name||'—'}</td><td>{lead.city_name||'—'}</td><td><span className={`lp-status-pill ${lead.status||''}`}>{lead.status||'—'}</span></td></tr>)}
            </tbody></table>{!recentLeads.length&&<div className="lp-empty">No leads uploaded yet.</div>}</div>
          </article>

          <article className="lp-card lp-table-card">
            <div className="lp-card-head"><div><h2>Recent Payouts</h2><p>Your latest withdrawal requests</p></div><Link to="/lead-partner/withdrawals">View all</Link></div>
            <div className="lp-table-wrap"><table className="lp-table"><thead><tr><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th>REFERENCE</th></tr></thead><tbody>
              {recentPayouts.map(payout=><tr key={payout.id}><td>{date(payout.requested_at)}</td><td><b>{money(payout.amount)}</b></td><td><span className={`lp-status-pill ${payout.status||''}`}>{payout.status||'—'}</span></td><td>{payout.transfer_reference||'—'}</td></tr>)}
            </tbody></table>{!recentPayouts.length&&<div className="lp-empty">No withdrawal requests yet.</div>}</div>
          </article>
        </section>
      </div>
    </main>
  </div>
}
