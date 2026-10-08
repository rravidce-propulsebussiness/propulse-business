import { useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminCallbackInbox.css'

export default function AdminCallbackInbox(){
  const [rows,setRows]=useState([])
  const [quoteRows,setQuoteRows]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(null)
  const [reload,setReload]=useState(0)
  useEffect(()=>{
    let active=true
    Promise.all([
      authRequest('/admin/expert-callbacks'),
      authRequest('/admin/professional-quote-leads'),
    ]).then(([callbacks,quotes])=>{
      if(!active)return
      setRows(Array.isArray(callbacks?.data)?callbacks.data:[])
      setQuoteRows(Array.isArray(quotes?.data)?quotes.data:[])
      setError('')
    }).catch(err=>{if(active)setError(err.message||'Unable to load professional enquiries')})
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
    <div className="admin-callback-heading admin-quote-heading"><div><span>PROJECT QUOTATIONS</span><h3>Professional-specific quote leads</h3><p>Only professionals set packages and prices. ProPulse coordinates contact with homeowners when the offer is ready.</p></div></div>
    {loading?<div className="admin-callback-empty">Loading quotation leads…</div>:quoteRows.length===0?<div className="admin-callback-empty">No project-specific quote leads yet.</div>:
      <div className="admin-callback-list">
        {quoteRows.map(item=><article key={'quote-'+item.id} className="admin-callback-row admin-quote-row">
          <div><span>QUOTE LEAD #{item.id} · {item.business_name||'Professional'}</span><h3>{item.customer_name}</h3><p>{item.project_title}</p><small>{new Date(item.created_at).toLocaleString('en-IN')}</small></div>
          <div className="admin-callback-contact">
            <a href={'tel:'+item.customer_phone}>Call {item.customer_phone}</a>
            {item.customer_email&&<a href={'mailto:'+item.customer_email}>{item.customer_email}</a>}
            <p><b>Requirements:</b> {item.requirement}</p>
            {item.site_location&&<p><b>Site:</b> {item.site_location}</p>}
            {item.area_text&&<p><b>Area:</b> {item.area_text}</p>}
            {item.budget_text&&<p><b>Budget:</b> {item.budget_text}</p>}
            {item.preferred_package&&<p><b>Requested plan:</b> {item.preferred_package}</p>}
          </div>
          <div className="admin-quote-proposal"><span>Status: {item.status.replaceAll('_',' ')}</span>
            {item.quoted_package&&<p><b>Professional's plan:</b> {item.quoted_package}</p>}
            {item.quoted_price!=null&&<p><b>Professional's estimate:</b> ₹{Number(item.quoted_price).toLocaleString('en-IN')}</p>}
            {item.quoted_scope&&<p><b>Included scope:</b> {item.quoted_scope}</p>}
            {item.professional_notes&&<p><b>Internal notes:</b> {item.professional_notes}</p>}
            {item.status==='quoted'&&<strong>Ready for customer coordination</strong>}
          </div>
        </article>)}
      </div>}
    <div className="admin-callback-heading"><div><span>CUSTOMER CALLBACKS</span><h3>Callback requests</h3></div></div>
    {loading?<div className="admin-callback-empty">Loading requests…</div>:rows.length===0?<div className="admin-callback-empty">No professional callback requests yet.</div>:
      <div className="admin-callback-list">{rows.map(item=><article key={item.id} className="admin-callback-row">
        <div><span>{item.project_id?'PROJECT':'PROFILE'} · {item.business_name||'Professional'}</span><h3>{item.customer_name}</h3><p>{item.project_title}</p><small>{new Date(item.created_at).toLocaleString('en-IN')}</small></div>
        <div className="admin-callback-contact"><a href={'tel:'+item.customer_phone}>Call {item.customer_phone}</a>{item.customer_email&&<a href={'mailto:'+item.customer_email}>{item.customer_email}</a>}{item.message&&<p>{item.message}</p>}</div>
        <div><label>Status<select value={item.status||'new'} disabled={saving===item.id} onChange={e=>update(item.id,e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label></div>
      </article>)}</div>}
  </section>
}
