import { useState } from 'react'
import { publicRequest } from '../utils/auth'
import './DirectProjectEnquiryForm.css'

const emptyForm = {
  name: '', phone: '', email: '', serviceType: 'construction',
  location: '', requirement: '', website: '', consent: false,
}
const newKey = () => 'direct_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

export default function DirectProjectEnquiryForm() {
  const [form,setForm] = useState(emptyForm)
  const [key,setKey] = useState(newKey)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [receipt,setReceipt] = useState(null)

  const update = (field,value) => setForm(current => ({...current,[field]:value}))

  async function submit(event) {
    event.preventDefault()
    if(saving || receipt)return
    const phone = form.phone.replace(/\D/g,'')
    if(!/^[6-9]\d{9}$/.test(phone)){setError('Enter a valid 10-digit mobile number.');return}
    if(!form.consent){setError('Please confirm ProPulse may contact you about your direct project enquiry.');return}
    setSaving(true)
    setError('')
    try{
      const result = await publicRequest('/direct-project-enquiries',{
        method:'POST',
        body:JSON.stringify({...form,phone,submissionKey:key}),
      })
      setReceipt(result?.enquiryId || true)
    }catch(err){
      setError(err.message || 'Unable to save your enquiry. Try again or use the contact information above.')
    }finally{
      setSaving(false)
    }
  }

  function reset(){
    setForm(emptyForm)
    setKey(newKey())
    setReceipt(null)
    setError('')
  }

  return <section id="direct-project" className="direct-project-card" aria-labelledby="direct-project-title">
    <div className="direct-project-heading">
      <span>WORK WITH PROPULSE DIRECTLY</span>
      <h2 id="direct-project-title">Request construction or interior services</h2>
      <p>This enquiry goes to the ProPulse team for our own construction or interior execution services. It is <strong>not offered for sale to other contractors</strong>.</p>
    </div>
    {receipt ? <div className="direct-project-confirmation" role="status">
      <strong>Your direct ProPulse enquiry was received.</strong>
      <p>Our team can use the details you provided to discuss your project. Reference: #{String(receipt)}</p>
      <button type="button" onClick={reset}>Send another enquiry</button>
    </div> : <form className="direct-project-form" onSubmit={submit}>
      <label>Full name <input required maxLength={160} autoComplete="name" value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Your name"/></label>
      <label>Mobile number <input required inputMode="tel" autoComplete="tel-national" maxLength={14} value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="10-digit mobile number"/></label>
      <label>Email (optional) <input type="email" maxLength={255} autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="you@example.com"/></label>
      <label>Service required <select value={form.serviceType} onChange={e=>update('serviceType',e.target.value)}>
        <option value="construction">Independent house / other construction</option>
        <option value="interiors">Residential / commercial interiors</option>
      </select></label>
      <label className="direct-project-full">Project locality <input required minLength={2} maxLength={160} value={form.location} onChange={e=>update('location',e.target.value)} placeholder="Example: Uppal, Hyderabad"/></label>
      <label className="direct-project-full">Project requirements <textarea required minLength={10} maxLength={2000} rows={4} value={form.requirement} onChange={e=>update('requirement',e.target.value)} placeholder="Plot size or BHK, area, number of floors, expected work and budget (if known)"/></label>
      <div className="direct-project-honeypot" aria-hidden="true"><label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>update('website',e.target.value)}/></label></div>
      <label className="direct-project-consent direct-project-full">
        <input type="checkbox" checked={form.consent} onChange={e=>update('consent',e.target.checked)}/>
        <span>I agree that ProPulse may contact me about this direct construction or interior enquiry. My details will not be submitted to the professional lead marketplace through this form.</span>
      </label>
      {error&&<p role="alert" className="direct-project-error direct-project-full">{error}</p>}
      <button className="direct-project-submit direct-project-full" type="submit" disabled={saving}>{saving?'Sending enquiry…':'Send Direct Enquiry'}</button>
    </form>}
  </section>
}
