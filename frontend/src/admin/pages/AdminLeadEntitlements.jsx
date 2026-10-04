import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminLeadEntitlements.css'

const EMPTY_LIST=Object.freeze([])

const formatDate=value=>value?new Date(value).toLocaleString():'No expiry'
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0))
const defaultAccessRules={
  allowSingle:true,
  allowShared:true,
  allowAutoRelease:true,
  allowExclusive:false
}
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
const defaultCampaign=()=>({
  name:'',
  audienceScope:'all',
  verificationScope:'any',
  userIds:[],
  industryId:'',
  stateId:'',
  cityId:'',
  sharedQuantity:1,
  premiumQuantity:0,
  validDays:30,
  claimExpiryDays:0,
  notes:'',
  ...defaultAccessRules
})
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

function accessLabels(item){
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

function verificationLabel(scope){
  if(scope==='verified')return 'Verified'
  if(scope==='unverified')return 'Non-verified'
  return 'Verified + Non-verified'
}

function locationLabel(item){
  if(item.city_name)return item.city_name
  if(item.state_name)return item.state_name
  return 'All locations'
}

export default function AdminLeadEntitlements(){
  const [data,setData]=useState(null)
  const [industries,setIndustries]=useState([])
  const [states,setStates]=useState([])
  const [cities,setCities]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  const [rule,setRule]=useState(defaultRule)
  const [editingRule,setEditingRule]=useState(null)
  const [ruleEditorOpen,setRuleEditorOpen]=useState(false)

  const [campaign,setCampaign]=useState(defaultCampaign)
  const [editingCampaign,setEditingCampaign]=useState(null)
  const [campaignEditorOpen,setCampaignEditorOpen]=useState(false)
  const [businessSearch,setBusinessSearch]=useState('')
  const [businessResults,setBusinessResults]=useState([])
  const [selectedBusinesses,setSelectedBusinesses]=useState([])

  const [grant,setGrant]=useState(defaultGrant)
  const [editingGrant,setEditingGrant]=useState(null)
  const [grantEditorOpen,setGrantEditorOpen]=useState(false)

  async function load(){
    try{
      setLoading(true);setError('')
      setData(await authRequest('/admin/lead-entitlements'))
    }catch(e){setError(e.message||'Failed to load lead entitlements')}
    finally{setLoading(false)}
  }

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])

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
    if(!campaignEditorOpen||campaign.audienceScope!=='specific_users')return
    let active=true
    const timer=setTimeout(async()=>{
      try{
        const query=new URLSearchParams({search:businessSearch,limit:'50',verification:'any'})
        const response=await authRequest(`/admin/lead-entitlements/businesses?${query}`)
        if(active)setBusinessResults(Array.isArray(response?.data)?response.data:[])
      }catch(e){if(active)setError(e.message||'Failed to load businesses')}
    },220)
    return()=>{active=false;clearTimeout(timer)}
  },[businessSearch,campaignEditorOpen,campaign.audienceScope])

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
      if(editingRule){
        await authRequest(`/admin/lead-entitlements/rules/${editingRule.id}`,{method:'PUT',body:JSON.stringify(rule)})
        setMessage('Registration rule updated.')
      }else{
        await authRequest('/admin/lead-entitlements/rules',{method:'POST',body:JSON.stringify(rule)})
        setMessage('Registration rule created.')
      }
      closeRuleEditor()
      await load()
    }catch(e){setError(e.message||'Failed to save registration rule')}
    finally{setSaving('')}
  }

  async function deleteRule(item){
    if(!window.confirm(`Delete registration rule “${item.name}”? Existing issued credits remain.`))return
    try{
      setSaving(`rule-delete-${item.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/rules/${item.id}`,{method:'DELETE'})
      setMessage('Registration rule deleted.')
      if(editingRule?.id===item.id)closeRuleEditor()
      await load()
    }catch(e){setError(e.message||'Failed to delete registration rule')}
    finally{setSaving('')}
  }

  function openCreateCampaign(){
    setEditingCampaign(null)
    setCampaign(defaultCampaign())
    setSelectedBusinesses([])
    setBusinessResults([])
    setBusinessSearch('')
    setError('')
    setCampaignEditorOpen(true)
  }

  function openEditCampaign(item){
    const users=Array.isArray(item.selected_users)?item.selected_users:[]
    setEditingCampaign(item)
    setSelectedBusinesses(users)
    setCampaign({
      name:item.name||'',
      audienceScope:item.audience_scope||'all',
      verificationScope:item.verification_scope||'any',
      userIds:users.map(user=>Number(user.id)),
      industryId:item.industry_id||'',
      stateId:item.state_id||'',
      cityId:item.city_id||'',
      sharedQuantity:Number(item.shared_quantity||0),
      premiumQuantity:Number(item.premium_quantity||0),
      validDays:Number(item.valid_days||0),
      claimExpiryDays:Number(item.claim_expiry_days||0),
      notes:item.notes||'',
      allowSingle:item.allow_single!==false,
      allowShared:item.allow_shared!==false,
      allowAutoRelease:item.allow_auto_release!==false,
      allowExclusive:Boolean(item.allow_exclusive)
    })
    setBusinessSearch('')
    setBusinessResults([])
    setError('')
    setCampaignEditorOpen(true)
  }

  function closeCampaignEditor(){
    setCampaignEditorOpen(false)
    setEditingCampaign(null)
    setCampaign(defaultCampaign())
    setSelectedBusinesses([])
    setBusinessResults([])
    setBusinessSearch('')
  }

  function toggleCampaignBusiness(item){
    const id=Number(item.id)
    const exists=campaign.userIds.includes(id)
    const userIds=exists?campaign.userIds.filter(value=>value!==id):[...campaign.userIds,id]
    setCampaign(value=>({...value,userIds}))
    setSelectedBusinesses(current=>exists?current.filter(user=>Number(user.id)!==id):[...current,item])
  }

  async function saveCampaign(){
    if(!campaign.name.trim())return setError('Give this business entitlement a name.')
    if(campaign.audienceScope==='specific_users'&&!campaign.userIds.length)return setError('Choose at least one business.')
    if(!hasBuyerAccess(campaign))return setError('Enable at least one buyer-access type.')
    if(Number(campaign.sharedQuantity)<=0&&Number(campaign.premiumQuantity)<=0)return setError('Set at least one Basic or Premium lead.')
    try{
      const action=editingCampaign?`campaign-update-${editingCampaign.id}`:'campaign-create'
      setSaving(action);setError('');setMessage('')
      if(editingCampaign){
        const result=await authRequest(`/admin/lead-entitlements/campaigns/${editingCampaign.id}`,{method:'PUT',body:JSON.stringify(campaign)})
        setMessage(`Business entitlement updated for ${Number(result?.recipientCount||0).toLocaleString('en-IN')} matching businesses.`)
      }else{
        const result=await authRequest('/admin/lead-entitlements/campaigns',{method:'POST',body:JSON.stringify(campaign)})
        setMessage(`Business entitlement created for ${Number(result?.recipientCount||0).toLocaleString('en-IN')} matching businesses.`)
      }
      closeCampaignEditor()
      await load()
    }catch(e){setError(e.message||'Failed to save business entitlement')}
    finally{setSaving('')}
  }

  async function deleteCampaign(item){
    if(!window.confirm(`Delete business entitlement “${item.name}”? Unused credits will be removed; already claimed lead access remains in history.`))return
    try{
      setSaving(`campaign-delete-${item.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/campaigns/${item.id}`,{method:'DELETE'})
      setMessage('Business entitlement deleted.')
      if(editingCampaign?.id===item.id)closeCampaignEditor()
      await load()
    }catch(e){setError(e.message||'Failed to delete business entitlement')}
    finally{setSaving('')}
  }

  function openEditGrant(item){
    setEditingGrant(item)
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
    setGrant(defaultGrant())
  }

  async function saveGrant(){
    if(!editingGrant)return
    if(!hasBuyerAccess(grant))return setError('Enable at least one buyer-access type.')
    try{
      setSaving(`grant-update-${editingGrant.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/grants/${editingGrant.id}`,{method:'PUT',body:JSON.stringify(grant)})
      setMessage('Direct entitlement updated.')
      closeGrantEditor()
      await load()
    }catch(e){setError(e.message||'Failed to update entitlement')}
    finally{setSaving('')}
  }

  async function deleteGrant(item){
    if(!window.confirm(`Delete this direct entitlement for ${item.business_name||item.name}?`))return
    try{
      setSaving(`grant-delete-${item.id}`);setError('');setMessage('')
      await authRequest(`/admin/lead-entitlements/grants/${item.id}`,{method:'DELETE'})
      setMessage('Direct entitlement deleted.')
      if(editingGrant?.id===item.id)closeGrantEditor()
      await load()
    }catch(e){setError(e.message||'Failed to delete entitlement')}
    finally{setSaving('')}
  }

  const summary=data?.summary||{}
  const registrationRules=Array.isArray(data?.registrationRules)?data.registrationRules:EMPTY_LIST
  const businessCampaigns=Array.isArray(data?.businessCampaigns)?data.businessCampaigns:EMPTY_LIST
  const grants=Array.isArray(data?.grants)?data.grants:EMPTY_LIST

  const ruleCities=useMemo(()=>{
    if(!rule.stateId)return cities
    return cities.filter(item=>Number(item.state_id)===Number(rule.stateId))
  },[cities,rule.stateId])

  const campaignCities=useMemo(()=>{
    if(!campaign.stateId)return cities
    return cities.filter(item=>Number(item.state_id)===Number(campaign.stateId))
  },[cities,campaign.stateId])

  const recentItems=useMemo(()=>{
    const ruleItems=registrationRules.map(item=>({...item,kind:'rule',sort_at:item.updated_at||item.created_at}))
    const campaignItems=businessCampaigns.map(item=>({...item,kind:'campaign',sort_at:item.updated_at||item.created_at}))
    const grantItems=grants.map(item=>({...item,kind:'grant',sort_at:item.updated_at||item.created_at}))
    return [...ruleItems,...campaignItems,...grantItems].sort((a,b)=>new Date(b.sort_at||0)-new Date(a.sort_at||0))
  },[registrationRules,businessCampaigns,grants])

  return <main className="admin-lead-entitlements">
    <section className="entitlement-hero">
      <div className="entitlement-hero-copy">
        <span>LEAD OPERATIONS / ACCESS CONTROL</span>
        <h1>Lead Entitlements</h1>
      </div>
      <div className={`entitlement-policy-status ${Number(summary.active_registration_rules||0)>0?'enabled':'disabled'}`}>
        <span className="entitlement-policy-icon"><i/></span>
        <div><strong>{Number(summary.active_registration_rules||0)} registration rule{Number(summary.active_registration_rules||0)===1?'':'s'}</strong></div>
      </div>
    </section>

    <section className="entitlement-summary-grid">
      <SummaryCard label="Registration rules" value={summary.registration_rules} note="New-user targeting" tone="green"/>
      <SummaryCard label="Business entitlements" value={summary.business_campaigns} note="Audience campaigns" tone="orange"/>
      <SummaryCard label="Active grants" value={summary.active_grants} note="Currently usable" tone="blue"/>
      <SummaryCard label="Basic granted" value={summary.shared_granted} note="Basic allowance"/>
      <SummaryCard label="Premium granted" value={summary.premium_granted} note="Premium allowance" tone="purple"/>
      <SummaryCard label="Claims used" value={summary.grant_claims} note="Claims from grants"/>
    </section>

    {error&&<div className="entitlement-alert error">{error}</div>}
    {message&&<div className="entitlement-alert success">{message}</div>}

    <section className="entitlement-action-bar">
      <button className="entitlement-action secondary" type="button" onClick={openCreateRule}>＋ Registration rule</button>
      <button className="entitlement-action primary" type="button" onClick={openCreateCampaign}>＋ Business entitlement</button>
    </section>

    <section className="entitlement-panel history entitlement-history-clean">
      <div className="entitlement-panel-head">
        <div><span>ENTITLEMENT HISTORY</span><h2>Recent entitlements</h2></div>
        <small>{recentItems.length} shown</small>
      </div>

      {loading?<div className="entitlement-empty">Loading…</div>:!recentItems.length?<div className="entitlement-empty">No rules or entitlements yet.</div>:<div className="entitlement-card-grid">
        {recentItems.map(item=>{
          if(item.kind==='rule'){
            const targets=[verificationLabel(item.verification_scope),item.industry_name||'All industries',locationLabel(item)]
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

          if(item.kind==='campaign'){
            const audience=item.audience_scope==='specific_users'
              ?`${Number(item.selected_user_count||0)} selected businesses`
              :'All businesses'
            const targets=[audience,verificationLabel(item.verification_scope),item.industry_name||'All industries',locationLabel(item)]
            const access=accessLabels(item)
            return <article className="entitlement-history-card campaign-history-card" key={`campaign-${item.id}`}>
              <div className="entitlement-history-card-head">
                <div><span className="history-type campaign">Business entitlement</span><h3>{item.name}</h3></div>
                <span className="grant-status active">{Number(item.active_recipient_count||0)} active</span>
              </div>
              <div className="entitlement-target-tags">{targets.map(label=><span key={label}>{label}</span>)}</div>
              <div className="entitlement-card-metrics">
                <div><span>Basic</span><strong>{item.shared_quantity||0}</strong></div>
                <div><span>Premium</span><strong>{item.premium_quantity||0}</strong></div>
                <div><span>Recipients</span><strong>{item.recipient_count||0}</strong></div>
              </div>
              <div className="grant-access-tags card-access">{access.map(label=><span key={label}>{label}</span>)}{item.allow_exclusive&&<span className="exclusive">Exclusive</span>}</div>
              <div className="entitlement-history-card-foot">
                <small>{Number(item.valid_days||0)===0?'No grant expiry':`Grant valid: ${item.valid_days} days`} · {Number(item.claim_expiry_days||0)===0?'Claimed access: Lifetime':`Claimed access: ${item.claim_expiry_days} days`}</small>
                <div className="entitlement-row-actions">
                  <button className="history-edit" type="button" onClick={()=>openEditCampaign(item)}>Edit</button>
                  <button className="history-delete" type="button" onClick={()=>deleteCampaign(item)} disabled={saving===`campaign-delete-${item.id}`}>{saving===`campaign-delete-${item.id}`?'…':'Delete'}</button>
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
              <div><span className="history-type manual">Direct entitlement</span><h3>{item.business_name||item.name}</h3></div>
              <span className={`grant-status ${status.toLowerCase()}`}>{status}</span>
            </div>
            <div className="entitlement-card-subline">#{item.user_id} · {item.email}</div>
            <div className="entitlement-card-metrics">
              <div><span>Basic left</span><strong>{sharedRemaining}</strong><small>{item.used_shared||0}/{item.shared_quantity} used</small></div>
              <div><span>Premium left</span><strong>{premiumRemaining}</strong><small>{item.used_premium||0}/{item.premium_quantity} used</small></div>
              <div><span>Valid</span><strong>{item.expires_at?formatDate(item.expires_at).split(',')[0]:'No expiry'}</strong></div>
            </div>
            <div className="grant-access-tags card-access">{access.map(label=><span key={label}>{label}</span>)}{item.allow_exclusive&&<span className="exclusive">Exclusive</span>}</div>
            <div className="entitlement-history-card-foot">
              <small>Legacy direct grant</small>
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
            <label>City<select value={rule.cityId} onChange={e=>setRule(v=>({...v,cityId:e.target.value}))}><option value="">All cities</option>{ruleCities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Registration window<div className="entitlement-input-suffix"><input type="number" min="1" max="365" value={rule.windowDays} onChange={e=>setRule(v=>({...v,windowDays:clamp(e.target.value,1,365)}))}/><span>days</span></div></label>
            <label>Basic leads<input type="number" min="0" max="1000" value={rule.sharedQuantity} onChange={e=>setRule(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Premium leads<input type="number" min="0" max="1000" value={rule.premiumQuantity} onChange={e=>setRule(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Claimed access<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={rule.claimExpiryDays} onChange={e=>setRule(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(rule.claimExpiryDays)===0?'Lifetime':'days'}</span></div></label>
          </div>
          <AccessRules value={rule} onChange={setRule}/>
          <div className="rule-priority-note">If multiple registration rules match, the most specific rule wins.</div>
        </div>
        <div className="entitlement-modal-actions">
          {editingRule&&<button className="danger" type="button" onClick={()=>deleteRule(editingRule)} disabled={saving===`rule-delete-${editingRule.id}`}>Delete</button>}
          <span/>
          <button className="secondary" type="button" onClick={closeRuleEditor}>Cancel</button>
          <button className="primary" type="button" onClick={saveRule} disabled={saving==='rule-create'||String(saving).startsWith('rule-update-')}>{saving?'Saving…':editingRule?'Save changes':'Create rule'}</button>
        </div>
      </section>
    </div>}

    {campaignEditorOpen&&<div className="entitlement-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeCampaignEditor()}}>
      <section className="entitlement-modal entitlement-rule-modal entitlement-campaign-modal" role="dialog" aria-modal="true" aria-label={editingCampaign?'Edit business entitlement':'Create business entitlement'}>
        <div className="entitlement-modal-head">
          <div><span>BUSINESS ENTITLEMENT</span><h2>{editingCampaign?'Edit entitlement':'Create business entitlement'}</h2></div>
          <button type="button" onClick={closeCampaignEditor}>×</button>
        </div>
        <div className="entitlement-modal-body">
          <div className="entitlement-form-grid rule-grid">
            <label className="rule-name-field">Name<input value={campaign.name} maxLength="120" onChange={e=>setCampaign(v=>({...v,name:e.target.value}))} placeholder="Example: Hyderabad interiors bonus"/></label>
            <label>Audience<select value={campaign.audienceScope} onChange={e=>{
              const value=e.target.value
              setCampaign(v=>({...v,audienceScope:value,userIds:value==='all'?[]:v.userIds}))
              if(value==='all')setSelectedBusinesses([])
            }}><option value="all">All business users</option><option value="specific_users">Specific business users</option></select></label>
            <label>Verification<select value={campaign.verificationScope} onChange={e=>setCampaign(v=>({...v,verificationScope:e.target.value}))}><option value="any">Verified + Non-verified</option><option value="verified">Verified only</option><option value="unverified">Non-verified only</option></select></label>
            <label>Industry<select value={campaign.industryId} onChange={e=>setCampaign(v=>({...v,industryId:e.target.value}))}><option value="">All industries</option>{industries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>State<select value={campaign.stateId} onChange={e=>setCampaign(v=>({...v,stateId:e.target.value,cityId:cities.some(city=>Number(city.id)===Number(v.cityId)&&Number(city.state_id)===Number(e.target.value))?v.cityId:''}))}><option value="">All states</option>{states.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>City<select value={campaign.cityId} onChange={e=>setCampaign(v=>({...v,cityId:e.target.value}))}><option value="">All cities</option>{campaignCities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Basic leads<input type="number" min="0" max="1000" value={campaign.sharedQuantity} onChange={e=>setCampaign(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Premium leads<input type="number" min="0" max="1000" value={campaign.premiumQuantity} onChange={e=>setCampaign(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Grant valid for<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={campaign.validDays} onChange={e=>setCampaign(v=>({...v,validDays:clamp(e.target.value,0,3650)}))}/><span>{Number(campaign.validDays)===0?'No expiry':'days'}</span></div></label>
            <label>Claimed access<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={campaign.claimExpiryDays} onChange={e=>setCampaign(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(campaign.claimExpiryDays)===0?'Lifetime':'days'}</span></div></label>
            <label className="notes campaign-notes">Admin note<textarea rows="2" value={campaign.notes} maxLength="1000" onChange={e=>setCampaign(v=>({...v,notes:e.target.value}))} placeholder="Optional note"/></label>
          </div>

          {campaign.audienceScope==='specific_users'&&<div className="campaign-user-picker">
            <label>Specific businesses<input value={businessSearch} onChange={e=>setBusinessSearch(e.target.value)} placeholder="Search business, user or email…"/></label>
            {selectedBusinesses.length>0&&<div className="campaign-selected-users">{selectedBusinesses.map(user=><button type="button" key={user.id} onClick={()=>toggleCampaignBusiness(user)}><span>{user.business_name||user.name}</span><b>×</b></button>)}</div>}
            <div className="campaign-user-results">
              {businessResults.map(item=>{
                const selected=campaign.userIds.includes(Number(item.id))
                return <button className={selected?'selected':''} type="button" key={item.id} onClick={()=>toggleCampaignBusiness(item)}>
                  <span><strong>{item.business_name||item.name}</strong><small>{item.email}</small></span>
                  <b className={item.is_verified?'verified':'unverified'}>{item.is_verified?'Verified':'Non-verified'}</b>
                </button>
              })}
              {!businessResults.length&&<div className="entitlement-empty-search">No business users found.</div>}
            </div>
          </div>}

          <AccessRules value={campaign} onChange={setCampaign}/>
          <div className="rule-priority-note">Saving applies this entitlement to the current matching business users. Editing re-syncs the recipient set safely.</div>
        </div>
        <div className="entitlement-modal-actions">
          {editingCampaign&&<button className="danger" type="button" onClick={()=>deleteCampaign(editingCampaign)} disabled={saving===`campaign-delete-${editingCampaign.id}`}>Delete</button>}
          <span/>
          <button className="secondary" type="button" onClick={closeCampaignEditor}>Cancel</button>
          <button className="primary" type="button" onClick={saveCampaign} disabled={saving==='campaign-create'||String(saving).startsWith('campaign-update-')}>{saving?'Saving…':editingCampaign?'Save changes':'Create entitlement'}</button>
        </div>
      </section>
    </div>}

    {grantEditorOpen&&editingGrant&&<div className="entitlement-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeGrantEditor()}}>
      <section className="entitlement-modal" role="dialog" aria-modal="true" aria-label="Edit direct entitlement">
        <div className="entitlement-modal-head">
          <div><span>DIRECT ENTITLEMENT</span><h2>Edit legacy direct grant</h2></div>
          <button type="button" onClick={closeGrantEditor}>×</button>
        </div>
        <div className="entitlement-modal-body">
          <div className="entitlement-selected-business compact"><span>Business</span><strong>{editingGrant.business_name||editingGrant.name}</strong><small>#{editingGrant.user_id} · {editingGrant.email}</small></div>
          <div className="entitlement-form-grid grant-grid">
            <label>Basic leads<input type="number" min="0" max="1000" value={grant.sharedQuantity} onChange={e=>setGrant(v=>({...v,sharedQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Premium leads<input type="number" min="0" max="1000" value={grant.premiumQuantity} onChange={e=>setGrant(v=>({...v,premiumQuantity:clamp(e.target.value,0,1000)}))}/></label>
            <label>Valid for<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={grant.validDays} onChange={e=>setGrant(v=>({...v,validDays:clamp(e.target.value,0,3650)}))}/><span>{Number(grant.validDays)===0?'No expiry':'days'}</span></div></label>
            <label>Claimed access<div className="entitlement-input-suffix"><input type="number" min="0" max="3650" value={grant.claimExpiryDays} onChange={e=>setGrant(v=>({...v,claimExpiryDays:clamp(e.target.value,0,3650)}))}/><span>{Number(grant.claimExpiryDays)===0?'Lifetime':'days'}</span></div></label>
            <label className="notes">Admin note<textarea rows="2" value={grant.notes} maxLength="1000" onChange={e=>setGrant(v=>({...v,notes:e.target.value}))}/></label>
          </div>
          <AccessRules value={grant} onChange={setGrant}/>
        </div>
        <div className="entitlement-modal-actions">
          <button className="danger" type="button" onClick={()=>deleteGrant(editingGrant)} disabled={saving===`grant-delete-${editingGrant.id}`}>Delete</button>
          <span/>
          <button className="secondary" type="button" onClick={closeGrantEditor}>Cancel</button>
          <button className="primary" type="button" onClick={saveGrant} disabled={String(saving).startsWith('grant-update-')}>{saving?'Saving…':'Save changes'}</button>
        </div>
      </section>
    </div>}
  </main>
}
