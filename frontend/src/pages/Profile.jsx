import BootLoader from '../components/BootLoader'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession, getUser } from '../utils/auth'
import UserHeader from '../components/UserHeader'
import {PACKAGE_PRICE_UNITS,formatPublishedPackagePrice} from '../utils/packagePricing'
import { PROFILE_PACKAGE_TIERS, getPreferredPackageIndustry, resolveProfilePackages, editableStarterSpecifications } from '../utils/profilePackageTemplates'
import { ALL_SERVICES_VALUE, selectAllIndustryServices } from '../utils/profileServiceSelection'
import ProfileBrochureField from '../components/ProfileBrochureField'
import ProfessionalPackageSpecEditor from '../components/ProfessionalPackageSpecEditor'
import ProjectMediaViewer from '../components/ProjectMediaViewer'
import ProfessionalBrochures from './ProfessionalBrochures'
import './Profile.css'
import './ProfileCompact.css'
import './ProfileWorkspace.css'
import {playSound} from '../utils/soundEffects'

const emptyService=()=>({industryId:'',serviceId:'',subserviceId:''})
const emptyLocation=()=>({stateId:'',cityId:''})
// Compare current editable values to the last successfully loaded/saved state.
// Keeps the bottom Save action usable even after an accordion editor is closed.
const profileFingerprint=(form,services,locations,projects,plans)=>JSON.stringify({form,services,locations,projects,plans})
const draftKey=()=>Math.random().toString(36).slice(2)+Date.now().toString(36)
const projectSlug=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/,'')
const emptyProject=()=>({_draftKey:draftKey(),seoSlug:'',seoTitle:'',seoDescription:'',seoKeyword:'',title:'',projectType:'',description:'',locationText:'',completionYear:'',areaText:'',budgetText:'',packageName:'',coverImageUrl:'',imageUrls:[],imageDisplayUrls:[],videoUrl:'',videoDisplayUrl:'',videoPublishedAt:'',planUrl:'',planDisplayUrl:'',brochureUrl:'',brochureDisplayUrl:'',isPublished:true})
const canonicalProjectType=value=>/interior|design/i.test(String(value||''))?'Interior Design':/estate|property|plot/i.test(String(value||''))?'Real Estate':/construction|build|villa|commercial|residential/i.test(String(value||''))?'Construction':''
const projectIndustry=value=>value==='Interior Design'?'design':value==='Real Estate'?'property':value==='Construction'?'construction':''
const INDUSTRY_OPTIONS=[{value:'construction',label:'Construction'},{value:'design',label:'Interior Design'},{value:'property',label:'Real Estate'}]


function mapProject(item){
  return {
    id:item.id,
    title:item.title||'',
    seoSlug:item.seo_slug||'',
    seoTitle:item.seo_title||'',
    seoDescription:item.seo_description||'',
    seoKeyword:item.seo_keyword||'',
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
    specSections:Array.isArray(item.spec_sections)?item.spec_sections:[],
    brochureUrl:item.brochure_url||'',
    brochureDisplayUrl:item.brochure_display_url||'',
    isPublished:item.is_published!==false,
  }
}

function ProfileBusinessFields({form,update,overview=false}){
  return <div className={overview?'profile-overview-fields profile-overview-fields-editable':'profile-grid'}>
    <label><span>Business Name <b aria-hidden="true">*</b></span><input value={form.businessName} onChange={e=>update('businessName',e.target.value)} required placeholder="Your registered business name"/></label>
    <label><span>Email Address <b aria-hidden="true">*</b></span><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required autoComplete="email"/></label>
    <label><span>Contact Person <b aria-hidden="true">*</b></span><input value={form.name} onChange={e=>update('name',e.target.value)} required autoComplete="name"/></label>
    <label><span>Phone Number <b aria-hidden="true">*</b></span><input value={form.phone} onChange={e=>update('phone',e.target.value)} required autoComplete="tel"/></label>
    <label className="wide"><span>About Your Business <b aria-hidden="true">*</b></span><textarea rows={overview?4:5} value={form.businessDetails} onChange={e=>update('businessDetails',e.target.value)} required placeholder="Describe your work and approach; this text also appears publicly when you publish your listing."/></label>
    <label><span>Years of Experience <small>(optional)</small></span><input type="number" min="0" max="100" value={form.yearsExperience} onChange={e=>update('yearsExperience',e.target.value)} placeholder="e.g. 8"/></label>
    <div id="profile-unified-publish" className="profile-unified-publish wide">
      <div><strong>Public expert listing</strong><p>Your Business Name is the public headline. About Your Business is the public summary. Both update automatically when you save.</p></div>
      <label className="profile-unified-visibility"><input type="checkbox" checked={form.publicProfileEnabled} onChange={e=>update('publicProfileEnabled',e.target.checked)}/><span>Publish when eligible</span></label>
    </div>
  </div>
}


const PROFILE_ICONS={
  business:'M4 21V8l8-5 8 5v13M4 21h16M8 11h8M8 15h8M11 21v-3h2v3',
  services:'M12 3v18M3 12h18M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  projects:'M4 4h16v16H4zM7 17l4-5 3 3 2-2 3 4M8 9h.01',
  packages:'M7 3h8l4 4v14H7zM15 3v5h4M10 12h6M10 16h6',
  proofs:'M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-4zM8 12l3 3 5-6',
  check:'M5 12l4 4L19 6',
  chevron:'M6 9l6 6 6-6',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  save:'M4 3h14l3 3v15H4zM8 3v7h9V3M8 21v-8h9v8',
  edit:'M15 5l4 4M4 20l4-1 11-11a2.8 2.8 0 0 0-4-4L4 15z',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 10h.01',
  sparkle:'M12 2l2 7 7 3-7 2-2 8-3-8-7-2 7-3z',
}
function ProfileIcon({name,size=21}){
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={PROFILE_ICONS[name]||PROFILE_ICONS.business}/></svg>
}
function ProfileRoofline(){
  return <svg className="profile-roofline" viewBox="0 0 230 98" fill="none" aria-hidden="true" focusable="false">
    <path d="M5 91h221" stroke="#ecc5a3" strokeWidth="2"/>
    <path d="M40 91V43l48-31 50 31v48M34 44 88 8l56 36M54 53h22v23H54zM96 53h26v23H96zM81 91V64h17v27" stroke="#e7a16d" strokeWidth="2.3" strokeLinejoin="round" fill="#fff5e9"/>
    <path d="M143 91V52l29-18 32 18v39M143 70h61M171 34v57M150 56h14v13h-14zM180 56h14v13h-14z" stroke="#f5b888" strokeWidth="2" fill="#fff0df"/>
    <path className="profile-roofline-spark" d="m190 10 5 13 13 4-13 4-5 13-4-13-12-4 12-4z" stroke="#fa8b38" fill="#ffe2c7"/>
  </svg>
}

