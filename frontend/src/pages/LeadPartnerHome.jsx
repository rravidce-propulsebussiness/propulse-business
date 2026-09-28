import { useEffect, useMemo, useState } from 'react'
import LeadPartnerSidebar from '../components/LeadPartnerSidebar'
import { Link, useNavigate } from 'react-router-dom'
import { authRequest, clearSession, getUser } from '../utils/auth'
import './LeadPartnerHome.css'

const EMPTY_LIST = []
const money = value => `₹${Number(value || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const dateTime = value => value ? new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

export default function LeadPartnerHome(){
  const navigate=useNavigate()
  const user=getUser()
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [period,setPeriod]=useState('month')
  const [periodOpen,setPeriodOpen]=useState(false)
  const [refreshKey,setRefreshKey]=useState(0)

  useEffect(()=>{
    let mounted=true
    queueMicrotask(()=>{
      if(!mounted)return
      setLoading(true)
      setError('')
      authRequest(`/lead-partner/dashboard?period=${period}`)
        .then(v=>mounted&&setData(v))
        .catch(e=>mounted&&setError(e.message||'Unable to load dashboard'))
        .finally(()=>mounted&&setLoading(false))
    })
    return()=>{mounted=false}
  },[period,refreshKey])

  const stats=data?.stats||{}
  const chart=data?.charts?.earnings||EMPTY_LIST
  const status=data?.charts?.leadStatus||{}
  const recentLeads=data?.recentLeads??EMPTY_LIST
  const recentPayouts=data?.recentPayouts??EMPTY_LIST
  const quality=data?.quality||{}
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
    ['available','Available'],
    ['sold','Sold'],
    ['refunded','Refunded'],
    ['fake','Verified fake'],
    ['closed','Closed'],
    ['paused','Paused'],
    ['quarantined','Quarantined']
  ].map(([key,label])=>({key,label,value:Number(status[key]||0)})).filter(x=>x.value>0)

  const activity=useMemo(()=>{
    const leadItems=recentLeads.slice(0,5).map(lead=>({
      id:`lead-${lead.id}`,
      time:lead.created_at,
      type:'lead',
      title:lead.status==='sold'?'Lead sold':lead.status==='invalid'?'Lead invalidated':'Lead uploaded',
      text:lead.customer_name||'Lead',
      meta:lead.service_name||lead.industry_name||'Lead inventory',
      status:lead.status
    }))
    const payoutItems=recentPayouts.slice(0,5).map(payout=>({
      id:`payout-${payout.id}`,
      time:payout.processed_at||payout.requested_at,
      type:'payout',
      title:payout.status==='paid'?'Withdrawal paid':'Withdrawal requested',
      text:money(payout.amount),
      meta:payout.transfer_reference||'Earnings & Withdrawals',
      status:payout.status
    }))
    return [...leadItems,...payoutItems].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,7)
  },[recentLeads,recentPayouts])

  const statusGradient=useMemo(()=>{
    if(!totalStatus)return 'conic-gradient(#dfe6ef 0 100%)'
    let cursor=0
    const colorMap={available:'#1c9b68',sold:'#2d6fd1',refunded:'#d98a2d',fake:'#d65349',closed:'#d0a328',paused:'#7f8da0',quarantined:'#b67a19'}
    return `conic-gradient(${statusSegments.map(x=>{const start=cursor;cursor+=(x.value/totalStatus)*100;return `${colorMap[x.key]||'#7f8da0'} ${start}% ${cursor}%`}).join(',')})`
  },[statusSegments,totalStatus])

  const uploaded=Number(stats.totalLeads||0)
  const sold=Number(stats.soldLeads||0)
  const conversionRate=uploaded>0?Math.min(100,(sold/uploaded)*100):0
  const fake=Number(quality.verifiedFakeLeads||0)
  const fakeRate=Number(quality.verifiedFakeRatePct||0)
  const qualityScore=quality.score===null||quality.score===undefined?null:Number(quality.score)
  const qualityBand=String(quality.band||'no_data').replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase())
  const qualityBreakdown=quality.breakdown||{}
  const qualityIssues=Array.isArray(quality.topIssues)?quality.topIssues:[]
  const firstName=user?.name?.split(' ')?.[0]||'Partner'
  const hour=new Date().getHours()
  const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'

  function signOut(){
    clearSession()
    navigate('/login',{replace:true})
  }

  return <div className="lp-shell">
    <LeadPartnerSidebar user={user} onSignOut={signOut}/>

    <main className="lp-main">
      <header className="lp-topbar">
        <div className="lp-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Dashboard</strong></div>
        <div className="lp-topbar-actions">
          <Link to="/lead-partner/inventory">Lead inventory</Link>
          <button type="button" onClick={()=>setRefreshKey(v=>v+1)} disabled={loading}>↻ {loading?'Refreshing':'Refresh'}</button>
        </div>
      </header>

      <div className="lp-content">
        <section className="lp-dashboard-hero">
          <div className="lp-dashboard-hero-copy">
            <span className="lp-dashboard-kicker">LEAD PARTNER / BUSINESS OVERVIEW</span>
            <div className="lp-title-row"><h1>{greeting}, {firstName}</h1><span className="lp-live-chip"><i/> Active partner</span></div>
            <p>Track lead inventory, sales performance, earnings and payout activity from one workspace.</p>
            <div className="lp-hero-chips">
              <span><b>{loading?'—':stats.totalLeads??0}</b> leads uploaded</span>
              <span><b>{loading?'—':stats.soldLeads??0}</b> sold</span>
              <span><b>{loading?'—':money(stats.availableEarnings)}</b> available</span>
            </div>
          </div>

          <div className="lp-period-wrap">
            <span className="lp-period-label">REPORTING PERIOD</span>
            <button className={`lp-period ${periodOpen?'open':''}`} type="button" onClick={()=>setPeriodOpen(v=>!v)} aria-expanded={periodOpen}>
              <span>▣</span><strong>{periodLabels[period]}</strong><b>⌄</b>
            </button>
            {periodOpen&&<div className="lp-period-menu">
              {Object.entries(periodLabels).map(([key,label])=><button key={key} type="button" className={period===key?'selected':''} onClick={()=>{setPeriod(key);setPeriodOpen(false)}}>{label}{period===key&&<span>✓</span>}</button>)}
            </div>}
          </div>
        </section>

        {error&&<div className="lp-alert"><div><b>Dashboard unavailable</b><span>{error}</span></div><button type="button" onClick={()=>setRefreshKey(v=>v+1)}>Retry</button></div>}

        <section className="lp-finance-overview">
          <article className="lp-wallet-card">
            <div className="lp-wallet-head">
              <div><span>AVAILABLE TO WITHDRAW</span><small>Eligible partner earnings after reservations and recovery</small></div>
              <Link to="/lead-partner/withdrawals">Withdraw earnings →</Link>
            </div>
            <strong>{loading?'—':money(stats.availableEarnings)}</strong>
            <div className="lp-wallet-breakdown">
              <div><span>Generated</span><b>{loading?'—':money(stats.earningsGenerated)}</b></div>
              <div><span>Pending payout</span><b>{loading?'—':money(stats.pendingWithdrawals)}</b></div>
              <div className={Number(stats.recoveryOutstanding||0)>0?'warning':''}><span>Recovery</span><b>{loading?'—':money(stats.recoveryOutstanding)}</b></div>
            </div>
          </article>

          <div className="lp-finance-kpis">
            <article><span className="lp-kpi-badge blue">₹</span><div><small>GROSS SALES</small><strong>{loading?'—':money(stats.grossSales)}</strong><em>Lead purchase value</em></div></article>
            <article><span className="lp-kpi-badge green">✓</span><div><small>AMOUNT RECEIVED</small><strong>{loading?'—':money(stats.amountReceived)}</strong><em>Paid withdrawals</em></div></article>
            <article><span className="lp-kpi-badge purple">↗</span><div><small>EARNINGS GENERATED</small><strong>{loading?'—':money(stats.earningsGenerated)}</strong><em>Partner earnings</em></div></article>
            <article><span className="lp-kpi-badge orange">◷</span><div><small>PENDING PAYOUT</small><strong>{loading?'—':money(stats.pendingWithdrawals)}</strong><em>Reserved for processing</em></div></article>
          </div>
        </section>

        <section className="lp-operating-strip">
          <article><span className="lp-operating-icon">▤</span><div><small>LEADS UPLOADED</small><strong>{loading?'—':stats.totalLeads??0}</strong><em>{loading?'—':stats.activeLeads??0} active</em></div></article>
          <article><span className="lp-operating-icon sold">↗</span><div><small>LEADS SOLD</small><strong>{loading?'—':stats.soldLeads??0}</strong><em>{conversionRate.toFixed(1)}% of uploaded</em></div></article>
          <article><span className="lp-operating-icon fake">!</span><div><small>VERIFIED FAKE</small><strong>{loading?'—':stats.verifiedFakeLeads??0}</strong><em>{Number(quality.verifiedFakeRatePct||0).toFixed(1)}% fake rate</em></div></article>
          <article><span className="lp-operating-icon refund">↩</span><div><small>REFUNDED</small><strong>{loading?'—':stats.refundedLeads??0}</strong><em>Refunded purchases</em></div></article>
          <article><span className="lp-operating-icon expired">◷</span><div><small>EXPIRED ACCESS</small><strong>{loading?'—':stats.expiredAccessLeads??0}</strong><em>Expired buyer access</em></div></article>
        </section>

        <section className="lp-primary-grid">
          <article className="lp-card lp-performance-card">
            <div className="lp-card-head">
              <div><span className="lp-section-kicker">FINANCIAL PERFORMANCE</span><h2>Earnings trend</h2><p>Latest six monthly points from the partner ledger.</p></div>
              <div className="lp-legend"><span><i className="earnings"/> Earnings</span><span><i className="received"/> Received</span></div>
            </div>
            <div className="lp-chart-caption"><span>LAST 6 MONTHS</span><b>Chart period is fixed to six months</b></div>
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
            <div className="lp-card-head"><div><span className="lp-section-kicker">INVENTORY HEALTH</span><h2>Lead status</h2><p>Current status distribution across your inventory.</p></div><Link to="/lead-partner/inventory">Inventory →</Link></div>
            <div className="lp-donut-wrap">
              <div className="lp-donut" style={{background:statusGradient}}><div><strong>{loading?'—':totalStatus}</strong><span>Total leads</span></div></div>
              <div className="lp-status-list">
                {statusSegments.map(x=><div key={x.key}><i className={x.key}/><span>{x.label}</span><b>{x.value}</b></div>)}
                {!statusSegments.length&&<div className="lp-empty-mini">No lead status data yet.</div>}
              </div>
            </div>
          </article>
        </section>

        <section className="lp-secondary-grid">
          <article className="lp-card lp-quality-card">
            <div className="lp-card-head"><div><span className="lp-section-kicker">LEAD QUALITY</span><h2>Reported lead outcomes</h2><p>Verified outcomes from buyer reports.</p></div><Link to="/lead-partner/reports">Open reports →</Link></div>
            <div className="lp-quality-summary">
              <div className={'lp-quality-score '+String(quality.band||'no_data')}><span>QUALITY SCORE</span><strong>{loading?'—':qualityScore===null?'—':qualityScore.toFixed(1)+'/100'}</strong><small>{qualityScore===null?'No lead data yet':qualityBand+' · '+String(quality.confidence||'low')+' confidence · '+Number(quality.sampleSize||0)+' leads scored'}</small></div>
              <div className="lp-quality-grid">
                <div><span>Completeness</span><strong>{loading?'—':Number(qualityBreakdown.completeness?.score||0).toFixed(1)}<small> / {qualityBreakdown.completeness?.max||45}</small></strong></div>
                <div><span>Validity</span><strong>{loading?'—':Number(qualityBreakdown.validity?.score||0).toFixed(1)}<small> / {qualityBreakdown.validity?.max||25}</small></strong></div>
                <div><span>Uniqueness</span><strong>{loading?'—':Number(qualityBreakdown.uniqueness?.score||0).toFixed(1)}<small> / {qualityBreakdown.uniqueness?.max||15}</small></strong></div>
                <div><span>Buyer outcome</span><strong>{loading?'—':Number(qualityBreakdown.outcome?.score||0).toFixed(1)}<small> / {qualityBreakdown.outcome?.max||15}</small></strong></div>
              </div>
            </div>
            <div className="lp-quality-note">
              <b>{fakeRate.toFixed(2)}% verified fake rate</b>
              <span>{fake} fake lead{fake===1?'':'s'} across {Number(quality.purchasedLeads||0)} purchased leads.</span>
              {qualityIssues.length>0&&<span>Top checks: {qualityIssues.map(x=>x.label+' ('+x.count+')').join(' · ')}</span>}
              {!qualityIssues.length&&qualityScore!==null&&<span>No current data-quality risk counters are elevated.</span>}
            </div>
          </article>

          <article className="lp-card lp-quick-actions-card">
            <div className="lp-card-head"><div><span className="lp-section-kicker">QUICK ACTIONS</span><h2>Partner workspace</h2><p>Jump directly to the most-used tools.</p></div></div>
            <div className="lp-quick-actions">
              <Link to="/lead-partner/inventory"><span>▤</span><div><b>Manage inventory</b><small>Upload and review leads</small></div><em>→</em></Link>
              <Link to="/lead-partner/pricing"><span>₹</span><div><b>Pricing & revenue</b><small>Manage partner pricing</small></div><em>→</em></Link>
              <Link to="/lead-partner/withdrawals"><span>⇩</span><div><b>Earnings & withdrawals</b><small>Request or review payouts</small></div><em>→</em></Link>
              <Link to="/lead-partner/account"><span>◎</span><div><b>Account settings</b><small>Business and payout profile</small></div><em>→</em></Link>
            </div>
          </article>
        </section>

        <section className="lp-bottom-grid">
          <article className="lp-card lp-activity-card">
            <div className="lp-card-head"><div><span className="lp-section-kicker">RECENT ACTIVITY</span><h2>Latest business activity</h2><p>Lead and payout events from your account.</p></div><Link to="/lead-partner/withdrawals">View funds →</Link></div>
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
            <div className="lp-card-head"><div><span className="lp-section-kicker">RECENT INVENTORY</span><h2>Latest leads</h2><p>Most recently uploaded leads for this reporting period.</p></div><Link to="/lead-partner/inventory">View all →</Link></div>
            <div className="lp-table-wrap">
              <table className="lp-table">
                <thead><tr><th>ID</th><th>LEAD</th><th>SERVICE</th><th>LOCATION</th><th>STATUS</th></tr></thead>
                <tbody>{recentLeads.slice(0,5).map(lead=><tr key={lead.id}><td>#{lead.id}</td><td><b>{lead.customer_name||'—'}</b></td><td>{lead.service_name||lead.industry_name||'—'}</td><td>{lead.city_name||'—'}</td><td><span className={`lp-status-pill ${lead.status||''}`}>{lead.status||'—'}</span></td></tr>)}</tbody>
              </table>
              {!recentLeads.length&&<div className="lp-empty">No leads uploaded in this period.</div>}
            </div>
          </article>
        </section>
      </div>
    </main>
  </div>
}
