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
const defaultRule=()=>({
  name:'',
  isActive:true,
  verificationScope:'any',
  industryId:'',
  stateId:'',
  cityId:'',
  windowDays:7,
  sharedQuantity:1,
  premiumQuantity:0,
  claimExpiryDays:0,
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
    ['allowSingle','Single Buyer','Single Only'],
    ['allowShared','Shared','Shared from start'],
    ['allowAutoRelease','Auto Release','1 → 2 → 3 buyers']
  ]
  return <div className="entitlement-access-block">
    <div className="entitlement-access-head"><div><strong>Buyer access</strong></div></div>
    <div className="entitlement-access-options">
      {options.map(([key,label,note])=><label className={value[key]?'active':''} key={key}>
        <input type="checkbox" checked={Boolean(value[key])} onChange={e=>onChange({...value,[key]:e.target.checked})}/>
        <span><strong>{label}</strong><small>{note}</small></span>
      </label>)}
    </div>
    <label className={`entitlement-exclusive-option ${value.allowExclusive?'active':''}`}>
      <input type="checkbox" checked={Boolean(value.allowExclusive)} onChange={e=>onChange({...value,allowExclusive:e.target.checked})}/>
      <span><strong>Exclusive Early Access</strong><small>Allow access during the exclusive window without Pro.</small></span>
    </label>
  </div>
}

function accessLabels(item,prefix=''){
  const labels=[]
  if(item[`${prefix}allow_single`]!==false)labels.push('Single')
  if(item[`${prefix}allow_shared`]!==false)labels.push('Shared')
  if(item[`${prefix}allow_auto_release`]!==false)labels.push('Auto Release')
  return labels
}

function remainingGrantDays(item){
  if(!item?.expires_at)return 0
  const days=Math.ceil((new Date(item.expires_at).getTime()-Date.now())/86400000)
  return Math.max(1,Number.isFinite(days)?days:1)
}

function verificationLabel(scope){
  if(scope==='verified')return 'Verified'
  if(scope==='unverified')return 'Non-verified'
  return 'Any verification'
}

