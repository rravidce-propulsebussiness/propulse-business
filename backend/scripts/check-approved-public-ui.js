const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const app=read('../frontend/src/App.jsx');
const mainEntry=read('../frontend/src/main.jsx');
const errorBoundary=read('../frontend/src/components/AppErrorBoundary.jsx');
const chunkRecovery=read('../frontend/src/utils/chunkRecovery.js');
const home=read('../frontend/src/pages/Home.jsx');
const homeCss=read('../frontend/src/pages/Home.css');
const popup=read('../frontend/src/components/GlobalLeadPopup.jsx');
const quote=read('../frontend/src/pages/Solutions.jsx');
const quoteCss=read('../frontend/src/pages/Solutions.css');
const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const packages=read('../frontend/src/pages/Packages.jsx');
const projects=read('../frontend/src/pages/Projects.jsx');
const about=read('../frontend/src/pages/About.jsx');
const howItWorks=read('../frontend/src/pages/HowItWorks.jsx');
const contact=read('../frontend/src/pages/Contact.jsx');
const experts=read('../frontend/src/pages/Experts.jsx');
const expertsCss=read('../frontend/src/pages/Experts.css');
const quoteLocationFields=read('../frontend/src/components/QuoteLocationFields.jsx');
const quoteLocationCss=read('../frontend/src/components/QuoteLocationFields.css');
const interiorExact=read('../frontend/src/components/InteriorRequirementExact.jsx');
const realEstateExact=read('../frontend/src/components/RealEstateRequirementExact.jsx');
const pincodeDetection=read('./src/services/pincodeDetectionService.js');
const pincodeRoutes=read('./src/routes/pincodeRoutes.js');
const publicExpertService=read('./src/services/publicExpertService.js');
const serverSource=read('./src/server.js');

assert.match(mainEntry,/installVitePreloadRecovery/);
assert.match(errorBoundary,/reloadOnceForStaleAsset\(error\)/);
assert.match(chunkRecovery,/vite:preloadError/);
assert.match(chunkRecovery,/failed to fetch dynamically imported module/);
assert.match(chunkRecovery,/RELOAD_COOLDOWN_MS=60_000/);

