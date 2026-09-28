import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminMembershipPlansConfig.css'

const DEFAULT_CYCLES=[
  {key:'monthly',label:'Monthly',months:1},
  {key:'quarterly',label:'Quarterly',months:3},
  {key:'yearly',label:'Yearly',months:12}
]
const LEAD_TYPES=[
  {key:'shared',label:'Basic'},
  {key:'premium',label:'Premium'},
  {key:'exclusive',label:'Exclusive'}
]
const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`
const slug=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const verifyLabel=value=>value==='verified'?'Verified only':value==='unverified'?'Non-verified only':'Verified + Non-verified'
const toLocalInput=value=>{
  if(!value)return''
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return''
  const pad=n=>String(n).padStart(2,'0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const toIso=value=>{
  if(!value)return null
  const date=new Date(value)
  return Number.isNaN(date.getTime())?null:date.toISOString()
}
const offerWindowLabel=item=>{
  const parts=[]
  if(item?.new_customer_days)parts.push(`New customer · first ${item.new_customer_days} day${Number(item.new_customer_days)===1?'':'s'}`)
  if(item?.valid_until){
    const end=new Date(item.valid_until)
    parts.push(`until ${end.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`)
  }
  return parts.join(' · ')||'Ongoing pricing'
}
const pricingRuleStatus=item=>{
  if(item?.is_active===false)return{key:'inactive',label:'Disabled'}
  const now=Date.now()
  const start=item?.valid_from?new Date(item.valid_from).getTime():null
  const end=item?.valid_until?new Date(item.valid_until).getTime():null
  if(start&&start>now)return{key:'scheduled',label:'Scheduled'}
  if(end&&end<now)return{key:'expired',label:'Expired'}
  return{key:'active',label:'Active'}
}

function allowanceFromEntitlements(items=[],months=1){
  const out=Object.fromEntries(LEAD_TYPES.map(type=>[type.key,{monthly:0,total:0}]))
  for(const item of Array.isArray(items)?items:[]){
    const key=String(item?.type||'').toLowerCase()
    if(!out[key])continue
    const monthly=Math.max(0,Number(item.monthly_quantity??item.quantity??0)||0)
    const total=Math.max(0,Number(item.period_total_quantity??monthly*months)||0)
    out[key]={monthly,total}
  }
  return out
}
function entitlementsFromAllowance(allowance={},months=1){
  return LEAD_TYPES.map(type=>{
    const monthly=Math.max(0,Number(allowance?.[type.key]?.monthly||0))
    const total=Math.max(monthly*Math.max(1,Number(months)||1),Number(allowance?.[type.key]?.total||0))
    return{type:type.key,quantity:monthly,monthly_quantity:monthly,period_total_quantity:total,complimentary:true}
  }).filter(item=>item.monthly_quantity>0||item.period_total_quantity>0)
}
function normalizeAddon(item){
  if(item?.cycles)return item
  const legacy=Number(item?.price||0)
  return{
    name:item?.name||'Add-on',
    cycles:Object.fromEntries(DEFAULT_CYCLES.map(c=>[c.key,{price:legacy*c.months,enabled:true,discount:0}]))
  }
}
function freshPackage(packageKey='grow'){
  const scale=packageKey==='scale'
  const periods=DEFAULT_CYCLES.map(c=>({...c,enabled:true,allowances:allowanceFromEntitlements([],c.months)}))
  return{
    name:scale?'Scale':'Grow',
    monthlyBasePrice:'',
    periods,
    pricing:Object.fromEntries(periods.map(c=>[c.key,{discount:0,price:'',customPrice:false}])),
    benefits:scale
      ?['Everything in GROW','Website development','SEO services','Website maintenance']
      :['Best lead pricing','Exclusive Leads access','Investment access unlocked for eligible members'],
    addOns:[]
  }
}
function formFromPackage(packageKey,plans){
  const key=packageKey==='scale'?'scale':'grow'
  const canonical=key==='scale'?'Scale':'Grow'
  const group=(Array.isArray(plans)?plans:[])
    .filter(plan=>String(plan?.plan_type||'').toLowerCase()==='pro'&&String(plan?.plan_group||'').toLowerCase()===key)
    .slice()
    .sort((a,b)=>Number(a.billing_months||1)-Number(b.billing_months||1)||Number(a.id)-Number(b.id))
  if(!group.length)return freshPackage(key)
  const first=group[0]
  const byMonths=new Map(group.map(plan=>[Number(plan.billing_months||1),plan]))
  const periods=DEFAULT_CYCLES.map(cycle=>{
    const plan=byMonths.get(cycle.months)
    if(!plan)return{...cycle,enabled:false,allowances:allowanceFromEntitlements([],cycle.months)}
    return{
      ...cycle,
      label:plan.billing_period||cycle.label,
      months:Number(plan.billing_months||cycle.months),
      enabled:plan.is_active!==false,
      sourceId:plan.id,
      allowances:allowanceFromEntitlements(plan.lead_entitlements,Number(plan.billing_months||cycle.months))
    }
  })
  group.filter(plan=>!DEFAULT_CYCLES.some(c=>c.months===Number(plan.billing_months||1))).forEach(plan=>{
    const months=Number(plan.billing_months||1)
    periods.push({
      key:`custom-${plan.id}`,
      label:plan.billing_period||`${months}-month`,
      months,
      enabled:plan.is_active!==false,
      sourceId:plan.id,
      allowances:allowanceFromEntitlements(plan.lead_entitlements,months)
    })
  })
  periods.sort((a,b)=>Number(a.months)-Number(b.months))
  const pricing={}
  periods.forEach(period=>{
    const plan=group.find(row=>Number(row.billing_months||1)===Number(period.months))
    if(!plan){pricing[period.key]={discount:0,price:'',customPrice:false};return}
    const base=Number(plan.monthly_base_price??first.monthly_base_price??0)*Number(period.months||1)
    const discount=Number(plan.discount_percent||0)
    const calculated=base*(1-discount/100)
    const final=Number(plan.price||0)
    pricing[period.key]={discount,price:final,customPrice:Math.abs(final-calculated)>0.01}
  })
  return{
    name:canonical,
    monthlyBasePrice:first.monthly_base_price??'',
    periods,
    pricing,
    benefits:Array.isArray(first.benefits)?first.benefits:[],
    addOns:Array.isArray(first.add_ons)?first.add_ons.map(normalizeAddon):[]
  }
}
function planGroup(plans,key){
  return (Array.isArray(plans)?plans:[])
    .filter(plan=>String(plan?.plan_type||'').toLowerCase()==='pro'&&String(plan?.plan_group||'').toLowerCase()===key)
    .slice()
    .sort((a,b)=>Number(a.billing_months||1)-Number(b.billing_months||1))
}
function defaultRule(group='grow',plans=[]){
  const groupPlans=planGroup(plans,group).filter(plan=>plan.is_active!==false)
  return{
    name:'',
    planGroup:group,
    audienceScope:'all',
    verificationScope:'any',
    userIds:[],
    industryId:'',
    stateId:'',
    cityId:'',
    offerLabel:'',
    validityMode:'always',
    validFrom:'',
    validUntil:'',
    customerEligibility:'any',
    newCustomerDays:1,
    isActive:true,
    notes:'',
    periodOverrides:groupPlans.map(plan=>({
      billingMonths:Number(plan.billing_months||1),
      label:plan.billing_period||`${plan.billing_months||1}-month`,
      enabled:true,
      basePrice:Number(plan.price||0),
      discountPercent:0,
      price:Number(plan.price||0),
      allowances:allowanceFromEntitlements(plan.lead_entitlements,Number(plan.billing_months||1))
    }))
  }
}
function ruleFromItem(item,plans){
  const base=defaultRule(String(item.plan_group||'grow').toLowerCase(),plans)
  const stored=Array.isArray(item.period_overrides)?item.period_overrides:[]
  const byMonths=new Map(stored.map(period=>[Number(period.billingMonths??period.billing_months??period.months),period]))
  return{
    ...base,
    name:item.name||'',
    planGroup:String(item.plan_group||'grow').toLowerCase(),
    audienceScope:item.audience_scope||'all',
    verificationScope:item.verification_scope||'any',
    userIds:(Array.isArray(item.selected_users)?item.selected_users:[]).map(user=>Number(user.id)),
    industryId:item.industry_id||'',
    stateId:item.state_id||'',
    cityId:item.city_id||'',
    offerLabel:item.offer_label||'',
    validityMode:item.valid_from||item.valid_until?'custom':'always',
    validFrom:toLocalInput(item.valid_from),
    validUntil:toLocalInput(item.valid_until),
    customerEligibility:item.new_customer_days?'new':'any',
    newCustomerDays:Number(item.new_customer_days||1),
    isActive:item.is_active!==false,
    notes:item.notes||'',
    periodOverrides:base.periodOverrides.map(period=>{
      const saved=byMonths.get(Number(period.billingMonths))
      if(!saved)return period
      const basePrice=Number(period.basePrice??period.price??0)
      const savedPrice=Number(saved.price??period.price)
      const derivedDiscount=basePrice>0?Math.max(0,Math.min(100,((basePrice-savedPrice)/basePrice)*100)):0
      return{
        billingMonths:Number(period.billingMonths),
        label:saved.label||period.label,
        enabled:saved.enabled!==false,
        basePrice,
        discountPercent:Number(saved.discountPercent??saved.discount_percent??derivedDiscount),
        price:savedPrice,
        allowances:allowanceFromEntitlements(saved.leadEntitlements??saved.lead_entitlements,Number(period.billingMonths))
      }
    })
  }
}
function locationLabel(item){
  return item.city_name||item.state_name||'All locations'
}
function pricingScopeForRule(value={}){
  const hasIndustry=Boolean(value.industryId??value.industry_id)
  const hasLocation=Boolean(value.stateId??value.state_id??value.cityId??value.city_id)
  if(hasIndustry&&hasLocation)return 'industry_location'
  if(hasIndustry)return 'industry'
  if(hasLocation)return 'location'
  return 'all'
}
function pricingScopeLabel(value={}){
  const scope=pricingScopeForRule(value)
  if(scope==='industry_location')return 'Industry + City'
  if(scope==='industry')return 'Industry pricing'
  if(scope==='location')return 'City / State pricing'
  return 'Default audience'
}
function ruleAudienceLabel(item){
  return item.audience_scope==='specific_users'
    ?`${Array.isArray(item.selected_users)?item.selected_users.length:0} selected businesses`
    :'All business users'
}
function entitlementSummary(items=[]){
  const allowance=allowanceFromEntitlements(items,1)
  const parts=[]
  if(allowance.shared.monthly)parts.push(`${allowance.shared.monthly} Basic/mo`)
  if(allowance.premium.monthly)parts.push(`${allowance.premium.monthly} Premium/mo`)
  if(allowance.exclusive.monthly)parts.push(`${allowance.exclusive.monthly} Exclusive/mo`)
  return parts.join(' · ')||'No leads'
}

function LeadAllowanceGrid({value,months,onChange}){
  const setValue=(type,field,next)=>{
    const current={...value,[type]:{...(value?.[type]||{monthly:0,total:0}),[field]:Math.max(0,Number(next)||0)}}
    if(field==='monthly'){
      current[type].total=Math.max(current[type].total,current[type].monthly*Math.max(1,Number(months)||1))
    }
    onChange(current)
  }
  return <div className="membership-lead-allowance-grid">
    {LEAD_TYPES.map(type=><div className="membership-lead-allowance-row" key={type.key}>
      <div><strong>{type.label}</strong><small>Complimentary leads</small></div>
      <label>Monthly<input type="number" min="0" value={value?.[type.key]?.monthly??0} onChange={e=>setValue(type.key,'monthly',e.target.value)}/></label>
      <label>Cycle total<input type="number" min="0" value={value?.[type.key]?.total??0} onChange={e=>setValue(type.key,'total',e.target.value)}/></label>
    </div>)}
  </div>
}

function PackageCard({groupKey,groupPlans,pricingRules,onOpenPackage}){
  const first=groupPlans[0]
  const active=groupPlans.filter(plan=>plan.is_active!==false)
  return <article className={`membership-package-card ${groupKey}`}>
    <div className="membership-package-card-head">
      <div><span>MEMBERSHIP PACKAGE</span><h3>{groupKey.toUpperCase()}</h3><small>{active.length} active billing cycle{active.length===1?'':'s'}</small></div>
      <button type="button" onClick={()=>onOpenPackage(groupKey)}>{groupPlans.length?'Edit package':'Create package'}</button>
    </div>
    <div className="membership-package-card-summary">
      <div><span>Base / month</span><strong>{money(first?.monthly_base_price||0)}</strong></div>
      <div><span>Features</span><strong>{Array.isArray(first?.benefits)?first.benefits.length:0}</strong></div>
      <div><span>Pricing rules</span><strong>{pricingRules.filter(rule=>String(rule.plan_group).toLowerCase()===groupKey).length}</strong></div>
    </div>
    <div className="membership-package-cycles">
      {active.length?active.map(plan=><div className="membership-cycle-summary" key={plan.id}>
        <div><strong>{plan.billing_period||`${plan.billing_months}-month`}</strong><small>{plan.billing_months} month{Number(plan.billing_months)===1?'':'s'}</small></div>
        <div><span>{money(plan.price)}</span><small>{entitlementSummary(plan.lead_entitlements)}</small></div>
      </div>):<div className="membership-empty-inline">No active billing cycles.</div>}
    </div>
  </article>
}

export default function AdminMembershipPlansConfig(){
  const [plans,setPlans]=useState([])
  const [pricingRules,setPricingRules]=useState([])
  const [investor,setInvestor]=useState(null)
  const [industries,setIndustries]=useState([])
  const [states,setStates]=useState([])
  const [cities,setCities]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  const [packageEditor,setPackageEditor]=useState(null)
  const [form,setForm]=useState(freshPackage('grow'))

  const [ruleEditorOpen,setRuleEditorOpen]=useState(false)
  const [editingRule,setEditingRule]=useState(null)
  const [rule,setRule]=useState(defaultRule('grow',[]))
  const [ruleTargetMode,setRuleTargetMode]=useState('all')
  const [businessSearch,setBusinessSearch]=useState('')
  const [businessResults,setBusinessResults]=useState([])
  const [selectedBusinesses,setSelectedBusinesses]=useState([])

  const [investorEditorOpen,setInvestorEditorOpen]=useState(false)

  const req=(path,options={})=>apiRequest(path,options)

  async function load(){
    setLoading(true)
    try{
      const [membershipPlans,rules,investorSettings,industryData,stateData,cityData]=await Promise.all([
        req('/membership-plans'),
        req('/membership-plans/rules'),
        req('/admin/commercial/investor-settings'),
        req('/industries'),
        req('/states'),
        req('/cities')
      ])
      setPlans(Array.isArray(membershipPlans)?membershipPlans:[])
      setPricingRules(Array.isArray(rules)?rules:[])
      setInvestor(investorSettings)
      setIndustries(Array.isArray(industryData)?industryData:[])
      setStates(Array.isArray(stateData)?stateData:[])
      setCities(Array.isArray(cityData)?cityData:[])
      setError('')
    }catch(e){
      setError(e.message||'Failed to load membership settings')
    }finally{
      setLoading(false)
    }
  }
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])

  const anyModal=Boolean(packageEditor||ruleEditorOpen||investorEditorOpen)
  useEffect(()=>{
    if(!anyModal)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=event=>{
      if(event.key!=='Escape'||saving)return
      setPackageEditor(null)
      setRuleEditorOpen(false)
      setInvestorEditorOpen(false)
    }
    window.addEventListener('keydown',onKey)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)}
  },[anyModal,saving])

  useEffect(()=>{
    if(!ruleEditorOpen||rule.audienceScope!=='specific_users')return
    let active=true
    const timer=setTimeout(async()=>{
      try{
        const query=new URLSearchParams({search:businessSearch})
        const response=await req(`/membership-plans/rules/businesses?${query}`)
        if(active)setBusinessResults(Array.isArray(response)?response:Array.isArray(response?.data)?response.data:[])
      }catch(e){
        if(active)setError(e.message||'Failed to load businesses')
      }
    },220)
    return()=>{active=false;clearTimeout(timer)}
  },[ruleEditorOpen,rule.audienceScope,businessSearch])

  const growPlans=useMemo(()=>planGroup(plans,'grow'),[plans])
  const scalePlans=useMemo(()=>planGroup(plans,'scale'),[plans])
  const activeRules=pricingRules.filter(item=>item.is_active!==false)
  const targetedCycles=pricingRules.reduce((sum,item)=>sum+(Array.isArray(item.period_overrides)?item.period_overrides.filter(period=>period.enabled!==false).length:0),0)

  const setField=(key,value)=>setForm(current=>({...current,[key]:value}))
  const setPricing=(key,field,value)=>setForm(current=>({...current,pricing:{...current.pricing,[key]:{...current.pricing[key],[field]:value}}}))
  const setPeriod=(key,field,value)=>setForm(current=>({...current,periods:current.periods.map(period=>period.key===key?{...period,[field]:value}:period)}))
  const setPeriodAllowance=(key,value)=>setForm(current=>({...current,periods:current.periods.map(period=>period.key===key?{...period,allowances:value}:period)}))
  const priceFor=period=>{
    const base=Number(form.monthlyBasePrice||0)*Number(period.months||1)
    const cfg=form.pricing[period.key]||{}
    const discounted=base*(1-Number(cfg.discount||0)/100)
    const final=cfg.customPrice&&cfg.price!==''?Number(cfg.price):discounted
    return{base,final,saving:Math.max(0,base-final)}
  }
  function addCycle(){
    const label=window.prompt('Billing cycle name')
    if(!label?.trim())return
    const months=Number(window.prompt('Number of months','6'))
    if(!Number.isFinite(months)||months<=0)return
    const key=`${slug(label)}-${Date.now()}`
    setForm(current=>({
      ...current,
      periods:[...current.periods,{key,label:label.trim(),months,enabled:true,allowances:allowanceFromEntitlements([],months)}],
      pricing:{...current.pricing,[key]:{discount:0,price:'',customPrice:false}}
    }))
  }
  function removeCycle(key){
    setForm(current=>({
      ...current,
      periods:current.periods.filter(period=>period.key!==key),
      pricing:Object.fromEntries(Object.entries(current.pricing).filter(([pricingKey])=>pricingKey!==key))
    }))
  }
  function addFeature(){
    const value=window.prompt('Feature name')
    if(value?.trim())setField('benefits',[...form.benefits,value.trim()])
  }

  function openPackage(key){
    setPackageEditor(key)
    setForm(formFromPackage(key,plans))
    setError('')
    setMessage('')
  }
  function closePackage(){
    if(saving)return
    setPackageEditor(null)
  }
  async function savePackage(event){
    event.preventDefault()
    const activePeriods=form.periods.filter(period=>period.enabled!==false&&Number(period.months)>0)
    if(!activePeriods.length)return setError('Enable at least one billing cycle.')
    try{
      setSaving('package')
      setError('')
      setMessage('')
      const periods=activePeriods.map(period=>({
        ...period,
        months:Number(period.months),
        leadEntitlements:entitlementsFromAllowance(period.allowances,period.months)
      }))
      await req('/membership-plans',{
        method:'POST',
        body:JSON.stringify({
          name:form.name.trim(),
          planGroup:form.name.trim(),
          planType:'pro',
          bundle:true,
          monthlyBasePrice:Number(form.monthlyBasePrice||0),
          benefits:form.benefits,
          addOns:form.addOns,
          leadRolloverEnabled:true,
          leadExpiryDays:null,
          periods,
          pricing:Object.fromEntries(periods.map(period=>[period.key,{
            discount:Number(form.pricing[period.key]?.discount||0),
            price:form.pricing[period.key]?.price||'',
            customPrice:Boolean(form.pricing[period.key]?.customPrice)
          }]))
        })
      })
      setMessage(`${form.name} package saved.`)
      setPackageEditor(null)
      await load()
    }catch(e){
      setError(e.message||'Failed to save membership package')
    }finally{
      setSaving('')
    }
  }

  function openCreateRule(group='grow'){
    setEditingRule(null)
    setRuleTargetMode('all')
    setRule(defaultRule(group,plans))
    setSelectedBusinesses([])
    setBusinessSearch('')
    setBusinessResults([])
    setRuleEditorOpen(true)
    setError('')
    setMessage('')
  }
  function openEditRule(item){
    const selected=Array.isArray(item.selected_users)?item.selected_users:[]
    setEditingRule(item)
    setRuleTargetMode(pricingScopeForRule(item))
    setRule(ruleFromItem(item,plans))
    setSelectedBusinesses(selected)
    setBusinessSearch('')
    setBusinessResults([])
    setRuleEditorOpen(true)
    setError('')
    setMessage('')
  }
  function closeRule(){
    if(saving)return
    setRuleEditorOpen(false)
    setEditingRule(null)
    setRuleTargetMode('all')
    setSelectedBusinesses([])
    setBusinessSearch('')
    setBusinessResults([])
  }
  function changeRuleGroup(group){
    const next=defaultRule(group,plans)
    setRule(current=>({...next,name:current.name,audienceScope:current.audienceScope,verificationScope:current.verificationScope,userIds:current.userIds,industryId:current.industryId,stateId:current.stateId,cityId:current.cityId,offerLabel:current.offerLabel,validityMode:current.validityMode,validFrom:current.validFrom,validUntil:current.validUntil,customerEligibility:current.customerEligibility,newCustomerDays:current.newCustomerDays,isActive:current.isActive,notes:current.notes}))
  }
  function setRulePeriod(index,field,value){
    setRule(current=>({...current,periodOverrides:current.periodOverrides.map((period,i)=>i===index?{...period,[field]:value}:period)}))
  }
  function setRulePeriodPricing(index,field,value){
    setRule(current=>({...current,periodOverrides:current.periodOverrides.map((period,i)=>{
      if(i!==index)return period
      const base=Math.max(0,Number(period.basePrice||0))
      if(field==='discountPercent'){
        const discount=Math.min(100,Math.max(0,Number(value)||0))
        return{...period,discountPercent:discount,price:Number((base*(1-discount/100)).toFixed(2))}
      }
      const price=Math.max(0,Number(value)||0)
      const discount=base>0?Math.min(100,Math.max(0,Number((((base-price)/base)*100).toFixed(2)))):0
      return{...period,price,discountPercent:discount}
    })}))
  }
  function applyOfferWindow(mode){
    const now=new Date()
    if(mode==='always'){
      setRule(current=>({...current,validityMode:'always',validFrom:'',validUntil:''}))
      return
    }
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
    setRule(current=>({...current,validityMode:mode,validFrom:toLocalInput(now),validUntil:toLocalInput(end)}))
  }
  function setRuleAllowance(index,value){
    setRule(current=>({...current,periodOverrides:current.periodOverrides.map((period,i)=>i===index?{...period,allowances:value}:period)}))
  }
  function toggleBusiness(item){
    const id=Number(item.id)
    const exists=rule.userIds.includes(id)
    setRule(current=>({...current,userIds:exists?current.userIds.filter(value=>value!==id):[...current.userIds,id]}))
    setSelectedBusinesses(current=>exists?current.filter(user=>Number(user.id)!==id):[...current,item])
  }
  async function saveRule(){
    if(!rule.name.trim())return setError('Give this pricing rule a name.')
    if(rule.audienceScope==='specific_users'&&!rule.userIds.length)return setError('Choose at least one business.')
    if(['industry','industry_location'].includes(ruleTargetMode)&&!rule.industryId)return setError('Choose an industry for this pricing rule.')
    if(['location','industry_location'].includes(ruleTargetMode)&&!rule.stateId)return setError('Choose a state for this pricing rule.')
    if(rule.validityMode!=='always'&&(!rule.validFrom||!rule.validUntil))return setError('Choose the offer start and end time.')
    if(rule.validityMode!=='always'&&new Date(rule.validUntil)<=new Date(rule.validFrom))return setError('Offer end time must be after the start time.')
    if(rule.customerEligibility==='new'&&Number(rule.newCustomerDays||0)<1)return setError('New-customer window must be at least 1 day.')
    if(!rule.periodOverrides.some(period=>period.enabled!==false))return setError('Enable at least one billing cycle.')
    try{
      setSaving(editingRule?`rule-${editingRule.id}`:'rule-create')
      setError('')
      setMessage('')
      const body={
        ...rule,
        offerLabel:rule.offerLabel?.trim()||null,
        validFrom:rule.validityMode==='always'?null:toIso(rule.validFrom),
        validUntil:rule.validityMode==='always'?null:toIso(rule.validUntil),
        newCustomerDays:rule.customerEligibility==='new'?Number(rule.newCustomerDays||1):null,
        periodOverrides:rule.periodOverrides.map(period=>({
          billingMonths:Number(period.billingMonths),
          label:period.label,
          enabled:period.enabled!==false,
          price:Number(period.price||0),
          discountPercent:Number(period.discountPercent||0),
          leadEntitlements:entitlementsFromAllowance(period.allowances,period.billingMonths)
        }))
      }
      if(editingRule){
        await req(`/membership-plans/rules/${editingRule.id}`,{method:'PUT',body:JSON.stringify(body)})
        setMessage('Membership pricing rule updated.')
      }else{
        await req('/membership-plans/rules',{method:'POST',body:JSON.stringify(body)})
        setMessage('Membership pricing rule created.')
      }
      setRuleEditorOpen(false)
      setEditingRule(null)
      setRuleTargetMode('all')
      setSelectedBusinesses([])
      setBusinessSearch('')
      setBusinessResults([])
      await load()
    }catch(e){
      setError(e.message||'Failed to save membership pricing rule')
    }finally{
      setSaving('')
    }
  }
  async function deleteRule(item){
    if(!window.confirm(`Delete membership pricing rule “${item.name}”? Existing purchased memberships keep their snapshotted price and lead allowance.`))return
    try{
      setSaving(`delete-rule-${item.id}`)
      setError('')
      setMessage('')
      await req(`/membership-plans/rules/${item.id}`,{method:'DELETE'})
      setMessage('Membership pricing rule deleted.')
      await load()
    }catch(e){
      setError(e.message||'Failed to delete membership pricing rule')
    }finally{
      setSaving('')
    }
  }

  const ruleCities=useMemo(()=>{
    if(!rule.stateId)return cities
    return cities.filter(city=>Number(city.state_id)===Number(rule.stateId))
  },[cities,rule.stateId])

  const ruleScope=ruleTargetMode
  function changeRuleScope(scope){
    setRuleTargetMode(scope)
    setRule(current=>({
      ...current,
      industryId:['industry','industry_location'].includes(scope)?current.industryId:'',
      stateId:['location','industry_location'].includes(scope)?current.stateId:'',
      cityId:['location','industry_location'].includes(scope)?current.cityId:''
    }))
  }

  const updateIndustry=(index,field,value)=>setInvestor(current=>({
    ...current,
    industryLimits:(current.industryLimits||[]).map((item,i)=>i===index?{...item,[field]:value}:item)
  }))
  const citiesForState=stateId=>cities.filter(city=>Number(city.state_id)===Number(stateId))
  const updateIndustryLocation=(industryIndex,locationIndex,field,value)=>setInvestor(current=>({
    ...current,
    industryLimits:(current.industryLimits||[]).map((industry,i)=>i!==industryIndex?industry:{
      ...industry,
      locations:(industry.locations||[]).map((location,j)=>j===locationIndex?{...location,[field]:value,...(field==='state_id'?{city_id:null}:{})}:location)
    })
  }))
  const addIndustryLocation=industryIndex=>setInvestor(current=>({
    ...current,
    industryLimits:(current.industryLimits||[]).map((industry,i)=>i!==industryIndex?industry:{
      ...industry,
      locations:[...(industry.locations||[]),{id:`new-${Date.now()}-${industryIndex}`,state_id:states[0]?.id||'',city_id:null,investor_limit:0,is_active:true}]
    })
  }))
  const removeIndustryLocation=(industryIndex,locationIndex)=>setInvestor(current=>({
    ...current,
    industryLimits:(current.industryLimits||[]).map((industry,i)=>i!==industryIndex?industry:{
      ...industry,
      locations:(industry.locations||[]).filter((_,j)=>j!==locationIndex)
    })
  }))
  async function saveInvestor(event){
    event.preventDefault()
    try{
      setSaving('investor')
      setError('')
      await req('/admin/commercial/investor-settings',{method:'PUT',body:JSON.stringify({
        globalLimit:Number(investor.global_limit||0),
        defaultIndustryLimit:Number(investor.default_industry_limit||0),
        customerIndustryLimit:Number(investor.customer_industry_limit??10),
        minInvestment:Number(investor.min_investment||0),
        maxInvestment:investor.max_investment===''?null:investor.max_investment,
        enabled:Boolean(investor.enabled),
        requiresPro:true,
        industryLimits:investor.industryLimits||[]
      })})
      setMessage('Investor settings saved.')
      setInvestorEditorOpen(false)
      await load()
    }catch(e){
      setError(e.message||'Failed to save investor settings')
    }finally{
      setSaving('')
    }
  }

  return <main className="membership-admin-page">
    <section className="membership-admin-hero">
      <div>
        <span>MEMBERSHIPS / PRICING & ENTITLEMENTS</span>
        <h1>GROW & SCALE</h1>
        <p>Set default GROW/SCALE packages, then override price and lead entitlement independently by industry, state, city or industry + city.</p>
      </div>
      <div className="membership-admin-state"><span>2</span><div><strong>Packages</strong><small>GROW + SCALE</small></div></div>
    </section>

    <section className="membership-summary-grid">
      <article><span>Packages</span><strong>2</strong><small>GROW + SCALE</small></article>
      <article className="green"><span>Active cycles</span><strong>{growPlans.filter(p=>p.is_active!==false).length+scalePlans.filter(p=>p.is_active!==false).length}</strong><small>Customer billing options</small></article>
      <article className="orange"><span>Pricing rules</span><strong>{pricingRules.length}</strong><small>{activeRules.length} active</small></article>
      <article className="purple"><span>Targeted cycles</span><strong>{targetedCycles}</strong><small>Price + lead overrides</small></article>
    </section>

    {error&&<div className="membership-alert error">{error}</div>}
    {message&&<div className="membership-alert success">{message}</div>}

    <section className="membership-action-bar">
      <button type="button" className="secondary" onClick={()=>openPackage('grow')}>Edit GROW</button>
      <button type="button" className="secondary" onClick={()=>openPackage('scale')}>Edit SCALE</button>
      <button type="button" className="primary" onClick={()=>openCreateRule('grow')}>＋ Create pricing rule</button>
    </section>

    <section className="membership-panel">
      <div className="membership-panel-head">
        <div><span>BASE PACKAGES</span><h2>Membership packages</h2></div>
        <small>Base price · billing cycles · lead allowance · features</small>
      </div>
      {loading?<div className="membership-empty">Loading memberships…</div>:<div className="membership-package-grid">
        <PackageCard groupKey="grow" groupPlans={growPlans} pricingRules={pricingRules} onOpenPackage={openPackage}/>
        <PackageCard groupKey="scale" groupPlans={scalePlans} pricingRules={pricingRules} onOpenPackage={openPackage}/>
      </div>}
    </section>

    <section className="membership-panel membership-rules-panel">
      <div className="membership-panel-head">
        <div><span>TARGETED PRICING</span><h2>Pricing & lead entitlement rules</h2><small>Different industries and cities can each have their own GROW or SCALE price.</small></div>
        <button type="button" onClick={()=>openCreateRule('grow')}>＋ Create rule</button>
      </div>
      {!pricingRules.length?<div className="membership-empty">No targeted membership rules yet. Base GROW and SCALE pricing applies to everyone.</div>
        :<div className="membership-rule-grid">
          {pricingRules.map(item=>{
            const status=pricingRuleStatus(item)
            return <article className={`membership-rule-card ${status.key}`} key={item.id}>
            <div className="membership-rule-card-head">
              <div><span className={`membership-plan-chip ${String(item.plan_group).toLowerCase()}`}>{String(item.plan_group).toUpperCase()}</span><h3>{item.name}</h3></div>
              <span className={`membership-rule-status ${status.key}`}>{status.label}</span>
            </div>
            <div className="membership-target-tags">
              <span className="membership-scope-tag">{pricingScopeLabel(item)}</span>
              {item.offer_label&&<span className="membership-offer-label-tag">{item.offer_label}</span>}
              <span>{ruleAudienceLabel(item)}</span>
              <span>{verifyLabel(item.verification_scope)}</span>
              <span>{item.industry_name||'All industries'}</span>
              <span>{locationLabel(item)}</span>
            </div>
            <div className="membership-rule-periods">
              {(Array.isArray(item.period_overrides)?item.period_overrides:[]).filter(period=>period.enabled!==false).map(period=><div key={period.billingMonths??period.months}>
                <span>{period.label||`${period.billingMonths??period.months}-month`}</span>
                <strong>{money(period.price)}</strong>
                {Number(period.discountPercent??period.discount_percent??0)>0&&<em>{Number(period.discountPercent??period.discount_percent??0).toFixed(0)}% off</em>}
                <small>{entitlementSummary(period.leadEntitlements??period.lead_entitlements)}</small>
              </div>)}
            </div>
            <div className="membership-rule-foot">
              <small>{offerWindowLabel(item)}{item.notes?` · ${item.notes}`:''}</small>
              <div><button type="button" onClick={()=>openEditRule(item)}>Edit</button><button type="button" className="danger" disabled={saving===`delete-rule-${item.id}`} onClick={()=>deleteRule(item)}>Delete</button></div>
            </div>
          </article>})}
        </div>}
    </section>

    {investor&&<section className="membership-panel membership-investor-card">
      <div className="membership-panel-head">
        <div><span>INVESTOR ACCESS</span><h2>Investor limits</h2></div>
        <button type="button" onClick={()=>setInvestorEditorOpen(true)}>Edit investor settings</button>
      </div>
      <div className="membership-investor-summary">
        <div><span>Status</span><strong>{investor.enabled?'Enabled':'Disabled'}</strong></div>
        <div><span>Customer / industry</span><strong>{Number(investor.customer_industry_limit??10)}</strong></div>
        <div><span>Minimum</span><strong>{money(investor.min_investment)}</strong></div>
        <div><span>Industries</span><strong>{(investor.industryLimits||[]).length}</strong></div>
      </div>
    </section>}

    {packageEditor&&<div className="membership-modal-backdrop" onClick={closePackage}>
      <form className="membership-modal membership-package-modal" onSubmit={savePackage} onClick={e=>e.stopPropagation()}>
        <div className="membership-modal-head">
          <div><span>BASE MEMBERSHIP PACKAGE</span><h2>{form.name}</h2><p>Base pricing is used when no targeted rule matches the business.</p></div>
          <button type="button" onClick={closePackage}>×</button>
        </div>
        <div className="membership-modal-body">
          <section className="membership-editor-section">
            <div className="membership-editor-title"><span>01</span><div><strong>Package pricing</strong><small>Monthly base and billing cycles</small></div></div>
            <div className="membership-base-fields">
              <div className="membership-package-lock"><span>Package</span><strong>{form.name}</strong></div>
              <label>Base price / month ₹<input type="number" min="0" step="0.01" required value={form.monthlyBasePrice} onChange={e=>setField('monthlyBasePrice',e.target.value)}/></label>
            </div>
            <div className="membership-editor-subhead"><strong>Billing cycles</strong><button type="button" onClick={addCycle}>＋ Add cycle</button></div>
            <div className="membership-cycle-editor-grid">
              {form.periods.map(period=>{
                const cfg=form.pricing[period.key]||{}
                const price=priceFor(period)
                return <article className={`membership-cycle-editor ${period.enabled!==false?'':'disabled'}`} key={period.key}>
                  <div className="membership-cycle-editor-head">
                    <label className="membership-toggle"><input type="checkbox" checked={period.enabled!==false} onChange={e=>setPeriod(period.key,'enabled',e.target.checked)}/><span/></label>
                    <input className="cycle-name" value={period.label} onChange={e=>setPeriod(period.key,'label',e.target.value)}/>
                    <input className="cycle-months" type="number" min="1" value={period.months} onChange={e=>setPeriod(period.key,'months',Number(e.target.value||1))}/>
                    <small>months</small>
                    {!['monthly','quarterly','yearly'].includes(period.key)&&<button type="button" className="cycle-remove" onClick={()=>removeCycle(period.key)}>×</button>}
                  </div>
                  <div className="membership-cycle-price-row">
                    <label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount||0} onChange={e=>setPricing(period.key,'discount',e.target.value)}/></label>
                    <label className="membership-check"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e=>setPricing(period.key,'customPrice',e.target.checked)}/> Custom final price</label>
                    {cfg.customPrice&&<label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e=>setPricing(period.key,'price',e.target.value)}/></label>}
                    <div className="membership-live-price"><span>Customer pays</span><strong>{money(price.final)}</strong>{price.saving>0&&<small>Save {money(price.saving)}</small>}</div>
                  </div>
                  <div className="membership-cycle-leads">
                    <span>Lead allowance</span>
                    <LeadAllowanceGrid value={period.allowances} months={period.months} onChange={value=>setPeriodAllowance(period.key,value)}/>
                  </div>
                </article>
              })}
            </div>
          </section>
          <section className="membership-editor-section">
            <div className="membership-editor-title"><span>02</span><div><strong>Customer features</strong><small>Benefits shown on the membership page</small></div></div>
            <div className="membership-feature-head"><div className="membership-feature-chips">{form.benefits.map((item,index)=><span key={`${item}-${index}`}>{item}<button type="button" onClick={()=>setField('benefits',form.benefits.filter((_,i)=>i!==index))}>×</button></span>)}</div><button type="button" onClick={addFeature}>＋ Add feature</button></div>
          </section>
        </div>
        <div className="membership-modal-actions"><button type="button" onClick={closePackage}>Cancel</button><button className="primary" disabled={saving==='package'}>{saving==='package'?'Saving…':`Save ${form.name}`}</button></div>
      </form>
    </div>}

    {ruleEditorOpen&&<div className="membership-modal-backdrop" onClick={closeRule}>
      <div className="membership-modal membership-rule-modal" onClick={e=>e.stopPropagation()}>
        <div className="membership-modal-head">
          <div><span>TARGETED MEMBERSHIP RULE</span><h2>{editingRule?'Edit pricing rule':'Create pricing rule'}</h2><p>Override membership price and complimentary leads for matching businesses.</p></div>
          <button type="button" onClick={closeRule}>×</button>
        </div>
        <div className="membership-modal-body">
          <section className="membership-editor-section">
            <div className="membership-editor-title"><span>01</span><div><strong>Rule & audience</strong><small>Choose whether this price varies by industry, city, or both</small></div></div>
            <div className="membership-scope-picker">
              <button type="button" className={ruleScope==='all'?'active':''} onClick={()=>changeRuleScope('all')}><strong>All</strong><small>Base targeted offer</small></button>
              <button type="button" className={ruleScope==='industry'?'active':''} onClick={()=>changeRuleScope('industry')}><strong>Industry</strong><small>Different price by industry</small></button>
              <button type="button" className={ruleScope==='location'?'active':''} onClick={()=>changeRuleScope('location')}><strong>State / City</strong><small>Different price by location</small></button>
              <button type="button" className={ruleScope==='industry_location'?'active':''} onClick={()=>changeRuleScope('industry_location')}><strong>Industry + City</strong><small>Most specific price</small></button>
            </div>
            <div className="membership-pricing-scope-note">
              {ruleScope==='industry'&&<span>Create separate rules for each industry that needs a different GROW or SCALE price.</span>}
              {ruleScope==='location'&&<span>Create separate rules for Hyderabad, Bengaluru, Mumbai or any other state/city pricing.</span>}
              {ruleScope==='industry_location'&&<span>This automatically overrides broader industry or city rules because it is more specific.</span>}
              {ruleScope==='all'&&<span>Use this when the offer is not limited to a particular industry or location.</span>}
            </div>
            <div className="membership-rule-form-grid">
              <label className="wide">Rule name<input value={rule.name} onChange={e=>setRule(current=>({...current,name:e.target.value}))} placeholder="Hyderabad Interior GROW"/></label>
              <label>Package<select value={rule.planGroup} onChange={e=>changeRuleGroup(e.target.value)}><option value="grow">GROW</option><option value="scale">SCALE</option></select></label>
              <label>Audience<select value={rule.audienceScope} onChange={e=>setRule(current=>({...current,audienceScope:e.target.value,userIds:e.target.value==='all'?[]:current.userIds}))}><option value="all">All business users</option><option value="specific_users">Specific business users</option></select></label>
              <label>Verification<select value={rule.verificationScope} onChange={e=>setRule(current=>({...current,verificationScope:e.target.value}))}><option value="any">Verified + Non-verified</option><option value="verified">Verified only</option><option value="unverified">Non-verified only</option></select></label>
              {['industry','industry_location'].includes(ruleScope)&&<label>Industry<select value={rule.industryId} onChange={e=>setRule(current=>({...current,industryId:e.target.value}))}><option value="">Select industry</option>{industries.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
              {['location','industry_location'].includes(ruleScope)&&<label>State<select value={rule.stateId} onChange={e=>setRule(current=>({...current,stateId:e.target.value,cityId:''}))}><option value="">Select state</option>{states.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
              {['location','industry_location'].includes(ruleScope)&&<label>City<select value={rule.cityId} disabled={!rule.stateId} onChange={e=>setRule(current=>({...current,cityId:e.target.value}))}><option value="">All cities in state</option>{ruleCities.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
              <label className="membership-rule-active"><input type="checkbox" checked={rule.isActive} onChange={e=>setRule(current=>({...current,isActive:e.target.checked}))}/><span><strong>Active</strong><small>Matching customers can use this offer.</small></span></label>
            </div>

            {rule.audienceScope==='specific_users'&&<div className="membership-business-picker">
              <label>Find businesses<input value={businessSearch} onChange={e=>setBusinessSearch(e.target.value)} placeholder="Search name, business, email or phone…"/></label>
              {selectedBusinesses.length>0&&<div className="membership-selected-businesses">{selectedBusinesses.map(item=><button type="button" key={item.id} onClick={()=>toggleBusiness(item)}>{item.business_name||item.name}<b>×</b></button>)}</div>}
              <div className="membership-business-results">{businessResults.map(item=>{
                const selected=rule.userIds.includes(Number(item.id))
                return <button type="button" className={selected?'selected':''} key={item.id} onClick={()=>toggleBusiness(item)}><span><strong>{item.business_name||item.name}</strong><small>{item.email}</small></span><b className={item.is_verified?'verified':'unverified'}>{item.is_verified?'Verified':'Not verified'}</b></button>
              })}</div>
            </div>}
            <div className="membership-offer-config">
              <div className="membership-offer-config-head"><div><strong>Special offer</strong><small>Optional time-limited or first-membership pricing</small></div><span>Automatic order: specific user → new customer → timed offer → industry + city → city/state → industry → all</span></div>
              <div className="membership-offer-grid">
                <label>Offer badge<input value={rule.offerLabel} onChange={e=>setRule(current=>({...current,offerLabel:e.target.value}))} placeholder="Welcome offer / Hyderabad special"/></label>
                <label>Customer eligibility<select value={rule.customerEligibility} onChange={e=>setRule(current=>({...current,customerEligibility:e.target.value}))}><option value="any">Any matching customer</option><option value="new">New customers only</option></select></label>
                {rule.customerEligibility==='new'&&<label>Registration window<input type="number" min="1" max="365" value={rule.newCustomerDays} onChange={e=>setRule(current=>({...current,newCustomerDays:e.target.value}))}/><small>First membership only, within N days after registration.</small></label>}
              </div>
              {rule.customerEligibility==='new'&&<div className="membership-welcome-presets">
                <span>Quick window</span>
                {[1,3,7,14].map(days=><button type="button" className={Number(rule.newCustomerDays)===days?'active':''} key={days} onClick={()=>setRule(current=>({...current,newCustomerDays:days}))}>{days} day{days===1?'':'s'}</button>)}
              </div>}
              <div className="membership-validity-presets">
                <button type="button" className={rule.validityMode==='always'?'active':''} onClick={()=>applyOfferWindow('always')}>Always</button>
                <button type="button" className={rule.validityMode==='today'?'active':''} onClick={()=>applyOfferWindow('today')}>Today</button>
                <button type="button" className={rule.validityMode==='week'?'active':''} onClick={()=>applyOfferWindow('week')}>This week</button>
                <button type="button" className={rule.validityMode==='custom'?'active':''} onClick={()=>applyOfferWindow('custom')}>Custom</button>
              </div>
              {rule.validityMode!=='always'&&<div className="membership-offer-grid dates">
                <label>Starts<input type="datetime-local" value={rule.validFrom} onChange={e=>setRule(current=>({...current,validityMode:'custom',validFrom:e.target.value}))}/></label>
                <label>Ends<input type="datetime-local" value={rule.validUntil} onChange={e=>setRule(current=>({...current,validityMode:'custom',validUntil:e.target.value}))}/></label>
              </div>}
            </div>
          </section>

          <section className="membership-editor-section">
            <div className="membership-editor-title"><span>02</span><div><strong>Price & lead entitlement</strong><small>Set the offer for each billing cycle</small></div></div>
            <div className="membership-rule-period-editor">
              {rule.periodOverrides.map((period,index)=><article className={period.enabled!==false?'':'disabled'} key={period.billingMonths}>
                <div className="membership-rule-period-head">
                  <label className="membership-toggle"><input type="checkbox" checked={period.enabled!==false} onChange={e=>setRulePeriod(index,'enabled',e.target.checked)}/><span/></label>
                  <div><strong>{period.label}</strong><small>Base {money(period.basePrice)} · {period.billingMonths} month{Number(period.billingMonths)===1?'':'s'}</small></div>
                  <label>Discount %<input type="number" min="0" max="100" step="0.01" value={period.discountPercent??0} onChange={e=>setRulePeriodPricing(index,'discountPercent',e.target.value)}/></label>
                  <label>Offer price ₹<input type="number" min="0" step="0.01" value={period.price} onChange={e=>setRulePeriodPricing(index,'price',e.target.value)}/></label>
                </div>
                <LeadAllowanceGrid value={period.allowances} months={period.billingMonths} onChange={value=>setRuleAllowance(index,value)}/>
              </article>)}
            </div>
          </section>

          <section className="membership-editor-section">
            <div className="membership-editor-title"><span>03</span><div><strong>Internal note</strong><small>Optional context for Admins</small></div></div>
            <textarea className="membership-rule-notes" rows="3" value={rule.notes} onChange={e=>setRule(current=>({...current,notes:e.target.value}))} placeholder="Why this pricing exists, campaign details, approval notes…"/>
          </section>
        </div>
        <div className="membership-modal-actions"><button type="button" onClick={closeRule}>Cancel</button><button className="primary" type="button" disabled={Boolean(saving)} onClick={saveRule}>{saving?'Saving…':editingRule?'Save rule':'Create rule'}</button></div>
      </div>
    </div>}

    {investorEditorOpen&&investor&&<div className="membership-modal-backdrop" onClick={()=>!saving&&setInvestorEditorOpen(false)}>
      <form className="membership-modal membership-investor-modal" onSubmit={saveInvestor} onClick={e=>e.stopPropagation()}>
        <div className="membership-modal-head"><div><span>INVESTOR SETTINGS</span><h2>Investment limits</h2><p>Configure customer and industry/location investment capacity.</p></div><button type="button" onClick={()=>!saving&&setInvestorEditorOpen(false)}>×</button></div>
        <div className="membership-modal-body">
          <section className="membership-editor-section">
            <div className="membership-rule-form-grid">
              <label>Customer limit / industry<input type="number" min="0" value={investor.customer_industry_limit??10} onChange={e=>setInvestor({...investor,customer_industry_limit:e.target.value})}/></label>
              <label>Minimum investment ₹<input type="number" min="0" value={investor.min_investment} onChange={e=>setInvestor({...investor,min_investment:e.target.value})}/></label>
              <label>Maximum investment ₹<input type="number" min="0" value={investor.max_investment??''} placeholder="No maximum" onChange={e=>setInvestor({...investor,max_investment:e.target.value})}/></label>
              <label className="membership-rule-active"><input type="checkbox" checked={Boolean(investor.enabled)} onChange={e=>setInvestor({...investor,enabled:e.target.checked})}/><span><strong>Investor enabled</strong><small>Allow eligible members to invest.</small></span></label>
            </div>
          </section>
          <section className="membership-editor-section">
            <div className="membership-editor-title"><span>02</span><div><strong>Industry → Location → Limit</strong><small>State-wide or city-specific capacity</small></div></div>
            <div className="membership-investor-hierarchy">{(investor.industryLimits||[]).map((industry,industryIndex)=><article key={industry.id}>
              <div className="membership-investor-industry-head"><div><strong>{industry.name}</strong><small>{(industry.locations||[]).length} location rules</small></div><label><input type="checkbox" checked={industry.is_active!==false} onChange={e=>updateIndustry(industryIndex,'is_active',e.target.checked)}/> Active</label></div>
              <div className="membership-investor-locations">{(industry.locations||[]).map((location,locationIndex)=><div key={location.id||`${industry.id}-${locationIndex}`}>
                <label>State<select value={location.state_id||''} onChange={e=>updateIndustryLocation(industryIndex,locationIndex,'state_id',e.target.value)}><option value="">Select state</option>{states.map(state=><option key={state.id} value={state.id}>{state.name}</option>)}</select></label>
                <label>City<select value={location.city_id??''} disabled={!location.state_id} onChange={e=>updateIndustryLocation(industryIndex,locationIndex,'city_id',e.target.value||null)}><option value="">All cities</option>{citiesForState(location.state_id).map(city=><option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
                <label>Investor slots<input type="number" min="0" step="0.01" value={location.investor_limit??0} onChange={e=>updateIndustryLocation(industryIndex,locationIndex,'investor_limit',e.target.value)}/></label>
                <label className="membership-check"><input type="checkbox" checked={location.is_active!==false} onChange={e=>updateIndustryLocation(industryIndex,locationIndex,'is_active',e.target.checked)}/> Active</label>
                <button type="button" onClick={()=>removeIndustryLocation(industryIndex,locationIndex)}>×</button>
              </div>)}</div>
              <button type="button" className="membership-add-location" onClick={()=>addIndustryLocation(industryIndex)}>＋ Add location</button>
            </article>)}</div>
          </section>
        </div>
        <div className="membership-modal-actions"><button type="button" onClick={()=>!saving&&setInvestorEditorOpen(false)}>Cancel</button><button className="primary" disabled={saving==='investor'}>{saving==='investor'?'Saving…':'Save investor settings'}</button></div>
      </form>
    </div>}
  </main>
}
