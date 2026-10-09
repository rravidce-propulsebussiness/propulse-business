import { useEffect, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminCallbackInbox.css'


function EnquiryReview({item,kind,onAction,saving}){
  const [pincode,setPincode]=useState('')
  const [consentConfirmed,setConsentConfirmed]=useState(false)
  const [evidence,setEvidence]=useState('')
  const leadId=Number(item.marketplace_lead_id)||null
  const legacy=!leadId&&item.marketplace_sync_status==='not_requested'
  const valid=Boolean(leadId&&item.link_verified)
  const status=String(item.lead_status||'')
  const prices=Array.isArray(item.lead_pricing?.shares)?item.lead_pricing.shares:[]
  const price=Number(prices.find(tier=>Number(tier.shares)===Number(item.lead_capacity))?.normal||0)
  const gateReasons=Array.isArray(item.quality_gate_reasons)?item.quality_gate_reasons:[]
  const working=saving===kind+'-'+item.id
  return <div className="admin-enquiry-review">
    <strong>Marketplace &amp; payment review</strong>
    <p>Request #{item.id} · {leadId?'Lead #'+leadId:'No marketplace lead yet'}</p>
    {!leadId?<p className="admin-enquiry-warning">{legacy?'Legacy request: customer marketplace consent and PIN were not collected. Contact the homeowner before enabling paid access.': 'Lead creation pending. '+(item.marketplace_sync_error||'Check PIN mapping and Lead Pricing, then retry.')}</p>
      :!valid?<p className="admin-enquiry-warning">Linked lead ownership or origin does not match this request. Do not release it; investigate the incorrect link.</p>
      :status==='quarantined'?<p className="admin-enquiry-warning">Quality review required · {item.quality_gate_status||'quarantined'}</p>
      :status==='available'?<p className="admin-enquiry-ready">{price>0?'Ready for Accept & Pay ₹'+price.toLocaleString('en-IN')+' (or free with eligible Pro membership).':'Lead available, but pricing must be configured.'}</p>
      :<p className="admin-enquiry-warning">Lead status: {status||'unavailable'}. Acceptance is currently blocked.</p>}
    {valid&&gateReasons.length>0&&status==='quarantined'&&<div className="admin-enquiry-reasons">{gateReasons.map((reason,index)=><p key={index}>{reason.message||reason.code||String(reason)}</p>)}</div>}
    {legacy&&kind!=='profile'&&<form className="admin-enquiry-legacy" onSubmit={event=>{event.preventDefault();onAction('authorize',kind,item,{pincode,consentConfirmed,evidence:evidence.trim()})}}>
      <label>Verified customer PIN code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit PIN" value={pincode} onChange={event=>setPincode(event.target.value.replace(/\\D/g,'').slice(0,6))} required/></label>
      <label>Evidence of homeowner confirmation<textarea rows={2} maxLength={1000} minLength={12} placeholder="When and how did the homeowner confirm that this request may be shared with marketplace professionals?" value={evidence} onChange={event=>setEvidence(event.target.value)} required/></label>
      <label className="admin-enquiry-consent"><input type="checkbox" checked={consentConfirmed} onChange={event=>setConsentConfirmed(event.target.checked)}/> I personally confirmed the homeowner agrees to marketplace sharing and paid professional access.</label>
      <button type="submit" disabled={working||!/^[0-9]{6}$/.test(pincode)||!consentConfirmed||evidence.trim().length<12}>{working?'Creating lead…':'Verify & create paid lead'}</button>
    </form>}
    <div className="admin-enquiry-actions">
      {!leadId&&!legacy&&<button type="button" disabled={working} onClick={()=>onAction('retry',kind,item)}>{working?'Checking…':'Retry lead creation'}</button>}
      {valid&&status==='quarantined'&&<>
        <button type="button" disabled={working} onClick={()=>onAction('recheck',kind,item)}>{working?'Checking…':'Recheck quality'}</button>
        <button type="button" className="admin-review-override" disabled={working} onClick={()=>onAction('release',kind,item)}>Release after review</button>
      </>}
      {valid&&<a href="/admin/leads">Manage lead</a>}
      <a href="/admin/lead-pricing">Lead pricing</a>
    </div>
  </div>
}

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
  const [feedback,setFeedback]=useState('')
  async function update(id,status){
    setSaving('callback-'+id);setError('');setFeedback('')
    try{
      await authRequest('/admin/expert-callbacks/'+id,{method:'PATCH',body:JSON.stringify({status})})
      setRows(previous=>previous.map(row=>row.id===id?{...row,status}:row))
    }catch(err){setError(err.message||'Unable to update callback')}
    finally{setSaving(null)}
  }
  async function review(action,kind,item,details={}){
    const token=kind+'-'+item.id
    let note=''
    if(action==='release'){
      note=window.prompt('Explain why lead #'+item.marketplace_lead_id+' has passed manual verification. Customer contact stays locked until payment or Pro membership acceptance.')
      if(note===null)return
      if(!note.trim()){setError('An Admin release reason is required.');return}
    }
    setSaving(token);setError('');setFeedback('')
    try{
      let result
      if(action==='retry')result=await authRequest('/admin/project-marketplace/'+kind+'/'+item.id+'/retry',{method:'POST'})
      else if(action==='authorize')result=await authRequest('/admin/project-marketplace/'+kind+'/'+item.id+'/authorize-legacy',{method:'POST',body:JSON.stringify(details)})
      else result=await authRequest('/leads/'+item.marketplace_lead_id+'/quality-gate/'+(action==='release'?'override':'recheck'),{
        method:'POST',body:JSON.stringify(action==='release'?{note:note.trim()}:{})
      })
      if((action==='retry'||action==='authorize')&&result.status==='review_required')setFeedback('Request #'+item.id+' still needs review: '+(result.reason||'check lead pricing or PIN mapping')+'.')
      else setFeedback(action==='authorize'?'Legacy request #'+item.id+' consent verified and marketplace lead creation checked. Verify the resulting status before selling contact access.':action==='retry'?'Marketplace sync checked for request #'+item.id+'.':action==='release'?'Lead #'+item.marketplace_lead_id+' released. The professional can now accept through the normal payment flow.':'Lead #'+item.marketplace_lead_id+' quality rechecked.')
      setLoading(true);setReload(value=>value+1)
    }catch(err){setError(err.message||'Unable to review professional enquiry.')}
    finally{setSaving(null)}
  }
  return <section className="admin-callback-section" aria-labelledby="admin-callback-title">
    <div className="admin-callback-heading"><div><span>CUSTOMER CALLBACKS</span><h2 id="admin-callback-title">Professional Enquiries</h2><p>Admin-only contacts for coordinating profile and project callback requests. Professionals see masked contact details.</p></div><button onClick={()=>{setLoading(true);setReload(v=>v+1)}} type="button">Refresh</button></div>
    {error&&<p className="admin-callback-error" role="alert">{error}</p>}
    {feedback&&<p className="admin-callback-feedback" role="status">{feedback}</p>}
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
          <div className="admin-quote-proposal"><span>Status: {String(item.status||'new').replaceAll('_',' ')}</span>
            <EnquiryReview item={item} kind="quote" onAction={review} saving={saving}/>
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
        <div><label>Status<select value={item.status||'new'} disabled={saving==='callback-'+item.id} onChange={e=>update(item.id,e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label>
        <EnquiryReview item={item} kind={item.project_id?'callback':'profile'} onAction={review} saving={saving}/></div>
      </article>)}</div>}
  </section>
}
