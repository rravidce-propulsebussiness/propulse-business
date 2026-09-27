import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminLeadEntitlements.css'

const formatDate=value=>value?new Date(value).toLocaleString():'No expiry'
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0))
const defaultAccessRules={
  allowSingle:true,
  allowShared:true,
  allowAutoRelease:true,
  allowExclusive:false
}
const defaultGrant=()=>({
  sharedQuantity:1,
  premiumQuantity:0,
  validDays:30,
  claimExpiryDays:0,
  notes:'',
  ...defaultAccessRules
})
const hasBuyerAccess=value=>Boolean(value?.allowSingle||value?.allowShared||value?.allowAutoRelease)

function SummaryCard({label,value,note,tone=''}) {
  return <article className={`ent-summary-card ${tone}`}>
    <span>{label}</span>
    <strong>{Number(value||0).toLocaleString('en-IN')}</strong>
    <small>{note}</small>
  </article>
}

function AccessRules({value,onChange}){
  const options=[
    ['allowSingle','Single Buyer','Single Only leads'],
    ['allowShared','Shared','Shared-from-start leads'],
    ['allowAutoRelease','Auto Release','1 → 2 → 3 buyer release leads']
  ]
  return <div className="entitlement-access-block">
    <div className="entitlement-access-head"><div><strong>Eligible buyer access</strong></div></div>
    <div className="entitlement-access-options">
      {options.map(([key,label,note])=><label className={value[key]?'active':''} key={key}>
        <input type="checkbox" checked={Boolean(value[key])} onChange={e=>onChange({...value,[key]:e.target.checked})}/>
        <span><strong>{label}</strong><small>{note}</small></span>
      </label>)}
    </div>
    <label className={`entitlement-exclusive-option ${value.allowExclusive?'active':''}`}>
      <input type="checkbox" checked={Boolean(value.allowExclusive)} onChange={e=>onChange({...value,allowExclusive:e.target.checked})}/>
      <span><strong>Exclusive Early Access</strong><small>Allow this entitlement during the exclusive window without Pro.</small></span>
    </label>
  </div>
}

function grantAccessLabels(item){
  const labels=[]
  if(item.allow_single!==false)labels.push('Single')
  if(item.allow_shared!==false)labels.push('Shared')
  if(item.allow_auto_release!==false)labels.push('Auto Release')
  return labels
}

function remainingGrantDays(item){
  if(!item?.expires_at)return 0
  const days=Math.ceil((new Date(item.expires_at).getTime()-Date.now())/86400000)
  return Math.max(1,Number.isFinite(days)?days:1)
}

