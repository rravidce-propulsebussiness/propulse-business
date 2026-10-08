import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession, getUser } from '../utils/auth'
import UserHeader from '../components/UserHeader'
import {PACKAGE_PRICE_UNITS,formatPublishedPackagePrice} from '../utils/packagePricing'
import ProfileBrochureField from '../components/ProfileBrochureField'
import ProfessionalBrochures from './ProfessionalBrochures'
import './Profile.css'
import './ProfileCompact.css'
import {playSound} from '../utils/soundEffects'

const emptyService=()=>({industryId:'',serviceId:'',subserviceId:''})
const emptyLocation=()=>({stateId:'',cityId:''})
const draftKey=()=>Math.random().toString(36).slice(2)+Date.now().toString(36)
const emptyProject=()=>({_draftKey:draftKey(),title:'',projectType:'',description:'',locationText:'',completionYear:'',areaText:'',budgetText:'',packageName:'',coverImageUrl:'',imageUrls:[],imageDisplayUrls:[],videoUrl:'',videoDisplayUrl:'',videoPublishedAt:'',planUrl:'',planDisplayUrl:'',brochureUrl:'',brochureDisplayUrl:'',isPublished:true})
const canonicalProjectType=value=>/interior|design/i.test(String(value||''))?'Interior Design':/estate|property|plot/i.test(String(value||''))?'Real Estate':/construction|build|villa|commercial|residential/i.test(String(value||''))?'Construction':''
const projectIndustry=value=>value==='Interior Design'?'design':value==='Real Estate'?'property':value==='Construction'?'construction':''
const INDUSTRY_OPTIONS=[{value:'construction',label:'Construction'},{value:'design',label:'Interior Design'},{value:'property',label:'Real Estate'}]
const emptyPlan=()=>({_draftKey:draftKey(),industry:'',title:'',description:'',priceFrom:'',priceUnit:'unspecified',durationLabel:'',inclusions:'',brochureUrl:'',brochureDisplayUrl:'',isPublished:true})

function reasonText(status){
  const reason=status?.reason
  if(status?.eligible)return 'Your business is eligible to appear in Find Professionals.'
  if(reason==='membership_required')return 'An active eligible membership is required before this profile can appear publicly.'
  if(reason==='verification_required')return 'Admin currently requires verified businesses for the public directory.'
  if(reason==='directory_disabled')return 'The public Expert Directory is currently disabled by Admin.'
  if(reason==='profile_hidden')return 'This public profile is currently hidden or disabled.'
  return 'Complete your public business profile to become eligible for the Expert Directory.'
}

function mapProject(item){
  return {
    id:item.id,
    title:item.title||'',
    projectType:canonicalProjectType(item.project_type),
    description:item.description||'',
    locationText:item.location_text||'',
    completionYear:item.completion_year||'',
    areaText:item.area_text||'',
    budgetText:item.budget_text||'',
    packageName:item.package_name||'',
    coverImageUrl:item.cover_image_url||'',
    imageUrls:Array.isArray(item.image_urls)?item.image_urls:[],
    imageDisplayUrls:Array.isArray(item.image_display_urls)?item.image_display_urls:[],
    videoUrl:item.video_url||'',
    videoDisplayUrl:item.video_display_url||item.video_url||'',
    videoPublishedAt:item.video_published_at||'',
    planUrl:item.plan_url||'',
    planDisplayUrl:item.plan_display_url||item.plan_url||'',
    brochureUrl:item.brochure_url||'',
    brochureDisplayUrl:item.brochure_display_url||'',
    isPublished:item.is_published!==false,
  }
}

function mapPlan(item){
  return {
    id:item.id,
    title:item.title||'',
    description:item.description||'',
    industry:item.industry||'',
    priceFrom:item.price_from??'',
    priceUnit:item.price_unit||'unspecified',
    durationLabel:item.duration_label||'',
    inclusions:Array.isArray(item.inclusions)?item.inclusions.join('\n'):'',
    brochureUrl:item.brochure_url||'',
    brochureDisplayUrl:item.brochure_display_url||'',
    isPublished:item.is_published!==false,
  }
}

