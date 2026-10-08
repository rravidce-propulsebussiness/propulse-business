import { useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminCallbackInbox.css'

export default function AdminCallbackInbox(){
  const [rows,setRows]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(null)
  const [reload,setReload]=useState(0)
  useEffect(()=>{
    let active=true
    authRequest('/admin/expert-callbacks').then(value=>{if(active){setRows(Array.isArray(value?.data)?value.data:[]);setError('')}})
      .catch(err=>{if(active)setError(err.message||'Unable to load callback requests')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[reload])
  async function update(id,status){
    setSaving(id);setError('')
    try{
      await authRequest('/admin/expert-callbacks/'+id,{method:'PATCH',body:JSON.stringify({status})})
      setRows(previous=>previous.map(row=>row.id===id?{...row,status}:row))
    }catch(err){setError(err.message||'Unable to update callback')}
    finally{setSaving(null)}
  }
  return <section className="admin-callback-section" aria-labelledby="admin-callback-title">
    <div className="admin-callback-heading"><div><span>CUSTOMER CALLBACKS</span><h2 id="admin-callback-title">Professional Enquiries</h2><p>Admin-only contacts for coordinating profile and project callback requests. Professionals see masked contact details.</p></div><button onClick={()=>{setLoading(true);setReload(v=>v+1)}} type="button">Refresh</button></div>
    {error&&<p className="admin-callback-error" role="alert">{error}</p>}
    {loading?<div className="admin-callback-empty">Loading requests…</div>:rows.length===0?<div className="admin-callback-empty">No professional callback requests yet.</div>:
      <div className="admin-callback-list">{rows.map(item=><article key={item.id} className="admin-callback-row">
        <div><span>{item.project_id?'PROJECT':'PROFILE'} · {item.business_name||'Professional'}</span><h3>{item.customer_name}</h3><p>{item.project_title}</p><small>{new Date(item.created_at).toLocaleString('en-IN')}</small></div>
        <div className="admin-callback-contact"><a href={'tel:'+item.customer_phone}>Call {item.customer_phone}</a>{item.customer_email&&<a href={'mailto:'+item.customer_email}>{item.customer_email}</a>}{item.message&&<p>{item.message}</p>}</div>
        <div><label>Status<select value={item.status||'new'} disabled={saving===item.id} onChange={e=>update(item.id,e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label></div>
      </article>)}</div>}
  </section>
}
