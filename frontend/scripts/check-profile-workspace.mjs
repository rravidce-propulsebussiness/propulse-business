import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'
import {ALL_SERVICES_VALUE,selectAllIndustryServices} from '../src/utils/profileServiceSelection.js'
import {createDefaultProfilePackages,resolveProfilePackages,getPreferredPackageIndustry} from '../src/utils/profilePackageTemplates.js'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const read=path=>readFileSync(resolve(root,path),'utf8')
const profile=read('src/pages/Profile.jsx')
const styles=read('src/pages/ProfileWorkspace.css')
const compactStyles=read('src/pages/ProfileCompact.css')
const brochures=read('src/pages/ProfessionalBrochures.jsx')
const header=read('src/components/UserHeader.jsx')
const count=term=>profile.split(term).length-1
const check=(v,message)=>assert(v,message)

check(profile.includes("['business','public'].includes")===false,'Old duplicate profile routing must be removed')
check(profile.includes("const [openProfileCard,setOpenProfileCard]"),'Profile cards must have interactive accordion state')
check(profile.includes("mapProfileTab=tab=>tab==='locations'?'services'"),'Location links still open the unified Services & Locations card')
check(profile.includes("tab==='brochures'?'packages'"),'Brochure links still open Packages & Brochures')
check(profile.includes("setOpenProfileCard('')"),'A user must be able to collapse open saved data')
check(profile.includes("cardEntries.map(card=>"),'Accordion cards must be driven from a single structured list')
check(profile.includes('aria-expanded={expanded}')&&profile.includes("aria-controls={'profile-card-body-'+card.id}"),'Accordion headers need accessible expand/collapse controls')
check(count('profile-accordion-trigger')===1,'Use just one reusable accordion trigger, not separate duplicate menus')
check(count('profile-workspace-nav')===0,'Do not duplicate the global site navigation within the profile')
check(count('profile-overview-cards')===0,'Old management/summary card links must be removed')
check(count('profile-callback-panel')===0,'Do not show the dedicated Requests CRM again in the profile')
check(count('Open Requests →')===0,'Requests must be managed only in its dedicated workspace')
check(count('profile-public-panel')===0,'Business and Public Profile must remain unified')
check(count('<ProfileBusinessFields form={form} update={update} overview/>')===1,'Use one business/public field editor')
check(count('<ProfessionalBrochures embedded onEditStateChange={setBrochureState}/>')===1,'Keep one brochure editor sharing the fixed Save bar')
check(count('id="profile-services"')===1&&count('id="profile-locations"')===1,'Each service and location editor must exist exactly once')
check(profile.includes('setActiveServiceIndex(open?null:index)')&&profile.includes('setActiveLocationIndex(open?null:index)'),'Only the selected service or location opens for editing')
check(profile.includes('setActiveLocationIndex(null)')&&profile.includes('setActiveServiceIndex(null)'),'Service and Location forms must not mount simultaneously')
check(count('id="business-profile-form"')>=4,'Existing forms must retain the shared primary save target')
check(profile.includes("const saved=await save({preventDefault(){}})"),'Bottom Save must use the existing profile API for saved or collapsed editors')
check(profile.includes('disabled={saveBusy||!needsSave'),'Sticky save must reflect both profile and brochure drafts and prevent double submission')
check(profile.includes('onClick={submitCurrentChanges}'),'Bottom Save must handle unmounted accordion editors')
check(profile.includes('if(hasUnsavedChanges){'),'Save bar must handle profile drafts without an expanded editor')
check(profile.includes("document.getElementById('profile-brochures-form')?.requestSubmit()"),'Brochure Save must use its own form while preserving the shared fixed button')
check(profile.includes('const profileFingerprint='),'Track unsaved changes across every profile editor')
check(profile.includes('setSavedSnapshot(profileFingerprint('),'Saved state must be updated only on successful load or save')
check(profile.includes("requestedTab?mapProfileTab(requestedTab):''"),'Show saved profile sections collapsed by default')
check(profile.includes("showEditorError('services','Complete every location selection.','locations')"),'Location validation must open the corresponding existing editor')
check(profile.includes("showEditorError('business'"),'Business validation must open the single business editor')
check(profile.includes('profile-accordion-savebar')&&profile.includes("publicProfileId"),'Use one always-available Save/Preview bar')
check(profile.includes("authRequest('/profile',{method:'PUT'"),'Keep authenticated profile save API')
check(profile.includes('revealProjectError')&&profile.includes("openCard('projects')"),'Validation should open the appropriate project editor')
check(profile.includes('revealPlanError')&&profile.includes("openCard('packages','plans')"),'Validation should open the appropriate package editor')
for(const fn of ['uploadProjectImages','uploadProjectVideo','uploadBrochure','uploadProjectPlan','updateService','updateLocation','updatePlan','updateProject']){
  check(profile.includes(fn),'Existing profile feature must remain available: '+fn)
}
check(header.includes('variant===\'profile\''),'Only profile route receives the customized site header')
check(header.includes('id="user-header-site-nav"'),'The existing site navigation must remain usable')
check(header.includes('aria-expanded={open}'),'Mobile menu should expose accessibility state')
for(const style of ['.profile-accordion-root','.profile-accordion-card.is-open','.profile-accordion-savebar',
  '.profile-site-header','.profile-accordion-pills','@media(max-width:760px)','prefers-reduced-motion']){
  check(styles.includes(style),'Missing premium animated responsive profile style '+style)
}
check(!styles.includes('.profile-workspace-layout'),'Old duplicate sidebar layout styles must be replaced')
check(!styles.includes('background:#092b61'),'Do not reintroduce the old navy profile banner')