assert.match(projects,/const previous=document\.body\.style\.overflow/);
assert.match(projects,/return\(\)=>\{document\.body\.style\.overflow=previous\}/);
assert.doesNotMatch(projects,/function openProject\(project\)\{\s*setSelectedProject\(project\)\s*document\.body\.style\.overflow/);
assert.doesNotMatch(projects,/import \{ openLeadPopup \}/);
assert.doesNotMatch(projects,/import PublicIcon /);

// Canonical public routes and shared requirement popup.
assert.match(app,/path="\/experts" element={<Experts\/>}/);
assert.match(app,/path="\/quote" element={<Solutions\/>}/);
assert.match(app,/path="\/professionals" element={<Leads\/>}/);
assert.match(app,/path="\/solutions" element={<LegacySolutionRedirect\/>}/);
assert.match(app,/targetHash=hash\?'#'\+hash/);
assert.match(app,/<GlobalLeadPopup\/>/);
assert.doesNotMatch(app,/ProfessionalHome/);

// Homeowner acquisition homepage.
assert.match(home,/Don&apos;t Leave Your/);
assert.match(home,/Find the right partner\. Build it right\./);
assert.doesNotMatch(home,/Build\. Design\. Find/);
assert.doesNotMatch(home,/Right Professionals/);
assert.match(home,/Start Your Requirement/);
assert.match(home,/propulse:open-lead-popup/);
assert.match(home,/What do you need\?/);
assert.match(home,/Build Your Home/);
assert.match(home,/Design Your Space/);
assert.match(home,/Find a Property/);
assert.match(home,/Why Homeowners Choose ProPulse/);
assert.match(home,/How It Works/);
assert.doesNotMatch(home,/WebsiteFaqSection/);
assert.doesNotMatch(home,/audience="homeowner"/);
assert.match(home,/to="\/experts">Find Professionals<\/Link>/);
assert.match(home,/to="\/professionals">For Professionals<\/Link>/);
assert.match(home,/\/quote#construction/);
assert.match(home,/\/quote#interiors/);
assert.match(home,/\/quote#property/);
assert.match(homeCss,/\.hc-hero/);
assert.match(homeCss,/\.hc-service-grid/);
assert.match(homeCss,/\.hc-benefit-grid/);
assert.match(homeCss,/\.hc-step-grid/);
assert.doesNotMatch(home,/HeroJourneyVideo/);

// Shared basic lead intake must remain wired to the public consultation endpoint.
assert.match(popup,/Tell Us Your Requirement/);
assert.match(popup,/\/customer-flows\/'\+form\.flowKey\+'\/consultation/);
assert.match(popup,/consent:true/);
assert.match(popup,/PIN Code/);
assert.match(popup,/No\. of Floors/);
assert.match(popup,/Submit Requirement/);
assert.match(popup,/Requirement received/);
assert.match(popup,/Continue to Detailed Requirement/);
assert.match(popup,/propulse_basic_lead_submitted/);

// Unified detailed quote flow.
assert.match(quote,/quote-flow-switcher/);
assert.match(quote,/Choose quote type/);
assert.match(quote,/Construction/);
assert.match(quote,/Interiors/);
assert.match(quote,/Real Estate/);
assert.match(quote,/RequirementWizard flowKey={active\.flowKey}/);
assert.match(quote,/aria-pressed={activeKey===key}/);
assert.match(quoteCss,/\.quote-flow-switcher/);
assert.match(quoteCss,/quoteFlowIn/);
assert.match(quoteCss,/\.quote-flow \.rq-premium-hero/);
assert.match(quoteCss,/\.quote-flow \.irx-hero/);
assert.match(quoteCss,/\.quote-flow \.rex-hero/);
assert.match(wizard,/RealEstateRequirementExact/);
assert.match(wizard,/QuoteLocationFields/);

// Packages keep customer quote links and comparison behavior.
assert.match(packages,/Construction Packages/);
assert.match(packages,/Interior Packages/);
assert.match(packages,/Side-by-Side Comparison/);
assert.match(packages,/Get Quote/);
assert.match(packages,/\/quote\?package=/);

// Public marketing pages keep both customer/professional navigation paths.
for(const source of [home,quote,packages,projects,about,howItWorks,contact]){
  assert.match(source,/For Professionals/);
  assert.match(source,/to="\/professionals"/);
  assert.match(source,/to="\/experts">Find Professionals<\/Link>/);
}

// Experts directory is public but does not expose direct contact data.
assert.doesNotMatch(experts,/experts-hero/);
assert.match(experts,/TRUSTED PROFESSIONALS/);
assert.match(experts,/Expert<\/span> <em>Engineers<\/em>/);
assert.match(experts,/Find trusted construction, interior and real-estate professionals/);
assert.match(experts,/More Filters/);
assert.match(experts,/View Profile/);
assert.match(experts,/Send Requirement/);
assert.match(experts,/Direct phone and email details are not displayed publicly/);
assert.match(experts,/publicRequest\('\/experts\?'/);
assert.match(expertsCss,/\.experts-grid/);
assert.match(expertsCss,/\.expert-card/);
assert.match(expertsCss,/\.expert-modal/);
assert.match(publicExpertService,/u\.role='business'/);
assert.match(publicExpertService,/u\.is_active=TRUE/);
assert.match(publicExpertService,/company_proof_documents/);
assert.match(publicExpertService,/requireActiveMembership/);
assert.match(publicExpertService,/business_profile_projects/);
assert.match(publicExpertService,/business_profile_service_plans/);
assert.match(publicExpertService,/getPublicExpert/);
assert.doesNotMatch(publicExpertService,/bp\.phone/);
assert.doesNotMatch(publicExpertService,/bp\.business_details/);
assert.doesNotMatch(publicExpertService,/membership_expires_at/);
assert.doesNotMatch(publicExpertService,/updatedBy/);
assert.doesNotMatch(publicExpertService,/u\.email/);
assert.match(serverSource,/app\.use\('\/api\/experts',publicExpertRoutes\)/);

// Location selection and PIN lookup must be available in every requirement experience.
assert.match(wizard,/QuoteLocationFields/);
assert.match(interiorExact,/QuoteLocationFields/);
assert.match(realEstateExact,/QuoteLocationFields/);
assert.match(quoteLocationFields,/Select State/);
assert.match(quoteLocationFields,/Type city \/ location/);
assert.match(quoteLocationFields,/state_id/);
assert.match(quoteLocationFields,/disabled={!stateId}/);
assert.match(quoteLocationFields,/Use my current location/);
assert.match(quoteLocationFields,/Enter 6-digit PIN/);
assert.match(quoteLocationFields,/lookupStatus === 'matched'/);
assert.match(quoteLocationCss,/\.quote-location-fields/);
assert.match(quoteLocationCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(pincodeDetection,/async function locatePincode\(pincode\)/);
assert.match(pincodeDetection,/status: 'MAPPED'/);
assert.match(pincodeDetection,/status: city \? 'DETECTED' : 'STATE_ONLY'/);
assert.match(pincodeRoutes,/router\.get\('\/location\/:pincode', publicLookupLimit, pincodeController\.locate\)/);

console.log('Approved public UI and customer-acquisition contract checks passed.');