export default function AdminLeadEntitlements(){
  const [data,setData]=useState(null)
  const [industries,setIndustries]=useState([])
  const [states,setStates]=useState([])
  const [cities,setCities]=useState([])
  const [search,setSearch]=useState('')
  const [businesses,setBusinesses]=useState([])
  const [selectedBusiness,setSelectedBusiness]=useState(null)
  const [grant,setGrant]=useState(defaultGrant)
  const [editingGrant,setEditingGrant]=useState(null)
  const [rule,setRule]=useState(defaultRule)
  const [editingRule,setEditingRule]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [ruleEditorOpen,setRuleEditorOpen]=useState(false)
  const [grantEditorOpen,setGrantEditorOpen]=useState(false)

  async function load(){
    try{
      setLoading(true);setError('')
      setData(await authRequest('/admin/lead-entitlements'))
    }catch(e){setError(e.message||'Failed to load lead entitlements')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[])

  useEffect(()=>{
    let active=true
    Promise.all([
      authRequest('/industries'),
      authRequest('/states'),
      authRequest('/cities')
    ]).then(([industryData,stateData,cityData])=>{
      if(!active)return
      setIndustries(Array.isArray(industryData)?industryData:[])
      setStates(Array.isArray(stateData)?stateData:[])
      setCities(Array.isArray(cityData)?cityData:[])
    }).catch(()=>{})
    return()=>{active=false}
  },[])

  useEffect(()=>{
    if(!grantEditorOpen||editingGrant)return
    let active=true
    const timer=setTimeout(async()=>{
      try{
        const query=new URLSearchParams({search,limit:'30'})
        const response=await authRequest(`/admin/lead-entitlements/businesses?${query}`)
        if(active)setBusinesses(Array.isArray(response?.data)?response.data:[])
      }catch(e){if(active)setError(e.message||'Failed to search verified businesses')}
    },250)
    return()=>{active=false;clearTimeout(timer)}
  },[search,grantEditorOpen,editingGrant])

  function openCreateRule(){
    setEditingRule(null)
    setRule(defaultRule())
    setError('')
    setRuleEditorOpen(true)
  }

  function openEditRule(item){
    setEditingRule(item)
    setRule({
      name:item.name||'',
      isActive:item.is_active!==false,
      verificationScope:item.verification_scope||'any',
      industryId:item.industry_id||'',
      stateId:item.state_id||'',
      cityId:item.city_id||'',
      windowDays:Number(item.window_days||7),
      sharedQuantity:Number(item.shared_quantity||0),
      premiumQuantity:Number(item.premium_quantity||0),
      claimExpiryDays:Number(item.claim_expiry_days||0),
      allowSingle:item.allow_single!==false,
      allowShared:item.allow_shared!==false,
      allowAutoRelease:item.allow_auto_release!==false,
      allowExclusive:Boolean(item.allow_exclusive)
    })
    setError('')
    setRuleEditorOpen(true)
  }

  function closeRuleEditor(){
    setRuleEditorOpen(false)
    setEditingRule(null)
    setRule(defaultRule())
  }

  async function saveRule(){
    if(!rule.name.trim())return setError('Give this registration rule a name.')
    if(rule.isActive&&!hasBuyerAccess(rule))return setError('Enable at least one buyer-access type.')
    if(rule.isActive&&Number(rule.sharedQuantity)<=0&&Number(rule.premiumQuantity)<=0)return setError('Set at least one Basic or Premium lead.')
    try{
      const action=editingRule?`rule-update-${editingRule.id}`:'rule-create'
      setSaving(action);setError('');setMessage('')
      const body=JSON.stringify(rule)
      if(editingRule){
        await authRequest(`/admin/lead-entitlements/rules/${editingRule.id}`,{method:'PUT',body})
        setMessage('Registration rule updated.')
      }else{
        await authRequest('/admin/lead-entitlements/rules',{method:'POST',body})
        setMessage('Registration rule created.')
      }
      closeRuleEditor()
      await load()
    }catch(e){setError(e.message||'Failed to save registration rule')}
    finally{setSaving('')}
  }

  async function deleteRule(item){
    if(!window.confirm(`Delete registration rule “${item.name}”? Existing grants already issued from it will remain.`))return
    try{
      setSaving(`rule-delete-${item.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/rules/${item.id}`,{method:'DELETE'})
      setMessage('Registration rule deleted.')
      if(editingRule?.id===item.id)closeRuleEditor()
      await load()
    }catch(e){setError(e.message||'Failed to delete registration rule')}
    finally{setSaving('')}
  }

  function openCreateGrant(){
    setEditingGrant(null)
    setSelectedBusiness(null)
    setSearch('')
    setGrant(defaultGrant())
    setError('')
    setGrantEditorOpen(true)
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
    setGrantEditorOpen(true)
  }

  function closeGrantEditor(){
    setGrantEditorOpen(false)
    setEditingGrant(null)
    setSelectedBusiness(null)
    setSearch('')
    setGrant(defaultGrant())
  }

  async function saveGrant(){
    if(!editingGrant&&!selectedBusiness)return setError('Choose a verified business first.')
    if(!hasBuyerAccess(grant))return setError('Enable at least one buyer-access type.')
    try{
      const action=editingGrant?`grant-update-${editingGrant.id}`:'grant-create'
      setSaving(action);setError('');setMessage('')
      if(editingGrant){
        await authRequest(`/admin/lead-entitlements/grants/${editingGrant.id}`,{method:'PUT',body:JSON.stringify(grant)})
        setMessage('Entitlement updated.')
      }else{
        await authRequest('/admin/lead-entitlements/grants',{method:'POST',body:JSON.stringify({...grant,userId:selectedBusiness.id})})
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
      setSaving(`grant-delete-${item.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/grants/${item.id}`,{method:'DELETE'})
      setMessage('Entitlement deleted.')
      if(editingGrant?.id===item.id)closeGrantEditor()
      await load()
    }catch(e){setError(e.message||'Failed to delete entitlement')}
    finally{setSaving('')}
  }

  const summary=data?.summary||{}
  const registrationRules=Array.isArray(data?.registrationRules)?data.registrationRules:[]
  const grants=Array.isArray(data?.grants)?data.grants:[]
  const selectedLabel=selectedBusiness?(selectedBusiness.business_name||selectedBusiness.name):''
  const filteredCities=useMemo(()=>{
    if(!rule.stateId)return cities
    return cities.filter(item=>Number(item.state_id)===Number(rule.stateId))
  },[cities,rule.stateId])

  const recentItems=useMemo(()=>{
    const ruleItems=registrationRules.map(item=>({...item,kind:'rule',sort_at:item.updated_at||item.created_at}))
    const grantItems=grants.map(item=>({...item,kind:'grant',sort_at:item.updated_at||item.created_at}))
    return [...ruleItems,...grantItems].sort((a,b)=>new Date(b.sort_at||0)-new Date(a.sort_at||0))
  },[registrationRules,grants])

  return <main className="admin-lead-entitlements">
    <section className="entitlement-hero">
      <div className="entitlement-hero-copy">
        <span>LEAD OPERATIONS / ACCESS CONTROL</span>
        <h1>Lead Entitlements</h1>
      </div>
      <div className={`entitlement-policy-status ${Number(summary.active_registration_rules||0)>0?'enabled':'disabled'}`}>
        <span className="entitlement-policy-icon"><i/></span>
        <div><strong>{Number(summary.active_registration_rules||0)} active rule{Number(summary.active_registration_rules||0)===1?'':'s'}</strong></div>
      </div>
    </section>

    <section className="entitlement-summary-grid">
      <SummaryCard label="Registration rules" value={summary.registration_rules} note="Targeted rules" tone="green"/>
      <SummaryCard label="Active grants" value={summary.active_grants} note="Currently usable" tone="blue"/>
      <SummaryCard label="Manual grants" value={summary.manual_grants} note="Admin-created" tone="orange"/>
      <SummaryCard label="Basic granted" value={summary.shared_granted} note="Basic allowance"/>
      <SummaryCard label="Premium granted" value={summary.premium_granted} note="Premium allowance" tone="purple"/>
      <SummaryCard label="Claims used" value={summary.grant_claims} note="Claims from grants"/>
    </section>

    {error&&<div className="entitlement-alert error">{error}</div>}
    {message&&<div className="entitlement-alert success">{message}</div>}

    <section className="entitlement-action-bar">
      <button className="entitlement-action secondary" type="button" onClick={openCreateRule}>＋ Registration rule</button>
      <button className="entitlement-action primary" type="button" onClick={openCreateGrant}>＋ Business entitlement</button>
    </section>

    <section className="entitlement-panel history entitlement-history-clean">
      <div className="entitlement-panel-head">
        <div><span>ENTITLEMENT HISTORY</span><h2>Recent entitlements</h2></div>
        <small>{recentItems.length} shown</small>
      </div>

      {loading?<div className="entitlement-empty">Loading…</div>:!recentItems.length?<div className="entitlement-empty">No rules or entitlements yet.</div>:<div className="entitlement-card-grid">
        {recentItems.map(item=>{
          if(item.kind==='rule'){
            const targets=[
              verificationLabel(item.verification_scope),
              item.industry_name||'All industries',
              item.city_name||item.state_name||'All locations'
            ]
            const access=accessLabels(item)
            return <article className="entitlement-history-card rule-history-card" key={`rule-${item.id}`}>
              <div className="entitlement-history-card-head">
                <div><span className="history-type rule">Registration rule</span><h3>{item.name}</h3></div>
                <span className={`grant-status ${item.is_active?'active':'disabled'}`}>{item.is_active?'Active':'Disabled'}</span>
              </div>
              <div className="entitlement-target-tags">{targets.map(label=><span key={label}>{label}</span>)}</div>
              <div className="entitlement-card-metrics">
                <div><span>Basic</span><strong>{item.shared_quantity||0}</strong></div>
                <div><span>Premium</span><strong>{item.premium_quantity||0}</strong></div>
                <div><span>Window</span><strong>{item.window_days||0}d</strong></div>
              </div>
              <div className="grant-access-tags card-access">{access.map(label=><span key={label}>{label}</span>)}{item.allow_exclusive&&<span className="exclusive">Exclusive</span>}</div>
              <div className="entitlement-history-card-foot">
                <small>{Number(item.claim_expiry_days||0)===0?'Claimed access: Lifetime':`Claimed access: ${item.claim_expiry_days} days`}</small>
                <div className="entitlement-row-actions">
                  <button className="history-edit" type="button" onClick={()=>openEditRule(item)}>Edit</button>
                  <button className="history-delete" type="button" onClick={()=>deleteRule(item)} disabled={saving===`rule-delete-${item.id}`}>{saving===`rule-delete-${item.id}`?'…':'Delete'}</button>
                </div>
              </div>
            </article>
          }

          const sharedRemaining=Math.max(0,Number(item.shared_quantity||0)-Number(item.used_shared||0))
          const premiumRemaining=Math.max(0,Number(item.premium_quantity||0)-Number(item.used_premium||0))
          const expired=item.expires_at&&new Date(item.expires_at)<=new Date()
          const status=expired?'Expired':'Active'
          const access=accessLabels(item)
          return <article className="entitlement-history-card grant-history-card" key={`grant-${item.id}`}>
            <div className="entitlement-history-card-head">
              <div><span className={`history-type ${item.source==='new_business'?'welcome':'manual'}`}>{item.source==='new_business'?'Registration grant':'Business entitlement'}</span><h3>{item.business_name||item.name}</h3></div>
              <span className={`grant-status ${status.toLowerCase()}`}>{status}</span>
            </div>
            <div className="entitlement-card-subline">#{item.user_id} · {item.email}</div>
            {item.registration_rule_name&&<div className="entitlement-rule-origin">Rule: {item.registration_rule_name}</div>}
            <div className="entitlement-card-metrics">
              <div><span>Basic left</span><strong>{sharedRemaining}</strong><small>{item.used_shared||0}/{item.shared_quantity} used</small></div>
              <div><span>Premium left</span><strong>{premiumRemaining}</strong><small>{item.used_premium||0}/{item.premium_quantity} used</small></div>
              <div><span>Valid</span><strong>{item.expires_at?formatDate(item.expires_at).split(',')[0]:'No expiry'}</strong></div>
            </div>
            <div className="grant-access-tags card-access">{access.map(label=><span key={label}>{label}</span>)}{item.allow_exclusive&&<span className="exclusive">Exclusive</span>}</div>
            <div className="entitlement-history-card-foot">
              <small>{Number(item.claim_expiry_days||0)===0?'Claimed access: Lifetime':`Claimed access: ${item.claim_expiry_days} days`}</small>
              <div className="entitlement-row-actions">
                <button className="history-edit" type="button" onClick={()=>openEditGrant(item)}>Edit</button>
                <button className="history-delete" type="button" onClick={()=>deleteGrant(item)} disabled={saving===`grant-delete-${item.id}`}>{saving===`grant-delete-${item.id}`?'…':'Delete'}</button>
              </div>
            </div>
          </article>
        })}
      </div>}
    </section>

    {ruleEditorOpen&&<div className="entitlement-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeRuleEditor()}}>
      <section className="entitlement-modal entitlement-rule-modal" role="dialog" aria-modal="true" aria-label={editingRule?'Edit registration rule':'Create registration rule'}>
        <div className="entitlement-modal-head">
          <div><span>REGISTRATION RULE</span><h2>{editingRule?'Edit rule':'Create rule'}</h2></div>
          <button type="button" onClick={closeRuleEditor}>×</button>
        </div>
        <div className="entitlement-modal-body">
          <div className="entitlement-form-grid rule-grid">
            <label className="rule-name-field">Rule name<input value={rule.name} maxLength="120" onChange={e=>setRule(v=>({...v,name:e.target.value}))} placeholder="Example: Hyderabad verified interiors"/></label>
            <label>Status<select value={rule.isActive?'active':'disabled'} onChange={e=>setRule(v=>({...v,isActive:e.target.value==='active'}))}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
            <label>Verification<select value={rule.verificationScope} onChange={e=>setRule(v=>({...v,verificationScope:e.target.value}))}><option value="any">Verified + Non-verified</option><option value="verified">Verified only</option><option value="unverified">Non-verified only</option></select></label>
            <label>Industry<select value={rule.industryId} onChange={e=>setRule(v=>({...v,industryId:e.target.value}))}><option value="">All industries</option>{industries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>State<select value={rule.stateId} onChange={e=>setRule(v=>({...v,stateId:e.target.value,cityId:cities.some(city=>Number(city.id)===Number(v.cityId)&&Number(city.state_id)===Number(e.target.value))?v.cityId:''}))}><option value="">All states</option>{states.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>City<select value={rule.cityId} onChange={e=>setRule(v=>({...v,cityId:e.target.value}))}><option value="">All cities</option>{filteredCities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Registration window<div className="entitlement-input-suffix"><input type="number" min="1" max="365" value={rule.windowDays} onChange={e=>setRule(v=>({...v,windowDays:clamp(e.target.value,1,365)}))}/><span>days</span></div></label>
            <label>Basic leads<input type="number" min="0" max="1000" value={rule.sharedQuantity} onChange={e=>setRule(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Premium leads<input type="number" min="0" max="1000" value={rule.premiumQuantity} onChange={e=>setRule(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Claimed access<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={rule.claimExpiryDays} onChange={e=>setRule(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(rule.claimExpiryDays)===0?'Lifetime':'days'}</span></div></label>
          </div>
          <AccessRules value={rule} onChange={setRule}/>
          <div className="rule-priority-note">If multiple rules match, the most specific rule wins. Registration rules do not stack.</div>
        </div>
        <div className="entitlement-modal-actions">
          {editingRule&&<button className="danger" type="button" onClick={()=>deleteRule(editingRule)} disabled={saving===`rule-delete-${editingRule.id}`}>Delete</button>}
          <span/>
          <button className="secondary" type="button" onClick={closeRuleEditor}>Cancel</button>
          <button className="primary" type="button" onClick={saveRule} disabled={saving==='rule-create'||String(saving).startsWith('rule-update-')}>{saving?'Saving…':editingRule?'Save changes':'Create rule'}</button>
        </div>
      </section>
    </div>}

    {grantEditorOpen&&<div className="entitlement-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeGrantEditor()}}>
      <section className="entitlement-modal entitlement-grant-modal" role="dialog" aria-modal="true" aria-label={editingGrant?'Edit entitlement':'Create entitlement'}>
        <div className="entitlement-modal-head">
          <div><span>{editingGrant?'EDIT ENTITLEMENT':'NEW ENTITLEMENT'}</span><h2>{editingGrant?'Edit entitlement':'Create business entitlement'}</h2></div>
          <button type="button" onClick={closeGrantEditor}>×</button>
        </div>
        <div className="entitlement-modal-body">
          {editingGrant?<div className="entitlement-selected-business compact"><span>Business</span><strong>{selectedLabel}</strong><small>#{selectedBusiness?.id} · {selectedBusiness?.email}</small></div>:<div className="entitlement-business-picker">
            <label>Verified business<input value={search} onChange={e=>{setSearch(e.target.value);setSelectedBusiness(null)}} placeholder="Search business, name or email…"/></label>
            <div className="entitlement-business-results">
              {businesses.slice(0,8).map(item=><button type="button" className={selectedBusiness?.id===item.id?'selected':''} onClick={()=>{setSelectedBusiness(item);setSearch(item.business_name||item.name)}} key={item.id}>
                <span><strong>{item.business_name||item.name}</strong><small>{item.email}</small></span><b>Verified</b>
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
          {editingGrant&&<button className="danger" type="button" onClick={()=>deleteGrant(editingGrant)} disabled={saving===`grant-delete-${editingGrant.id}`}>Delete</button>}
          <span/>
          <button className="secondary" type="button" onClick={closeGrantEditor}>Cancel</button>
          <button className="primary" type="button" onClick={saveGrant} disabled={(!editingGrant&&!selectedBusiness)||saving==='grant-create'||String(saving).startsWith('grant-update-')}>{saving?'Saving…':editingGrant?'Save changes':'Create entitlement'}</button>
        </div>
      </section>
    </div>}
  </main>
}
