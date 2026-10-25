import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'

const here=dirname(fileURLToPath(import.meta.url))
const profile=readFileSync(resolve(here,'../src/pages/Profile.jsx'),'utf8')
const css=readFileSync(resolve(here,'../src/pages/ProfileWorkspace.css'),'utf8')
const count=needle=>profile.split(needle).length-1

assert(profile.includes("['services','projects','brochures','plans','proofs']"),'Only distinct editing sections should have separate route tabs');
assert(profile.includes("requestedTab==='locations'?'services'"),'Existing locations deep links must open the unified services-and-locations editor');
assert(profile.includes("section==='locations'?'services'"),'Checklist location links must open the unified editor');
assert.equal(count("activeSection==='locations'&&"),0,'A duplicate Locations tab or editor must not remain');
assert.equal(count("activeGroup==='services'&&<div"),0,'Services and Locations must not have a second row of tab buttons');
assert.equal(count('id="profile-services"'),1,'Services editor must appear exactly once');
assert.equal(count('id="profile-locations"'),1,'Locations editor must appear exactly once');
const serviceStart=profile.indexOf("{activeSection==='services'&&<>");
const locationStart=profile.indexOf('id="profile-locations"');
const projectsStart=profile.indexOf("{activeSection==='projects'&&<>");
assert(serviceStart>=0&&locationStart>serviceStart&&projectsStart>locationStart,'Services and Locations must share a single mounted tab/form');
assert.equal(count('profile-callback-panel'),0,'Requests CRM must not be duplicated in the Projects editor');
assert.equal(count('Open Requests →'),0,'Requests must stay in the existing dedicated workspace');

assert(profile.includes("['business','public'].includes(section)?'overview':section"),'Legacy Business and Public profile URLs must redirect into the unified editor');
assert.equal(count("profile-public-panel"),0,'Separate public profile editor must not exist');
assert.equal(count("activeSection==='business'"),0,'Redundant business editor must not exist');
assert(profile.includes("activeSection==='proofs'&&<section"),'Company proof documents must remain accessible privately');
assert(profile.includes('profile-unified-visibility'),'Public visibility must be editable in the same Business Profile form');
assert(profile.includes('update(\'yearsExperience\''),'Years of experience must remain editable in the unified form');
assert(!profile.includes('form.publicHeadline')&&!profile.includes('form.publicSummary'),'Users must not need separate public text fields');
assert.equal(count('<nav className="profile-workspace-nav"'),1,'Profile navigation must render just once')
assert.equal(count('<aside className="profile-side-column"'),0,'The old duplicate info sidebar must be removed')
assert.equal(count('<section className="profile-hero"'),1,'Only one business summary card should render')
assert.equal(count('<ProfessionalBrochures embedded/>'),1,'Company brochures must keep their single existing editor')
assert.equal(count('<ProfileBusinessFields form={form} update={update} overview/>'),1,'Business fields should be reused in the overview')
assert.equal(count('<ProfileBusinessFields form={form} update={update}/>'),0,'A second Business Details editor must not exist')
assert(profile.includes("{activeSection==='overview'&&<div className=\"profile-overview-layout\">"),'Overview renders only on the overview tab')
assert(profile.includes("{activeSection==='overview'?null:activeSection==='brochures'?"),'Detailed form and brochure editor must not duplicate the overview')
assert(profile.includes('<form id="business-profile-form" className="profile-overview-card'), 'Overview must submit using the existing authenticated profile action')
assert(profile.includes('<form id="business-profile-form" onSubmit={save}'), 'Detailed edit tabs must retain authenticated profile saving')
assert(profile.includes('form="business-profile-form"'), 'The primary Save Changes control must submit the mounted editor')
assert(profile.includes("authRequest('/profile',{method:'PUT'"),'Saving must use the existing profile API')
assert.equal(count('<form id="business-profile-form"'),2,'Business overview form and conditional work editor must share the same form target without mounting together');
assert(profile.includes("activeSection==='overview'?null:activeSection==='brochures'?"),'Conditional project/verification editors must not mount next to the business overview form');
assert(profile.includes('getElementById(\'profile-workspace-content\')'),'Editor validation must scroll to the visible content area')
assert(profile.includes('publicProfileId&&<Link to={\'/experts/\'+publicProfileId}'), 'Public preview must open the specific eligible business profile')
for(const marker of ['uploadProjectImages','uploadProjectVideo','uploadBrochure','uploadProjectPlan','updateService','updateLocation','updatePlan','updateProject']) {
  assert(profile.includes(marker),`Existing edit/upload feature ${marker} must remain available`)
}
for(const marker of ['.profile-workspace-layout','.profile-overview-card','.profile-overview-fields-editable','@media(max-width:750px)','prefers-reduced-motion']) {
  assert(css.includes(marker),`Missing premium profile workspace style ${marker}`)
}
assert(!css.includes('background:#092b61'),'The new workspace stylesheet must not reintroduce the old dark hero')
assert(css.includes('overflow-x:clip'),'Mobile profile content should not clip the entire viewport with sideways document scrolling');
console.log('ProPulse premium profile workspace and no-duplicate regressions passed.')