export default function Profile(){
  const navigate=useNavigate()
  const location=useLocation()
  const [form,setForm]=useState({name:'',email:'',phone:'',businessName:'',businessDetails:'',yearsExperience:'',publicProfileEnabled:true})
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
  const [publicProfileId,setPublicProfileId]=useState(null)
  const [videoUploads,setVideoUploads]=useState({})
  const [videoProgress,setVideoProgress]=useState({})
  const [imageUploads,setImageUploads]=useState({})
  const [planUploads,setPlanUploads]=useState({})
  const [mediaPreview,setMediaPreview]=useState(null)
  const [brochureUploads,setBrochureUploads]=useState({})
  const requestedTab=new URLSearchParams(location.search).get('tab')
  // Legacy ?tab=business or ?tab=public links open the single profile editor.
  const [expandedProject,setExpandedProject]=useState(null)
  const [expandedPlan,setExpandedPlan]=useState(null)
  // One accordion is open at a time. Old profile deep links open their
  // corresponding card; the top site menu stays the only navigation.
  const mapProfileTab=tab=>tab==='locations'?'services':tab==='brochures'?'packages':tab==='plans'?'packages':tab==='proofs'?'proofs':tab==='projects'?'projects':tab==='services'?'services':'business'
  const [openProfileCard,setOpenProfileCard]=useState(()=>requestedTab?mapProfileTab(requestedTab):'')
  const [packageView,setPackageView]=useState(()=>requestedTab==='brochures'?'brochures':'plans')
  const [brochureState,setBrochureState]=useState({ready:false,dirty:false,busy:false,uploading:false})
  // Index of the ONE service form currently being edited. Saved services stay collapsed.
  const [activeServiceIndex,setActiveServiceIndex]=useState(null)
  // Index of the one location being edited. Saved locations stay collapsed.
  const [activeLocationIndex,setActiveLocationIndex]=useState(null)
  useEffect(()=>{
    if(requestedTab){
      setOpenProfileCard(mapProfileTab(requestedTab))
      if(requestedTab==='brochures')setPackageView('brochures')
      else if(requestedTab==='plans')setPackageView('plans')
    }
  },[requestedTab])

  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [savedSnapshot,setSavedSnapshot]=useState(null)

  useEffect(()=>{
    async function load(){
      try{
        const [profile,industryData,serviceData,subserviceData,stateData,cityData]=await Promise.all([
          authRequest('/profile'),authRequest('/industries'),authRequest('/services'),authRequest('/subservices'),authRequest('/states'),authRequest('/cities'),
        ])
        const loadedForm={
          name:getUser()?.name||'',email:getUser()?.email||'',phone:profile.phone||'',businessName:profile.business_name||'',businessDetails:profile.business_details||'',
          yearsExperience:profile.years_experience??'',publicProfileEnabled:profile.public_profile_enabled!==false,
        }
        const loadedServices=(profile.services||[]).map(x=>({industryId:String(x.industry_id),serviceId:String(x.service_id),subserviceId:x.subservice_id?String(x.subservice_id):''}))
        const loadedLocations=(profile.locations||[]).map(x=>({stateId:String(x.state_id),cityId:String(x.city_id)}))
        const loadedProjects=(profile.projects||[]).map(mapProject)
        const originalPlans=(profile.service_plans||[]).map(mapPlan)
        const loadedPlans=resolveProfilePackages(originalPlans,getPreferredPackageIndustry(loadedServices,industryData))
        setForm(loadedForm)
        setIndustries(industryData);setServices(serviceData);setSubservices(subserviceData);setStates(stateData);setCities(cityData)
        setServiceSelections(loadedServices)
        setLocationSelections(loadedLocations)
        setCompanyProofs(Array.isArray(profile.company_proofs)?profile.company_proofs:[])
        setProjects(loadedProjects)
        setPlans(loadedPlans)
        // New starter slots remain unsaved until the business explicitly taps Save.
        setSavedSnapshot(profileFingerprint(loadedForm,loadedServices,loadedLocations,loadedProjects,originalPlans))
        setDirectoryStatus(profile.directory_status||null)
        setPublicProfileId(profile.id||null)
      }catch(err){setError(err.message)}finally{setLoading(false)}
    }
    load()
  },[])

  const serviceOptions=useMemo(()=>serviceSelections.map(x=>services.filter(s=>String(s.industry_id)===String(x.industryId))),[services,serviceSelections])
  const subserviceOptions=useMemo(()=>serviceSelections.map(x=>subservices.filter(s=>String(s.service_id)===String(x.serviceId))),[subservices,serviceSelections])
  const cityOptions=useMemo(()=>locationSelections.map(x=>cities.filter(c=>String(c.state_id)===String(x.stateId))),[cities,locationSelections])
  const completionItems=[
    Boolean(form.name&&form.email&&form.phone),Boolean(form.businessName&&form.businessDetails),
    serviceSelections.length>0&&serviceSelections.every(x=>x.industryId&&x.serviceId),locationSelections.length>0&&locationSelections.every(x=>x.stateId&&x.cityId),
    projects.length>0,
  ]
  const completion=Math.round((completionItems.filter(Boolean).length/completionItems.length)*100)

  const completedSections=completionItems.filter(Boolean).length
  const serviceNames=[...new Set(serviceSelections.map(selection=>{
    const entry=services.find(item=>String(item.id)===String(selection.serviceId))
    return entry?.name||industries.find(item=>String(item.id)===String(selection.industryId))?.name
  }).filter(Boolean))]
  const locationNames=[...new Set(locationSelections.map(selection=>{
    return cities.find(item=>String(item.id)===String(selection.cityId))?.name
  }).filter(Boolean))]
  const directoryEligible=Boolean(directoryStatus?.eligible)
  const currentSnapshot=profileFingerprint(form,serviceSelections,locationSelections,projects,plans)
  const hasUnsavedChanges=savedSnapshot!==null&&currentSnapshot!==savedSnapshot
  const brochureView=openProfileCard==='packages'&&packageView==='brochures'
  const brochureNeedsSave=brochureState.ready&&brochureState.dirty
  const needsSave=hasUnsavedChanges||brochureNeedsSave
  const saveBusy=saving||(brochureView&&(brochureState.busy||brochureState.uploading))



  // Accordions are in-page controls. Route navigation on each tap caused
  // mobile browsers to jump to the document top and lose the editing position.
  // Incoming /profile?tab=... links still work through the requestedTab effect.
  function openCard(card,mode){
    const target=card==='overview'?'business':card==='locations'?'services':card==='brochures'?'packages':card==='plans'?'packages':card
    if(mode)setPackageView(mode)
    setOpenProfileCard(target)
    setMessage('')
  }
  function toggleCard(card){
    if(openProfileCard===card)setOpenProfileCard('')
    else openCard(card)
  }
  function addProject(){const item=emptyProject();setProjects(current=>[...current,item]);setExpandedProject('draft-'+item._draftKey);setMessage('')}
  function projectKey(item){return item.id?'project-'+item.id:'draft-'+item._draftKey}
  function planKey(item){return item.id?'plan-'+item.id:'draft-'+item._draftKey}
  function revealProjectError(index,message){setExpandedProject(projectKey(projects[index]));openCard('projects');setError(message)}
  function revealPlanError(index,message){setExpandedPlan(planKey(plans[index]));openCard('packages','plans');setError(message)}
  function update(field,value){setForm(x=>({...x,[field]:value}));setMessage('')}
  function updateService(index,field,value){
    if(field==='serviceId'&&value&&serviceSelections.some((item,i)=>
      i!==index&&String(item.industryId)===String(serviceSelections[index]?.industryId)&&
      String(item.serviceId)===String(value))){
      setError('This service is already listed. Use Edit on the existing service instead.')
      return
    }
    setServiceSelections(items=>items.map((x,i)=>i!==index?x:
      field==='industryId'?{industryId:value,serviceId:'',subserviceId:''}:
      field==='serviceId'?{...x,serviceId:value,subserviceId:''}:{...x,[field]:value}))
    setError('');setMessage('')
  }
  function addService(){
    const incomplete=serviceSelections.findIndex(item=>!item.industryId||!item.serviceId)
    if(incomplete>=0){setActiveServiceIndex(incomplete)}
    else{
      setActiveServiceIndex(serviceSelections.length)
      setServiceSelections(items=>[...items,emptyService()])
    }
    setActiveLocationIndex(null);setError('');setMessage('')
  }
  function removeService(index){
    setServiceSelections(items=>items.filter((_,i)=>i!==index))
    setActiveServiceIndex(current=>current===null?null:current===index?null:current>index?current-1:current)
    setError('');setMessage('Service removed from this profile. Tap Save Changes to apply.')
  }
  function updateLocation(index,field,value){
    const row=locationSelections[index]
    if(field==='cityId'&&value&&locationSelections.some((item,i)=>
      i!==index&&String(item.stateId)===String(row?.stateId)&&String(item.cityId)===String(value))){
      setError('This location is already listed. Edit the existing location instead.')
      return
    }
    setLocationSelections(items=>items.map((x,i)=>i!==index?x:
      field==='stateId'?{stateId:value,cityId:''}:{...x,cityId:value}))
    setError('');setMessage('')
  }
  function addLocation(){
    const incomplete=locationSelections.findIndex(item=>!item.stateId||!item.cityId)
    if(incomplete>=0)setActiveLocationIndex(incomplete)
    else{
      setActiveLocationIndex(locationSelections.length)
      setLocationSelections(items=>[...items,emptyLocation()])
    }
    setActiveServiceIndex(null);setError('');setMessage('')
  }
  function removeLocation(index){
    setLocationSelections(items=>items.filter((_,i)=>i!==index))
    setActiveLocationIndex(current=>current===null?null:current===index?null:current>index?current-1:current)
    setError('');setMessage('Location removed from this profile. Tap Save Changes to apply.')
  }
  function updateProject(index,field,value){setProjects(items=>items.map((item,i)=>i!==index?item:field==='title'?{...item,title:value,seoSlug:(!item.seoSlug||item.seoSlug===projectSlug(item.title))?projectSlug(value):item.seoSlug}:field==='projectType'?{...item,projectType:value,packageName:''}:field==='videoUrl'?{...item,videoUrl:value,videoDisplayUrl:value}:field==='planUrl'?{...item,planUrl:value,planDisplayUrl:value}:field==='brochureUrl'?{...item,brochureUrl:value,brochureDisplayUrl:value}:{...item,[field]:value}));setMessage('')}
  function updatePlan(index,field,value){
    setPlans(items=>items.map((item,i)=>{
      if(i!==index)return item
      if(field==='brochureUrl')return {...item,brochureUrl:value,brochureDisplayUrl:value}
      // Never overwrite existing business specifications on an industry change.
      if(field==='industry'&&String(item._draftKey||'').startsWith('default-')){
        const isPristine=JSON.stringify(item.specSections||[])===JSON.stringify(editableStarterSpecifications(item.industry))
        return {...item,industry:value,priceUnit:value==='property'?'project':'sqft',specSections:isPristine?editableStarterSpecifications(value):item.specSections,isPublished:false}
      }
      return {...item,[field]:value}
    }))
    setMessage('')
  }

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

  function sendVideoPart(url,blob,{contentType,onProgress,needEtag=false}={}){
    return new Promise((resolve,reject)=>{
      const request=new XMLHttpRequest()
      request.open('PUT',url)
      if(contentType)request.setRequestHeader('Content-Type',contentType)
      request.upload.onprogress=event=>{if(event.lengthComputable)onProgress?.(event.loaded)}
      request.onerror=()=>reject(new Error('Upload connection failed. Check your internet and R2 CORS settings, then retry.'))
      request.ontimeout=()=>reject(new Error('Video upload timed out. Please retry.'))
      request.onload=()=>{
        if(request.status<200||request.status>=300)return reject(new Error('Video storage rejected the upload (HTTP '+request.status+').'))
        const etag=request.getResponseHeader('ETag')
        if(needEtag&&!etag)return reject(new Error('R2 must expose the ETag header in its CORS policy to support large video uploads.'))
        resolve(etag)
      }
      request.send(blob)
    })
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
    let session=null
    setVideoUploads(current=>({...current,[index]:true}))
    setVideoProgress(current=>({...current,[index]:0}))
    setError('');setMessage('')
    try{
      session=await authRequest('/profile/projects/video/uploads/start',{
        method:'POST',body:JSON.stringify({mimeType:mime,size:file.size}),timeoutMs:45000,
      })
      const updateProgress=bytes=>setVideoProgress(current=>({...current,[index]:Math.min(99,Math.round(100*bytes/file.size))}))
      let parts=[]
      if(session.mode==='single'){
        await sendVideoPart(session.uploadUrl,file,{contentType:mime,onProgress:updateProgress})
      }else{
        const chunkSize=session.chunkSize
        if(!Number.isSafeInteger(chunkSize)||chunkSize<5*1024*1024)throw Error('Invalid R2 upload chunk size.')
        const total=Math.ceil(file.size/chunkSize)
        for(let number=1;number<=total;number++){
          const offset=(number-1)*chunkSize
          const signed=await authRequest('/profile/projects/video/uploads/part-url',{
            method:'POST',body:JSON.stringify({reference:session.reference,uploadId:session.uploadId,partNumber:number}),
            timeoutMs:30000,
          })
          const chunk=file.slice(offset,Math.min(file.size,offset+chunkSize))
          const etag=await sendVideoPart(signed.uploadUrl,chunk,{
            onProgress:loaded=>updateProgress(offset+loaded),needEtag:true,
          })
          parts.push({partNumber:number,etag})
        }
      }
      const result=await authRequest('/profile/projects/video/uploads/finish',{
        method:'POST',body:JSON.stringify({
          reference:session.reference,uploadId:session.uploadId||null,
          parts,mimeType:mime,size:file.size,
        }),timeoutMs:120000,
      })
      setProjects(items=>items.map((item,i)=>i===index?{
        ...item,videoUrl:result.url||'',videoDisplayUrl:result.displayUrl||result.url||'',videoPublishedAt:result.uploadedAt||'',
      }:item))
      setVideoProgress(current=>({...current,[index]:100}))
      playSound('upload')
      setMessage('Project video uploaded to cloud storage. Save changes to publish it.')
    }catch(err){
      if(session?.uploadId){
        void authRequest('/profile/projects/video/uploads/abort',{
          method:'POST',body:JSON.stringify({reference:session.reference,uploadId:session.uploadId}),timeoutMs:15000,
        }).catch(()=>{})
      }
      playSound('warning')
      const reason=!navigator.onLine
        ? 'Your internet connection is offline. Reconnect and retry the video upload.'
        :err?.status===403
          ? 'Video upload was blocked (403). This may be an access permission, session, CSRF or hosting firewall restriction. Refresh the page and sign in again; if it continues, check the 403 response body and Hostinger security logs.'
          :err?.status===503
            ? 'Video storage or login service is temporarily unavailable (503). Retry when the site is stable.'
            :err.message||'Unable to upload project video. Please retry.'
      setError(reason)
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

  function addAllServicesForIndustry(index){
    const industryId=serviceSelections[index]?.industryId
    if(!industryId)return setError('Select an industry first.')
    const available=services.filter(item=>String(item.industry_id)===String(industryId))
    if(!available.length)return setError('No services are available for this industry.')
    setServiceSelections(items=>selectAllIndustryServices(items,services,index))
    setMessage(`All ${available.length} industry services selected. Tap Save Changes to publish.`)
    setError('')
  }

  // Validation errors open the exact existing editor, not a new management page.
  function showEditorError(card,message,subsection){
    if(card==='services'){
      if(subsection==='services'){
        const incomplete=serviceSelections.findIndex(item=>!item.industryId||!item.serviceId)
        if(incomplete>=0)setActiveServiceIndex(incomplete)
        else if(serviceSelections.length)setActiveServiceIndex(0)
        else{
          setServiceSelections(items=>[...items,emptyService()])
          setActiveServiceIndex(0)
        }
        setActiveLocationIndex(null)
      }else{
        const incomplete=locationSelections.findIndex(item=>!item.stateId||!item.cityId)
        if(incomplete>=0)setActiveLocationIndex(incomplete)
        else if(locationSelections.length)setActiveLocationIndex(0)
        else{
          setLocationSelections(items=>[...items,emptyLocation()])
          setActiveLocationIndex(0)
        }
        setActiveServiceIndex(null)
      }
    }
    openCard(card)
    setError(message)
    setMessage('')
  }
  async function submitCurrentChanges(){
    if(saveBusy||!needsSave||!savedSnapshot)return
    // Existing profile data and company brochures have separate API endpoints,
    // but share this ONE fixed action. Save both when both drafts have changes.
    if(hasUnsavedChanges){
      const saved=await save({preventDefault(){}})
      if(!saved)return
    }
    if(brochureNeedsSave){
      // Keep the brochure editor mounted while switching profile sections.
      // Reveal it before submitting so validation feedback remains visible.
      setOpenProfileCard('packages')
      setPackageView('brochures')
      requestAnimationFrame(()=>{
        document.getElementById('profile-brochures-form')?.requestSubmit()
      })
    }
  }
  async function save(e){
    e.preventDefault();setError('');setMessage('')
    if(!form.name.trim()||!form.email.trim()||!form.phone.trim()||!form.businessName.trim()||!form.businessDetails.trim())return showEditorError('business','Complete all business information before saving.')
    if(!serviceSelections.length||serviceSelections.some(x=>!x.industryId||!x.serviceId))return showEditorError('services','Complete every service selection.','services')
    if(!locationSelections.length||locationSelections.some(x=>!x.stateId||!x.cityId))return showEditorError('services','Complete every location selection.','locations')
    const untitledProject=projects.findIndex(item=>!item.title.trim())
    if(untitledProject>=0)return revealProjectError(untitledProject,'Every completed project needs a title.')
    const unclassifiedProject=projects.findIndex(item=>item.isPublished&&!['Construction','Interior Design','Real Estate'].includes(item.projectType))
    if(unclassifiedProject>=0)return revealProjectError(unclassifiedProject,'Select Construction, Interior Design or Real Estate for every published project before saving.')
    const missingYearProject=projects.findIndex(item=>item.isPublished&&(!Number.isInteger(Number(item.completionYear))||Number(item.completionYear)<1950||Number(item.completionYear)>new Date().getFullYear()))
    if(missingYearProject>=0)return revealProjectError(missingYearProject,'To publish a completed project, enter its actual completion year. Uncheck Public to save unfinished work privately.')
    const untitledPlan=plans.findIndex(item=>!item.title.trim())
    if(untitledPlan>=0)return revealPlanError(untitledPlan,'Every service package needs a name.')
    const badSpecPlan=plans.findIndex(plan=>(plan.specSections||[]).some(section=>!String(section.title||'').trim()))
    if(badSpecPlan>=0)return revealPlanError(badSpecPlan,'Name every material or work item, or remove the unfinished row before saving.')
    const missingRatePlan=plans.findIndex(item=>item.isPublished&&(item.priceFrom===''||!Number.isFinite(Number(item.priceFrom))||Number(item.priceFrom)<=0||item.priceUnit==='unspecified'))
    if(missingRatePlan>=0)return revealPlanError(missingRatePlan,'Set your own positive package rate and pricing unit before publishing. ProPulse reference prices are never assigned automatically.')
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
        plans:plans.map(item=>({...item,priceFrom:item.priceFrom===''?null:Number(item.priceFrom),inclusions:item.inclusions.split('\n').map(v=>v.trim()).filter(Boolean),specSections:item.specSections||[]})),
      })})
      saveSession({user:result.user})
      const savedProfile=result.user?.profile
      const updatedProjects=savedProfile?(savedProfile.projects||[]).map(mapProject):projects
      const updatedPlans=savedProfile?(savedProfile.service_plans||[]).map(mapPlan):plans
      if(savedProfile){
        setProjects(updatedProjects);setPlans(updatedPlans);setDirectoryStatus(savedProfile.directory_status||null)
      }
      // Server reconciliation can assign new IDs; baseline must include them.
      setSavedSnapshot(profileFingerprint(form,serviceSelections,locationSelections,updatedProjects,updatedPlans))
      playSound('success')
      // Keep the currently open editors open after Save, even when the server
      // assigns new IDs to newly created projects or packages. Closing them
      // changes the page height and makes mobile users lose their position.
      setExpandedProject(current=>{
        const index=projects.findIndex(item=>projectKey(item)===current)
        return index>=0&&updatedProjects[index]?projectKey(updatedProjects[index]):current
      })
      setExpandedPlan(current=>{
        const index=plans.findIndex(item=>planKey(item)===current)
        return index>=0&&updatedPlans[index]?planKey(updatedPlans[index]):current
      })
      setMessage('Business and public listing saved together. Your services are now shown in the saved list.')
      return true
    }catch(err){playSound('warning');setError(err.message);return false}finally{setSaving(false)}
  }


  if(loading)return <><UserHeader variant="profile"/><div className="profile-page profile-accordion-root"><BootLoader contained message="Loading business profile" /></div></>
  const cardEntries=[
    {id:'business',title:'Business & Public Profile',description:'Business details, contact information and public visibility',icon:'business',badge:completionItems[0]&&completionItems[1]?'Complete':'Add details'},
    {id:'services',title:'Services & Locations',description:'What you do and where you work',icon:'services',badge:serviceNames.length+' Services · '+locationNames.length+' Locations'},
    {id:'projects',title:'Projects & Media',description:'Showcase your work with photos, videos and plans',icon:'projects',badge:projects.length+' Items'},
    {id:'packages',title:'Packages & Brochures',description:'Show your pricing and specifications',icon:'packages',badge:plans.length+' Packages'},
    {id:'proofs',title:'Verification Documents',description:'Private company verification and legal documents',icon:'proofs',badge:companyProofs.length+' Documents'}
  ]
  return <>
    <UserHeader variant="profile"/>
    {mediaPreview&&<ProjectMediaViewer url={mediaPreview.url} type={mediaPreview.type} title={mediaPreview.title} onClose={()=>setMediaPreview(null)}/>}
    <main className="profile-page profile-accordion-root" id="profile-workspace-content">
      <header className="profile-accordion-intro">
        <div className="profile-intro-copy">
          <span className="profile-accordion-overline">PROFESSIONAL WORKSPACE</span>
          <h1>Business Profile</h1>
          <p>Edit once, publish everywhere.</p>
        </div>
        <ProfileRoofline/>
      </header>
      <section className="profile-accordion-progress" aria-label="Profile completion">
        <div className="profile-progress-circle" role="progressbar" aria-label="Profile completion" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100">
          <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" stroke="#ffe4d1" strokeWidth="10" fill="none"/><circle className="profile-progress-ring" cx="50" cy="50" r="40" stroke="#ff701b" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2*Math.PI*40}`} strokeDashoffset={`${2*Math.PI*40*(1-completion/100)}`} transform="rotate(-90 50 50)" fill="none"/></svg>
          <strong>{completion}%</strong>
        </div>
        <div className="profile-progress-copy"><h2>Profile Completion</h2><p>{completedSections} of {completionItems.length} core steps complete</p></div>
        <div className="profile-progress-tip"><ProfileIcon name="sparkle" size={21}/><b>{completion===100?'Ready to shine!':'Looking good!'}</b><p>{completion===100?'Keep your portfolio updated.':'Add a few more details to stand out.'}</p></div>
      </section>


      <div className="profile-accordion-list">
        {cardEntries.map(card=>{
          const expanded=openProfileCard===card.id
          const preserveBrochureDraft=card.id==='packages'&&brochureNeedsSave
          return <section className={'profile-accordion-card'+(expanded?' is-open':'')} key={card.id} id={'profile-card-'+card.id}>
            <button type="button" className="profile-accordion-trigger" aria-expanded={expanded} aria-controls={'profile-card-body-'+card.id} onClick={()=>toggleCard(card.id)}>
              <span className="profile-accordion-icon"><ProfileIcon name={card.icon} size={23}/></span>
              <span className="profile-accordion-title"><strong>{card.title}</strong><small>{card.description}</small></span>
              <span className={'profile-accordion-count'+(card.id==='business'&&completionItems[0]&&completionItems[1]?' is-complete':'')}>{card.badge}</span>
              <ProfileIcon name="chevron" size={21}/>
            </button>
            {(expanded||preserveBrochureDraft)&&<div id={'profile-card-body-'+card.id} className="profile-accordion-body" hidden={!expanded}>
              {card.id==='business'&&<form id="business-profile-form" className="profile-accordion-form" onSubmit={save}>
                <ProfileBusinessFields form={form} update={update} overview/>
              </form>}
              {card.id==='services'&&<div className="profile-accordion-service-block">
                <div className="profile-accordion-field-head profile-service-list-heading">
                  <div><h3><ProfileIcon name="services" size={18}/> Services Offered</h3><p>Manage services individually. Only the one you edit will expand.</p></div>
                  <button type="button" className="profile-service-add-button" onClick={addService}>+ Add Service</button>
                </div>
                <div className="profile-service-compact-list" id="profile-services">
                  {serviceSelections.map((item,index)=>{
                    const open=activeServiceIndex===index
                    const service=services.find(entry=>String(entry.id)===String(item.serviceId))
                    const industry=industries.find(entry=>String(entry.id)===String(item.industryId))
                    const subservice=subservices.find(entry=>String(entry.id)===String(item.subserviceId))
                    return <div className={'profile-service-compact-item'+(open?' is-editing':'')} key={index}>
                      <div className="profile-service-compact-heading">
                        <span className="profile-service-item-icon"><ProfileIcon name="services" size={18}/></span>
                        <div className="profile-service-item-summary">
                          <strong>{service?.name||'New service'}</strong>
                          <small>{industry?.name||'Select industry'}{subservice?' · '+subservice.name:''}</small>
                        </div>
                        <div className="profile-service-item-actions">
                          <button type="button" className="profile-service-edit-button" aria-label={(open?'Close editor for ':'Edit ')+(service?.name||'new service')} aria-expanded={open} onClick={()=>{setActiveServiceIndex(open?null:index);setActiveLocationIndex(null);setError('')}}><ProfileIcon name="edit" size={16}/>{open?'Close':'Edit'}</button>
                          <button type="button" className="profile-service-delete-button" aria-label={'Delete '+(service?.name||'new service')} onClick={()=>removeService(index)}>Delete</button>
                        </div>
                      </div>
                      {open&&<form id="business-profile-form" onSubmit={save} className="profile-accordion-form profile-service-inline-form">
                        <label>Industry
                          <select value={item.industryId} onChange={event=>updateService(index,'industryId',event.target.value)} required>
                            <option value="">Select industry</option>
                            {industries.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}
                          </select>
                        </label>
                        <label>Service
                          <select value={item.serviceId} onChange={event=>event.target.value===ALL_SERVICES_VALUE?addAllServicesForIndustry(index):updateService(index,'serviceId',event.target.value)} disabled={!item.industryId} required>
                            <option value="">Select service</option>
                            {(serviceOptions[index]||[]).length>0&&<option value={ALL_SERVICES_VALUE}>✓ All services ({(serviceOptions[index]||[]).length})</option>}
                            {(serviceOptions[index]||[]).map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}
                          </select>
                        </label>
                        <label>Subservice <small>Optional · leave blank for all related services</small>
                          <select value={item.subserviceId} onChange={event=>updateService(index,'subserviceId',event.target.value)} disabled={!item.serviceId}>
                            <option value="">All related</option>
                            {(subserviceOptions[index]||[]).map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}
                          </select>
                        </label>
                        <p className="profile-service-save-hint">Changes are applied when you tap Save Changes below.</p>
                      </form>}
                    </div>
                  })}
                  {!serviceSelections.length&&<p className="profile-service-empty">No services added. Use Add Service to select your industry and service.</p>}
                </div>

                <div className="profile-accordion-field-head profile-service-list-heading profile-location-list-heading">
                  <div><h3><ProfileIcon name="pin" size={18}/> Service Locations</h3><p>Saved cities stay visible. Edit or remove one location at a time.</p></div>
                  <button type="button" className="profile-service-add-button" onClick={addLocation}>+ Add Location</button>
                </div>
                <div className="profile-service-compact-list profile-location-compact-list" id="profile-locations">
                  {locationSelections.map((item,index)=>{
                    const open=activeLocationIndex===index
                    const city=cities.find(entry=>String(entry.id)===String(item.cityId))
                    const state=states.find(entry=>String(entry.id)===String(item.stateId))
                    return <div className={'profile-service-compact-item profile-location-compact-item'+(open?' is-editing':'')} key={index}>
                      <div className="profile-service-compact-heading">
                        <span className="profile-service-item-icon"><ProfileIcon name="pin" size={18}/></span>
                        <div className="profile-service-item-summary">
                          <strong>{city?.name||'New location'}</strong>
                          <small>{state?.name||'Select state / UT'}</small>
                        </div>
                        <div className="profile-service-item-actions">
                          <button type="button" className="profile-service-edit-button" aria-label={(open?'Close editor for ':'Edit ')+(city?.name||'new location')} aria-expanded={open} aria-controls={open?'business-profile-form':undefined} onClick={()=>{setActiveLocationIndex(open?null:index);setActiveServiceIndex(null);setError('')}}><ProfileIcon name="edit" size={16}/>{open?'Close':'Edit'}</button>
                          <button type="button" className="profile-service-delete-button" aria-label={'Delete '+(city?.name||'new location')} onClick={()=>removeLocation(index)}>Delete</button>
                        </div>
                      </div>
                      {open&&<form id="business-profile-form" onSubmit={save} className="profile-accordion-form profile-service-inline-form profile-location-inline-form">
                        <label>State / UT
                          <select value={item.stateId} onChange={event=>updateLocation(index,'stateId',event.target.value)} required>
                            <option value="">Select state / UT</option>
                            {states.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}
                          </select>
                        </label>
                        <label>City
                          <select value={item.cityId} onChange={event=>updateLocation(index,'cityId',event.target.value)} disabled={!item.stateId} required>
                            <option value="">Select city</option>
                            {(cityOptions[index]||[]).map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}
                          </select>
                        </label>
                        <p className="profile-service-save-hint">Tap Save Changes below to update your service locations.</p>
                      </form>}
                    </div>
                  })}
                  {!locationSelections.length&&<p className="profile-service-empty">No service locations yet. Add a location to help customers find you.</p>}
                </div>
              </div>}
              {card.id==='projects'&&<form id="business-profile-form" onSubmit={save} className="profile-accordion-form profile-accordion-editor"><section className="profile-panel profile-project-panel" id="profile-projects">
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
                  <button type="button" className="profile-entry-edit" aria-expanded={isExpanded} aria-controls={'project-editor-'+index} onClick={()=>setExpandedProject(isExpanded?null:projectKey(project))}>{isExpanded?'Close editor':'Edit project'} <span aria-hidden="true">{isExpanded?'−':'＋'}</span></button><button type="button" className="profile-entry-delete" aria-label={'Delete project '+(project.title||'new project')} onClick={()=>{setProjects(items=>items.filter((_,i)=>i!==index));setExpandedProject(null);setMessage('Project removed from this profile. Tap Save Changes to apply.')}}>Delete</button>
                </div>
              </div>
              {isExpanded&&<div className="profile-entry-body" id={'project-editor-'+index}>
                <div className="profile-entry-controls"><label className="profile-inline-check"><input type="checkbox" checked={project.isPublished} onChange={e=>updateProject(index,'isPublished',e.target.checked)}/> Publish in completed projects</label></div>
              <div className="profile-showcase-grid"><label>Project title<input value={project.title} maxLength="180" onChange={e=>updateProject(index,'title',e.target.value)} placeholder="3BHK premium apartment interiors"/></label><label>Project industry <select value={project.projectType||''} onChange={e=>updateProject(index,'projectType',e.target.value)} required={project.isPublished}><option value="">Select category</option><option value="Construction">Construction</option><option value="Interior Design">Interior Design</option><option value="Real Estate">Real Estate</option></select></label><label>Location<input value={project.locationText} maxLength="180" onChange={e=>updateProject(index,'locationText',e.target.value)} placeholder="Hyderabad, Telangana"/></label><label>Completion year {project.isPublished?'(required to publish)':''}<input type="number" min="1950" max={new Date().getFullYear()} value={project.completionYear} onChange={e=>updateProject(index,'completionYear',e.target.value)}/></label><label>Area<input value={project.areaText} maxLength="120" onChange={e=>updateProject(index,'areaText',e.target.value)} placeholder="2,400 sq ft"/></label><label>Project value / budget<input value={project.budgetText} maxLength="120" onChange={e=>updateProject(index,'budgetText',e.target.value)} placeholder="₹28–32 lakh"/></label><label>Related published package
                  <select value={project.packageName||''} onChange={e=>updateProject(index,'packageName',e.target.value)}>
                    <option value="">No package linked</option>
                    {plans.filter(plan=>plan.isPublished&&plan.title&&plan.industry===projectIndustry(project.projectType)).map(plan=><option value={plan.title} key={plan.id||plan.title}>{plan.title}</option>)}
                  </select>
                </label><label className="wide">Description<textarea rows="3" value={project.description} maxLength="3000" onChange={e=>updateProject(index,'description',e.target.value)} placeholder="Scope completed, design approach, materials and outcome…"/></label><label className="wide">Cover image URL<input value={project.coverImageUrl} onChange={e=>updateProject(index,'coverImageUrl',e.target.value)} placeholder="https://… image"/></label>
                <details className="profile-project-seo-settings">
                  <summary>SEO &amp; Search Visibility <small>Set how this project appears in Google and AI search</small></summary>
                  <div className="profile-project-seo-grid">
                    <label>SEO page title <input value={project.seoTitle||''} maxLength="160" onChange={e=>updateProject(index,'seoTitle',e.target.value)} placeholder={project.title||'Modern 3BHK interiors in Hyderabad'}/><small>Search results use this title, or your project title if blank.</small></label>
                    <label>Primary SEO keyword <input value={project.seoKeyword||''} maxLength="160" onChange={e=>updateProject(index,'seoKeyword',e.target.value)} placeholder="3BHK interior design in Uppal Hyderabad"/></label>
                    <label className="wide">SEO URL slug <input value={project.seoSlug||''} maxLength="100" onChange={e=>updateProject(index,'seoSlug',projectSlug(e.target.value))} placeholder="3bhk-interior-design-uppal-hyderabad"/><small>Public URL: https://propulsetechnologies.online/projects/{project.seoSlug||'project-'+(project.id||'new')} · use lowercase letters, numbers and hyphens. Changing a published slug changes its URL.</small></label>
                    <label className="wide">Meta description <textarea rows="3" value={project.seoDescription||''} maxLength="320" onChange={e=>updateProject(index,'seoDescription',e.target.value)} placeholder="Explore modern 3BHK interiors in Uppal, Hyderabad, featuring a modular kitchen, false ceilings and customized wardrobes."/><small>{(project.seoDescription||'').length}/320 characters. Aim for about 150–160 characters.</small></label>
                  </div>
                </details>
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
                <div className="profile-project-media-grid"><div className="profile-video-field profile-media-card"><label>Project video URL<input value={project.videoUrl} onChange={e=>updateProject(index,'videoUrl',e.target.value)} placeholder="Upload a video below or paste https://…"/></label><label className={'profile-video-upload '+(videoUploads[index]?'busy':'')}><span>{videoUploads[index]?'Uploading '+(videoProgress[index]||0)+'%…':'Upload project video'}</span><small>MP4, MOV or WebM · upload directly to Cloudflare R2</small><input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" disabled={Boolean(videoUploads[index])} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadProjectVideo(index,file)}}/></label>{videoUploads[index]&&<div className="profile-video-progress" role="progressbar" aria-label="Project video upload" aria-valuenow={videoProgress[index]||0} aria-valuemin={0} aria-valuemax={100}><span style={{width:(videoProgress[index]||0)+'%'}}/></div>}{project.videoUrl&&playableVideo(project.videoDisplayUrl||project.videoUrl)&&<video className="profile-project-video-preview" controls preload="metadata" src={project.videoDisplayUrl||project.videoUrl}/>} {project.videoUrl&&<button type="button" className="profile-video-link" onClick={()=>setMediaPreview({url:project.videoDisplayUrl||project.videoUrl,type:'video',title:(project.title||'Project')+' video'})}>▶ Preview video on ProPulse</button>}</div><div className="profile-plan-file-field profile-media-card"><label>Plan / drawing link <small>Optional if hosted elsewhere</small><input value={project.planUrl} onChange={e=>updateProject(index,'planUrl',e.target.value)} placeholder="Upload below or paste https://…"/></label><label className={'profile-plan-upload '+(planUploads[index]?'busy':'')}><span>{planUploads[index]?'Uploading plan…':'Upload plan / drawing'}</span><small>PDF, JPG, PNG or WebP · max 15 MB</small><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" disabled={Boolean(planUploads[index])} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadProjectPlan(index,file)}}/></label>{project.planUrl&&<button type="button" className="profile-plan-link" onClick={()=>setMediaPreview({url:project.planDisplayUrl||project.planUrl,type:'plan',title:(project.title||'Project')+' plan / drawing'})}>▤ View plan on ProPulse</button>} {project.planUrl&&<button type="button" className="profile-plan-remove" onClick={()=>updateProject(index,'planUrl','')}>Remove plan / drawing</button>}</div></div></div>
              <ProfileBrochureField title="Project specifications / brochure" description="Upload the project scope, materials, brands, finishes or handover dossier as a PDF. Customers will see it on the public project page." url={project.brochureUrl} displayUrl={project.brochureDisplayUrl} busy={Boolean(brochureUploads['project-'+index])} onUpload={file=>uploadBrochure('project',index,file)} onRemove={()=>updateProject(index,'brochureUrl','')}/>
              </div>}
            </article>})}{!projects.length&&<div className="profile-showcase-empty"><b>No completed projects added yet.</b><span>Add real work to make your public profile stronger.</span></div>}</div>
          </section></form>}
              {card.id==='packages'&&<div className="profile-accordion-packages">
                <div className="profile-accordion-segmented" role="group" aria-label="Package management">
                  <button type="button" className={packageView==='plans'?'selected':''} onClick={()=>setPackageView('plans')}>Packages</button>
                  <button type="button" className={packageView==='brochures'?'selected':''} onClick={()=>setPackageView('brochures')}>Company Brochures</button>
                </div>
                <div className="profile-package-pane" hidden={packageView!=='plans'}><form id="business-profile-form" className="profile-accordion-form profile-accordion-editor" onSubmit={save}><section className="profile-panel profile-plan-panel" id="profile-plans">
            <div className="panel-title"><div><span>06</span><h2>Service Packages</h2><p>Your three editable Business OS-style packages are ready: Standard, Premium and Royal. Review materials and specifications, set your company's price, then publish. Brochure uploads are optional.</p></div></div>
            <div className="profile-showcase-list">{plans.map((plan,index)=>{const isExpanded=expandedPlan===planKey(plan);return <article className={"profile-showcase-card compact profile-entry-card"+(isExpanded?" is-expanded":"")} key={planKey(plan)}><div className="profile-showcase-card-head profile-entry-head">
                <div className="profile-entry-overview">
                  <div className="profile-entry-thumbnail profile-entry-plan-icon" aria-hidden="true">₹</div>
                  <div className="profile-entry-summary">
                    <span>{PROFILE_PACKAGE_TIERS[index]?.name||'Package'} · {INDUSTRY_OPTIONS.find(option=>option.value===plan.industry)?.label||'Choose industry'}</span>
                    <h3>{plan.title||'New package'}</h3>
                    <p>{plan.priceFrom!==''&&Number(plan.priceFrom)>0?formatPublishedPackagePrice(plan.priceFrom,plan.priceUnit):'Set your package price to publish'}{plan.durationLabel?' · '+plan.durationLabel:''}{plan.brochureUrl?' · Brochure attached':''}</p>
                  </div>
                </div>
                <div className="profile-entry-actions">
                  <span className={'profile-entry-status '+(plan.isPublished?'published':'draft')}>{plan.isPublished?'Public':'Set price / draft'}</span>
                  <button type="button" className="profile-entry-edit" aria-expanded={isExpanded} aria-controls={'package-editor-'+index} onClick={()=>setExpandedPlan(isExpanded?null:planKey(plan))}>{isExpanded?'Close editor':'Edit package'} <span aria-hidden="true">{isExpanded?'−':'＋'}</span></button>
                </div>
              </div>
              {isExpanded&&<div className="profile-entry-body" id={'package-editor-'+index}>
                <div className="profile-entry-controls"><label className="profile-inline-check"><input type="checkbox" checked={plan.isPublished} onChange={e=>updatePlan(index,'isPublished',e.target.checked)} disabled={!plan.isPublished&&(plan.priceFrom===''||!Number.isFinite(Number(plan.priceFrom))||Number(plan.priceFrom)<=0||plan.priceUnit==='unspecified')}/> Publish this package</label><small>Set your rate and review the pre-filled material items before publishing. Unpublished drafts are hidden from customers.</small></div><div className="profile-showcase-grid"><label>Industry <select value={plan.industry||''} onChange={e=>updatePlan(index,'industry',e.target.value)} required={plan.isPublished}><option value="">Select industry</option>{INDUSTRY_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Packages only appear in quotations for projects in this industry.</small></label><label>Package name<input value={plan.title} maxLength="160" onChange={e=>updatePlan(index,'title',e.target.value)} placeholder="Premium turnkey interiors"/></label><label>Your company package rate (₹)<input type="number" min="0" value={plan.priceFrom} onChange={e=>updatePlan(index,'priceFrom',e.target.value)} placeholder="500000"/></label><label>Price unit<select value={plan.priceUnit} onChange={e=>updatePlan(index,'priceUnit',e.target.value)}>{PACKAGE_PRICE_UNITS.map(unit=><option key={unit.value} value={unit.value}>{unit.label}</option>)}</select><small>Important for ₹/sq ft, ₹/sq yd and fixed-price packages.</small></label><label>Duration<input value={plan.durationLabel} maxLength="120" onChange={e=>updatePlan(index,'durationLabel',e.target.value)} placeholder="8–10 weeks"/></label><label className="wide">Description<textarea rows="3" value={plan.description} maxLength="2000" onChange={e=>updatePlan(index,'description',e.target.value)} placeholder="Who this plan is for and what customers should expect…"/></label><label className="wide">Additional inclusions / legacy notes <small>Optional; editable material items below are primary.</small><textarea rows="3" value={plan.inclusions} onChange={e=>updatePlan(index,'inclusions',e.target.value)} placeholder="Design consultation; material selection; execution management"/></label></div>
              <ProfessionalPackageSpecEditor industry={plan.industry} sections={plan.specSections||[]} onChange={sections=>updatePlan(index,'specSections',sections)}/>
              <details className="profile-optional-brochure">
                <summary>Optional package brochure PDF {plan.brochureUrl?'· Attached':'· Not required'}</summary>
                <p>You do not need another template or PDF. Your structured specifications above automatically appear in customer quotation PDFs.</p>
                <ProfileBrochureField title="Attach existing brochure PDF" description="Optional supporting file, not another package." url={plan.brochureUrl} displayUrl={plan.brochureDisplayUrl} busy={Boolean(brochureUploads['plan-'+index])} onUpload={file=>uploadBrochure('plan',index,file)} onRemove={()=>updatePlan(index,'brochureUrl','')}/>
              </details>
              </div>}
            </article>})}</div>
          </section></form></div>
                <div className="profile-package-pane" hidden={packageView!=='brochures'}>
                  <ProfessionalBrochures embedded onEditStateChange={setBrochureState}/>
                </div>
              </div>}
              {card.id==='proofs'&&<div className="profile-accordion-editor"><section className="profile-panel profile-proof-panel">
            <div className="panel-title"><div><span>07</span><h2>Company proof</h2><p>Verification documents remain private and are reviewed by ProPulse Admin.</p></div></div>
            {companyProofs.length?<div className="profile-proof-list">{companyProofs.map(doc=><div className="profile-proof-item" key={doc.id||(doc.original_name+'-'+doc.created_at)}><div className="profile-proof-icon">{String(doc.mime_type||'').includes('pdf')?'PDF':'IMG'}</div><div className="profile-proof-info"><strong>{doc.original_name||'Company proof document'}</strong><small>{doc.mime_type||'Document'} · {doc.file_size?(Number(doc.file_size)/1024/1024).toFixed(2)+' MB':''}{doc.status?' · '+String(doc.status).replace(/^./,m=>m.toUpperCase()):''}</small></div>{doc.file_url&&<a className="profile-proof-view" href={doc.file_url} target="_blank" rel="noreferrer">View document ↗</a>}</div>)}</div>:<div className="profile-proof-empty"><strong>No company proof documents found</strong><span>Upload a proof document from signup to complete business verification.</span></div>}
          </section></div>}
            </div>}
          </section>
        })}
      </div>
      <div className="profile-accordion-advice"><ProfileIcon name="sparkle" size={22}/><p>Keep your profile updated to get more visibility and customer enquiries.</p></div>
    </main>
    <div className="profile-accordion-savebar" role="region" aria-label="Profile actions">
      {(error||message)&&<div className={'profile-save-feedback '+(error?'error':'success')} role={error?'alert':'status'}>{error||message}</div>}
      {directoryEligible&&publicProfileId
        ?<Link className="profile-accordion-preview" to={'/experts/'+publicProfileId}><ProfileIcon name="eye" size={21}/> Preview Public Profile</Link>
        :<button type="button" className="profile-accordion-preview" disabled title="Complete your directory eligibility to preview your listing"><ProfileIcon name="eye" size={21}/> Preview Public Profile</button>}
      <button type="button" className={'profile-accordion-save'+(needsSave?' has-changes':' is-saved')} disabled={saveBusy||!needsSave||(brochureView&&!brochureState.ready)} onClick={submitCurrentChanges}>
        <ProfileIcon name={needsSave?'save':'check'} size={21}/>{saveBusy?'Saving…':brochureView&&!brochureState.ready?'Loading…':needsSave?'Save Changes':'All Saved'}
      </button>
    </div>
  </>
}
