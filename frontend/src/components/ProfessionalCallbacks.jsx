import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authRequest } from '../utils/auth'
import '../pages/ProfessionalWorkspace.css'

export default function ProfessionalCallbacks(){
  const [requests,setRequests]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [refresh,setRefresh]=useState(0)
  useEffect(()=>{
    let active=true
    authRequest('/profile/project-callbacks')
      .then(response=>{if(active){setRequests(Array.isArray(response?.data)?response.data:[]);setError('')}})
      .catch(err=>{if(active)setError(err.message||'Unable to load callback requests')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[refresh])
  return <section className="pw-callbacks" aria-labelledby="pw-callback-heading">
    <div className="pw-callbacks-heading"><div><span>PRIVATE ENQUIRIES</span><h2 id="pw-callback-heading">Callback Requests</h2><p>Customers who requested a callback from your professional profile or published projects. Contact details remain masked until ProPulse coordinates an introduction.</p></div><div className="pw-links"><button type="button" onClick={()=>{setLoading(true);setRefresh(v=>v+1)}}>Refresh</button><Link to="/profile/brochures">Manage Brochures →</Link></div></div>
    {error&&<p className="pw-error" role="alert">{error}</p>}
    {loading?<div className="pw-callback-empty">Checking callback requests…</div>:requests.length===0?<div className="pw-callback-empty">No callback requests yet. Enquiries from your published projects and professional profile will appear here.</div>:
      <div className="pw-callback-grid">{requests.map(item=><article className="pw-callback-card" key={item.id}>
        <div className="pw-callback-top"><span>{item.project_id?'PROJECT ENQUIRY':'PROFILE ENQUIRY'}</span><small>{new Date(item.created_at).toLocaleString('en-IN')}</small></div>
        <h3>{item.customer_name}</h3><p>{item.project_id?item.project_title:'General professional callback'}</p>
        {item.message&&<blockquote>{item.message}</blockquote>}
        <div className="pw-contact-rows"><div><span>Mobile</span><strong>{item.customer_phone||'Protected'}</strong></div><div><span>Email</span><strong>{item.customer_email||'Not supplied'}</strong></div></div>
        <small className="pw-privacy">Contact information is masked to protect the customer. ProPulse coordinates follow-up.</small>
      </article>)}</div>}
  </section>
}
