import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRequest } from '../../utils/auth'
import './AdminLeadPartners.css'

const STATUSES=[
  {key:'',label:'All partners'},
  {key:'pending',label:'Pending'},
  {key:'active',label:'Active'},
  {key:'suspended',label:'Suspended'},
  {key:'rejected',label:'Rejected'}
]
const NEXT_STATUS={pending:'active',active:'suspended',suspended:'active',rejected:'active'}
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const date=v=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'
const shortDate=v=>v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'
const statusText=value=>String(value||'').replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase())
const leadOutcome=lead=>{
  if(lead?.verified_fake)return{key:'fake',label:'Verified fake'}
  if(Number(lead?.refunded_sales||0)>0)return{key:'refunded',label:'Refunded'}
  if(Number(lead?.purchase_count||0)>0)return{key:'sold',label:'Purchased'}
  return{key:String(lead?.status||'available'),label:statusText(lead?.status||'available')}
}

export default function AdminLeadPartners(){
  const navigate=useNavigate()
  const [status,setStatus]=useState('')
  const [search,setSearch]=useState('')
  const [query,setQuery]=useState('')
  const [data,setData]=useState({partners:[],pagination:{},totals:{}})
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [selected,setSelected]=useState(null)
  const [detail,setDetail]=useState(null)
  const [detailLoading,setDetailLoading]=useState(false)
  const [detailTab,setDetailTab]=useState('leads')

  const load=useCallback(async()=>{
    try{
      setLoading(true)
      setError('')
      const params=new URLSearchParams()
      if(status)params.set('status',status)
      if(query)params.set('search',query)
      params.set('limit','100')
      setData(await authRequest(`/admin/lead-partners?${params}`))
    }catch(e){
      setError(e.message||'Failed to load Lead Partners')
    }finally{
      setLoading(false)
    }
  },[status,query])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])

  const stats=useMemo(()=>{
    const rows=Array.isArray(data.partners)?data.partners:[]
    return rows.reduce((acc,row)=>{
      acc.partners+=1
      acc.leads+=Number(row.total_leads||0)
      acc.generated+=Number(row.generated_earnings||0)
      acc.transferDue+=Number(row.pending_transfer||0)
      acc.transferred+=Number(row.transferred_amount||0)
      return acc
    },{partners:0,leads:0,generated:0,transferDue:0,transferred:0})
  },[data.partners])

  async function changeStatus(partnerId,nextStatus){
    try{
      setBusy(partnerId)
      setError('')
      setMessage('')
      await authRequest(`/admin/lead-partners/${partnerId}/status`,{method:'PATCH',body:JSON.stringify({status:nextStatus})})
      setMessage(`Lead Partner #${partnerId} is now ${nextStatus}.`)
      await load()
      if(selected?.id===partnerId){
        setSelected(current=>current?{...current,status:nextStatus}:current)
        setDetail(current=>current?.partner?{...current,partner:{...current.partner,status:nextStatus}}:current)
      }
    }catch(e){
      setError(e.message||'Failed to update Lead Partner')
    }finally{
      setBusy(null)
    }
  }

  async function openDetails(row,tab='leads'){
    try{
      setSelected(row)
      setDetailTab(tab)
      setDetailLoading(true)
      setDetail(null)
      setError('')
      const result=await authRequest(`/admin/lead-partners/${row.id}/financials`)
      setDetail(result)
    }catch(e){
      setError(e.message||'Failed to load partner details')
    }finally{
      setDetailLoading(false)
    }
  }

  function closeDetails(){
    setSelected(null)
    setDetail(null)
    setDetailTab('leads')
  }

  const submitSearch=e=>{
    e?.preventDefault()
    setQuery(search.trim())
  }

  return <main className="alp-page">
    <section className="alp-hero">
      <div>
        <span>PARTNER OPERATIONS / FINANCE</span>
        <h1>Lead Partner master</h1>
        <p>One view for every partner: related leads, sales generated, partner earnings, transfer due, transferred amount and quality. Payout processing continues to use the existing payout ledger and queue.</p>
      </div>
      <button type="button" onClick={()=>navigate('/admin/lead-partner-payouts')}>
        <span>₹</span>
        Open payout queue
      </button>
    </section>

    <section className="alp-kpis">
      <article><span>PARTNERS SHOWN</span><strong>{stats.partners}</strong><small>{data.pagination?.total||0} total accounts</small></article>
      <article><span>PARTNER LEADS</span><strong>{stats.leads}</strong><small>Leads linked to these partners</small></article>
      <article><span>EARNINGS GENERATED</span><strong>{money(stats.generated)}</strong><small>Valid partner earnings</small></article>
      <article className="attention"><span>TRANSFER DUE</span><strong>{money(stats.transferDue)}</strong><small>Pending withdrawal requests</small></article>
      <article><span>TRANSFERRED</span><strong>{money(stats.transferred)}</strong><small>Completed partner payouts</small></article>
    </section>

    {error&&<div className="alp-alert error">{error}</div>}
    {message&&<div className="alp-alert success">{message}</div>}

    <section className="alp-panel">
      <div className="alp-panel-head">
        <div>
          <span>PARTNER DIRECTORY</span>
          <h2>Partner accounts</h2>
        </div>
        <form className="alp-search" onSubmit={submitSearch}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partner, business, email, phone or ID"/>
          <button type="submit">Search</button>
          {query&&<button type="button" className="clear" onClick={()=>{setSearch('');setQuery('')}}>Clear</button>}
        </form>
      </div>

      <div className="alp-filter-row">
        {STATUSES.map(item=><button type="button" key={item.key} className={status===item.key?'active':''} onClick={()=>setStatus(item.key)}>{item.label}</button>)}
      </div>

      {loading
        ?<div className="alp-state">Loading partner accounts…</div>
        :!data.partners?.length
          ?<div className="alp-state">No Lead Partners match this view.</div>
          :<div className="alp-table-wrap">
            <table className="alp-table">
              <thead>
                <tr>
                  <th>PARTNER</th>
                  <th>LEADS</th>
                  <th>PURCHASED</th>
                  <th>EARNINGS GENERATED</th>
                  <th>AVAILABLE</th>
                  <th>TRANSFER DUE</th>
                  <th>TRANSFERRED</th>
                  <th>QUALITY</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {data.partners.map(row=>{
                  const next=NEXT_STATUS[row.status]
                  return <tr key={row.id} className={Number(row.pending_transfer||0)>0?'has-transfer':''}>
                    <td>
                      <button type="button" className="alp-partner-link" onClick={()=>openDetails(row)}>
                        <span className="alp-avatar">{String(row.business_name||row.user_name||'P').trim().charAt(0).toUpperCase()}</span>
                        <span>
                          <b>{row.business_name||row.user_name||'Partner'}</b>
                          <small>{row.user_email||'—'}</small>
                          <em>Partner #{row.id} · {statusText(row.status)}</em>
                        </span>
                      </button>
                    </td>
                    <td><b>{row.total_leads}</b><small>{row.active_leads} active</small></td>
                    <td><b>{row.purchased_leads}</b><small>{row.verified_fake_leads} fake</small></td>
                    <td><b>{money(row.generated_earnings)}</b><small>Sales {money(row.gross_sales)}</small></td>
                    <td><b>{money(row.available_earnings)}</b><small>Not yet requested</small></td>
                    <td><b className={Number(row.pending_transfer||0)>0?'due':''}>{money(row.pending_transfer)}</b><small>{row.pending_payout_count||0} pending request{Number(row.pending_payout_count||0)===1?'':'s'}</small></td>
                    <td><b>{money(row.transferred_amount)}</b><small>Paid to partner</small></td>
                    <td><b>{row.quality_score===null||row.quality_score===undefined?'—':Number(row.quality_score).toFixed(1)+'/100'}</b><small>{String(row.quality_band||'no_data').replace(/_/g,' ')} · {Number(row.verified_fake_rate_pct||0).toFixed(2)}% fake</small></td>
                    <td>
                      <div className="alp-actions">
                        <button type="button" className="primary" onClick={()=>openDetails(row)}>View partner</button>
                        {next&&<button type="button" disabled={busy===row.id} onClick={()=>changeStatus(row.id,next)}>{busy===row.id?'Saving…':next==='active'?'Activate':next==='suspended'?'Suspend':'Reactivate'}</button>}
                      </div>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>}
    </section>

    {selected&&<div className="alp-drawer-backdrop" onClick={closeDetails}>
      <aside className="alp-drawer" onClick={e=>e.stopPropagation()}>
        <header className="alp-drawer-head">
          <div className="alp-drawer-profile">
            <span className="alp-drawer-avatar">{String(detail?.partner?.business_name||selected.business_name||selected.user_name||'P').trim().charAt(0).toUpperCase()}</span>
            <div>
              <span>PARTNER #{selected.id}</span>
              <h2>{detail?.partner?.business_name||selected.business_name||selected.user_name||'Lead Partner'}</h2>
              <p>{detail?.partner?.user_email||selected.user_email||'—'}{(detail?.partner?.business_phone||selected.business_phone)?` · ${detail?.partner?.business_phone||selected.business_phone}`:''}</p>
            </div>
          </div>
          <div className="alp-drawer-head-actions">
            {NEXT_STATUS[detail?.partner?.status||selected.status]&&<button type="button" disabled={busy===selected.id} onClick={()=>changeStatus(selected.id,NEXT_STATUS[detail?.partner?.status||selected.status])}>{NEXT_STATUS[detail?.partner?.status||selected.status]==='active'?'Activate / Reactivate':'Suspend'}</button>}
            <button type="button" className="close" onClick={closeDetails}>×</button>
          </div>
        </header>

        {detailLoading
          ?<div className="alp-state drawer-state">Loading partner account…</div>
          :detail&&<>
            <section className="alp-detail-kpis">
              <article><span>LEAD SALES</span><strong>{money(detail.grossSales)}</strong><small>Valid gross sales</small></article>
              <article><span>PARTNER EARNINGS</span><strong>{money(detail.generatedEarnings)}</strong><small>Generated after commission</small></article>
              <article><span>AVAILABLE</span><strong>{money(detail.availableEarnings)}</strong><small>Can be requested by partner</small></article>
              <article className="attention"><span>TRANSFER DUE</span><strong>{money(detail.pendingTransfer)}</strong><small>Pending withdrawal requests</small></article>
              <article><span>TRANSFERRED</span><strong>{money(detail.transferredAmount)}</strong><small>Completed payouts</small></article>
              <article><span>RECOVERY</span><strong>{money(detail.recoveryOutstanding)}</strong><small>Outstanding reversal recovery</small></article>
            </section>

            <section className="alp-partner-strip">
              <div><span>STATUS</span><strong className={`status ${detail.partner?.status||selected.status}`}>{statusText(detail.partner?.status||selected.status)}</strong></div>
              <div><span>QUALITY</span><strong>{detail.quality?.score===null||detail.quality?.score===undefined?'—':Number(detail.quality.score).toFixed(1)+'/100 · '+String(detail.quality.band||'').replace(/_/g,' ')}</strong></div>
              <div><span>PAYOUT ACCOUNT</span><strong>{detail.partner?.payout_method==='upi'?(detail.partner?.upi_id||'UPI'):(detail.partner?.bank_name||detail.partner?.account_holder_name||'Not configured')}</strong></div>
              <div><span>JOINED</span><strong>{shortDate(detail.partner?.created_at)}</strong></div>
              {Number(detail.pendingTransfer||0)>0&&<button type="button" onClick={()=>navigate(`/admin/lead-partner-payouts?search=${encodeURIComponent(detail.partner?.user_email||selected.user_email||'')}`)}>Review transfer due →</button>}
            </section>

            <section className="alp-quality-panel">
              <div className="alp-quality-breakdown">
                {['completeness','validity','uniqueness','outcome'].map(key=><div key={key}><span>{key}</span><strong>{Number(detail.quality?.breakdown?.[key]?.score||0).toFixed(1)}<small> / {detail.quality?.breakdown?.[key]?.max||0}</small></strong></div>)}
              </div>
              <div className="alp-quality-issues">
                <span>QUALITY SIGNALS</span>
                <strong>{detail.quality?.topIssues?.length?'Needs review':'No elevated data-quality counters'}</strong>
                <small>{detail.quality?.topIssues?.length?detail.quality.topIssues.map(x=>x.label+' ('+x.count+')').join(' · '):('Verified fake rate '+Number(detail.quality?.verifiedFakeRatePct||0).toFixed(2)+'% · '+String(detail.quality?.confidence||'none')+' confidence')}</small>
              </div>
            </section>

            <nav className="alp-detail-tabs">
              <button type="button" className={detailTab==='leads'?'active':''} onClick={()=>setDetailTab('leads')}>Related leads <b>{detail.leads?.length||0}</b></button>
              <button type="button" className={detailTab==='earnings'?'active':''} onClick={()=>setDetailTab('earnings')}>Earnings <b>{detail.history?.length||0}</b></button>
              <button type="button" className={detailTab==='payouts'?'active':''} onClick={()=>setDetailTab('payouts')}>Payouts <b>{detail.payouts?.length||0}</b></button>
            </nav>

            {detailTab==='leads'&&<section className="alp-detail-section">
              <div className="alp-section-head"><div><span>PARTNER INVENTORY</span><h3>Leads from this partner</h3></div><small>Sales and earnings are calculated from the existing lead purchase and partner earning ledgers.</small></div>
              {!detail.leads?.length?<div className="alp-state">This partner has not added any leads yet.</div>:<div className="alp-detail-table-wrap"><table className="alp-detail-table"><thead><tr><th>LEAD</th><th>QUALITY</th><th>CREATED</th><th>OUTCOME</th><th>PURCHASES</th><th>LEAD SALES</th><th>PARTNER EARNING</th></tr></thead><tbody>{detail.leads.map(lead=>{const outcome=leadOutcome(lead);return <tr key={lead.id}><td><b>#{lead.id} · {lead.customer_name||lead.service_name||lead.industry_name||'Lead'}</b><small>{[lead.industry_name,lead.service_name,lead.city_name].filter(Boolean).join(' · ')||'—'}</small><small>{lead.requirement||'No requirement summary'}</small></td><td><b>{lead.quality_score===null||lead.quality_score===undefined?'—':Number(lead.quality_score).toFixed(1)+'/100'}</b><small>{String(lead.quality_band||'no_data').replace(/_/g,' ')}</small>{lead.quality_flags?.length>0&&<small>{lead.quality_flags.slice(0,2).join(' · ').replace(/_/g,' ')}</small>}</td><td>{shortDate(lead.created_at)}</td><td><span className={`alp-outcome ${outcome.key}`}>{outcome.label}</span></td><td><b>{lead.purchase_count}</b>{lead.last_purchase_at&&<small>Last {shortDate(lead.last_purchase_at)}</small>}</td><td><b>{money(lead.gross_sales)}</b>{Number(lead.refunded_sales||0)>0&&<small>{money(lead.refunded_sales)} refunded</small>}</td><td><b>{money(lead.generated_earning)}</b>{Number(lead.reversed_earning||0)>0&&<small>{money(lead.reversed_earning)} reversed</small>}</td></tr>})}</tbody></table></div>}
            </section>}

            {detailTab==='earnings'&&<section className="alp-detail-section">
              <div className="alp-section-head"><div><span>PARTNER LEDGER</span><h3>Earnings history</h3></div><small>One earning entry per completed lead purchase. Reversals and recovery remain in the same ledger.</small></div>
              {!detail.history?.length?<div className="alp-state">No earning events yet.</div>:<div className="alp-detail-table-wrap"><table className="alp-detail-table"><thead><tr><th>DATE</th><th>LEAD</th><th>SALE</th><th>COMMISSION</th><th>EARNING</th><th>PAYOUT / RECOVERY</th><th>STATUS</th></tr></thead><tbody>{detail.history.map(item=><tr key={item.id}><td>{date(item.created_at)}</td><td><b>#{item.lead_id}</b><small>{item.industry_name||'—'}{item.city_name?` · ${item.city_name}`:''}</small></td><td>{money(item.gross_sale_amount)}</td><td>{Number(item.commission_percent||0).toFixed(2)}%</td><td><b>{money(item.earning_amount)}</b></td><td><small>Paid {money(item.paid_payout)}</small><small>Reserved {money(item.reserved_payout)}</small>{Number(item.recovery_allocated||0)>0&&<small>Recovery {money(item.recovery_allocated)}</small>}</td><td><span className={`alp-ledger-status ${item.status}`}>{statusText(item.status)}</span></td></tr>)}</tbody></table></div>}
            </section>}

            {detailTab==='payouts'&&<section className="alp-detail-section">
              <div className="alp-section-head"><div><span>TRANSFER HISTORY</span><h3>Partner payouts</h3></div><button type="button" onClick={()=>navigate(`/admin/lead-partner-payouts?search=${encodeURIComponent(detail.partner?.user_email||selected.user_email||'')}`)}>Open this partner in payout queue →</button></div>
              {!detail.payouts?.length?<div className="alp-state">No withdrawal requests yet.</div>:<div className="alp-detail-table-wrap"><table className="alp-detail-table"><thead><tr><th>REQUEST</th><th>AMOUNT</th><th>METHOD</th><th>REQUESTED</th><th>STATUS</th><th>TRANSFER REFERENCE</th></tr></thead><tbody>{detail.payouts.map(item=><tr key={item.id}><td><b>#{item.id}</b></td><td><b>{money(item.amount)}</b></td><td>{String(item.payout_method||'—').toUpperCase()}</td><td>{date(item.requested_at)}</td><td><span className={`alp-ledger-status ${item.status}`}>{statusText(item.status)}</span>{item.rejection_reason&&<small>{item.rejection_reason}</small>}</td><td>{item.transfer_reference||'—'}{item.paid_at&&<small>Paid {date(item.paid_at)}</small>}</td></tr>)}</tbody></table></div>}
            </section>}
          </>}
      </aside>
    </div>}
  </main>
}
