import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const read=path=>readFileSync(resolve(root,path),'utf8')
const profile=read('src/pages/Profile.jsx')
const styles=read('src/pages/ProfileWorkspace.css')
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
check(count('<ProfessionalBrochures embedded/>')===1,'Keep existing brochure editing/upload exactly once')
check(count('id="profile-services"')===1&&count('id="profile-locations"')===1,'Each service and location editor must exist exactly once')
check(profile.includes('setEditServices(v=>!v)')&&profile.includes('setEditLocations(v=>!v)'),'Inline Edit must expand existing service and location controls')
check(profile.includes('setEditLocations(false)')&&profile.includes('setEditServices(false)'),'Only one editable service/location form should have the save form id')
check(count('id="business-profile-form"')>=4,'Existing forms must retain the shared primary save target')
check(profile.includes('form="business-profile-form"'),'Bottom action bar must submit the active form')
check(profile.includes('disabled={saving||!hasUnsavedChanges}'),'Sticky save should only be unavailable when unchanged or saving')
check(profile.includes('onClick={submitCurrentChanges}'),'Bottom Save must handle unmounted accordion editors')
check(profile.includes('else void save({preventDefault(){}})'),'Collapsed editors must save via existing API without a mounted form')
check(profile.includes('mountedForm.requestSubmit()'),'Open forms keep native browser field validation')
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
console.log('Premium accordion profile, single menu, sticky Save/Preview and no-duplicate regressions passed.')
