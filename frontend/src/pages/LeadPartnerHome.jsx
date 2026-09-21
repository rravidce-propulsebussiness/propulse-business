import { useEffect, useMemo, useState } from 'react'
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import { Link, useNavigate } from 'react-router-dom'
import { authRequest, clearSession, getUser } from '../utils/auth'
import './LeadPartnerHome.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const dateTime = value => value ? new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'


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
    setLoading(true)
    authRequest(`/lead-partner/dashboard?period=${period}`)
      .then(v=>mounted&&setData(v))
      .catch(e=>mounted&&setError(e.message||'Unable to load dashboard'))
      .finally(()=>mounted&&setLoading(false))
    return()=>{mounted=false}
  },[period])
  const stats=data?.stats||{}
  const chart=data?.charts?.earnings||[]
  const status=data?.charts?.leadStatus||{}
  const recentLeads=data?.recentLeads||[]
  const recentPayouts=data?.recentPayouts||[]
  const periodLabels={month:'This Month',last_month:'Last Month',last_3_months:'Last 3 Months',last_6_months:'Last 6 Months',all:'All Time'}
  const quality=data?.quality||{}

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
    ['available','Available'],['sold','Sold'],['refunded','Refunded'],['fake','Verified fake'],['closed','Closed'],['paused','Paused']
  ].map(([key,label])=>({key,label,value:Number(status[key]||0)})).filter(x=>x.value>0)

  const activity=useMemo(()=>{
    const leadItems=recentLeads.slice(0,5).map(lead=>({
      id:`lead-${lead.id}`,time:lead.created_at,type:'lead',title:lead.status==='sold'?'Lead sold':lead.status==='invalid'?'Lead invalidated':'Lead uploaded',
      text:lead.customer_name||'Lead',meta:lead.service_name||lead.industry_name||'Lead inventory',status:lead.status
    }))
    const payoutItems=recentPayouts.slice(0,5).map(payout=>({
      id:`payout-${payout.id}`,time:payout.processed_at||payout.requested_at,type:'payout',title:payout.status==='paid'?'Withdrawal paid':'Withdrawal requested',
      text:money(payout.amount),meta:payout.transfer_reference||'Earnings & Withdrawals',status:payout.status
    }))
    return [...leadItems,...payoutItems].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,7)
  },[recentLeads,recentPayouts])

  const statusGradient=useMemo(()=>{
    if(!totalStatus)return 'conic-gradient(#dfe6ef 0 100%)'
    let cursor=0
    const colorMap={available:'#16a36a',sold:'#377dff',refunded:'#f79009',fake:'#ef5148',closed:'#f6ad12',paused:'#8392a8'}
    return `conic-gradient(${statusSegments.map(x=>{const start=cursor;cursor+=(x.value/totalStatus)*100;return `${colorMap[x.key]||'#8392a8'} ${start}% ${cursor}%`}).join(',')})`
  },[statusSegments,totalStatus])

  function signOut(){
    clearSession()
    localStorage.removeItem('propulse_session_mode')
    navigate('/login',{replace:true})
  }

  return <div className="lp-shell">
    <LeadPartnerSidebar user={user} onSignOut={signOut} />

    <main className="lp-main">
      <header className="lp-topbar">
        <div className="lp-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Overview</strong></div>
        <div className="lp-top-status"><i/> Partner account</div>
      </header>

      <div className="lp-content">
        <section className="lp-hero lp-hero-premium">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">LEAD PARTNER WORKSPACE</span>
            <div className="lp-title-row"><h1>Good afternoon, {user?.name?.split(' ')[0]||'Partner'}</h1><span className="lp-live-chip"><i/> Active</span></div>
            <p>Your business performance, earnings and lead quality — in one place.</p>
          </div>
          <div className="lp-period-wrap"><button className={`lp-period ${periodOpen?'open':''}`} type="button" onClick={()=>setPeriodOpen(v=>!v)} aria-expanded={periodOpen}><span>▣</span> {periodLabels[period]} <b>⌄</b></button>{periodOpen&&<div className="lp-period-menu">{Object.entries(periodLabels).map(([key,label])=><button key={key} type="button" className={period===key?'selected':''} onClick={()=>{setPeriod(key);setPeriodOpen(false)}}>{label}{period===key&&<span>✓</span>}</button>)}</div>}</div>
        </section>

        {error&&<div className="lp-alert"><strong>Dashboard unavailable</strong><span>{error}</span></div>}

        <section className="lp-finance-hero">
          <div className="lp-balance-card">
            <div className="lp-balance-top"><div><span className="lp-card-overline">AVAILABLE TO WITHDRAW</span><small>Eligible partner earnings</small></div><Link to="/lead-partner/withdrawals">Withdraw →</Link></div>
            <strong>{loading?'—':money(stats.availableEarnings)}</strong>
            <div className="lp-balance-foot"><span>Earnings {loading?'—':money(stats.earningsGenerated)}</span><span>Recovery {loading?'—':money(stats.recoveryOutstanding)}</span></div>
          </div>
          <div className="lp-finance-mini-grid">
            <article><span>Gross sales</span><strong>{loading?'—':money(stats.grossSales)}</strong><small>Paid lead value</small></article>
            <article><span>Amount received</span><strong>{loading?'—':money(stats.amountReceived)}</strong><small>Successful payouts</small></article>
            <article><span>Pending payout</span><strong>{loading?'—':money(stats.pendingWithdrawals)}</strong><small>Awaiting processing</small></article>
            <article><span>Recovery outstanding</span><strong className={Number(stats.recoveryOutstanding||0)>0?'warning-value':''}>{loading?'—':money(stats.recoveryOutstanding)}</strong><small>From invalidated leads</small></article>
          </div>
        </section>

        <section className="lp-metric-strip">
          <article><span className="lp-metric-icon">♙</span><div><small>Leads uploaded</small><strong>{loading?'—':stats.totalLeads??0}</strong><em>{loading?'—':stats.activeLeads??0} active</em></div></article>
          <article><span className="lp-metric-icon green">↗</span><div><small>Leads sold</small><strong>{loading?'—':stats.soldLeads??0}</strong><em>Completed purchases</em></div></article>
          <article><span className="lp-metric-icon red">!</span><div><small>Verified fake</small><strong>{loading?'—':stats.verifiedFakeLeads??0}</strong><em>Admin confirmed</em></div></article>
          <article><span className="lp-metric-icon orange">↩</span><div><small>Refunded leads</small><strong>{loading?'—':stats.refundedLeads??0}</strong><em>Purchases refunded</em></div></article>
          <article><span className="lp-metric-icon yellow">◷</span><div><small>Expired access</small><strong>{loading?'—':stats.expiredAccessLeads??0}</strong><em>Buyer access expired</em></div></article>
        </section>

        <section className="lp-chart-grid lp-chart-grid-premium">
          <article className="lp-card lp-earnings-card">
            <div className="lp-card-head"><div><span className="lp-card-overline dark">FINANCIAL PERFORMANCE</span><h2>Earnings performance</h2><p>Generated earnings compared with completed payouts.</p></div><div className="lp-legend"><span><i className="earnings"/> Earnings</span><span><i className="received"/> Received</span></div></div>
            <div className="lp-line-chart">
              <div className="lp-y-axis"><span>{money(chartMax)}</span><span>{money(chartMax*.75)}</span><span>{money(chartMax*.5)}</span><span>{money(chartMax*.25)}</span><span>₹0</span></div>
              <svg viewBox="0 0 650 190" preserveAspectRatio="none" aria-label="Earnings and received trend">
                {[18,55,92,129,166].map(y=><line key={y} x1="24" x2="626" y1={y} y2={y} className="chart-gridline"/>)} 
                <polyline points={chartPoints('earnings')} className="chart-area-line earnings-line"/>
                <polyline points={chartPoints('received')} className="chart-area-line received-line"/>
                {chart.map((x,i)=>{const px=24+(i*Math.max(0,602/Math.max(1,chart.length-1)));const ey=172-(Number(x.earnings||0)/chartMax)*134;const ry=172-(Number(x.received||0)/chartMax)*134;return <g key={`${x.label}-${i}`}><circle cx={px} cy={ey} r="4" className="earnings-dot"/><circle cx={px} cy={ry} r="4" className="received-dot"/></g>})}
              </svg>
              <div className="lp-x-axis">{chart.map((x,i)=><span key={`${x.label}-x-${i}`}>{x.label}</span>)}</div>
            </div>
          </article>

          <article className="lp-card lp-status-card">
            <div className="lp-card-head"><div><span className="lp-card-overline dark">INVENTORY MIX</span><h2>Lead status</h2><p>Current distribution of uploaded leads.</p></div></div>
            <div className="lp-donut-wrap lp-donut-wrap-premium">
              <div className="lp-donut" style={{background:statusGradient}}><div><strong>{loading?'—':totalStatus}</strong><span>Total leads</span></div></div>
              <div className="lp-status-list">{statusSegments.map(x=><div key={x.key}><i className={x.key}/><span>{x.label}</span><b>{x.value}</b></div>)}{!statusSegments.length&&<div className="lp-empty-mini">No lead status data yet.</div>}</div>
            </div>
          </article>
        </section>

        <section className="lp-insight-grid">
          <article className="lp-card lp-quality-card">
            <div className="lp-card-head"><div><span className="lp-card-overline dark">LEAD QUALITY</span><h2>Reported lead outcomes</h2><p>Quality signals from purchased partner leads.</p></div><Link to="/lead-partner/reports">Open reports →</Link></div>
            <div className="lp-quality-grid">
              <div><span>Purchased leads</span><strong>{loading?'—':quality.purchasedLeads??0}</strong></div>
              <div><span>Verified genuine</span><strong>{loading?'—':quality.verifiedGenuineReports??0}</strong></div>
              <div><span>Verified fake</span><strong className="quality-danger">{loading?'—':quality.verifiedFakeLeads??0}</strong></div>
              <div><span>Fake rate</span><strong>{loading?'—':Number(quality.verifiedFakeRatePct||0).toFixed(2)}%</strong></div>
            </div>
            <div className="lp-quality-note">Verified fake leads are handled through the existing refund and earnings-reversal workflow.</div>
          </article>
          <article className="lp-card lp-health-card">
            <div className="lp-card-head"><div><span className="lp-card-overline dark">FINANCIAL POSITION</span><h2>Balance breakdown</h2><p>Understand how the current balance is composed.</p></div><Link to="/lead-partner/account">Account →</Link></div>
            <div className="lp-health-list">
              <div><span>Gross sales</span><b>{loading?'—':money(stats.grossSales)}</b></div>
              <div><span>Earnings</span><b>{loading?'—':money(stats.earningsGenerated)}</b></div>
              <div><span>Already received</span><b>{loading?'—':money(stats.amountReceived)}</b></div>
              <div><span>Pending payout</span><b>{loading?'—':money(stats.pendingWithdrawals)}</b></div>
              <div className="highlight"><span>Available now</span><b>{loading?'—':money(stats.availableEarnings)}</b></div>
              <div className={Number(stats.recoveryOutstanding||0)>0?'warning':''}><span>Recovery outstanding</span><b>{loading?'—':money(stats.recoveryOutstanding)}</b></div>
            </div>
          </article>
        </section>

        <section className="lp-bottom-grid lp-bottom-grid-premium">
          <article className="lp-card lp-activity-card">
            <div className="lp-card-head"><div><span className="lp-card-overline dark">RECENT ACTIVITY</span><h2>Latest business activity</h2><p>Recent lead and payout events.</p></div><Link to="/lead-partner/withdrawals">View funds →</Link></div>
            <div className="lp-activity-list">
              {activity.map(item=><div key={item.id} className="lp-activity-item">
                <span className={`lp-activity-icon ${item.type} ${item.status||''}`}>{item.type==='payout'?'₹':item.status==='invalid'?'!':'•'}</span>
                <div><strong>{item.title}</strong><span>{item.text}</span><small>{item.meta} · {dateTime(item.time)}</small></div>
                {item.type==='payout'&&<b className="activity-amount">{item.text}</b>}
              </div>)}
              {!activity.length&&<div className="lp-empty">No recent activity.</div>}
            </div>
          </article>
          <article className="lp-card lp-table-card">
            <div className="lp-card-head"><div><span className="lp-card-overline dark">RECENT LEADS</span><h2>Lead inventory</h2><p>Your latest uploaded leads.</p></div><Link to="/lead-partner/inventory">View all →</Link></div>
            <div className="lp-table-wrap"><table className="lp-table"><thead><tr><th>ID</th><th>LEAD</th><th>SERVICE</th><th>LOCATION</th><th>STATUS</th></tr></thead><tbody>
              {recentLeads.slice(0,5).map(lead=><tr key={lead.id}><td>#{lead.id}</td><td><b>{lead.customer_name||'—'}</b></td><td>{lead.service_name||'—'}</td><td>{lead.city_name||'—'}</td><td><span className={`lp-status-pill ${lead.status||''}`}>{lead.status||'—'}</span></td></tr>)}
            </tbody></table>{!recentLeads.length&&<div className="lp-empty">No leads uploaded yet.</div>}</div>
          </article>
        </section>
      </div>
    </main>
  </div>
}
