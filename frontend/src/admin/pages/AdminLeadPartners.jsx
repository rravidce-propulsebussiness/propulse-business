import { useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'

const STATUSES = [['','All'],['pending','Pending'],['active','Active'],['suspended','Suspended'],['rejected','Rejected']]
const NEXT_STATUS = { pending:'active', active:'suspended', suspended:'active', rejected:'active' }
const money = v => `₹${Number(v || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})`

export default function AdminLeadPartners(){
  const [status,setStatus]=useState('')
  const [data,setData]=useState({partners:[],pagination:{}})
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [selected,setSelected]=useState(null)
  const [financials,setFinancials]=useState(null)
  const [financialLoading,setFinancialLoading]=useState(false)

  async function load(){
    try{setLoading(true);setError('');setData(await authRequest(`/admin/lead-partners${status?`?status=${encodeURIComponent(status)}`:''}`))}
    catch(e){setError(e.message||'Failed to load Lead Partners')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[status])

  async function changeStatus(partnerId,nextStatus){
    try{setBusy(partnerId);setError('');setMessage('');await authRequest(`/admin/lead-partners/${partnerId}/status`,{method:'PATCH',body:JSON.stringify({status:nextStatus})});setMessage(`Lead Partner #${partnerId} is now ${nextStatus}.`);await load()}
    catch(e){setError(e.message||'Failed to update Lead Partner')}
    finally{setBusy(null)}
  }

  async function openDetails(row){
    try{setSelected(row);setFinancialLoading(true);setFinancials(null);setError('');const result=await authRequest(`/admin/lead-partners/${row.id}/financials`);setFinancials(result)}
    catch(e){setError(e.message||'Failed to load partner financials')}
    finally{setFinancialLoading(false)}
  }

  return <section className="admin-page">
    <div className="admin-page-header"><div><span className="admin-eyebrow">PARTNER QUALITY & FINANCE</span><h1>Lead Partners</h1><p>Manage partner status, verified lead quality, sales, and real earnings. Partner uploads remain automatic; this page does not add an upload approval step.</p></div></div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{STATUSES.map(([value,label])=><button key={value} onClick={()=>setStatus(value)} style={{padding:'9px 13px',borderRadius:8,border:'1px solid #d7e1ec',background:status===value?'#0b2d63':'#fff',color:status===value?'#fff':'#173f78',fontWeight:800,cursor:'pointer'}}>{label}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}{message&&<div className="admin-success">{message}</div>}
    <div style={{marginBottom:12,fontSize:13,color:'#5d6b7b'}}>Fake rate = verified-fake partner leads ÷ distinct partner leads with at least one completed purchase (paid or later refunded after verification).</div>
    {loading?<div className="admin-loading">Loading Lead Partners…</div>:!data.partners?.length?<div className="admin-empty">No Lead Partners in this view.</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PARTNER</th><th>STATUS</th><th>TOTAL LEADS</th><th>PURCHASED</th><th>VERIFIED FAKE</th><th>GENUINE REPORTS</th><th>VERIFIED FAKE RATE</th><th>ACTION</th></tr></thead><tbody>{data.partners.map(row=>{const next=NEXT_STATUS[row.status];return <tr key={row.id}><td><b>{row.user_name||'Partner'}</b><small>{row.user_email||'—'}</small><small>Partner #{row.id}</small></td><td>{row.status}</td><td>{row.total_leads}</td><td>{row.purchased_leads}</td><td>{row.verified_fake_leads}</td><td>{row.verified_genuine_reports}</td><td><b>{Number(row.verified_fake_rate_pct||0).toFixed(2)}%</b></td><td><button onClick={()=>openDetails(row)} style={{marginRight:8}}>View</button>{next&&<button disabled={busy===row.id} onClick={()=>changeStatus(row.id,next)}>{busy===row.id?'Saving…':next==='active'?'Activate':next==='suspended'?'Suspend':'Reactivate'}</button>}</td></tr>})}</tbody></table></div>}

    {selected&&<div style={{position:'fixed',inset:0,background:'rgba(8,24,48,.45)',display:'flex',justifyContent:'flex-end',zIndex:1000}} onClick={()=>setSelected(null)}>
      <aside style={{width:'min(760px,96vw)',height:'100%',background:'#fff',overflow:'auto',padding:24,boxShadow:'-12px 0 40px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}><div><span className="admin-eyebrow">PARTNER ACCOUNT</span><h2 style={{margin:'4px 0'}}>{selected.user_name||'Partner'}</h2><div style={{color:'#66778b'}}>{selected.user_email||'—'} · Partner #{selected.id}</div></div><button onClick={()=>setSelected(null)}>Close</button></div>
        {financialLoading?<div className="admin-loading" style={{marginTop:24}}>Loading financial history…</div>:financials&&<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,marginTop:24}}>
            {[['Gross sales',financials.grossSales],['Available earnings',financials.availableEarnings],['Paid earnings',financials.paidEarnings],['Reversed earnings',financials.reversedEarnings],['Recovery outstanding',financials.recoveryOutstanding]].map(([label,value])=><div key={label} style={{padding:16,border:'1px solid #e1e8f0',borderRadius:12,background:'#f8fbff'}}><div style={{fontSize:12,color:'#6b7a8c',fontWeight:800,textTransform:'uppercase'}}>{label}</div><div style={{fontSize:24,fontWeight:900,color:'#0b2d63',marginTop:5}}>{money(value)}</div></div>)}
          </div>
          {Number(financials.recoveryOutstanding||0)>0&&<div style={{marginTop:14,padding:12,border:'1px solid #f5d48a',borderRadius:10,background:'#fff8e6',color:'#8a5a00'}}>Recovery is being offset against future eligible earnings; it is excluded from the partner's withdrawable balance.</div>}
          <div style={{marginTop:24,fontWeight:900,color:'#173f78'}}>Earnings history</div>
          {!financials.history?.length?<div className="admin-empty" style={{marginTop:10}}>No earning events yet.</div>:<div className="admin-table-wrap" style={{marginTop:10}}><table className="admin-table"><thead><tr><th>DATE</th><th>LEAD</th><th>SALE</th><th>COMMISSION</th><th>EARNING</th><th>RECOVERY USED</th><th>STATUS</th></tr></thead><tbody>{financials.history.map(item=><tr key={item.id}><td>{item.created_at?new Date(item.created_at).toLocaleString('en-IN'): '—'}</td><td><b>#{item.lead_id}</b><small>{item.industry_name||'—'}{item.city_name?` · ${item.city_name}`:''}</small></td><td>{money(item.gross_sale_amount)}</td><td>{Number(item.commission_percent||0).toFixed(2)}%</td><td><b>{money(item.earning_amount)}</b></td><td>{money(item.recovery_allocated)}</td><td>{item.status}</td></tr>)}</tbody></table></div>}
        </>}
      </aside>
    </div>}
  </section>
}
