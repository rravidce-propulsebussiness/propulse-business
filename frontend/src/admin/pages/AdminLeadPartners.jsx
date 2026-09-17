import { useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'

const STATUSES = [['','All'],['pending','Pending'],['active','Active'],['suspended','Suspended'],['rejected','Rejected']]
const NEXT_STATUS = { pending:'active', active:'suspended', suspended:'active', rejected:'active' }

export default function AdminLeadPartners(){
  const [status,setStatus]=useState('')
  const [data,setData]=useState({partners:[],pagination:{}})
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(null)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  async function load(){
    try{setLoading(true);setError('');setData(await authRequest(`/admin/lead-partners${status?`?status=${encodeURIComponent(status)}`:''}`))}
    catch(e){setError(e.message||'Failed to load Lead Partners')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[status])

  async function changeStatus(partnerId,nextStatus){
    try{
      setBusy(partnerId);setError('');setMessage('')
      await authRequest(`/admin/lead-partners/${partnerId}/status`,{method:'PATCH',body:JSON.stringify({status:nextStatus})})
      setMessage(`Lead Partner #${partnerId} is now ${nextStatus}.`)
      await load()
    }catch(e){setError(e.message||'Failed to update Lead Partner')}
    finally{setBusy(null)}
  }

  return <section className="admin-page">
    <div className="admin-page-header"><div><span className="admin-eyebrow">PARTNER QUALITY</span><h1>Lead Partners</h1><p>Review partner status and verified lead-quality history. Partner uploads remain automatic; this page does not add an upload approval step.</p></div></div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{STATUSES.map(([value,label])=><button key={value} onClick={()=>setStatus(value)} style={{padding:'9px 13px',borderRadius:8,border:'1px solid #d7e1ec',background:status===value?'#0b2d63':'#fff',color:status===value?'#fff':'#173f78',fontWeight:800,cursor:'pointer'}}>{label}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}{message&&<div className="admin-success">{message}</div>}
    <div style={{marginBottom:12,fontSize:13,color:'#5d6b7b'}}>Fake rate = verified-fake partner leads ÷ distinct partner leads with at least one completed purchase (paid or later refunded after verification).</div>
    {loading?<div className="admin-loading">Loading Lead Partners…</div>:!data.partners?.length?<div className="admin-empty">No Lead Partners in this view.</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PARTNER</th><th>STATUS</th><th>TOTAL LEADS</th><th>PURCHASED</th><th>VERIFIED FAKE</th><th>GENUINE REPORTS</th><th>VERIFIED FAKE RATE</th><th>ACTION</th></tr></thead><tbody>{data.partners.map(row=>{const next=NEXT_STATUS[row.status];return <tr key={row.id}><td><b>{row.user_name||'Partner'}</b><small>{row.user_email||'—'}</small><small>Partner #{row.id}</small></td><td>{row.status}</td><td>{row.total_leads}</td><td>{row.purchased_leads}</td><td>{row.verified_fake_leads}</td><td>{row.verified_genuine_reports}</td><td><b>{Number(row.verified_fake_rate_pct||0).toFixed(2)}%</b></td><td>{next&&<button disabled={busy===row.id} onClick={()=>changeStatus(row.id,next)}>{busy===row.id?'Saving…':next==='active'?'Activate':next==='suspended'?'Suspend':'Reactivate'}</button>}</td></tr>})}</tbody></table></div>}
  </section>
}
