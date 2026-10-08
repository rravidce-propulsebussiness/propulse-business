import {useEffect,useState} from 'react'
import {authRequest} from '../utils/auth'
import {formatPublishedPackagePrice} from '../utils/packagePricing'
import './ProfessionalProjectQuotes.css'

const initialDraft=item=>({
  packageName:item.quoted_package||item.preferred_package||'',
  price:item.quoted_price??'',
  scope:item.quoted_scope||'',
  notes:item.professional_notes||'',
})

export default function ProfessionalProjectQuotes({plans=[]}){
  const [requests,setRequests]=useState([])
  const [drafts,setDrafts]=useState({})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const [saving,setSaving]=useState(null)
  const [version,setVersion]=useState(0)
  useEffect(()=>{
    let live=true
    setLoading(true)
    authRequest('/profile/project-quote-requests')
      .then(data=>{
        if(!live)return
        const items=Array.isArray(data?.data)?data.data:[]
        setRequests(items)
        setDrafts(Object.fromEntries(items.map(item=>[item.id,initialDraft(item)])))
        setError('')
      })
      .catch(err=>{if(live)setError(err.message||'Could not load project quotation requests.')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[version])

  const update=(id,key,value)=>{
    setDrafts(previous=>({...previous,[id]:{...(previous[id]||{}),[key]:value}}))
    setFeedback('');setError('')
  }

  async function saveRequest(item,status){
    if(saving!==null)return
    const draft=drafts[item.id]||initialDraft(item)
    if(status==='quoted'&&(!draft.packageName.trim()||!draft.scope.trim()||!Number.isFinite(Number(draft.price))||Number(draft.price)<=0)){
      setError('To submit a final quotation, select a package, enter the total quotation amount, and describe what is included.')
      return
    }
    try{
      setSaving(item.id);setError('');setFeedback('')
      const result=await authRequest('/profile/project-quote-requests/'+encodeURIComponent(item.id),{
        method:'PATCH',
        body:JSON.stringify({
          status,
          packageName:draft.packageName,
          price:draft.price,
          scope:draft.scope,
          notes:draft.notes,
        }),
      })
      setRequests(old=>old.map(req=>req.id===item.id?{
        ...req,...result,status:result.status,quoted_package:result.quoted_package,
        quoted_price:result.quoted_price,quoted_scope:result.quoted_scope,
        professional_notes:result.professional_notes,quoted_at:result.quoted_at,
      }:req))
      setFeedback(status==='quoted'?'Quotation saved. ProPulse Admin has been notified to coordinate delivery.':'Quotation draft saved.')
    }catch(err){setError(err.message||'Unable to save this quotation. Please try again.')}
    finally{setSaving(null)}
  }

  const available=plans.filter(p=>p.isPublished&&p.title)
  return <section className="pqq-panel profile-panel" aria-labelledby="pqq-heading">
    <div className="panel-title"><div><span>PROJECT QUOTES</span><h2 id="pqq-heading">Professional Quote Requests</h2>
      <p>Customers who asked for a price from your completed project pages. Prepare the final scope and quotation here; ProPulse coordinates delivery and keeps customer contact details masked.</p>
    </div><button type="button" onClick={()=>setVersion(v=>v+1)} disabled={loading}>Refresh Requests</button></div>
    {error&&<p className="pqq-alert error" role="alert">{error}</p>}
    {feedback&&<p className="pqq-alert success" role="status">{feedback}</p>}
    {loading?<p className="pqq-loading" role="status">Loading project quote enquiries…</p>:requests.length===0?
      <p className="pqq-empty">No project quotations yet. New Get Quote enquiries will appear here when customers request pricing from a published project.</p>:
      <div className="pqq-grid">{requests.map(item=>{
        const draft=drafts[item.id]||initialDraft(item)
        const selected=available.find(plan=>plan.title===draft.packageName)
        return <article className="pqq-card" key={item.id}>
          <div className="pqq-card-top"><div><span>QUOTATION #{item.id}</span><h3>{item.project_title}</h3></div><span className={'pqq-status status-'+item.status}>{String(item.status||'new').replaceAll('_',' ')}</span></div>
          <p className="pqq-customer">Requested by {item.customer_name} · {item.created_at?new Date(item.created_at).toLocaleString('en-IN'):''}</p>
          <div className="pqq-private">
            <div><strong>Customer phone</strong><span>{item.customer_phone||'Protected'}</span></div>
            {item.customer_email&&<div><strong>Email</strong><span>{item.customer_email}</span></div>}
            <p>Contact details are masked; ProPulse coordinates the response.</p>
          </div>
          <dl className="pqq-details">
            <div><dt>Requested package</dt><dd>{item.preferred_package||'Custom pricing'}</dd></div>
            {item.package_price_from_snapshot!=null&&<div><dt>Published starting rate at request</dt><dd>{formatPublishedPackagePrice(item.package_price_from_snapshot,item.package_price_unit_snapshot)}</dd></div>}
            {item.site_location&&<div><dt>Site location</dt><dd>{item.site_location}</dd></div>}
            {item.area_text&&<div><dt>Customer area</dt><dd>{item.area_text}</dd></div>}
            {item.budget_text&&<div><dt>Budget indicated</dt><dd>{item.budget_text}</dd></div>}
          </dl>
          <div className="pqq-requirement"><strong>Customer requirement</strong><p>{item.requirement}</p></div>
          <div className="pqq-editor">
            <div><label htmlFor={'pqq-package-'+item.id}>Quotation package</label><select id={'pqq-package-'+item.id} value={draft.packageName} onChange={e=>update(item.id,'packageName',e.target.value)}>
              <option value="">Choose package</option>
              {draft.packageName&&!available.some(p=>p.title===draft.packageName)&&<option value={draft.packageName}>{draft.packageName} (previous)</option>}
              {available.map(plan=><option key={plan.id||plan.title} value={plan.title}>{plan.title}</option>)}
              <option value="Custom Project Quotation">Custom Project Quotation</option>
            </select></div>
            <div><label htmlFor={'pqq-price-'+item.id}>Final quoted total (₹)</label><input id={'pqq-price-'+item.id} type="number" min="1" max="9999999999" step="0.01" value={draft.price} onChange={e=>update(item.id,'price',e.target.value)} placeholder="Enter final amount"/></div>
            <div className="pqq-wide"><label htmlFor={'pqq-scope-'+item.id}>Confirmed scope and inclusions</label><textarea id={'pqq-scope-'+item.id} rows={3} maxLength={3000} placeholder="Specify finishes, measured area, materials, exclusions, taxes and unit rates…" value={draft.scope} onChange={e=>update(item.id,'scope',e.target.value)}/></div>
            <div className="pqq-wide"><label htmlFor={'pqq-notes-'+item.id}>Internal notes (optional)</label><textarea id={'pqq-notes-'+item.id} rows={2} maxLength={1500} placeholder="Site visit, questions, follow-up timing…" value={draft.notes} onChange={e=>update(item.id,'notes',e.target.value)}/></div>
          </div>
          {selected?.priceFrom&&<p className="pqq-warning">Profile starting rate: {formatPublishedPackagePrice(selected.priceFrom,selected.priceUnit)}. Enter your separately calculated final total above; the starting rate is not a completed quotation.</p>}
          <div className="pqq-actions"><button type="button" disabled={saving!==null} onClick={()=>saveRequest(item,'in_review')}>{saving===item.id?'Saving…':'Save Draft'}</button><button className="pqq-primary" type="button" disabled={saving!==null} onClick={()=>saveRequest(item,'quoted')}>Submit Final Quote →</button></div>
        </article>
      })}</div>}
  </section>
}