export default function Profile(){
  const navigate=useNavigate()
  const location=useLocation()
  const [form,setForm]=useState({name:'',email:'',phone:'',businessName:'',businessDetails:'',publicHeadline:'',publicSummary:'',yearsExperience:'',publicProfileEnabled:true})
  const [industries,setIndustries]=useState([])
  const [services,setServices]=useState([])
  const [subservices,setSubservices]=useState([])
  const [states,setStates]=useState([])
  const [cities,setCities]=useState([])
  const [serviceSelections,setServiceSelections]=useState([])
  const [locationSelections,setLocationSelections]=useState([])
  const [companyProofs,setCompanyProofs]=useState([])
  const [projects,setProjects]=useState([])
  const [plans,setPlans]=useState([])
  const [directoryStatus,setDirectoryStatus]=useState(null)
  const [videoUploads,setVideoUploads]=useState({})
  const [imageUploads,setImageUploads]=useState({})
  const [planUploads,setPlanUploads]=useState({})
  const [brochureUploads,setBrochureUploads]=useState({})
  const requestedTab=new URLSearchParams(location.search).get('tab')
  const activeSection=['business','services','locations','public','projects','brochures','plans'].includes(requestedTab)?requestedTab:'business'
  const [expandedProject,setExpandedProject]=useState(null)
  const [expandedPlan,setExpandedPlan]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  useEffect(()=>{
    async function load(){
      try{
        const [profile,industryData,serviceData,subserviceData,stateData,cityData]=await Promise.all([
          authRequest('/profile'),authRequest('/industries'),authRequest('/services'),authRequest('/subservices'),authRequest('/states'),authRequest('/cities'),
        ])
        setForm({
          name:getUser()?.name||'',email:getUser()?.email||'',phone:profile.phone||'',businessName:profile.business_name||'',businessDetails:profile.business_details||'',
          publicHeadline:profile.public_headline||'',publicSummary:profile.public_summary||'',yearsExperience:profile.years_experience??'',publicProfileEnabled:profile.public_profile_enabled!==false,
        })
        setIndustries(industryData);setServices(serviceData);setSubservices(subserviceData);setStates(stateData);setCities(cityData)
        setServiceSelections((profile.services||[]).map(x=>({industryId:String(x.industry_id),serviceId:String(x.service_id),subserviceId:x.subservice_id?String(x.subservice_id):''})))
        setLocationSelections((profile.locations||[]).map(x=>({stateId:String(x.state_id),cityId:String(x.city_id)})))
        setCompanyProofs(Array.isArray(profile.company_proofs)?profile.company_proofs:[])
        setProjects((profile.projects||[]).map(mapProject))
        setPlans((profile.service_plans||[]).map(mapPlan))
        setDirectoryStatus(profile.directory_status||null)
      }catch(err){setError(err.message)}finally{setLoading(false)}
    }
    load()
  },[])

  const serviceOptions=useMemo(()=>serviceSelections.map(x=>services.filter(s=>String(s.industry_id)===String(x.industryId))),[services,serviceSelections])
  const subserviceOptions=useMemo(()=>serviceSelections.map(x=>subservices.filter(s=>String(s.service_id)===String(x.serviceId))),[subservices,serviceSelections])
  const cityOptions=useMemo(()=>locationSelections.map(x=>cities.filter(c=>String(c.state_id)===String(x.stateId))),[cities,locationSelections])
  const initials=(form.businessName||form.name||'P').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'P'
  const completionItems=[
    Boolean(form.name&&form.email&&form.phone),Boolean(form.businessName&&form.businessDetails),
    serviceSelections.length>0&&serviceSelections.every(x=>x.industryId&&x.serviceId),locationSelections.length>0&&locationSelections.every(x=>x.stateId&&x.cityId),
    Boolean(form.publicHeadline&&form.publicSummary),projects.length>0,
  ]
  const completion=Math.round((completionItems.filter(Boolean).length/completionItems.length)*100)

  function selectSection(section){if(activeSection!==section)navigate('/profile?tab='+section);setMessage('');requestAnimationFrame(()=>document.getElementById('profile-tabs')?.scrollIntoView({behavior:'smooth',block:'start'}))}
  function addProject(){const item=emptyProject();setProjects(current=>[...current,item]);setExpandedProject('draft-'+item._draftKey);setMessage('')}
  function addPlan(){const item=emptyPlan();setPlans(current=>[...current,item]);setExpandedPlan('draft-'+item._draftKey);setMessage('')}
  function projectKey(item){return item.id?'project-'+item.id:'draft-'+item._draftKey}
  function planKey(item){return item.id?'plan-'+item.id:'draft-'+item._draftKey}
  function revealProjectError(index,message){setExpandedProject(projectKey(projects[index]));navigate('/profile?tab=projects');setError(message);requestAnimationFrame(()=>document.getElementById('profile-tabs')?.scrollIntoView({block:'start',behavior:'smooth'}))}
  function revealPlanError(index,message){setExpandedPlan(planKey(plans[index]));navigate('/profile?tab=plans');setError(message);requestAnimationFrame(()=>document.getElementById('profile-tabs')?.scrollIntoView({block:'start',behavior:'smooth'}))}
  function update(field,value){setForm(x=>({...x,[field]:value}));setMessage('')}
  function updateService(index,field,value){setServiceSelections(items=>items.map((x,i)=>i!==index?x:field==='industryId'?{industryId:value,serviceId:'',subserviceId:''}:field==='serviceId'?{...x,serviceId:value,subserviceId:''}:{...x,[field]:value}));setMessage('')}
  function updateLocation(index,field,value){setLocationSelections(items=>items.map((x,i)=>i!==index?x:field==='stateId'?{stateId:value,cityId:''}:{...x,cityId:value}));setMessage('')}
  function updateProject(index,field,value){setProjects(items=>items.map((item,i)=>i!==index?item:field==='projectType'?{...item,projectType:value,packageName:''}:field==='videoUrl'?{...item,videoUrl:value,videoDisplayUrl:value}:field==='planUrl'?{...item,planUrl:value,planDisplayUrl:value}:field==='brochureUrl'?{...item,brochureUrl:value,brochureDisplayUrl:value}:{...item,[field]:value}));setMessage('')}
  function updatePlan(index,field,value){setPlans(items=>items.map((item,i)=>i===index?field==='brochureUrl'?{...item,brochureUrl:value,brochureDisplayUrl:value}:{...item,[field]:value}:item));setMessage('')}

  async function uploadProjectImages(index,files){
    const photos=Array.from(files||[]);
    if(!photos.length)return;
    const current=projects[index]?.imageUrls||[];
    if(current.length+photos.length>8)return setError('Maximum 8 gallery photos per project.');
    const types={'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp'};
    if(photos.some(photo=>!['image/jpeg','image/png','image/webp'].includes(photo.type||types[String(photo.name||'').split('.').pop()?.toLowerCase()])||photo.size>12*1024*1024)){
      return setError('Choose JPG, PNG or WebP photos, up to 12 MB each.');
    }
    setImageUploads(v=>({...v,[index]:true}));
    setError('');setMessage('');
    try{
      const results=[];
      for(const photo of photos){
        const type=photo.type||types[String(photo.name||'').split('.').pop()?.toLowerCase()];
        results.push(await authRequest('/profile/projects/image',{
          method:'POST',headers:{'Content-Type':type},body:photo,timeoutMs:90000,
        }));
      }
      setProjects(items=>items.map((item,i)=>i!==index?item:{
        ...item,
        imageUrls:[...(item.imageUrls||[]),...results.map(x=>x.url)].slice(0,8),
        imageDisplayUrls:[...(item.imageDisplayUrls||[]),...results.map(x=>x.displayUrl||x.url)].slice(0,8),
      }));
      playSound('upload');
      setMessage('Photos uploaded. Save changes to publish them in the Projects gallery.');
    }catch(error){
      playSound('warning');setError(error.message||'Photo upload failed.');
    }finally{setImageUploads(v=>({...v,[index]:false}));}
  }

  async function uploadProjectVideo(index,file){
    if(!file)return
    const extension=String(file.name||'').toLowerCase().split('.').pop()
    const inferred={mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'}[extension]
    const mime=file.type||inferred||''
    if(!['video/mp4','video/quicktime','video/webm'].includes(mime)){
      setError('Only MP4, MOV and WebM project videos are supported.')
      return
    }
    if(file.size>50*1024*1024){
      setError('Project videos must be 50 MB or smaller.')
      return
    }
    try{
      setVideoUploads(current=>({...current,[index]:true}))
      setError('');setMessage('')
      const result=await authRequest('/profile/projects/video',{
        method:'POST',
        headers:{'Content-Type':mime},
        body:file,
        timeoutMs:120000,
      })
      setProjects(items=>items.map((item,i)=>i===index?{...item,videoUrl:result.url||'',videoDisplayUrl:result.displayUrl||result.url||'',videoPublishedAt:result.uploadedAt||''}:item))
      playSound('upload')
      setMessage('Video uploaded. Save changes to publish it on your profile and Projects page.')
    }catch(err){
      playSound('warning')
      setError(err.message||'Unable to upload project video.')
    }finally{
      setVideoUploads(current=>({...current,[index]:false}))
    }
  }

  function playableVideo(url){
    const value=String(url||'')
    return value.startsWith('/uploads/business-projects/')||/\.(mp4|mov|webm)(?:$|[?#])/i.test(value)
  }

  async function uploadProjectPlan(index,file){
    if(!file)return
    const extension=String(file.name||'').toLowerCase().split('.').pop()
    const inferred={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[extension]
    const mime=file.type||inferred||''
    if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(mime)){
      setError('Only PDF, JPG, PNG and WebP plan files are supported.')
      return
    }
    if(file.size>15*1024*1024){
      setError('Plan / drawing files must be 15 MB or smaller.')
      return
    }
    try{
      setPlanUploads(current=>({...current,[index]:true}))
      setError('');setMessage('')
      const result=await authRequest('/profile/projects/plan',{
        method:'POST',
        headers:{'Content-Type':mime},
        body:file,
        timeoutMs:90000,
      })
      setProjects(items=>items.map((item,i)=>i===index?{...item,planUrl:result.url||'',planDisplayUrl:result.displayUrl||result.url||''}:item))
      playSound('upload')
      setMessage('Plan / drawing uploaded. Save changes to attach it to this project.')
    }catch(err){
      playSound('warning')
      setError(err.message||'Unable to upload plan / drawing.')
    }finally{
      setPlanUploads(current=>({...current,[index]:false}))
    }
  }

  async function uploadBrochure(type,index,file){
    if(!file)return;
    if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name||'')){
      setError('Select a PDF brochure (images are not supported for specifications).');return;
    }
    if(file.size<=0||file.size>15*1024*1024){
      setError('Brochure PDF must be 15 MB or smaller.');return;
    }
    const key=type+'-'+index;
    try{
      setBrochureUploads(current=>({...current,[key]:true}));
      setError('');setMessage('');
      const result=await authRequest('/profile/projects/plan',{
        method:'POST',headers:{'Content-Type':'application/pdf'},body:file,timeoutMs:90000,
      });
      if(!result.url)throw new Error('The upload completed without a file reference');
      const update=item=>({...item,brochureUrl:result.url,brochureDisplayUrl:result.displayUrl||result.url});
      if(type==='project')setProjects(items=>items.map((item,i)=>i===index?update(item):item));
      else setPlans(items=>items.map((item,i)=>i===index?update(item):item));
      playSound('upload');setMessage('Brochure uploaded. Click Save changes to publish it.');
    }catch(err){playSound('warning');setError(err.message||'Could not upload brochure PDF.');}
    finally{setBrochureUploads(current=>({...current,[key]:false}));}
  }

  function planPreviewKind(url){
    const value=String(url||'').toLowerCase()
    if(/\.pdf(?:$|[?#])/.test(value))return 'pdf'
    if(/\.(?:jpg|jpeg|png|webp)(?:$|[?#])/.test(value))return 'image'
    return 'external'
  }

  function addAllServicesForIndustry(index){
    const industryId=serviceSelections[index]?.industryId
    if(!industryId)return setError('Select an industry first.')
    const available=services.filter(service=>String(service.industry_id)===String(industryId))
    if(!available.length)return setError('No services are available for this industry.')
    setServiceSelections(items=>{
      const existing=new Set(items.map(item=>`${item.industryId}:${item.serviceId}`))
      const additions=available.filter(service=>!existing.has(`${industryId}:${service.id}`)).map(service=>({industryId:String(industryId),serviceId:String(service.id),subserviceId:''}))
      return additions.length?[...items,...additions]:items
    })
    setMessage('All available services for this industry were added.');setError('')
  }

  async function save(e){
    e.preventDefault();setError('');setMessage('')
    if(!form.name.trim()||!form.email.trim()||!form.phone.trim()||!form.businessName.trim()||!form.businessDetails.trim())return setError('Complete all business information before saving.')
    if(!serviceSelections.length||serviceSelections.some(x=>!x.industryId||!x.serviceId))return setError('Complete every service selection.')
    if(!locationSelections.length||locationSelections.some(x=>!x.stateId||!x.cityId))return setError('Complete every location selection.')
    const untitledProject=projects.findIndex(item=>!item.title.trim())
    if(untitledProject>=0)return revealProjectError(untitledProject,'Every completed project needs a title.')
    const unclassifiedProject=projects.findIndex(item=>item.isPublished&&!['Construction','Interior Design','Real Estate'].includes(item.projectType))
    if(unclassifiedProject>=0)return revealProjectError(unclassifiedProject,'Select Construction, Interior Design or Real Estate for every published project before saving.')
    const missingYearProject=projects.findIndex(item=>item.isPublished&&(!Number.isInteger(Number(item.completionYear))||Number(item.completionYear)<1950||Number(item.completionYear)>new Date().getFullYear()))
    if(missingYearProject>=0)return revealProjectError(missingYearProject,'To publish a completed project, enter its actual completion year. Uncheck Public to save unfinished work privately.')
    const untitledPlan=plans.findIndex(item=>!item.title.trim())
    if(untitledPlan>=0)return revealPlanError(untitledPlan,'Every service package needs a name.')
    const missingIndustryPlan=plans.findIndex(item=>item.isPublished&&!INDUSTRY_OPTIONS.some(option=>option.value===item.industry))
    if(missingIndustryPlan>=0)return revealPlanError(missingIndustryPlan,'Select an industry for this published package before saving. Existing packages without an industry must be classified.')
    const mismatchedPackageProject=projects.findIndex(item=>item.packageName&&!plans.some(plan=>plan.isPublished&&plan.title===item.packageName&&plan.industry===projectIndustry(item.projectType)))
    if(mismatchedPackageProject>=0)return revealProjectError(mismatchedPackageProject,'A project can only link to a published package from the same industry. Review the linked package.')
    try{
      setSaving(true)
      const result=await authRequest('/profile',{method:'PUT',body:JSON.stringify({
        ...form,
        yearsExperience:form.yearsExperience===''?null:Number(form.yearsExperience),
        services:serviceSelections.map(x=>({industryId:Number(x.industryId),serviceId:Number(x.serviceId),subserviceId:x.subserviceId?Number(x.subserviceId):null})),
        locations:locationSelections.map(x=>({stateId:Number(x.stateId),cityId:Number(x.cityId)})),
        projects:projects.map(item=>({...item,completionYear:item.completionYear===''?null:Number(item.completionYear)})),
        plans:plans.map(item=>({...item,priceFrom:item.priceFrom===''?null:Number(item.priceFrom),inclusions:item.inclusions.split('\n').map(v=>v.trim()).filter(Boolean)})),
      })})
      saveSession({user:result.user})
      const savedProfile=result.user?.profile
      if(savedProfile){
        setProjects((savedProfile.projects||[]).map(mapProject));setPlans((savedProfile.service_plans||[]).map(mapPlan));setDirectoryStatus(savedProfile.directory_status||null)
      }
      playSound('success')
      setExpandedProject(null);setExpandedPlan(null)
      setMessage('Profile saved successfully. Public directory content is up to date.')
    }catch(err){playSound('warning');setError(err.message)}finally{setSaving(false)}
  }

  if(loading)return <><UserHeader/><div className="profile-page"><div className="profile-loading">Loading your business profile…</div></div></>

  return <>
    <UserHeader/>
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero-glow"/>
        <div className="profile-avatar">{initials}</div>
        <div className="profile-hero-main">
          <div className="profile-hero-title"><div><span className="profile-kicker">BUSINESS PROFILE</span><h1>{form.businessName||form.name||'Business profile'}</h1><p>{form.publicHeadline||form.businessDetails||'Build a strong public profile customers can evaluate before creating a requirement.'}</p></div><button className="profile-hero-back" type="button" onClick={()=>navigate('/professionals')}>← Marketplace</button></div>
          <div className="profile-hero-meta"><span>✉ {form.email||'Email not set'}</span><span>☎ {form.phone||'Phone not set'}</span><span>⌁ {locationSelections.length} location{locationSelections.length===1?'':'s'}</span><span>✦ {serviceSelections.length} service{serviceSelections.length===1?'':'s'}</span><span>▣ {projects.length} project{projects.length===1?'':'s'}</span></div>
        </div>
        <div className="profile-completion-mini"><strong>{completion}%</strong><span>Profile complete</span><div><i style={{width:`${completion}%`}}/></div></div>
      </section>

      <section className={`profile-directory-banner ${directoryStatus?.eligible?'eligible':'attention'}`}>
        <div><span>{directoryStatus?.eligible?'PUBLIC DIRECTORY READY':'PUBLIC DIRECTORY STATUS'}</span><h3>{directoryStatus?.eligible?'Your business can appear in Experts':'Complete eligibility for Experts'}</h3><p>{reasonText(directoryStatus)}</p></div>
        <div className="profile-directory-actions">{directoryStatus?.membership&&<b>{String(directoryStatus.membership.planGroup||'').toUpperCase()} member</b>}{directoryStatus?.eligible&&<Link to="/experts">Preview Experts ↗</Link>}</div>
      </section>

      <nav className="profile-tabs" id="profile-tabs" aria-label="Profile sections">
        <button type="button" className={activeSection==='business'?'active':''} onClick={()=>selectSection('business')}>Business</button>
        <button type="button" className={activeSection==='services'?'active':''} onClick={()=>selectSection('services')}>Services</button>
        <button type="button" className={activeSection==='locations'?'active':''} onClick={()=>selectSection('locations')}>Locations</button>
        <button type="button" className={activeSection==='public'?'active':''} onClick={()=>selectSection('public')}>Public profile</button>
        <button type="button" className={activeSection==='projects'?'active':''} onClick={()=>selectSection('projects')}>Projects</button>
        <button type="button" className={activeSection==='brochures'?'active':''} onClick={()=>selectSection('brochures')}>Company Brochures</button>
        <button type="button" className={activeSection==='plans'?'active':''} onClick={()=>selectSection('plans')}>Packages</button>
      </nav>

      {error&&<div className="profile-alert error">{error}</div>}
      {message&&<div className="profile-alert success">{message}</div>}

      {activeSection==='brochures'?<ProfessionalBrochures embedded/>:<form onSubmit={save} className={"profile-form"+(["public","projects","plans"].includes(activeSection)?" profile-form-wide":"")}>
        <div className="profile-main-column">
          {activeSection==='business'&&<>
          <section className="profile-panel profile-information" id="profile-information">
            <div className="panel-title"><div><span>01</span><h2>Business information</h2><p>Private account and core business details.</p></div></div>
            <div className="profile-grid"><label>Full name<input value={form.name} onChange={e=>update('name',e.target.value)} required/></label><label>Email<input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required/></label><label>Phone<input value={form.phone} onChange={e=>update('phone',e.target.value)} required/></label><label>Business name<input value={form.businessName} onChange={e=>update('businessName',e.target.value)} required/></label><label className="wide">Business details<textarea rows="4" value={form.businessDetails} onChange={e=>update('businessDetails',e.target.value)} required/></label></div>
          </section>
          </>}

          {activeSection==='services'&&<>
          <section className="profile-panel" id="profile-services">
            <div className="panel-title"><div><span>02</span><h2>Services you provide</h2><p>These services drive lead matching and appear on your public profile.</p></div><button type="button" onClick={()=>setServiceSelections(x=>[...x,emptyService()])}>+ Add service</button></div>
            <div className="profile-list">{serviceSelections.map((x,i)=><div className="profile-row" key={`s-${i}`}><div className="row-number">{String(i+1).padStart(2,'0')}</div><label>Industry<select value={x.industryId} onChange={e=>updateService(i,'industryId',e.target.value)} required><option value="">Select industry</option>{industries.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Service<select value={x.serviceId} onChange={e=>updateService(i,'serviceId',e.target.value)} disabled={!x.industryId} required><option value="">Select service</option>{(serviceOptions[i]||[]).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Subservice <small>Optional · blank means all</small><select value={x.subserviceId} onChange={e=>updateService(i,'subserviceId',e.target.value)} disabled={!x.serviceId}><option value="">All related</option>{(subserviceOptions[i]||[]).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><button type="button" className="add-all-services" onClick={()=>addAllServicesForIndustry(i)} disabled={!x.industryId}>Add all services</button><button type="button" className="row-remove" onClick={()=>setServiceSelections(items=>items.filter((_,n)=>n!==i))}>Remove</button></div>)}</div>
          </section>
          </>}

          {activeSection==='locations'&&<>
          <section className="profile-panel" id="profile-locations">
            <div className="panel-title"><div><span>03</span><h2>Locations you serve</h2><p>Customers can see the cities you cover, but not your private contact information.</p></div><button type="button" onClick={()=>setLocationSelections(x=>[...x,emptyLocation()])}>+ Add location</button></div>
            <div className="profile-list">{locationSelections.map((x,i)=><div className="profile-row location-row" key={`l-${i}`}><div className="row-number">{String(i+1).padStart(2,'0')}</div><label>State / UT<select value={x.stateId} onChange={e=>updateLocation(i,'stateId',e.target.value)} required><option value="">Select state / UT</option>{states.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>City<select value={x.cityId} onChange={e=>updateLocation(i,'cityId',e.target.value)} disabled={!x.stateId} required><option value="">Select city</option>{(cityOptions[i]||[]).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><button type="button" className="row-remove" onClick={()=>setLocationSelections(items=>items.filter((_,n)=>n!==i))}>Remove</button></div>)}</div>
          </section>
          </>}

          {activeSection==='public'&&<>
          <section className="profile-panel profile-public-panel" id="profile-public">
            <div className="panel-title"><div><span>04</span><h2>Public profile</h2><p>This copy is shown to homeowners in Find Professionals.</p></div><label className="profile-public-toggle"><input type="checkbox" checked={form.publicProfileEnabled} onChange={e=>update('publicProfileEnabled',e.target.checked)}/><span>Publish when eligible</span></label></div>
            <div className="profile-grid"><label className="wide">Public headline<input maxLength="180" value={form.publicHeadline} onChange={e=>update('publicHeadline',e.target.value)} placeholder="Turnkey home construction with transparent project execution"/></label><label>Years of experience<input type="number" min="0" max="100" value={form.yearsExperience} onChange={e=>update('yearsExperience',e.target.value)} placeholder="e.g. 8"/></label><label className="wide">Public summary<textarea rows="5" maxLength="3000" value={form.publicSummary} onChange={e=>update('publicSummary',e.target.value)} placeholder="Describe your strengths, process, project types, materials, team and customer experience…"/></label></div>
          </section>
          </>}

          {activeSection==='projects'&&<>
          <section className="profile-panel profile-project-panel" id="profile-projects">
            <div className="panel-title"><div><span>05</span><h2>Completed Projects</h2><p>Add completed work, photos and a project-specific brochure with materials and specifications. Keep unfinished work private.</p></div><button type="button" onClick={addProject}>+ Add Project</button></div>
            <div className="profile-showcase-list">{projects.map((project,index)=>{const isExpanded=expandedProject===projectKey(project);return <article className={"profile-showcase-card profile-entry-card"+(isExpanded?" is-expanded":"")} key={projectKey(project)}>
              <div className="profile-showcase-card-head profile-entry-head">
                <div className="profile-entry-overview">
                  <div className="profile-entry-thumbnail">{(project.imageDisplayUrls?.[0]||project.coverImageUrl)?<img src={project.imageDisplayUrls?.[0]||project.coverImageUrl} alt="" loading="lazy"/>:<span aria-hidden="true">▧</span>}</div>
                  <div className="profile-entry-summary">
                    <span>PROJECT {String(index+1).padStart(2,'0')} · {project.projectType||'Choose industry'}</span>
                    <h3>{project.title||'New project'}</h3>
                    <p>{[project.locationText,project.completionYear&&'Completed '+project.completionYear,project.areaText].filter(Boolean).join(' · ')||'Complete project details to publish'}</p>
                  </div>
                </div>
                <div className="profile-entry-actions">
                  <span className={'profile-entry-status '+(project.isPublished?'published':'draft')}>{project.isPublished?'Public':'Private draft'}</span>
                  <button type="button" className="profile-entry-edit" aria-expanded={isExpanded} aria-controls={'project-editor-'+index} onClick={()=>setExpandedProject(isExpanded?null:projectKey(project))}>{isExpanded?'Close editor':'Edit project'} <span aria-hidden="true">{isExpanded?'−':'＋'}</span></button>
                </div>
              </div>
              {isExpanded&&<div className="profile-entry-body" id={'project-editor-'+index}>
                <div className="profile-entry-controls"><label className="profile-inline-check"><input type="checkbox" checked={project.isPublished} onChange={e=>updateProject(index,'isPublished',e.target.checked)}/> Publish in completed projects</label><button type="button" className="row-remove" onClick={()=>{setProjects(items=>items.filter((_,i)=>i!==index));setExpandedProject(null)}}>Remove project</button></div>
              <div className="profile-showcase-grid"><label>Project title<input value={project.title} maxLength="180" onChange={e=>updateProject(index,'title',e.target.value)} placeholder="3BHK premium apartment interiors"/></label><label>Project industry <select value={project.projectType||''} onChange={e=>updateProject(index,'projectType',e.target.value)} required={project.isPublished}><option value="">Select category</option><option value="Construction">Construction</option><option value="Interior Design">Interior Design</option><option value="Real Estate">Real Estate</option></select></label><label>Location<input value={project.locationText} maxLength="180" onChange={e=>updateProject(index,'locationText',e.target.value)} placeholder="Hyderabad, Telangana"/></label><label>Completion year {project.isPublished?'(required to publish)':''}<input type="number" min="1950" max={new Date().getFullYear()} value={project.completionYear} onChange={e=>updateProject(index,'completionYear',e.target.value)}/></label><label>Area<input value={project.areaText} maxLength="120" onChange={e=>updateProject(index,'areaText',e.target.value)} placeholder="2,400 sq ft"/></label><label>Project value / budget<input value={project.budgetText} maxLength="120" onChange={e=>updateProject(index,'budgetText',e.target.value)} placeholder="₹28–32 lakh"/></label><label>Related published package
                  <select value={project.packageName||''} onChange={e=>updateProject(index,'packageName',e.target.value)}>
                    <option value="">No package linked</option>
                    {plans.filter(plan=>plan.isPublished&&plan.title&&plan.industry===projectIndustry(project.projectType)).map(plan=><option value={plan.title} key={plan.id||plan.title}>{plan.title}</option>)}
                  </select>
                </label><label className="wide">Description<textarea rows="3" value={project.description} maxLength="3000" onChange={e=>updateProject(index,'description',e.target.value)} placeholder="Scope completed, design approach, materials and outcome…"/></label><label className="wide">Cover image URL<input value={project.coverImageUrl} onChange={e=>updateProject(index,'coverImageUrl',e.target.value)} placeholder="https://… image"/></label>
                <div className="profile-project-gallery-field">
                  <label className="profile-gallery-upload">
                    <span>{imageUploads[index]?'Uploading photos…':'Add project gallery photos'}</span>
                    <small>JPG, PNG or WebP · up to 8 images · 12 MB each</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple disabled={Boolean(imageUploads[index])||(project.imageUrls||[]).length>=8} onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';uploadProjectImages(index,files)}}/>
                  </label>
                  {(project.imageUrls||[]).length>0&&<div className="profile-gallery-grid">
                    {project.imageUrls.map((url,photoIndex)=><div className="profile-gallery-photo" key={url+photoIndex}>
                      <img src={project.imageDisplayUrls?.[photoIndex]||url} alt={'Project gallery '+(photoIndex+1)}/>
                      <button type="button" onClick={()=>setProjects(items=>items.map((item,i)=>i!==index?item:{...item,imageUrls:item.imageUrls.filter((_,j)=>j!==photoIndex),imageDisplayUrls:(item.imageDisplayUrls||[]).filter((_,j)=>j!==photoIndex)}))} aria-label={'Remove gallery photo '+(photoIndex+1)}>×</button>
                    </div>)}
                  </div>}
                  <small className="profile-gallery-help">Your published photos appear automatically on the public Projects page after you save.</small>
                </div>
                <div className="profile-video-field"><label>Video URL<input value={project.videoUrl} onChange={e=>updateProject(index,'videoUrl',e.target.value)} placeholder="Upload a video below or paste https://…"/></label><label className={'profile-video-upload '+(videoUploads[index]?'busy':'')}><span>{videoUploads[index]?'Uploading video…':'Upload video'}</span><small>MP4, MOV or WebM · max 50 MB</small><input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" disabled={Boolean(videoUploads[index])} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadProjectVideo(index,file)}}/></label>{project.videoUrl&&playableVideo(project.videoDisplayUrl||project.videoUrl)&&<video className="profile-project-video-preview" controls preload="metadata" src={project.videoDisplayUrl||project.videoUrl}/>} {project.videoUrl&&!playableVideo(project.videoDisplayUrl||project.videoUrl)&&<a className="profile-video-link" href={project.videoDisplayUrl||project.videoUrl} target="_blank" rel="noreferrer">Open external video ↗</a>}</div><div className="profile-plan-file-field"><label>Plan / drawing link <small>Optional if hosted elsewhere</small><input value={project.planUrl} onChange={e=>updateProject(index,'planUrl',e.target.value)} placeholder="Upload below or paste https://…"/></label><label className={'profile-plan-upload '+(planUploads[index]?'busy':'')}><span>{planUploads[index]?'Uploading plan…':'Upload plan / drawing'}</span><small>PDF, JPG, PNG or WebP · max 15 MB</small><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" disabled={Boolean(planUploads[index])} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadProjectPlan(index,file)}}/></label>{project.planUrl&&planPreviewKind(project.planDisplayUrl||project.planUrl)==='image'&&<img className="profile-plan-preview" src={project.planDisplayUrl||project.planUrl} alt={(project.title||'Project')+' plan / drawing'}/>} {project.planUrl&&planPreviewKind(project.planDisplayUrl||project.planUrl)==='pdf'&&<a className="profile-plan-link" href={project.planDisplayUrl||project.planUrl} target="_blank" rel="noreferrer">View PDF plan ↗</a>} {project.planUrl&&planPreviewKind(project.planDisplayUrl||project.planUrl)==='external'&&<a className="profile-plan-link" href={project.planDisplayUrl||project.planUrl} target="_blank" rel="noreferrer">Open plan / drawing ↗</a>} {project.planUrl&&<button type="button" className="profile-plan-remove" onClick={()=>updateProject(index,'planUrl','')}>Remove plan / drawing</button>}</div></div>
              <ProfileBrochureField title="Project specifications / brochure" description="Upload the project scope, materials, brands, finishes or handover dossier as a PDF. Customers will see it on the public project page." url={project.brochureUrl} displayUrl={project.brochureDisplayUrl} busy={Boolean(brochureUploads['project-'+index])} onUpload={file=>uploadBrochure('project',index,file)} onRemove={()=>updateProject(index,'brochureUrl','')}/>
              </div>}
            </article>})}{!projects.length&&<div className="profile-showcase-empty"><b>No completed projects added yet.</b><span>Add real work to make your public profile stronger.</span></div>}</div>
          </section>
          <section className="profile-panel profile-callback-panel" aria-label="Open customer requests CRM">
            <div className="panel-title"><div><span>REQUESTS CRM</span><h2>Customer enquiries</h2><p>Profile callbacks, project requests and quotations now live in the dedicated Requests workspace.</p></div><Link to="/professional-requests">Open Requests →</Link></div>
          </section>
          </>}

          {activeSection==='plans'&&<>
          <section className="profile-panel profile-plan-panel" id="profile-plans">
            <div className="panel-title"><div><span>06</span><h2>Service Packages</h2><p>Set prices, scope and inclusions. Attach specifications PDFs for customers to review. Each project has its own separate brochure upload.</p></div><button type="button" onClick={addPlan}>+ Add Package</button></div>
            <div className="profile-showcase-list">{plans.map((plan,index)=>{const isExpanded=expandedPlan===planKey(plan);return <article className={"profile-showcase-card compact profile-entry-card"+(isExpanded?" is-expanded":"")} key={planKey(plan)}><div className="profile-showcase-card-head profile-entry-head">
                <div className="profile-entry-overview">
                  <div className="profile-entry-thumbnail profile-entry-plan-icon" aria-hidden="true">₹</div>
                  <div className="profile-entry-summary">
                    <span>PACKAGE {String(index+1).padStart(2,'0')} · {INDUSTRY_OPTIONS.find(option=>option.value===plan.industry)?.label||'Choose industry'}</span>
                    <h3>{plan.title||'New package'}</h3>
                    <p>{plan.priceFrom!==''?formatPublishedPackagePrice(plan.priceFrom,plan.priceUnit):'Starting price not set'}{plan.durationLabel?' · '+plan.durationLabel:''}{plan.brochureUrl?' · Brochure attached':''}</p>
                  </div>
                </div>
                <div className="profile-entry-actions">
                  <span className={'profile-entry-status '+(plan.isPublished?'published':'draft')}>{plan.isPublished?'Public':'Private draft'}</span>
                  <button type="button" className="profile-entry-edit" aria-expanded={isExpanded} aria-controls={'package-editor-'+index} onClick={()=>setExpandedPlan(isExpanded?null:planKey(plan))}>{isExpanded?'Close editor':'Edit package'} <span aria-hidden="true">{isExpanded?'−':'＋'}</span></button>
                </div>
              </div>
              {isExpanded&&<div className="profile-entry-body" id={'package-editor-'+index}>
                <div className="profile-entry-controls"><label className="profile-inline-check"><input type="checkbox" checked={plan.isPublished} onChange={e=>updatePlan(index,'isPublished',e.target.checked)}/> Publish this package</label><button type="button" className="row-remove" onClick={()=>{setPlans(items=>items.filter((_,i)=>i!==index));setExpandedPlan(null)}}>Remove package</button></div><div className="profile-showcase-grid"><label>Industry <select value={plan.industry||''} onChange={e=>updatePlan(index,'industry',e.target.value)} required={plan.isPublished}><option value="">Select industry</option>{INDUSTRY_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Packages only appear in quotations for projects in this industry.</small></label><label>Package name<input value={plan.title} maxLength="160" onChange={e=>updatePlan(index,'title',e.target.value)} placeholder="Premium turnkey interiors"/></label><label>Starting price (₹)<input type="number" min="0" value={plan.priceFrom} onChange={e=>updatePlan(index,'priceFrom',e.target.value)} placeholder="500000"/></label><label>Price unit<select value={plan.priceUnit} onChange={e=>updatePlan(index,'priceUnit',e.target.value)}>{PACKAGE_PRICE_UNITS.map(unit=><option key={unit.value} value={unit.value}>{unit.label}</option>)}</select><small>Important for ₹/sq ft, ₹/sq yd and fixed-price packages.</small></label><label>Duration<input value={plan.durationLabel} maxLength="120" onChange={e=>updatePlan(index,'durationLabel',e.target.value)} placeholder="8–10 weeks"/></label><label className="wide">Description<textarea rows="3" value={plan.description} maxLength="2000" onChange={e=>updatePlan(index,'description',e.target.value)} placeholder="Who this plan is for and what customers should expect…"/></label><label className="wide">Package inclusions <small>Add one inclusion per line</small><textarea rows="4" value={plan.inclusions} onChange={e=>updatePlan(index,'inclusions',e.target.value)} placeholder="Design consultation; material selection; execution management"/></label></div>
              <ProfileBrochureField title="Package brochure / technical specifications" description="Upload your detailed package PDF: plywood grades, laminate and hardware brands, inclusions, exclusions, milestones and warranty terms." url={plan.brochureUrl} displayUrl={plan.brochureDisplayUrl} busy={Boolean(brochureUploads['plan-'+index])} onUpload={file=>uploadBrochure('plan',index,file)} onRemove={()=>updatePlan(index,'brochureUrl','')}/>
              </div>}
            </article>})}{!plans.length&&<div className="profile-showcase-empty"><b>No public service plans added.</b><span>Add packages only if you want customers to compare offerings in Experts.</span></div>}</div>
          </section>
          </>}

          {activeSection==='business'&&<section className="profile-panel profile-proof-panel">
            <div className="panel-title"><div><span>07</span><h2>Company proof</h2><p>Verification documents remain private and are reviewed by ProPulse Admin.</p></div></div>
            {companyProofs.length?<div className="profile-proof-list">{companyProofs.map(doc=><div className="profile-proof-item" key={doc.id||(doc.original_name+'-'+doc.created_at)}><div className="profile-proof-icon">{String(doc.mime_type||'').includes('pdf')?'PDF':'IMG'}</div><div className="profile-proof-info"><strong>{doc.original_name||'Company proof document'}</strong><small>{doc.mime_type||'Document'} · {doc.file_size?(Number(doc.file_size)/1024/1024).toFixed(2)+' MB':''}{doc.status?' · '+String(doc.status).replace(/^./,m=>m.toUpperCase()):''}</small></div>{doc.file_url&&<a className="profile-proof-view" href={doc.file_url} target="_blank" rel="noreferrer">View document ↗</a>}</div>)}</div>:<div className="profile-proof-empty"><strong>No company proof documents found</strong><span>Upload a proof document from signup to complete business verification.</span></div>}
          </section>}
          <div className="profile-save"><button type="submit" disabled={saving}>{saving?'Saving…':'Save changes'} <span>→</span></button></div>
        </div>

        <aside className="profile-side-column">
          <section className="profile-side-card profile-progress-card"><div className="profile-ring" style={{'--progress':`${completion*3.6}deg`}}><strong>{completion}%</strong></div><div><span className="side-kicker">PROFILE COMPLETION</span><h3>Build a credible profile</h3><p>Services, locations and real project evidence make the public profile more useful.</p></div><ul><li className={completionItems[0]?'done':''}>Personal information</li><li className={completionItems[1]?'done':''}>Business details</li><li className={completionItems[2]?'done':''}>Services</li><li className={completionItems[3]?'done':''}>Lead locations</li><li className={completionItems[4]?'done':''}>Public profile copy</li><li className={completionItems[5]?'done':''}>Completed project</li></ul></section>
          <section className="profile-side-card"><span className="side-icon">✦</span><span className="side-kicker">PUBLIC SHOWCASE</span><h3>What customers can review</h3><div className="coverage-stat"><strong>{projects.filter(x=>x.isPublished).length}</strong><span>Projects</span></div><div className="coverage-stat"><strong>{plans.filter(x=>x.isPublished).length}</strong><span>Packages</span></div><p>Phone and email remain protected on the public directory.</p></section>
          <section className="profile-side-card profile-membership-card"><span className="side-kicker">EXPERT DIRECTORY</span><h3>{directoryStatus?.eligible?'Eligible for Expert Directory':directoryStatus?.membership?`${String(directoryStatus.membership.planGroup||'').toUpperCase()} membership`:'No active eligible plan'}</h3><p>{reasonText(directoryStatus)}</p>{directoryStatus?.eligible&&<Link to="/experts">View directory ↗</Link>}</section>
        </aside>

      </form>}
    </div>
  </>
}