// Native Android picker must expose the bulk selection inside Service, not as
// a separate out-of-context action below the service rows.
check(profile.includes('value={ALL_SERVICES_VALUE}>✓ All services'), 'Service picker must offer All services on mobile')
check(profile.includes('event.target.value===ALL_SERVICES_VALUE?addAllServicesForIndustry(index)'), 'All services option must trigger bulk selection')
check(profile.includes('selectAllIndustryServices(items,services,index)'), 'Picker must use safe normalized multirow selection')
check(!profile.includes('className="add-all-services"'), 'Do not display a duplicate Add all services button')
check(ALL_SERVICES_VALUE==='__all_services__', 'The special picker value must never be stored as a service ID')
const catalog=[
  {id:11,industry_id:2,name:'Advertising'},
  {id:12,industry_id:2,name:'Digital Marketing'},
  {id:13,industry_id:3,name:'Construction'}
]
const blank=[{industryId:'2',serviceId:'',subserviceId:''}]
const all=selectAllIndustryServices(blank,catalog,0)
assert.deepEqual(all,[
  {industryId:'2',serviceId:'11',subserviceId:''},
  {industryId:'2',serviceId:'12',subserviceId:''}
],'Selecting All must fill the blank row and add missing services without an unsavable placeholder')
assert.deepEqual(selectAllIndustryServices(all,catalog,0),all,'Repeated All must be idempotent')
assert.deepEqual(selectAllIndustryServices([all[0],{industryId:'2',serviceId:'',subserviceId:''}],catalog,1),all,
  'Already selected service must not be duplicated; empty row must be reused')
assert.deepEqual(selectAllIndustryServices([...all,{industryId:'2',serviceId:'',subserviceId:''}],catalog,2),all,
  'Already complete industries must not leave an invalid empty service row')
assert.deepEqual(selectAllIndustryServices([{industryId:'3',serviceId:'',subserviceId:''}],catalog,0),[
  {industryId:'3',serviceId:'13',subserviceId:''}
],'Bulk selection must respect the selected industry')
assert.deepEqual(selectAllIndustryServices([{industryId:'7',serviceId:'',subserviceId:''}],catalog,0),[
  {industryId:'7',serviceId:'',subserviceId:''}
],'No matching catalog entries should preserve current values until an error is shown')


check(profile.includes('const [activeServiceIndex,setActiveServiceIndex]=useState(null)'), 'Only one service editor is allowed')
check(profile.includes("const open=activeServiceIndex===index"), 'Each service item has one expandable editor')
check(profile.includes('serviceSelections.map((item,index)=>'), 'All existing services must be shown in compact rows')
check(profile.includes('profile-service-compact-item'), 'Existing service cards must be visible while editing one entry')
check(profile.includes('profile-service-edit-button')&&profile.includes('profile-service-delete-button'), 'Every service must be editable or removable')
check(profile.includes('profile-service-inline-form'), 'Add Service must open only one inline form')
check(profile.includes('function addService()')&&profile.includes('setActiveServiceIndex(serviceSelections.length)'), 'Adding a service opens only its new row')
check(profile.includes('const incomplete=serviceSelections.findIndex'), 'An existing blank draft must be reused rather than duplicated')
check(profile.includes('setActiveServiceIndex(current=>current===null?null:current===index?null:current>index?current-1:current)'), 'Deleting a service must preserve the editing index for remaining rows')
check(!profile.includes('setEditServices('), 'Remove obsolete show-all service editor state')
const savedSection=profile.slice(profile.indexOf('saveSession({user:result.user})'),profile.indexOf('return true',profile.indexOf('saveSession({user:result.user})')))
check(!savedSection.includes('setActiveServiceIndex(null);setActiveLocationIndex(null)'), 'Successful Save must keep the selected service or location editor open')
check(savedSection.includes('setExpandedProject(current=>')&&savedSection.includes('setExpandedPlan(current=>'), 'Successful Save must keep the current project or package editor open even after new IDs arrive')
check(!profile.includes('Services you provide'), 'Do not display duplicate legacy service editor heading')
check(profile.includes("String(item.serviceId)===String(value)"), 'Prevent adding existing industry services twice')
check(styles.includes('.profile-service-compact-item')&&styles.includes('.profile-service-inline-form'), 'Compact rows and one mobile inline editor must be styled')

