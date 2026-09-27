import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import { clearSession, getToken } from '../../utils/auth'
import './AdminCoupons.css'

const PURCHASE_TYPES=[
  {key:'membership',label:'Membership',note:'GROW & SCALE checkout'},
  {key:'lead',label:'Lead purchase',note:'Marketplace leads'},
  {key:'wallet_topup',label:'Wallet top-up',note:'Wallet recharge'}
]
const emptyCoupon=()=>({
  code:'',
  description:'',
  discount_type:'percent',
  discount_value:'',
  max_discount:'',
  min_order_amount:'',
  usage_limit:'',
  per_user_limit:'',
  starts_at:'',
  expires_at:'',
  purchase_types:['membership','lead'],
  user_ids:[],
  industry_ids:[],
  membership_plan_ids:[],
  is_active:true
})
const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const pad=value=>String(value).padStart(2,'0')
const toLocalInput=value=>{
  if(!value)return''
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return''
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const toIso=value=>{
  if(!value)return null
  const date=new Date(value)
  return Number.isNaN(date.getTime())?null:date.toISOString()
}
const validityLabel=item=>{
  if(!item.starts_at&&!item.expires_at)return'Always available'
  const start=item.starts_at?new Date(item.starts_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Now'
  const end=item.expires_at?new Date(item.expires_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'No expiry'
  return `${start} → ${end}`
}
const couponStatus=item=>{
  if(item.is_active===false)return{key:'inactive',label:'Disabled'}
  const now=Date.now()
  const start=item.starts_at?new Date(item.starts_at).getTime():null
  const end=item.expires_at?new Date(item.expires_at).getTime():null
  if(start&&start>now)return{key:'scheduled',label:'Scheduled'}
  if(end&&end<=now)return{key:'expired',label:'Expired'}
  return{key:'active',label:'Active'}
}
const planLabel=plan=>{
  const group=String(plan.plan_group||plan.name||'').toUpperCase()
  const cycle=plan.billing_period||`${plan.billing_months||1} month`
  return `${group} · ${cycle}`
}
const purchaseLabel=types=>{
  const values=Array.isArray(types)?types:[]
  if(!values.length)return'No purchase type'
  return values.map(type=>PURCHASE_TYPES.find(item=>item.key===type)?.label||type).join(' · ')
}

export default function AdminCoupons(){
  const navigate=useNavigate()
  const [coupons,setCoupons]=useState([])
  const [users,setUsers]=useState([])
  const [industries,setIndustries]=useState([])
  const [membershipPlans,setMembershipPlans]=useState([])
  const [form,setForm]=useState(emptyCoupon)
  const [editing,setEditing]=useState(null)
  const [modalOpen,setModalOpen]=useState(false)
  const [search,setSearch]=useState('')
  const [statusFilter,setStatusFilter]=useState('all')
  const [typeFilter,setTypeFilter]=useState('all')
  const [userSearch,setUserSearch]=useState('')
  const [industrySearch,setIndustrySearch]=useState('')
  const [validityMode,setValidityMode]=useState('always')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [copied,setCopied]=useState('')

  const request=useCallback(async(path,options={})=>{
    if(!getToken()){
      clearSession()
      navigate('/login',{replace:true})
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path,options)
  },[navigate])

  const load=useCallback(async()=>{
    try{
      setLoading(true)
      setError('')
      const [couponData,userData,industryData,planData]=await Promise.all([
        request('/coupons?status=all'),
        request('/admin/users?role=business&status=active&pageSize=100'),
        request('/industries'),
        request('/membership-plans')
      ])
      setCoupons(Array.isArray(couponData)?couponData:[])
      setUsers(Array.isArray(userData)?userData:Array.isArray(userData?.data)?userData.data:[])
      setIndustries(Array.isArray(industryData)?industryData:Array.isArray(industryData?.data)?industryData.data:[])
      setMembershipPlans((Array.isArray(planData)?planData:[]).filter(plan=>String(plan.plan_type||'').toLowerCase()==='pro'))
    }catch(e){
      setError(e.message||'Failed to load coupons')
    }finally{
      setLoading(false)
    }
  },[request])

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[load])

  useEffect(()=>{
    if(!modalOpen||userSearch.trim().length<2)return undefined
    let active=true
    const timer=window.setTimeout(async()=>{
      try{
        const params=new URLSearchParams({role:'business',status:'active',pageSize:'30',search:userSearch.trim()})
        const data=await request(`/admin/users?${params}`)
        const results=Array.isArray(data)?data:Array.isArray(data?.data)?data.data:[]
        if(!active)return
        setUsers(current=>{
          const map=new Map(current.map(item=>[Number(item.id),item]))
          results.forEach(item=>map.set(Number(item.id),item))
          return [...map.values()]
        })
      }catch{}
    },220)
    return()=>{active=false;window.clearTimeout(timer)}
  },[modalOpen,userSearch,request])

  useEffect(()=>{
    if(!modalOpen)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=event=>{if(event.key==='Escape'&&!saving)closeModal()}
    window.addEventListener('keydown',onKey)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}
  },[modalOpen,saving])

  const stats=useMemo(()=>{
    let active=0,scheduled=0,expired=0,redemptions=0
    for(const item of coupons){
      const state=couponStatus(item).key
      if(state==='active')active++
      if(state==='scheduled')scheduled++
      if(state==='expired')expired++
      redemptions+=Number(item.redeemed_count||0)
    }
    return{total:coupons.length,active,scheduled,expired,redemptions}
  },[coupons])

  const filtered=useMemo(()=>coupons.filter(item=>{
    const needle=search.trim().toLowerCase()
    const matchesSearch=!needle||String(item.code||'').toLowerCase().includes(needle)||String(item.description||'').toLowerCase().includes(needle)||String(item.target_industries||'').toLowerCase().includes(needle)
    const state=couponStatus(item).key
    const matchesStatus=statusFilter==='all'||state===statusFilter
    const purchaseTypes=Array.isArray(item.purchase_types)?item.purchase_types:JSON.parse(item.purchase_types||'[]')
    const matchesType=typeFilter==='all'||purchaseTypes.includes(typeFilter)
    return matchesSearch&&matchesStatus&&matchesType
  }),[coupons,search,statusFilter,typeFilter])

  const selectedUsers=useMemo(()=>users.filter(user=>form.user_ids.includes(Number(user.id))),[users,form.user_ids])
  const visibleUsers=useMemo(()=>{
    const q=userSearch.trim().toLowerCase()
    return users.filter(user=>{
      if(form.user_ids.includes(Number(user.id)))return false
      if(!q)return true
      return [user.business_name,user.name,user.email,user.phone].some(value=>String(value||'').toLowerCase().includes(q))
    }).slice(0,16)
  },[users,userSearch,form.user_ids])
  const visibleIndustries=useMemo(()=>{
    const q=industrySearch.trim().toLowerCase()
    return industries.filter(item=>!q||String(item.name||'').toLowerCase().includes(q))
  },[industries,industrySearch])
  const plansByGroup=useMemo(()=>({
    grow:membershipPlans.filter(plan=>String(plan.plan_group||'').toLowerCase()==='grow').sort((a,b)=>Number(a.billing_months||1)-Number(b.billing_months||1)),
    scale:membershipPlans.filter(plan=>String(plan.plan_group||'').toLowerCase()==='scale').sort((a,b)=>Number(a.billing_months||1)-Number(b.billing_months||1))
  }),[membershipPlans])

  function closeModal(){
    if(saving)return
    setModalOpen(false)
    setEditing(null)
    setForm(emptyCoupon())
    setValidityMode('always')
    setUserSearch('')
    setIndustrySearch('')
  }
  function openCreate(){
    setEditing(null)
    setForm(emptyCoupon())
    setValidityMode('always')
    setUserSearch('')
    setIndustrySearch('')
    setError('')
    setNotice('')
    setModalOpen(true)
  }
  async function openEdit(item){
    try{
      setError('')
      setNotice('')
      const detail=await request(`/coupons/${item.id}`)
      const purchaseTypes=Array.isArray(detail.purchase_types)?detail.purchase_types:JSON.parse(detail.purchase_types||'[]')
      const planIds=Array.isArray(detail.membership_plan_ids)?detail.membership_plan_ids:JSON.parse(detail.membership_plan_ids||'[]')
      setEditing(detail.id)
      setUsers(current=>{
        const map=new Map(current.map(user=>[Number(user.id),user]))
        ;(detail.users||[]).forEach(user=>{if(!map.has(Number(user.id)))map.set(Number(user.id),user)})
        return [...map.values()]
      })
      setForm({
        ...emptyCoupon(),
        ...detail,
        starts_at:toLocalInput(detail.starts_at),
        expires_at:toLocalInput(detail.expires_at),
        purchase_types:purchaseTypes.filter(type=>PURCHASE_TYPES.some(item=>item.key===type)),
        membership_plan_ids:planIds.map(Number),
        user_ids:(detail.users||[]).map(user=>Number(user.id)),
        industry_ids:(detail.industries||[]).map(industry=>Number(industry.id))
      })
      setValidityMode(detail.starts_at||detail.expires_at?'custom':'always')
      setUserSearch('')
      setIndustrySearch('')
      setModalOpen(true)
    }catch(e){
      setError(e.message||'Failed to load coupon')
    }
  }
  function toggle(field,value){
    setForm(current=>{
      const values=Array.isArray(current[field])?current[field]:[]
      return{...current,[field]:values.includes(value)?values.filter(item=>item!==value):[...values,value]}
    })
  }
  function applyValidity(mode){
    setValidityMode(mode)
    if(mode==='always'){
      setForm(current=>({...current,starts_at:'',expires_at:''}))
      return
    }
    const now=new Date()
    const end=new Date(now)
    if(mode==='today'){
      end.setHours(23,59,59,999)
    }else if(mode==='week'){
      const daysUntilSunday=(7-now.getDay())%7
      end.setDate(end.getDate()+daysUntilSunday)
      end.setHours(23,59,59,999)
    }else{
      end.setDate(end.getDate()+7)
      end.setHours(23,59,0,0)
    }
    setForm(current=>({...current,starts_at:toLocalInput(now),expires_at:toLocalInput(end)}))
  }
  async function save(event){
    event.preventDefault()
    if(saving)return
    if(!form.purchase_types.length)return setError('Choose at least one purchase type.')
    if(validityMode!=='always'&&form.starts_at&&form.expires_at&&new Date(form.expires_at)<=new Date(form.starts_at))return setError('Coupon end time must be after its start time.')
    try{
      setSaving(true)
      setError('')
      const body={
        ...form,
        code:String(form.code||'').trim().toUpperCase(),
        discount_value:Number(form.discount_value),
        max_discount:form.max_discount===''?null:Number(form.max_discount),
        min_order_amount:Number(form.min_order_amount||0),
        usage_limit:form.usage_limit===''?null:Number(form.usage_limit),
        per_user_limit:form.per_user_limit===''?null:Number(form.per_user_limit),
        starts_at:validityMode==='always'?null:toIso(form.starts_at),
        expires_at:validityMode==='always'?null:toIso(form.expires_at),
        membership_plan_ids:form.purchase_types.includes('membership')?form.membership_plan_ids:[]
      }
      await request(editing?`/coupons/${editing}`:'/coupons',{method:editing?'PATCH':'POST',body:JSON.stringify(body)})
      setNotice(editing?'Coupon updated successfully.':'Coupon created successfully.')
      setModalOpen(false)
      setEditing(null)
      setForm(emptyCoupon())
      setValidityMode('always')
      await load()
    }catch(e){
      setError(e.message||'Failed to save coupon')
    }finally{
      setSaving(false)
    }
  }
  async function toggleActive(item){
    try{
      setError('')
      await request(`/coupons/${item.id}/status`,{method:'PATCH',body:JSON.stringify({isActive:!item.is_active})})
      setNotice(item.is_active?'Coupon disabled.':'Coupon enabled.')
      await load()
    }catch(e){
      setError(e.message||'Failed to update coupon')
    }
  }
  async function remove(item){
    if(!window.confirm(`Delete coupon ${item.code}? Coupons with redemption history cannot be deleted and should be disabled instead.`))return
    try{
      setError('')
      await request(`/coupons/${item.id}`,{method:'DELETE'})
      setNotice(`Coupon ${item.code} deleted.`)
      await load()
    }catch(e){
      setError(e.message||'Failed to delete coupon')
    }
  }
  async function copyCode(code){
    try{
      await navigator.clipboard.writeText(code)
      setCopied(code)
      window.setTimeout(()=>setCopied(current=>current===code?'':current),1300)
    }catch{
      setError('Could not copy coupon code.')
    }
  }

  return <main className="admin-coupons premium-coupons-page">
    <section className="coupon-premium-hero">
      <div className="coupon-hero-copy">
        <span>PROMOTIONS / COUPONS</span>
        <h1>Coupon campaigns</h1>
        <p>Create one coupon rule and control where it works: memberships, leads, wallet top-ups, selected industries, selected businesses or specific GROW/SCALE billing cycles.</p>
      </div>
      <div className="coupon-hero-actions">
        <div className="coupon-hero-live"><i/><div><strong>{stats.active}</strong><span>active now</span></div></div>
        <button type="button" onClick={openCreate}>＋ Create coupon</button>
      </div>
    </section>

    <section className="coupon-kpi-grid">
      <article><div className="coupon-kpi-icon">%</div><div><span>Total coupons</span><strong>{stats.total}</strong><small>Configured campaigns</small></div></article>
      <article className="active"><div className="coupon-kpi-icon">✓</div><div><span>Active now</span><strong>{stats.active}</strong><small>Currently redeemable</small></div></article>
      <article className="scheduled"><div className="coupon-kpi-icon">◷</div><div><span>Scheduled</span><strong>{stats.scheduled}</strong><small>Starts later</small></div></article>
      <article className="redeemed"><div className="coupon-kpi-icon">↗</div><div><span>Redemptions</span><strong>{stats.redemptions}</strong><small>Successful uses</small></div></article>
    </section>

    {error&&<div className="coupon-alert error">{error}</div>}
    {notice&&<div className="coupon-alert success">{notice}</div>}

    <section className="coupon-action-bar">
      <div>
        <strong>Coupon workspace</strong>
        <small>Create at the top; manage existing campaigns below.</small>
      </div>
      <button type="button" onClick={openCreate}>＋ Create coupon</button>
    </section>

    <section className="coupon-panel">
      <div className="coupon-panel-head">
        <div><span>CAMPAIGNS</span><h2>Existing coupons</h2></div>
        <div className="coupon-panel-count">{filtered.length} shown</div>
      </div>

      <div className="coupon-toolbar">
        <label className="coupon-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code, description or industry…"/></label>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="inactive">Disabled</option>
        </select>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="all">All purchase types</option>
          {PURCHASE_TYPES.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </div>

      {loading?<div className="coupon-empty premium"><span className="coupon-loading-ring"/><strong>Loading coupons…</strong></div>
        :!filtered.length?<div className="coupon-empty premium"><div className="coupon-empty-icon">%</div><strong>No coupons match these filters</strong><small>Create a new coupon or change the filters above.</small><button type="button" onClick={openCreate}>＋ Create coupon</button></div>
        :<div className="coupon-card-grid">
          {filtered.map(item=>{
            const state=couponStatus(item)
            const purchaseTypes=Array.isArray(item.purchase_types)?item.purchase_types:JSON.parse(item.purchase_types||'[]')
            const planIds=Array.isArray(item.membership_plan_ids)?item.membership_plan_ids:JSON.parse(item.membership_plan_ids||'[]')
            return <article className={`coupon-premium-card ${state.key}`} key={item.id}>
              <div className="coupon-card-head">
                <div className="coupon-code-wrap">
                  <button type="button" className="coupon-code" onClick={()=>copyCode(item.code)} title="Copy coupon code">{item.code}</button>
                  <span>{copied===item.code?'Copied':'Click code to copy'}</span>
                </div>
                <span className={`coupon-status ${state.key}`}>{state.label}</span>
              </div>

              <p className="coupon-description">{item.description||'No campaign description'}</p>

              <div className="coupon-discount-block">
                <div><span>Discount</span><strong>{item.discount_type==='percent'?`${Number(item.discount_value)}%`:money(item.discount_value)}</strong>{item.max_discount!=null&&<small>Max {money(item.max_discount)}</small>}</div>
                <div><span>Minimum order</span><strong>{Number(item.min_order_amount)>0?money(item.min_order_amount):'None'}</strong></div>
              </div>

              <div className="coupon-card-tags">
                <span>{purchaseLabel(purchaseTypes)}</span>
                <span>{Number(item.target_user_count)>0?`${item.target_user_count} selected users`:'All users'}</span>
                <span>{Number(item.target_industry_count)>0?`${item.target_industry_count} industries`:'All industries'}</span>
                {planIds.length>0&&<span>{planIds.length} membership cycles</span>}
              </div>

              <div className="coupon-card-detail-grid">
                <div><span>Validity</span><strong>{validityLabel(item)}</strong></div>
                <div><span>Usage</span><strong>{Number(item.redeemed_count||0)}{item.usage_limit?` / ${item.usage_limit}`:' / Unlimited'}</strong></div>
                <div><span>Per user</span><strong>{item.per_user_limit||'Unlimited'}</strong></div>
              </div>

              {item.target_industries&&<div className="coupon-industry-line"><span>Industries</span><strong>{item.target_industries}</strong></div>}

              <div className="coupon-card-actions">
                <button type="button" onClick={()=>openEdit(item)}>Edit</button>
                <button type="button" onClick={()=>toggleActive(item)}>{item.is_active?'Disable':'Enable'}</button>
                <button type="button" className="danger" onClick={()=>remove(item)}>Delete</button>
              </div>
            </article>
          })}
        </div>}
    </section>

    {modalOpen&&<div className="coupon-modal-backdrop" onClick={closeModal}>
      <form className="coupon-modal" onSubmit={save} onClick={e=>e.stopPropagation()}>
        <div className="coupon-modal-head">
          <div><span>COUPON CAMPAIGN</span><h2>{editing?'Edit coupon':'Create coupon'}</h2><p>Configure discount, purchase scope, audience, validity and usage limits in one rule.</p></div>
          <button type="button" onClick={closeModal}>×</button>
        </div>

        <div className="coupon-modal-body">
          <section className="coupon-editor-section">
            <div className="coupon-editor-title"><span>01</span><div><strong>Coupon & discount</strong><small>Code, discount value and checkout conditions</small></div></div>
            <div className="coupon-form-grid">
              <label>Coupon code<input required maxLength="50" value={form.code} onChange={e=>setForm(current=>({...current,code:e.target.value.toUpperCase()}))} placeholder="WELCOME20"/></label>
              <label>Discount type<select value={form.discount_type} onChange={e=>setForm(current=>({...current,discount_type:e.target.value}))}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
              <label>{form.discount_type==='percent'?'Discount %':'Discount amount ₹'}<input required type="number" min="0.01" max={form.discount_type==='percent'?100:undefined} step="0.01" value={form.discount_value} onChange={e=>setForm(current=>({...current,discount_value:e.target.value}))}/></label>
              <label>Maximum discount ₹<input type="number" min="0" step="0.01" value={form.max_discount??''} onChange={e=>setForm(current=>({...current,max_discount:e.target.value}))} placeholder="No cap"/></label>
              <label>Minimum order ₹<input type="number" min="0" step="0.01" value={form.min_order_amount??''} onChange={e=>setForm(current=>({...current,min_order_amount:e.target.value}))} placeholder="0"/></label>
              <label className="wide">Description<input value={form.description||''} onChange={e=>setForm(current=>({...current,description:e.target.value}))} placeholder="Welcome discount for selected customers"/></label>
            </div>
          </section>

          <section className="coupon-editor-section">
            <div className="coupon-editor-title"><span>02</span><div><strong>Purchase scope</strong><small>Choose where the code can be redeemed</small></div></div>
            <div className="coupon-purchase-types">
              {PURCHASE_TYPES.map(item=><button type="button" key={item.key} className={form.purchase_types.includes(item.key)?'selected':''} onClick={()=>toggle('purchase_types',item.key)}><span>{item.key==='membership'?'★':item.key==='lead'?'◈':'₹'}</span><div><strong>{item.label}</strong><small>{item.note}</small></div><b>{form.purchase_types.includes(item.key)?'✓':'+'}</b></button>)}
            </div>

            {form.purchase_types.includes('membership')&&<div className="coupon-membership-scope">
              <div className="coupon-subhead"><div><strong>Membership cycles</strong><small>Leave everything unselected to allow all GROW & SCALE billing cycles.</small></div>{form.membership_plan_ids.length>0&&<button type="button" onClick={()=>setForm(current=>({...current,membership_plan_ids:[]}))}>Clear</button>}</div>
              <div className="coupon-plan-groups">
                {['grow','scale'].map(group=><div key={group}><span>{group.toUpperCase()}</span><div>{plansByGroup[group].map(plan=><label key={plan.id} className={form.membership_plan_ids.includes(Number(plan.id))?'selected':''}><input type="checkbox" checked={form.membership_plan_ids.includes(Number(plan.id))} onChange={()=>toggle('membership_plan_ids',Number(plan.id))}/><strong>{plan.billing_period||`${plan.billing_months} month`}</strong><small>{money(plan.price)}</small></label>)}</div></div>)}
              </div>
            </div>}
          </section>

          <section className="coupon-editor-section">
            <div className="coupon-editor-title"><span>03</span><div><strong>Audience</strong><small>Optional targeting. Empty selections mean everyone / every industry.</small></div></div>
            <div className="coupon-audience-grid">
              <div className="coupon-picker">
                <div className="coupon-picker-head"><div><strong>Specific business users</strong><small>{form.user_ids.length?`${form.user_ids.length} selected`:'All users'}</small></div></div>
                <input className="coupon-picker-search" value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search business, name or email…"/>
                {selectedUsers.length>0&&<div className="coupon-selected-chips">{selectedUsers.map(user=><button type="button" key={user.id} onClick={()=>toggle('user_ids',Number(user.id))}>{user.business_name||user.name}<b>×</b></button>)}</div>}
                <div className="coupon-picker-results">{visibleUsers.map(user=><button type="button" key={user.id} onClick={()=>toggle('user_ids',Number(user.id))}><span><strong>{user.business_name||user.name}</strong><small>{user.email}</small></span><b>＋</b></button>)}</div>
              </div>

              <div className="coupon-picker">
                <div className="coupon-picker-head"><div><strong>Industries</strong><small>{form.industry_ids.length?`${form.industry_ids.length} selected`:'All industries'}</small></div>{form.industry_ids.length>0&&<button type="button" onClick={()=>setForm(current=>({...current,industry_ids:[]}))}>Clear</button>}</div>
                <input className="coupon-picker-search" value={industrySearch} onChange={e=>setIndustrySearch(e.target.value)} placeholder="Search industry…"/>
                <div className="coupon-industry-options">{visibleIndustries.map(industry=><label className={form.industry_ids.includes(Number(industry.id))?'selected':''} key={industry.id}><input type="checkbox" checked={form.industry_ids.includes(Number(industry.id))} onChange={()=>toggle('industry_ids',Number(industry.id))}/><span>{industry.name}</span></label>)}</div>
              </div>
            </div>
          </section>

          <section className="coupon-editor-section">
            <div className="coupon-editor-title"><span>04</span><div><strong>Validity & limits</strong><small>Schedule the campaign and protect usage</small></div></div>
            <div className="coupon-validity-presets">
              <button type="button" className={validityMode==='always'?'active':''} onClick={()=>applyValidity('always')}>Always</button>
              <button type="button" className={validityMode==='today'?'active':''} onClick={()=>applyValidity('today')}>Today</button>
              <button type="button" className={validityMode==='week'?'active':''} onClick={()=>applyValidity('week')}>This week</button>
              <button type="button" className={validityMode==='custom'?'active':''} onClick={()=>applyValidity('custom')}>Custom</button>
            </div>
            <div className="coupon-form-grid coupon-limit-grid">
              {validityMode!=='always'&&<><label>Starts<input type="datetime-local" value={form.starts_at||''} onChange={e=>{setValidityMode('custom');setForm(current=>({...current,starts_at:e.target.value}))}}/></label><label>Ends<input type="datetime-local" value={form.expires_at||''} onChange={e=>{setValidityMode('custom');setForm(current=>({...current,expires_at:e.target.value}))}}/></label></>}
              <label>Total usage limit<input type="number" min="1" step="1" value={form.usage_limit??''} onChange={e=>setForm(current=>({...current,usage_limit:e.target.value}))} placeholder="Unlimited"/></label>
              <label>Per-user limit<input type="number" min="1" step="1" value={form.per_user_limit??''} onChange={e=>setForm(current=>({...current,per_user_limit:e.target.value}))} placeholder="Unlimited"/></label>
              <label className="coupon-active-control"><input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm(current=>({...current,is_active:e.target.checked}))}/><span><strong>Coupon enabled</strong><small>Customers can redeem it when all rules match.</small></span></label>
            </div>
          </section>
        </div>

        <div className="coupon-modal-actions">
          <button type="button" onClick={closeModal}>Cancel</button>
          <button className="primary" disabled={saving}>{saving?'Saving…':editing?'Save coupon':'Create coupon'}</button>
        </div>
      </form>
    </div>}
  </main>
}
