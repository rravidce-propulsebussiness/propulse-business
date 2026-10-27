import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminCallbackInbox.css'


function EnquiryReview({item,kind,onAction,saving}){
  const [pincode,setPincode]=useState('')
  const [consentConfirmed,setConsentConfirmed]=useState(false)
  const [evidence,setEvidence]=useState('')
  const [selectedMode,setSelectedMode]=useState(item.access_mode||'member_free_nonmember_paid')
  const leadId=Number(item.marketplace_lead_id)||null
  const legacy=!leadId&&item.marketplace_sync_status==='not_requested'
  const canDeleteTest=kind==='quote'&&!leadId&&item.status==='new'&&!item.quoted_at&&item.quoted_price==null
  const valid=Boolean(leadId&&item.link_verified)
  const status=String(item.lead_status||'')
  const prices=Array.isArray(item.lead_pricing?.shares)?item.lead_pricing.shares:[]
  const price=Number(prices.find(tier=>Number(tier.shares)===Number(item.lead_capacity))?.normal||0)
  const gateReasons=Array.isArray(item.quality_gate_reasons)?item.quality_gate_reasons:[]
  const working=saving===kind+'-'+item.id
  const mode=item.access_mode||'member_free_nonmember_paid'
  const modes=[
    ['free','Free · No payment'],
    ['paid','Paid · Including members'],
    ['member_free_nonmember_paid','Members free · Others pay'],
    ['members_only','Only active members · Free']
  ]
  return <div className="admin-enquiry-review">
    <strong>Marketplace &amp; payment review</strong>
    <p>Request #{item.id} · {leadId?'Lead #'+leadId:'No marketplace lead yet'}</p>
    {!leadId?<p className="admin-enquiry-warning">{legacy?'Legacy request: customer marketplace consent and PIN were not collected. Contact the homeowner before enabling paid access.': 'Lead creation pending. '+(item.marketplace_sync_error||'Check PIN mapping and Lead Pricing, then retry.')}</p>
      :!valid?<p className="admin-enquiry-warning">Linked lead ownership or origin does not match this request. Do not release it; investigate the incorrect link.</p>
      :status==='quarantined'?<p className="admin-enquiry-warning">Quality review required · {item.quality_gate_status||'quarantined'}</p>
      :status==='available'?<p className="admin-enquiry-ready">{mode==='free'?'Ready for free acceptance.':mode==='members_only'?'Reserved for active Pro members (free).':price>0?(mode==='paid'?'Paid acceptance for all professionals.':'Active Pro members free; non-members pay.')+' Current normal lead price ₹'+price.toLocaleString('en-IN')+'.':'Lead available, but paid acceptance requires configured pricing.'}</p>
      :<p className="admin-enquiry-warning">Lead status: {status||'unavailable'}. Acceptance is currently blocked.</p>}
    <div className="admin-enquiry-mode">
      <label htmlFor={'mode-'+kind+'-'+item.id}>Who can accept this enquiry?</label>
      <select id={'mode-'+kind+'-'+item.id} value={selectedMode} onChange={event=>setSelectedMode(event.target.value)} disabled={working||item.access_mode_locked}>
        {modes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" disabled={working||item.access_mode_locked||selectedMode===mode} onClick={()=>onAction('mode',kind,item,{accessMode:selectedMode})}>{working?'Saving…':'Save access rule'}</button>
      {item.access_mode_locked&&<small>Access rule locked: this lead has a purchase, pending payment or acceptance claim.</small>}
      {!item.access_mode_locked&&<small>Applies to the selected professional; customer contact stays protected until acceptance.</small>}
    </div>
    {valid&&gateReasons.length>0&&status==='quarantined'&&<div className="admin-enquiry-reasons">{gateReasons.map((reason,index)=><p key={index}>{reason.message||reason.code||String(reason)}</p>)}</div>}
    {legacy&&kind!=='profile'&&<form className="admin-enquiry-legacy" onSubmit={event=>{event.preventDefault();onAction('authorize',kind,item,{pincode,consentConfirmed,evidence:evidence.trim()})}}>
      <label>Verified customer PIN code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit PIN" value={pincode} onChange={event=>setPincode(event.target.value.replace(/\D/g,'').slice(0,6))} required/></label>
      <label>Homeowner consent record<textarea rows={2} maxLength={1000} minLength={12} placeholder="Example: Customer confirmed sharing during a call on [date]." value={evidence} onChange={event=>setEvidence(event.target.value)} required/>
        <small className={evidence.trim().length>=12?'admin-enquiry-validity ready':'admin-enquiry-validity'}>{evidence.trim().length}/12 minimum characters · Record how you obtained the customer's permission</small>
      </label>
      <label className="admin-enquiry-consent"><input type="checkbox" checked={consentConfirmed} onChange={event=>setConsentConfirmed(event.target.checked)}/> I personally confirmed the homeowner agrees to marketplace sharing and paid professional access.</label>
      <button type="submit" disabled={working||!/^[0-9]{6}$/.test(pincode)||!consentConfirmed||evidence.trim().length<12}>{working?'Creating lead…':'Create Marketplace Lead'}</button>
      <small>Created directly from this quotation with the configured Lead Pricing and normal paid acceptance. No customer number is released until payment or an eligible membership acceptance.</small>
    </form>}
    <div className="admin-enquiry-actions">
      {!leadId&&!legacy&&<button type="button" disabled={working} onClick={()=>onAction('retry',kind,item)}>{working?'Creating…':'Create marketplace lead / Retry'}</button>}
      {canDeleteTest&&<button type="button" className="admin-review-delete" disabled={working} onClick={()=>onAction('delete',kind,item)}>{working?'Working…':'Delete test quotation'}</button>}
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
  const [companySummary,setCompanySummary]=useState([])
  const [companyError,setCompanyError]=useState('')
  const [selectedCompany,setSelectedCompany]=useState('all')
  const [selectedType,setSelectedType]=useState('all')
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(null)
  const [reload,setReload]=useState(0)
  useEffect(()=>{
    let active=true
    Promise.all([
      authRequest('/admin/expert-callbacks'),
      authRequest('/admin/professional-quote-leads'),
      // A separate all-time aggregate avoids undercounting from inbox row limits.
      authRequest('/admin/professional-enquiries/company-summary').catch(()=>null),
    ]).then(([callbacks,quotes,companies])=>{
      if(!active)return
      setRows(Array.isArray(callbacks?.data)?callbacks.data:[])
      setQuoteRows(Array.isArray(quotes?.data)?quotes.data:[])
      setCompanySummary(Array.isArray(companies?.data)?companies.data:[])
      setCompanyError(companies ? '' : 'Company totals unavailable. Request lists below are still available.')
      setError('')
    }).catch(err=>{if(active)setError(err.message||'Unable to load professional enquiries')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[reload])
  const [feedback,setFeedback]=useState('')
  const companyId=item=>String(item.business_user_id||'')
  const matches=item=>{
    if(selectedCompany!=='all'&&companyId(item)!==selectedCompany)return false
    const needle=search.trim().toLowerCase()
    return !needle||[
      item.customer_name,item.business_name,item.project_title,
      item.customer_phone,item.customer_email,item.id,
    ].some(value=>String(value??'').toLowerCase().includes(needle))
  }
  const visibleQuotes=useMemo(()=>quoteRows.filter(matches),[quoteRows,selectedCompany,search])
  const visibleCallbacks=useMemo(()=>rows.filter(matches),[rows,selectedCompany,search])
  const totals=useMemo(()=>companySummary.reduce((total,item)=>({
    received:total.received+Number(item.total_requests||0),
    quotes:total.quotes+Number(item.quote_requests||0),
    callbacks:total.callbacks+Number(item.project_callbacks||0)+Number(item.profile_callbacks||0),
    linked:total.linked+Number(item.linked_marketplace_leads||0),
  }),{received:0,quotes:0,callbacks:0,linked:0}),[companySummary])
  const selectedCompanyName=selectedCompany==='all'?'All companies':
    companySummary.find(item=>String(item.company_id)===selectedCompany)?.business_name||'Selected company'
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
      if(action==='mode'){
        result=await authRequest('/admin/project-marketplace/'+kind+'/'+item.id+'/access-mode',{method:'PATCH',body:JSON.stringify(details)})
      }else if(action==='delete'){
        const typed=window.prompt('Permanently delete this unlinked test quotation? Type its request number ('+item.id+') to confirm. The customer enquiry will disappear from Admin and the professional account.')
        if(typed===null)return
        if(typed.trim()!==String(item.id))throw new Error('Deletion cancelled: quotation number did not match.')
        if(!window.confirm('Permanently delete quotation #'+item.id+'? This cannot be undone.'))return
        result=await authRequest('/admin/professional-quote-leads/'+item.id+'/delete-test',{method:'POST',body:JSON.stringify({confirmationId:item.id})})
      }
      else if(action==='retry')result=await authRequest('/admin/project-marketplace/'+kind+'/'+item.id+'/retry',{method:'POST'})
      else if(action==='authorize')result=await authRequest('/admin/project-marketplace/'+kind+'/'+item.id+'/authorize-legacy',{method:'POST',body:JSON.stringify(details)})
      else result=await authRequest('/leads/'+item.marketplace_lead_id+'/quality-gate/'+(action==='release'?'override':'recheck'),{
        method:'POST',body:JSON.stringify(action==='release'?{note:note.trim()}:{})
      })
      if((action==='retry'||action==='authorize')&&result.status==='review_required')setFeedback('Request #'+item.id+' still needs review: '+(result.reason||'check lead pricing or PIN mapping')+'.')
      else setFeedback(action==='mode'?'Access rule saved for '+kind+' #'+item.id+'.':action==='delete'?'Test quotation #'+item.id+' deleted. Any separate, already-paid marketplace leads were not touched.':action==='authorize'?'Marketplace creation checked for request #'+item.id+'. Verify the resulting quality status before taking payment.':action==='retry'?'Marketplace sync checked for request #'+item.id+'.':action==='release'?'Lead #'+item.marketplace_lead_id+' released. The professional can now accept through the normal payment flow.':'Lead #'+item.marketplace_lead_id+' quality rechecked.')
      setLoading(true);setReload(value=>value+1)
    }catch(err){setError(err.message||'Unable to review professional enquiry.')}
    finally{setSaving(null)}
  }
  return <section className="admin-callback-section admin-enquiry-workspace" aria-labelledby="admin-callback-title">
    <header className="admin-callback-heading admin-enquiry-hero">
      <div><span>LEADS / PROFESSIONAL ENQUIRIES</span>
        <h2 id="admin-callback-title">Professional Enquiries</h2>
        <p>Track requests received by every professional, quotation progress and verified marketplace leads in one place.</p>
      </div>
      <button onClick={()=>{setLoading(true);setReload(value=>value+1)}} disabled={loading} type="button">{loading?'Refreshing…':'↻ Refresh'}</button>
    </header>
    {error&&<p className="admin-callback-error" role="alert">{error}</p>}
    {feedback&&<p className="admin-callback-feedback" role="status">{feedback}</p>}
    {companyError&&<p className="admin-callback-error" role="status">{companyError}</p>}

    <div className="admin-enquiry-metrics" aria-label="All-time professional request totals">
      {[
        ['Total requests',totals.received,'All enquiry types'],
        ['Quote requests',totals.quotes,'Professional project quotations'],
        ['Callbacks',totals.callbacks,'Projects + public profiles'],
        ['Linked leads',totals.linked,'Verified marketplace links'],
      ].map(([label,value,description])=><div className="admin-enquiry-metric" key={label}>
        <small>{label}</small><strong>{loading?'—':companyError?'—':Number(value).toLocaleString('en-IN')}</strong>
        <span>{description}</span>
      </div>)}
    </div>

    <section className="admin-enquiry-companies" aria-label="Company enquiry summary">
      <div className="admin-enquiry-section-head"><div>
        <h3>Requests received by company</h3>
        <p>All-time totals from submitted requests, not just the recent inbox. A verified lead is counted only when its request and professional ownership match.</p>
      </div><span>{companySummary.length} companies</span></div>
      {loading?<p className="admin-callback-empty">Loading company totals…</p>
        :companySummary.length===0?<p className="admin-callback-empty">{companyError?'Could not load company totals.':'No company enquiries received yet.'}</p>
        :<div className="admin-enquiry-company-scroll"><table className="admin-enquiry-company-table">
          <thead><tr><th>Company</th><th>Total requests</th><th>Quotes</th><th>Project callbacks</th><th>Profile callbacks</th><th>Linked leads</th><th>Last 30 days</th><th></th></tr></thead>
          <tbody>{companySummary.map(item=><tr key={item.company_id} className={selectedCompany===String(item.company_id)?'selected':''}>
            <td><strong>{item.business_name}</strong><small>Latest: {item.last_request_at?new Date(item.last_request_at).toLocaleDateString('en-IN'):'—'}</small></td>
            <td><strong>{Number(item.total_requests||0).toLocaleString('en-IN')}</strong></td>
            <td>{Number(item.quote_requests||0).toLocaleString('en-IN')}</td>
            <td>{Number(item.project_callbacks||0).toLocaleString('en-IN')}</td>
            <td>{Number(item.profile_callbacks||0).toLocaleString('en-IN')}</td>
            <td><span className="admin-enquiry-linked">{Number(item.linked_marketplace_leads||0).toLocaleString('en-IN')}</span></td>
            <td>{Number(item.requests_last_30_days||0).toLocaleString('en-IN')}</td>
            <td><button type="button" onClick={()=>{setSelectedCompany(String(item.company_id));setSelectedType('all')}}>View requests</button></td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    <section className="admin-enquiry-inbox" aria-label="Recent professional enquiries">
      <div className="admin-enquiry-section-head"><div>
        <h3>Recent enquiry inbox</h3>
        <p>{selectedCompanyName} · Latest 200 quote requests and 150 callbacks are loaded. Company totals above cover all-time history.</p>
      </div></div>
      <div className="admin-enquiry-tabs" role="group" aria-label="Enquiry type">
        {[
          ['all','All requests',quoteRows.length+rows.length],
          ['quote','Quote requests',quoteRows.length],
          ['callback','Callbacks',rows.length],
        ].map(([value,label,count])=><button key={value} type="button"
          aria-pressed={selectedType===value}
          className={selectedType===value?'active':''}
          onClick={()=>setSelectedType(value)}>{label} <span>{count}</span></button>)}
      </div>
      <div className="admin-enquiry-filters">
        <label><span>Search</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)}
          placeholder="Customer, company, phone or project"/></label>
        <label><span>Company</span><select value={selectedCompany} onChange={event=>setSelectedCompany(event.target.value)}>
          <option value="all">All companies</option>
          {companySummary.map(item=><option key={item.company_id} value={String(item.company_id)}>{item.business_name}</option>)}
        </select></label>
        {(selectedCompany!=='all'||search)&&<button type="button" className="admin-enquiry-reset" onClick={()=>{setSelectedCompany('all');setSearch('')}}>Clear filters</button>}
      </div>

      {(selectedType==='all'||selectedType==='quote')&&<section className="admin-enquiry-kind">
        <div className="admin-enquiry-kind-heading"><h4>Professional quote requests</h4><span>{visibleQuotes.length} shown</span></div>
        {loading?<div className="admin-callback-empty">Loading quotation leads…</div>
          :visibleQuotes.length===0?<div className="admin-callback-empty">No matching project quotation requests.</div>
          :<div className="admin-callback-list">{visibleQuotes.map(item=><article key={'quote-'+item.id} className="admin-callback-row admin-quote-row">
            <div><span>QUOTE #{item.id} · {item.business_name||'Professional'}</span><h3>{item.customer_name}</h3><p>{item.project_title}</p><small>{new Date(item.created_at).toLocaleString('en-IN')}</small></div>
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
              <strong className={item.marketplace_lead_id&&item.link_verified?'admin-enquiry-status-linked':'admin-enquiry-status-pending'}>
                {item.marketplace_lead_id&&item.link_verified?'Marketplace lead #'+item.marketplace_lead_id:
                  'Marketplace lead pending / needs review'}
              </strong>
              {item.quoted_package&&<p><b>Professional's plan:</b> {item.quoted_package}</p>}
              {item.quoted_price!=null&&<p><b>Professional's estimate:</b> ₹{Number(item.quoted_price).toLocaleString('en-IN')}</p>}
              {item.quoted_scope&&<p><b>Included scope:</b> {item.quoted_scope}</p>}
              {item.professional_notes&&<p><b>Internal notes:</b> {item.professional_notes}</p>}
              {item.status==='quoted'&&<strong>Ready for customer coordination</strong>}
              <details className="admin-enquiry-review-details"><summary>Marketplace &amp; payment review</summary>
                <EnquiryReview item={item} kind="quote" onAction={review} saving={saving}/>
              </details>
            </div>
          </article>)}</div>}
      </section>}
      {(selectedType==='all'||selectedType==='callback')&&<section className="admin-enquiry-kind">
        <div className="admin-enquiry-kind-heading"><h4>Callback requests</h4><span>{visibleCallbacks.length} shown</span></div>
        {loading?<div className="admin-callback-empty">Loading callback requests…</div>
          :visibleCallbacks.length===0?<div className="admin-callback-empty">No matching callback requests.</div>
          :<div className="admin-callback-list">{visibleCallbacks.map(item=><article key={'callback-'+item.id} className="admin-callback-row">
            <div><span>{item.project_id?'PROJECT CALLBACK':'PROFILE CALLBACK'} · {item.business_name||'Professional'}</span><h3>{item.customer_name}</h3><p>{item.project_title}</p><small>{new Date(item.created_at).toLocaleString('en-IN')}</small></div>
            <div className="admin-callback-contact">
              <a href={'tel:'+item.customer_phone}>Call {item.customer_phone}</a>
              {item.customer_email&&<a href={'mailto:'+item.customer_email}>{item.customer_email}</a>}
              {Object.entries(item.requirement_fields||{}).filter(([key,value])=>!key.startsWith('_')&&String(value||'').trim()).map(([key,value])=><p key={key}><b>{key}:</b> {String(value)}</p>)}
              {item.message&&<p><b>Additional information:</b> {item.message}</p>}
            </div>
            <div><label>Status<select value={item.status||'new'} disabled={saving==='callback-'+item.id}
              onChange={event=>update(item.id,event.target.value)}>
              <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
            </select></label>
            <strong className={item.marketplace_lead_id&&item.link_verified?'admin-enquiry-status-linked':'admin-enquiry-status-pending'}>
              {item.marketplace_lead_id&&item.link_verified?'Marketplace lead #'+item.marketplace_lead_id:'Marketplace link pending / review'}
            </strong>
            <details className="admin-enquiry-review-details"><summary>Marketplace &amp; payment review</summary>
              <EnquiryReview item={item} kind={item.project_id?'callback':'profile'} onAction={review} saving={saving}/>
            </details></div>
          </article>)}</div>}
      </section>}
    </section>
  </section>
}