export default function AdminLeadEntitlements(){
  const [data,setData]=useState(null)
  const [settings,setSettings]=useState({
    newBusinessEnabled:false,
    windowDays:7,
    sharedQuantity:1,
    premiumQuantity:0,
    claimExpiryDays:0,
    ...defaultAccessRules
  })
  const [search,setSearch]=useState('')
  const [businesses,setBusinesses]=useState([])
  const [selectedBusiness,setSelectedBusiness]=useState(null)
  const [grant,setGrant]=useState(defaultGrant)
  const [editingGrant,setEditingGrant]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [registrationEditorOpen,setRegistrationEditorOpen]=useState(false)
  const [manualEditorOpen,setManualEditorOpen]=useState(false)

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
        claimExpiryDays:Number(value.claim_expiry_days||0),
        allowSingle:value.new_business_allow_single!==false,
        allowShared:value.new_business_allow_shared!==false,
        allowAutoRelease:value.new_business_allow_auto_release!==false,
        allowExclusive:Boolean(value.new_business_allow_exclusive)
      })
    }catch(e){setError(e.message||'Failed to load lead entitlements')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[])

  useEffect(()=>{
    if(!manualEditorOpen||editingGrant)return
    let active=true
    const timer=setTimeout(async()=>{
      try{
        const query=new URLSearchParams({search,limit:'30'})
        const response=await authRequest(`/admin/lead-entitlements/businesses?${query}`)
        if(active)setBusinesses(Array.isArray(response?.data)?response.data:[])
      }catch(e){if(active)setError(e.message||'Failed to search verified businesses')}
    },250)
    return()=>{active=false;clearTimeout(timer)}
  },[search,manualEditorOpen,editingGrant])

  async function saveSettings(){
    if(settings.newBusinessEnabled&&!hasBuyerAccess(settings)){
      setError('Enable at least one buyer-access type: Single Buyer, Shared or Auto Release.')
      return
    }
    try{
      setSaving('settings');setError('');setMessage('')
      await authRequest('/admin/lead-entitlements/settings',{method:'PUT',body:JSON.stringify(settings)})
      setMessage('Registration entitlement saved.')
      await load()
      setRegistrationEditorOpen(false)
    }catch(e){setError(e.message||'Failed to save entitlement settings')}
    finally{setSaving('')}
  }

  async function deleteSettings(){
    if(!window.confirm('Delete the registration entitlement rule? Existing grants already issued to businesses will remain.'))return
    try{
      setSaving('delete-settings');setError('');setMessage('')
      await authRequest('/admin/lead-entitlements/settings',{method:'DELETE'})
      setMessage('Registration entitlement deleted.')
      setRegistrationEditorOpen(false)
      await load()
    }catch(e){setError(e.message||'Failed to delete registration entitlement')}
    finally{setSaving('')}
  }

  function openCreateGrant(){
    setEditingGrant(null)
    setSelectedBusiness(null)
    setSearch('')
    setGrant(defaultGrant())
    setError('')
    setManualEditorOpen(true)
  }

  function openEditGrant(item){
    setEditingGrant(item)
    setSelectedBusiness({
      id:item.user_id,
      name:item.name,
      business_name:item.business_name,
      email:item.email
    })
    setSearch(item.business_name||item.name||'')
    setGrant({
      sharedQuantity:Number(item.shared_quantity||0),
      premiumQuantity:Number(item.premium_quantity||0),
      validDays:remainingGrantDays(item),
      claimExpiryDays:Number(item.claim_expiry_days||0),
      notes:item.notes||'',
      allowSingle:item.allow_single!==false,
      allowShared:item.allow_shared!==false,
      allowAutoRelease:item.allow_auto_release!==false,
      allowExclusive:Boolean(item.allow_exclusive)
    })
    setError('')
    setManualEditorOpen(true)
  }

  function closeGrantEditor(){
    setManualEditorOpen(false)
    setEditingGrant(null)
    setSelectedBusiness(null)
    setSearch('')
    setGrant(defaultGrant())
  }

  async function saveGrant(){
    if(!editingGrant&&!selectedBusiness)return setError('Choose a verified business first.')
    if(!hasBuyerAccess(grant))return setError('Enable at least one buyer-access type: Single Buyer, Shared or Auto Release.')
    try{
      const action=editingGrant?`update-${editingGrant.id}`:'grant'
      setSaving(action);setError('');setMessage('')
      if(editingGrant){
        await authRequest(`/admin/lead-entitlements/grants/${editingGrant.id}`,{
          method:'PUT',
          body:JSON.stringify(grant)
        })
        setMessage('Entitlement updated.')
      }else{
        await authRequest('/admin/lead-entitlements/grants',{
          method:'POST',
          body:JSON.stringify({...grant,userId:selectedBusiness.id})
        })
        setMessage('Entitlement created.')
      }
      closeGrantEditor()
      await load()
    }catch(e){setError(e.message||'Failed to save lead entitlement')}
    finally{setSaving('')}
  }

  async function deleteGrant(item){
    if(!window.confirm(`Delete this entitlement for ${item.business_name||item.name}?`))return
    try{
      setSaving(`delete-${item.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/grants/${item.id}`,{method:'DELETE'})
      setMessage('Entitlement deleted.')
      if(editingGrant?.id===item.id)closeGrantEditor()
      await load()
    }catch(e){setError(e.message||'Failed to delete entitlement')}
    finally{setSaving('')}
  }

  const summary=data?.summary||{}
  const grants=Array.isArray(data?.grants)?data.grants:[]
  const savedRegistration=data?.settings||null
  const registrationAccess=useMemo(()=>{
    if(!savedRegistration)return []
    const labels=[]
    if(savedRegistration.new_business_allow_single!==false)labels.push('Single')
    if(savedRegistration.new_business_allow_shared!==false)labels.push('Shared')
    if(savedRegistration.new_business_allow_auto_release!==false)labels.push('Auto Release')
    return labels
  },[savedRegistration])
  const recentEntitlements=useMemo(()=>{
    const rows=grants.map(item=>({...item,kind:'grant',sort_at:item.updated_at||item.created_at}))
    if(savedRegistration?.updated_at)rows.push({
      id:'registration-policy',
      kind:'policy',
      sort_at:savedRegistration.updated_at
    })
    return rows.sort((a,b)=>new Date(b.sort_at||0)-new Date(a.sort_at||0))
  },[grants,savedRegistration])

  const selectedLabel=selectedBusiness?(selectedBusiness.business_name||selectedBusiness.name):''

  return <main className="admin-lead-entitlements">
    <section className="entitlement-hero">
      <div className="entitlement-hero-copy">
        <span>LEAD OPERATIONS / ACCESS CONTROL</span>
        <h1>Lead Entitlements</h1>
      </div>
      <div className={`entitlement-policy-status ${settings.newBusinessEnabled?'enabled':'disabled'}`}>
        <span className="entitlement-policy-icon"><i/></span>
        <div><strong>{settings.newBusinessEnabled?'Registration rule active':'Registration rule off'}</strong></div>
      </div>
    </section>

    <section className="entitlement-summary-grid">
      <SummaryCard label="Active grants" value={summary.active_grants} note="Currently usable" tone="blue"/>
      <SummaryCard label="Welcome grants" value={summary.welcome_grants} note="Registration grants" tone="green"/>
      <SummaryCard label="Manual grants" value={summary.manual_grants} note="Admin-created grants" tone="orange"/>
      <SummaryCard label="Basic granted" value={summary.shared_granted} note="Basic allowance"/>
      <SummaryCard label="Premium granted" value={summary.premium_granted} note="Premium allowance" tone="purple"/>
      <SummaryCard label="Claims used" value={summary.grant_claims} note="Claims from grants"/>
    </section>

    {error&&<div className="entitlement-alert error">{error}</div>}
    {message&&<div className="entitlement-alert success">{message}</div>}

    <section className="entitlement-action-bar">
      <button className="entitlement-action secondary" type="button" onClick={()=>setRegistrationEditorOpen(true)}>
        {savedRegistration?.updated_at?'Edit registration rule':'Create registration rule'}
      </button>
      <button className="entitlement-action primary" type="button" onClick={openCreateGrant}>＋ Create entitlement</button>
    </section>

    <section className="entitlement-panel history entitlement-history-clean">
      <div className="entitlement-panel-head">
        <div><span>ENTITLEMENT HISTORY</span><h2>Recent entitlements</h2></div>
        <small>{recentEntitlements.length} shown</small>
      </div>

      {loading?<div className="entitlement-empty">Loading…</div>:!recentEntitlements.length?<div className="entitlement-empty">No entitlements yet.</div>:<div className="entitlement-table-wrap">
        <table className="entitlement-table">
          <thead><tr><th>BUSINESS / RULE</th><th>SOURCE</th><th>BASIC</th><th>PREMIUM</th><th>ACCESS</th><th>VALIDITY</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
          <tbody>{recentEntitlements.map(item=>{
            if(item.kind==='policy'){
              const enabled=Boolean(savedRegistration?.new_business_enabled)
              return <tr key="registration-policy" className="entitlement-policy-row">
                <td><strong>New verified businesses</strong><small>Saved {formatDate(savedRegistration.updated_at)}</small></td>
                <td><span className="grant-source policy">Registration</span></td>
                <td><strong>{savedRegistration.new_business_shared_quantity||0}</strong></td>
                <td><strong>{savedRegistration.new_business_premium_quantity||0}</strong></td>
                <td><div className="grant-access-tags">{registrationAccess.map(label=><span key={label}>{label}</span>)}{savedRegistration.new_business_allow_exclusive&&<span className="exclusive">Exclusive</span>}</div></td>
                <td><strong>{savedRegistration.new_business_window_days||0} days</strong><small>{Number(savedRegistration.claim_expiry_days||0)===0?'Lifetime claimed access':`${savedRegistration.claim_expiry_days} days claimed access`}</small></td>
                <td><span className={`grant-status ${enabled?'active':'disabled'}`}>{enabled?'Enabled':'Disabled'}</span></td>
                <td><div className="entitlement-row-actions">
                  <button className="history-edit" type="button" onClick={()=>setRegistrationEditorOpen(true)}>Edit</button>
                  <button className="history-delete" type="button" onClick={deleteSettings} disabled={saving==='delete-settings'}>{saving==='delete-settings'?'…':'Delete'}</button>
                </div></td>
              </tr>
            }

            const sharedRemaining=Math.max(0,Number(item.shared_quantity||0)-Number(item.used_shared||0))
            const premiumRemaining=Math.max(0,Number(item.premium_quantity||0)-Number(item.used_premium||0))
            const expired=item.expires_at&&new Date(item.expires_at)<=new Date()
            const status=expired?'Expired':'Active'
            const access=grantAccessLabels(item)
            return <tr key={`grant-${item.id}`}>
              <td><strong>{item.business_name||item.name}</strong><small>#{item.user_id} · {item.email}</small></td>
              <td><span className={`grant-source ${item.source}`}>{item.source==='new_business'?'Welcome':'Admin'}</span></td>
              <td><strong>{sharedRemaining}</strong><small>{item.used_shared||0}/{item.shared_quantity} used</small></td>
              <td><strong>{premiumRemaining}</strong><small>{item.used_premium||0}/{item.premium_quantity} used</small></td>
              <td><div className="grant-access-tags">{access.map(label=><span key={label}>{label}</span>)}{item.allow_exclusive&&<span className="exclusive">Exclusive</span>}</div></td>
              <td><strong>{formatDate(item.expires_at)}</strong><small>{Number(item.claim_expiry_days||0)===0?'Lifetime claimed access':`${item.claim_expiry_days} days claimed access`}</small></td>
              <td><span className={`grant-status ${status.toLowerCase()}`}>{status}</span></td>
              <td><div className="entitlement-row-actions">
                <button className="history-edit" type="button" onClick={()=>openEditGrant(item)}>Edit</button>
                <button className="history-delete" type="button" onClick={()=>deleteGrant(item)} disabled={saving===`delete-${item.id}`}>{saving===`delete-${item.id}`?'…':'Delete'}</button>
              </div></td>
            </tr>
          })}</tbody>
        </table>
      </div>}
    </section>

    {registrationEditorOpen&&<div className="entitlement-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setRegistrationEditorOpen(false)}}>
      <section className="entitlement-modal" role="dialog" aria-modal="true" aria-label="Registration entitlement">
        <div className="entitlement-modal-head">
          <div><span>REGISTRATION RULE</span><h2>{savedRegistration?.updated_at?'Edit registration rule':'Create registration rule'}</h2></div>
          <button type="button" onClick={()=>setRegistrationEditorOpen(false)}>×</button>
        </div>
        <div className="entitlement-modal-body">
          <label className="entitlement-toggle modal-toggle">
            <input type="checkbox" checked={settings.newBusinessEnabled} onChange={e=>setSettings(v=>({...v,newBusinessEnabled:e.target.checked}))}/>
            <span>{settings.newBusinessEnabled?'Enabled':'Disabled'}</span>
          </label>

          <div className="entitlement-form-grid welcome-grid">
            <label>Registration window<div className="entitlement-input-suffix"><input type="number" min="1" max="365" value={settings.windowDays} onChange={e=>setSettings(v=>({...v,windowDays:clamp(e.target.value,1,365)}))}/><span>days</span></div></label>
            <label>Basic leads<input type="number" min="0" max="1000" value={settings.sharedQuantity} onChange={e=>setSettings(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Premium leads<input type="number" min="0" max="1000" value={settings.premiumQuantity} onChange={e=>setSettings(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Claimed access<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={settings.claimExpiryDays} onChange={e=>setSettings(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(settings.claimExpiryDays)===0?'Lifetime':'days'}</span></div></label>
          </div>

          <AccessRules value={settings} onChange={setSettings}/>
        </div>
        <div className="entitlement-modal-actions">
          {savedRegistration?.updated_at&&<button className="danger" type="button" onClick={deleteSettings} disabled={saving==='delete-settings'}>Delete</button>}
          <span/>
          <button className="secondary" type="button" onClick={()=>setRegistrationEditorOpen(false)}>Cancel</button>
          <button className="primary" type="button" onClick={saveSettings} disabled={saving==='settings'}>{saving==='settings'?'Saving…':'Save'}</button>
        </div>
      </section>
    </div>}

    {manualEditorOpen&&<div className="entitlement-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeGrantEditor()}}>
      <section className="entitlement-modal entitlement-grant-modal" role="dialog" aria-modal="true" aria-label={editingGrant?'Edit entitlement':'Create entitlement'}>
        <div className="entitlement-modal-head">
          <div><span>{editingGrant?'EDIT ENTITLEMENT':'NEW ENTITLEMENT'}</span><h2>{editingGrant?'Edit entitlement':'Create entitlement'}</h2></div>
          <button type="button" onClick={closeGrantEditor}>×</button>
        </div>
        <div className="entitlement-modal-body">
          {editingGrant?<div className="entitlement-selected-business compact"><span>Business</span><strong>{selectedLabel}</strong><small>#{selectedBusiness?.id} · {selectedBusiness?.email}</small></div>:<div className="entitlement-business-picker">
            <label>Verified business<input value={search} onChange={e=>{setSearch(e.target.value);setSelectedBusiness(null)}} placeholder="Search business, name or email…"/></label>
            <div className="entitlement-business-results">
              {businesses.slice(0,8).map(item=><button type="button" className={selectedBusiness?.id===item.id?'selected':''} onClick={()=>{setSelectedBusiness(item);setSearch(item.business_name||item.name)}} key={item.id}>
                <span><strong>{item.business_name||item.name}</strong><small>{item.email}</small></span>
                <b>Verified</b>
              </button>)}
              {!businesses.length&&!loading&&<div className="entitlement-empty-search">No verified businesses found.</div>}
            </div>
          </div>}

          {!editingGrant&&selectedBusiness&&<div className="entitlement-selected-business compact"><span>Selected</span><strong>{selectedLabel}</strong><small>#{selectedBusiness.id} · {selectedBusiness.email}</small></div>}

          <div className="entitlement-form-grid grant-grid">
            <label>Basic leads<input type="number" min="0" max="1000" value={grant.sharedQuantity} onChange={e=>setGrant(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Premium leads<input type="number" min="0" max="1000" value={grant.premiumQuantity} onChange={e=>setGrant(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Valid for<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={grant.validDays} onChange={e=>setGrant(v=>({...v,validDays:clamp(e.target.value,0,3650)}))}/><span>{Number(grant.validDays)===0?'No expiry':'days'}</span></div></label>
            <label>Claimed access<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={grant.claimExpiryDays} onChange={e=>setGrant(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(grant.claimExpiryDays)===0?'Lifetime':'days'}</span></div></label>
            <label className="notes">Admin note<textarea rows="2" value={grant.notes} maxLength="1000" onChange={e=>setGrant(v=>({...v,notes:e.target.value}))} placeholder="Optional note"/></label>
          </div>

          <AccessRules value={grant} onChange={setGrant}/>
        </div>
        <div className="entitlement-modal-actions">
          {editingGrant&&<button className="danger" type="button" onClick={()=>deleteGrant(editingGrant)} disabled={saving===`delete-${editingGrant.id}`}>Delete</button>}
          <span/>
          <button className="secondary" type="button" onClick={closeGrantEditor}>Cancel</button>
          <button className="primary" type="button" onClick={saveGrant} disabled={(!editingGrant&&!selectedBusiness)||saving==='grant'||String(saving).startsWith('update-')}>{saving?'Saving…':editingGrant?'Save changes':'Create'}</button>
        </div>
      </section>
    </div>}
  </main>
}