check(profile.includes('const [activeLocationIndex,setActiveLocationIndex]=useState(null)'), 'Keep one editable location at a time')
check(profile.includes('const open=activeLocationIndex===index'), 'Only selected location expands')
check(profile.includes('locationSelections.map((item,index)=>'), 'Show every saved location as a compact row')
check(profile.includes('profile-location-compact-list')&&profile.includes('profile-location-compact-item'), 'Location rows must be compact, not a large form stack')
check(profile.includes('profile-location-inline-form'), 'Add Location must open one inline form')
check(profile.includes('function addLocation()')&&profile.includes('setActiveLocationIndex(locationSelections.length)'), 'Add Location should create exactly one new draft')
check(profile.includes('const incomplete=locationSelections.findIndex'), 'Reuse an incomplete location draft')
check(profile.includes('setActiveLocationIndex(current=>current===null?null:current===index?null:current>index?current-1:current)'), 'Removing a location must reconcile the selected editor index')
check(profile.includes("String(item.cityId)===String(value)"), 'Prevent duplicate cities within the same state')
check(!profile.includes('setEditLocations('), 'Remove old expand-every-location editor')
check(!profile.includes('Locations you serve'), 'Do not leave the original stacked locations panel')
check(!profile.includes('className="row-remove" onClick={()=>setLocationSelections'), 'Only one location Delete action should exist')
check(profile.includes("profile-entry-delete"), 'Project Delete must remain available')
check(profile.split('className="profile-entry-delete"').length-1===1,'Only project Delete is permitted; the three package slots are permanent')
check(!profile.includes('+ Add Package')&&!profile.includes('Delete package '),'No package add/remove controls')
check(!profile.includes('Remove package</button>')&&!profile.includes('Remove project</button>'), 'No duplicate nested remove controls')
check(brochures.includes('className="profile-entry-delete"'), 'Saved brochures also need visible Delete')
check(!brochures.includes('Remove brochure</button>'), 'Do not duplicate brochure Delete in the editor')
check(brochures.includes('setExpanded(editorKey(doc))'), 'Adding a brochure opens only the new brochure editor')
check(profile.includes("setExpandedProject('draft-'+item._draftKey)"), 'Adding a project must expand only the new record')
check(!profile.includes('function addPlan()'), 'Package management must not grow beyond the three editable tiers')
check(compactStyles.includes('.profile-entry-actions .profile-entry-delete'), 'Shared compact Delete styling is required for mobile')
check(profile.includes('companyProofs.map(doc=>'), 'Preserve the existing private, admin-reviewed verification document list')

/* One Save/Preview action and stable in-page navigation for ALL editors. */
check(profile.includes("const [brochureState,setBrochureState]=useState("),'Parent must track brochure save/draft state')
check(profile.includes("const brochureNeedsSave=brochureState.ready&&brochureState.dirty"),'Brochure draft must remain savable even when collapsed or switched')
check(profile.includes("const needsSave=hasUnsavedChanges||brochureNeedsSave"),'Fixed Save button must reflect both profile and brochure changes')
check(profile.includes("setOpenProfileCard('packages')")&&profile.includes("document.getElementById('profile-brochures-form')?.requestSubmit()"),'Fixed Save button must submit the embedded brochure form without navigating')
check(profile.includes("const saved=await save({preventDefault(){}})"),'When both profile and brochures changed, Save must update both without a second click')
check(profile.includes("if(!saved)return"),'Failed profile save must not silently proceed as though both saves succeeded')
check(profile.includes("return true")&&profile.includes("return false"),'Profile save must report success/failure to shared Save handler')
check(profile.includes("const preserveBrochureDraft=card.id==='packages'&&brochureNeedsSave"),'Unsubmitted brochures must remain mounted when accordion closes')
check(profile.includes("hidden={packageView!=='plans'}")&&profile.includes("hidden={packageView!=='brochures'}"),'Package and brochure tabs must not discard drafts when switched')
check(!profile.includes("navigate('/profile?tab=brochures')"),'Tapping Brochures must not navigate and jump to top')
check(!profile.includes("navigate('/profile?tab=plans')"),'Tapping Packages must not navigate and jump to top')
const accordionNav=profile.slice(profile.indexOf('function openCard('),profile.indexOf('function addProject(){'))
check(!accordionNav.includes("navigate("),'Accordion expand/collapse must not navigate and reset scroll')
check(brochures.includes("onEditStateChange?.({ready:!loading,dirty:hasUnsavedChanges"),'Embedded brochures must report changes to profile Save bar')
check(brochures.includes("setSavedSnapshot(JSON.stringify(savableBrochures(savedDocs)))"),'Brochure Save must update saved-state baseline')
check(brochures.includes("id={embedded?'profile-brochures-form':undefined}"),'Embedded brochure form needs a unique Save target')
check(brochures.includes("!embedded&&<button type=\"submit\""),'Embedded brochure editor must hide its own Save button')
check(!brochures.includes('Save Brochures</button></div>'),'Old duplicate inline Save footer must be removed')
check(!brochures.includes('+ Add First Brochure'),'Only one Add Brochure action should remain')
check(brochures.includes('setExpanded(editedIndex>=0&&savedDocs[editedIndex]?editorKey(savedDocs[editedIndex]):null)'), 'Save should keep the edited brochure open instead of abruptly shrinking/scrolling the page')
check(styles.includes('.profile-accordion-root [hidden]{display:none!important}'), 'Inactive package panes must truly be hidden without unmounting')
check(styles.includes('.profile-accordion-root .profile-company-brochures.profile-panel'), 'Embedded brochures must match the existing premium accordion styling')

