import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminLeadEntitlements.css'

const formatDate=value=>value?new Date(value).toLocaleString():'No expiry'
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0))

function SummaryCard({label,value,note,tone=''}) {
  return <article className={`ent-summary-card ${tone}`}>
    <span>{label}</span>
    <strong>{Number(value||0).toLocaleString('en-IN')}</strong>
    <small>{note}</small>
  </article>
}

export default function AdminLeadEntitlements(){
  const [data,setData]=useState(null)
  const [settings,setSettings]=useState({
    newBusinessEnabled:false,
    windowDays:7,
    sharedQuantity:1,
    premiumQuantity:0,
    claimExpiryDays:0
  })
  const [search,setSearch]=useState('')
  const [businesses,setBusinesses]=useState([])
  const [selectedBusiness,setSelectedBusiness]=useState(null)
  const [grant,setGrant]=useState({sharedQuantity:1,premiumQuantity:0,validDays:30,claimExpiryDays:0,notes:''})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  async function load(){
    try{
      setLoading(true);setError('')
      const response=await authRequest('/admin/lead-entitlements')
      setData(response)
      const value=response?.settings||{}
      setSettings({
        newBusinessEnabled:Boolean(value.new_business_enabled),
        windowDays:Number(value.new_business_window_days||7),
        sharedQuantity:Number(value.new_business_shared_quantity||0),
        premiumQuantity:Number(value.new_business_premium_quantity||0),
        claimExpiryDays:Number(value.claim_expiry_days||0)
      })
    }catch(e){setError(e.message||'Failed to load lead entitlements')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[])

  useEffect(()=>{
    let active=true
    const timer=setTimeout(async()=>{
      try{
        const query=new URLSearchParams({search,limit:'30'})
        const response=await authRequest(`/admin/lead-entitlements/businesses?${query}`)
        if(active)setBusinesses(Array.isArray(response?.data)?response.data:[])
      }catch(e){if(active)setError(e.message||'Failed to search verified businesses')}
    },250)
    return()=>{active=false;clearTimeout(timer)}
  },[search])

  async function saveSettings(){
    try{
      setSaving('settings');setError('');setMessage('')
      const saved=await authRequest('/admin/lead-entitlements/settings',{
        method:'PUT',
        body:JSON.stringify(settings)
      })
      setSettings({
        newBusinessEnabled:Boolean(saved.new_business_enabled),
        windowDays:Number(saved.new_business_window_days||7),
        sharedQuantity:Number(saved.new_business_shared_quantity||0),
        premiumQuantity:Number(saved.new_business_premium_quantity||0),
        claimExpiryDays:Number(saved.claim_expiry_days||0)
      })
      setMessage('New verified business entitlement settings saved.')
      await load()
    }catch(e){setError(e.message||'Failed to save entitlement settings')}
    finally{setSaving('')}
  }

  async function createGrant(){
    if(!selectedBusiness)return setError('Choose a verified business first.')
    try{
      setSaving('grant');setError('');setMessage('')
      await authRequest('/admin/lead-entitlements/grants',{
        method:'POST',
        body:JSON.stringify({...grant,userId:selectedBusiness.id})
      })
      setMessage(`Lead entitlement granted to ${selectedBusiness.business_name||selectedBusiness.name}.`)
      setSelectedBusiness(null)
      setSearch('')
      setGrant({sharedQuantity:1,premiumQuantity:0,validDays:30,claimExpiryDays:0,notes:''})
      await load()
    }catch(e){setError(e.message||'Failed to grant lead entitlement')}
    finally{setSaving('')}
  }

  async function revoke(id){
    if(!window.confirm('Revoke this entitlement grant? Already claimed leads will remain in the business account.'))return
    try{
      setSaving(`revoke-${id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/grants/${id}/revoke`,{method:'PATCH',body:'{}'})
      setMessage('Entitlement grant revoked.')
      await load()
    }catch(e){setError(e.message||'Failed to revoke entitlement grant')}
    finally{setSaving('')}
  }

  const summary=data?.summary||{}
  const grants=Array.isArray(data?.grants)?data.grants:[]
  const selectedLabel=selectedBusiness?(selectedBusiness.business_name||selectedBusiness.name):''
  const welcomeDescription=useMemo(()=>{
    const basic=Number(settings.sharedQuantity||0)
    const premium=Number(settings.premiumQuantity||0)
    const parts=[]
    if(basic)parts.push(`${basic} Basic`)
    if(premium)parts.push(`${premium} Premium`)
    return parts.length?parts.join(' + '):'No lead quantity'
  },[settings.sharedQuantity,settings.premiumQuantity])

  return <main className="admin-lead-entitlements">
    <section className="entitlement-summary-grid">
      <SummaryCard label="Active grants" value={summary.active_grants} note="Currently usable manual + welcome grants" tone="blue"/>
      <SummaryCard label="Welcome grants" value={summary.welcome_grants} note="Issued once to eligible verified businesses" tone="green"/>
      <SummaryCard label="Manual grants" value={summary.manual_grants} note="Entitlements issued directly by Admin" tone="orange"/>
      <SummaryCard label="Basic granted" value={summary.shared_granted} note="Total Basic/shared lead allowance"/>
      <SummaryCard label="Premium granted" value={summary.premium_granted} note="Total Premium lead allowance" tone="purple"/>
      <SummaryCard label="Claims used" value={summary.grant_claims} note="Leads claimed using these grants"/>
    </section>

    {error&&<div className="entitlement-alert error">{error}</div>}
    {message&&<div className="entitlement-alert success">{message}</div>}

    <section className="entitlement-panel welcome">
      <div className="entitlement-panel-head">
        <div>
          <span>NEW VERIFIED BUSINESS</span>
          <h2>Registration entitlement</h2>
          <p>One-time lead credits available only to verified business accounts during their first configured registration days.</p>
        </div>
        <label className="entitlement-toggle">
          <input type="checkbox" checked={settings.newBusinessEnabled} onChange={e=>setSettings(v=>({...v,newBusinessEnabled:e.target.checked}))}/>
          <span>{settings.newBusinessEnabled?'Enabled':'Disabled'}</span>
        </label>
      </div>

      <div className="entitlement-rule">
        <div className="entitlement-rule-icon">✓</div>
        <div>
          <strong>{welcomeDescription}</strong>
          <span>Once per verified business · usable only within first {settings.windowDays} registration day{Number(settings.windowDays)===1?'':'s'}</span>
        </div>
      </div>

      <div className="entitlement-form-grid welcome-grid">
        <label>Registration window
          <div className="entitlement-input-suffix"><input type="number" min="1" max="365" value={settings.windowDays} onChange={e=>setSettings(v=>({...v,windowDays:clamp(e.target.value,1,365)}))}/><span>days</span></div>
        </label>
        <label>Basic leads
          <input type="number" min="0" max="1000" value={settings.sharedQuantity} onChange={e=>setSettings(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/>
        </label>
        <label>Premium leads
          <input type="number" min="0" max="1000" value={settings.premiumQuantity} onChange={e=>setSettings(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/>
        </label>
        <label>Claim access expiry
          <div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={settings.claimExpiryDays} onChange={e=>setSettings(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(settings.claimExpiryDays)===0?'Never':'days'}</span></div>
        </label>
      </div>

      <div className="entitlement-info-strip">
        <span>Verified only</span>
        <span>One-time only</span>
        <span>Window starts at registration</span>
        <span>Existing buyer-capacity/profile rules still apply</span>
      </div>

      <div className="entitlement-actions"><button className="primary" onClick={saveSettings} disabled={saving==='settings'}>{saving==='settings'?'Saving…':'Save registration entitlement'}</button></div>
    </section>

    <section className="entitlement-panel">
      <div className="entitlement-panel-head">
        <div>
          <span>MANUAL ENTITLEMENT</span>
          <h2>Grant leads to a verified business</h2>
          <p>Give extra Basic or Premium lead credits without creating or changing a membership.</p>
        </div>
      </div>

      <div className="entitlement-business-picker">
        <label>Find verified business
          <input value={search} onChange={e=>{setSearch(e.target.value);setSelectedBusiness(null)}} placeholder="Search business name, user name or email…"/>
        </label>
        <div className="entitlement-business-results">
          {businesses.slice(0,8).map(item=><button type="button" className={selectedBusiness?.id===item.id?'selected':''} onClick={()=>{setSelectedBusiness(item);setSearch(item.business_name||item.name)}} key={item.id}>
            <span><strong>{item.business_name||item.name}</strong><small>{item.email}</small></span>
            <b>{item.welcome_issued?'Welcome issued':'Verified'}</b>
          </button>)}
          {!businesses.length&&!loading&&<div className="entitlement-empty-search">No verified businesses match this search.</div>}
        </div>
      </div>

      {selectedBusiness&&<div className="entitlement-selected-business"><span>Selected</span><strong>{selectedLabel}</strong><small>#{selectedBusiness.id} · {selectedBusiness.email}</small></div>}

      <div className="entitlement-form-grid grant-grid">
        <label>Basic leads<input type="number" min="0" max="1000" value={grant.sharedQuantity} onChange={e=>setGrant(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
        <label>Premium leads<input type="number" min="0" max="1000" value={grant.premiumQuantity} onChange={e=>setGrant(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
        <label>Grant valid for<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={grant.validDays} onChange={e=>setGrant(v=>({...v,validDays:clamp(e.target.value,0,3650)}))}/><span>{Number(grant.validDays)===0?'No expiry':'days'}</span></div></label>
        <label>Claim access expiry<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={grant.claimExpiryDays} onChange={e=>setGrant(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(grant.claimExpiryDays)===0?'Never':'days'}</span></div></label>
        <label className="notes">Admin note<textarea rows="2" value={grant.notes} maxLength="1000" onChange={e=>setGrant(v=>({...v,notes:e.target.value}))} placeholder="Optional reason or campaign note"/></label>
      </div>

      <div className="entitlement-actions"><button className="primary" onClick={createGrant} disabled={!selectedBusiness||saving==='grant'}>{saving==='grant'?'Granting…':'Grant lead entitlement'}</button></div>
    </section>

    <section className="entitlement-panel history">
      <div className="entitlement-panel-head">
        <div><span>GRANT HISTORY</span><h2>Recent entitlements</h2><p>Usage is counted only for claims made through the specific grant.</p></div>
        <small>{grants.length} shown</small>
      </div>

      {loading?<div className="entitlement-empty">Loading entitlements…</div>:!grants.length?<div className="entitlement-empty">No manual or welcome entitlements have been issued yet.</div>:<div className="entitlement-table-wrap">
        <table className="entitlement-table">
          <thead><tr><th>BUSINESS</th><th>SOURCE</th><th>BASIC</th><th>PREMIUM</th><th>VALIDITY</th><th>STATUS</th><th/></tr></thead>
          <tbody>{grants.map(item=>{
            const sharedRemaining=Math.max(0,Number(item.shared_quantity||0)-Number(item.used_shared||0))
            const premiumRemaining=Math.max(0,Number(item.premium_quantity||0)-Number(item.used_premium||0))
            const expired=item.expires_at&&new Date(item.expires_at)<=new Date()
            const status=item.revoked_at?'Revoked':expired?'Expired':'Active'
            return <tr key={item.id}>
              <td><strong>{item.business_name||item.name}</strong><small>#{item.user_id} · {item.email}</small></td>
              <td><span className={`grant-source ${item.source}`}>{item.source==='new_business'?'New business':'Admin'}</span></td>
              <td><strong>{sharedRemaining}</strong><small>{item.used_shared||0} used / {item.shared_quantity} granted</small></td>
              <td><strong>{premiumRemaining}</strong><small>{item.used_premium||0} used / {item.premium_quantity} granted</small></td>
              <td><strong>{formatDate(item.expires_at)}</strong><small>Claim access: {Number(item.claim_expiry_days||0)===0?'No expiry':`${item.claim_expiry_days} days`}</small></td>
              <td><span className={`grant-status ${status.toLowerCase()}`}>{status}</span></td>
              <td>{!item.revoked_at&&!expired&&<button className="revoke" onClick={()=>revoke(item.id)} disabled={saving===`revoke-${item.id}`}>{saving===`revoke-${item.id}`?'…':'Revoke'}</button>}</td>
            </tr>
          })}</tbody>
        </table>
      </div>}
    </section>
  </main>
}