const defaultPackages=createDefaultProfilePackages('construction')
check(defaultPackages.length===3,'There must be exactly three starter packages')
assert.deepEqual(defaultPackages.map(plan=>plan.title),['Standard','Premium','Royal'])
assert.deepEqual(defaultPackages.map(plan=>plan.priceFrom),['','',''],'Every company must enter its own package rate')
assert.deepEqual(defaultPackages.map(plan=>plan.isPublished),[false,false,false],'Unpriced drafts must never publish themselves')
assert.deepEqual(defaultPackages.map(plan=>plan.title),['Standard','Premium','Royal'])
check(defaultPackages.every(plan=>plan.priceUnit==='sqft'&&plan.specSections.length===16),'The three construction tiers must contain all 16 editable Business OS categories')
check(defaultPackages.every(plan=>plan.specSections.every(item=>item.brand===''&&item.grade===''&&item.allowanceValue==='')),'Do not assume a contractor uses any particular brand, grade or allowance')
check(defaultPackages.every(plan=>plan.inclusions===''&&plan.brochureUrl===''),'Do not duplicate the catalogue text or require a brochure')
check(defaultPackages.every(plan=>plan.priceUnit==='sqft'&&plan.inclusions.includes('Steel:')),'Starter packages must inherit current construction specifications')
const customised={...defaultPackages[1],id:42,priceFrom:1950,description:'Our updated package',brochureUrl:'https://example.com/package.pdf'}
const merged=resolveProfilePackages([customised],'construction')
check(merged.length===3&&merged[1].priceFrom===1950&&merged[1].id===42&&merged[1].brochureUrl===customised.brochureUrl,'Saved price, description and brochure must survive tier reconciliation')
const savedSpecifications=[{title:'Steel / TMT',brand:'Tata',grade:'Fe 550D',unit:'none',pricingTreatment:'included',description:'As per drawings'}]
const savedWithSpecs={...customised,specSections:savedSpecifications}
const preserved=resolveProfilePackages([savedWithSpecs],'construction')
assert.deepEqual(preserved[1].specSections,savedSpecifications,'Never overwrite saved professional specifications')
const legacy={...customised,specSections:[]}
const upgraded=resolveProfilePackages([legacy],'construction')
check(upgraded[1].specSections.length===16&&upgraded[1].priceFrom===1950,'Previously saved prices must survive a proposed editable-specification upgrade')
assert.deepEqual(createDefaultProfilePackages('design').map(plan=>plan.specSections.length),[11,11,11])
check(profile.includes('Your company package rate (₹)'),'Quote rates must be company-owned')
check(profile.includes('Optional package brochure PDF'),'Brochure upload must be secondary, not another mandatory editor')
check(!read('src/components/ProfessionalPackageSpecEditor.jsx').includes('Add construction template'),'Do not offer a duplicate construction template button')
assert.deepEqual(createDefaultProfilePackages('design').map(plan=>plan.isPublished),[false,false,false])
check(getPreferredPackageIndustry([{industryId:'2'}],[{id:2,name:'Interior Design'}])==='design','Do not prepublish construction prices for interior businesses')
check(profile.includes('resolveProfilePackages(originalPlans')&&profile.includes('getPreferredPackageIndustry(loadedServices,industryData)'),'Profile must load fixed editable tiers from existing plans')
check(profile.includes('originalPlans))'),'Unsaved starter templates must not be reported as already saved')
console.log('Premium accordion profile, three editable package tiers, sticky Save/Preview and no-duplicate regressions passed.')
