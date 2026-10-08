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
const supportChat=read('../frontend/src/components/SupportChatWidget.jsx');
const quote=read('../frontend/src/pages/Solutions.jsx');
const quoteCss=read('../frontend/src/pages/Solutions.css');
const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const questionUtils=read('../frontend/src/components/customerFlowQuestionUtils.js');
const packages=read('../frontend/src/pages/Packages.jsx');
const projects=read('../frontend/src/pages/Projects.jsx');
const projectDetail=read('../frontend/src/pages/ProjectDetail.jsx');
const about=read('../frontend/src/pages/About.jsx');
const howItWorks=read('../frontend/src/pages/HowItWorks.jsx');
const contact=read('../frontend/src/pages/Contact.jsx');
const experts=read('../frontend/src/pages/Experts.jsx');
const expertsCss=read('../frontend/src/pages/Experts.css');
const professionalDetailCss=read('../frontend/src/pages/ProfessionalDetails.css');
const professionalDetail=read('../frontend/src/pages/ProfessionalDetails.jsx');
const quoteLocationFields=read('../frontend/src/components/QuoteLocationFields.jsx');
const notificationBell=read('../frontend/src/components/NotificationBell.jsx');
const portalContact=read('../frontend/src/pages/PortalContact.jsx');
const adminContactSocial=read('../frontend/src/admin/pages/AdminContactSocial.jsx');
const userHeader=read('../frontend/src/components/UserHeader.jsx');
const realEstateBuySellMigration=read('./src/database/migrations/20261006_real_estate_buy_sell_only.sql');
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
assert.match(supportChat,/const userId=user\?\.id\|\|null/);
assert.match(supportChat,/\},\[userId\]\)/);
assert.match(wizard,/onCompletionChangeRef\.current\?\.\(false\)/);
assert.match(wizard,/onCompletionChangeRef\.current\?\.\(true\)/);
assert.match(wizard,/answers\.built_up_area\]\)/);


// Project details now live at their own URL; the listing must never lock body scrolling.
assert.match(app,/path="\/projects\/:projectId" element={<ProjectDetail\/>}/);
assert.match(projects,/to=\{projectPath\(project\)\}/);
assert.doesNotMatch(projects,/document\.body\.style\.overflow/);
assert.doesNotMatch(projects,/pj-detail-backdrop/);
assert.match(projectDetail,/pjd-main-grid/);
assert.doesNotMatch(projects,/import \{ openLeadPopup \}/);
assert.doesNotMatch(projects,/import PublicIcon /);

// Canonical public routes and shared requirement popup.
assert.match(app,/path="\/experts" element={<Experts\/>}/);
assert.match(app,/path="\/quote" element={<Solutions\/>}/);
assert.match(app,/path="\/professionals" element={<ProfessionalsRoute\/>}/);
assert.match(app,/function ProfessionalsRoute\(\)[\s\S]*user\?\.role==='admin'[\s\S]*\/admin\/leads[\s\S]*user\?\.role==='lead_partner'[\s\S]*\/lead-partner\/dashboard[\s\S]*<Leads\/>/);
assert.match(app,/path="\/professional-contact" element={<PortalContact audience="professionals"\/>}/);
assert.match(contact,/portalAudience\s*===\s*'users'[\s\S]*<Navigate to="\/contact" replace\/>/);
assert.match(portalContact,/professionals:\{label:'Professional',title:'Professional Support'/);
assert.match(adminContactSocial,/key:'professionals',label:'Professionals'/);
assert.match(userHeader,/to="\/professional-contact"[\s\S]*>Contact<\/Link>/);
assert.match(app,/path="\/solutions" element={<LegacySolutionRedirect\/>}/);
assert.match(app,/targetHash=hash\?'#'\+hash/);
assert.match(app,/<GlobalLeadPopup\/>/);
assert.doesNotMatch(app,/ProfessionalHome/);

// Homeowner acquisition homepage.
assert.doesNotMatch(home,/Build\. Design\. Find/);
assert.doesNotMatch(home,/Right Professionals/);
assert.match(home,/propulse:open-lead-popup/);
assert.match(home,/What do you need\?/);
assert.match(home,/Build Your Home/);
assert.match(home,/Design Your Space/);
assert.match(home,/Find a Property/);
assert.match(home,/Why Homeowners Choose ProPulse/);
assert.match(home,/How It Works/);
assert.doesNotMatch(home,/WebsiteFaqSection/);
assert.doesNotMatch(home,/audience="homeowner"/);
assert.match(home,/<PublicHeader \/>/);
assert.match(home,/openRequirement\(''\)/);
assert.match(home,/openRequirement\(item\.key\)/);
assert.match(home,/to="\/packages"/);
assert.match(homeCss,/\.hc-hero/);
assert.match(homeCss,/\.hc-service-grid/);
assert.match(homeCss,/\.hc-benefit-grid/);
assert.match(homeCss,/\.hc-step-grid/);
assert.match(home,/HeroBlueprintAnimation/);
assert.doesNotMatch(home,/HeroJourneyVideo/);
assert.match(home,/Buy or sell the right property/);
assert.doesNotMatch(home,/buy, sell, rent or invest/i);
assert.match(quote,/Buy or sell property with a structured location/);
assert.doesNotMatch(quote,/buy, rent, sell or invest/i);
assert.match(contact,/Questions about construction, interiors or real estate\? Reach our team directly\./);
assert.match(contact,/href=\{'tel:' \+ phone\.replace/);
assert.match(contact,/href=\{'mailto:' \+ email\}/);
assert.match(contact,/https:\/\/wa\.me\//);
assert.match(contact,/openLeadPopup\(''\)/);
assert.doesNotMatch(contact,/contact-service-strip|contact-map-grid|contact-direct-links/);
// The portfolio must not imply that illustrative stock photos are completed client work.
assert.doesNotMatch(projects,/CONCEPTS|sample-courtyard|COMPLETED STYLE · DEMO/);
assert.match(projects,/Completed <em>Projects<\/em>/);
assert.match(projects,/professionalProjects\.filter\(project=>/);
assert.match(projects,/className="pj-portfolio-section"/);
assert.match(projects,/Declared completion years|declared completion years|declared completion/);
assert.doesNotMatch(projects,/pj-portfolio-hero|pj-project-card--featured/);
assert.match(projectDetail,/Navigate to="\/projects" replace/);
assert.doesNotMatch(projectDetail,/MORE DESIGN INSPIRATION|pjd-bottom-grid|pjd-related-grid|LOVE THIS CONCEPT/);
assert.match(projectDetail,/pjd-dialog-backdrop/);
assert.match(projectDetail,/pjd-information/);
assert.match(projectDetail,/These details were supplied by the publishing professional/);
assert.match(projects,/category === 'property'/);
assert.match(projects,/to=\{projectPath\(project\)\}/);
assert.doesNotMatch(projects,/pj-detail-backdrop/);
assert.match(projectDetail,/pjd-main-grid/);
assert.match(projectDetail,/pjd-callback-form/);

assert.match(projectDetail,/Download Package/);
assert.match(projectDetail,/Request a Callback/);
assert.match(projectDetail,/Get Quote/);
assert.match(projectDetail,/downloadProjectPackagePdf/);
assert.doesNotMatch(projectDetail,/openLeadPopup/);
assert.match(projectDetail,/pjd-mobile-actions/);
assert.doesNotMatch(projectDetail,/package-details\\.txt/);
assert.match(read('../frontend/src/utils/requirementQuotePdf.js'),/export async function downloadProjectPackagePdf/);
assert.match(read('../frontend/src/components/GlobalLeadPopup.jsx'),/intent==='callback'/);

assert.match(app,/path="\/projects\/:projectId" element={<ProjectDetail\/>}/);
assert.doesNotMatch(projects,/Investment Apartment|rental-demand considerations/);

// Shared basic lead intake must remain wired to the public consultation endpoint.
assert.match(popup,/Tell Us Your Requirement/);
assert.match(popup,/\/customer-flows\/'\+form\.flowKey\+'\/consultation/);
assert.match(popup,/consent:true/);
assert.match(popup,/PIN Code/);
assert(popup.indexOf('PIN Code')<popup.indexOf('City / Location')&&popup.indexOf('City / Location')<popup.indexOf('I am looking for'),'Global lead popup must start with PIN, then City, then requirement type');
assert.match(popup,/label:'G\+3 and above'/);
assert.doesNotMatch(popup,/label:'Above G\+3'|label:'G\+3'/);
assert.match(popup,/<option value="buy">Buy<\/option><option value="sell">Sell<\/option>/);
assert.doesNotMatch(popup,/<option value="rent">Rent<\/option>|<option value="invest">Invest<\/option>/);
assert.match(realEstateBuySellMigration,/o\.value NOT IN \('buy','sell'\)/);
assert.match(realEstateExact,/to="\/faq">FAQ<\/Link>/);
assert.match(realEstateExact,/to="\/contact">Contact Us<\/Link>/);
assert.doesNotMatch(realEstateExact,/key:'rental'|key:'investment'|intent:'rent'|intent:'invest'/);
assert.doesNotMatch(realEstateExact,/to="\/contact\?audience=users">Privacy Policy<\/Link>|to="\/contact\?audience=users">Terms & Conditions<\/Link>/);
assert.match(popup,/No\. of Floors/);
assert.match(popup,/Submit Requirement/);
assert.match(popup,/Requirement received/);
assert.match(popup,/Continue to Detailed Requirement/);
assert.match(popup,/propulse_basic_lead_submitted/);
assert.match(popup,/const AUTO_POPUP_DELAY_MS=5\*60\*1000/);
assert.doesNotMatch(popup,/cycle===0\?15000:300000/);
assert.match(popup,/const closePopup=useCallback/);
assert.match(popup,/\[open,closePopup\]/);
assert.match(quoteLocationFields,/queueMicrotask\(\(\)=>\{/);
assert.match(notificationBell,/const applyUnread=useCallback/);
assert.match(notificationBell,/queueMicrotask\(refresh\)/);
assert.match(notificationBell,/if\(active\)applyUnread/);
assert.doesNotMatch(popup,/const selectedCity=useMemo/);

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
assert.match(questionUtils,/export const isEmptyAnswer/);
assert.match(questionUtils,/export function isQuestionVisible/);
assert.match(wizard,/queueMicrotask\(\(\)=>\{/);
assert.match(wizard,/QuoteLocationFields/);

// Packages keep customer quote links and comparison behavior.
assert.match(packages,/Construction Packages/);
assert.match(packages,/Interior Packages/);
assert.match(packages,/Side-by-Side Comparison/);
assert.match(packages,/Get Quote/);
assert.match(packages,/\/quote\?package=/);

// Public marketing pages use the shared site chrome; navigation links live in PublicSiteChrome.
const publicChrome=read('../frontend/src/components/PublicSiteChrome.jsx');
for(const source of [home,quote,packages,projects,about,howItWorks,contact]){
  assert.match(source,/PublicHeader/);
  assert.match(source,/PublicFooter/);
}
assert.match(publicChrome,/For Professionals/);
assert.match(publicChrome,/to="\/professionals"/);
assert.match(publicChrome,/to="\/experts"/);

for(const source of [home,projects,about,howItWorks,interiorExact,realEstateExact,wizard]){
  assert.doesNotMatch(source,/\/#contact/);
  assert.doesNotMatch(source,/>Privacy Policy<|>Terms & Conditions</);
}
assert.match(publicChrome,/to="\/faq"[^>]*>FAQ<\/Link>/);
assert.match(publicChrome,/to="\/contact"[^>]*>Contact<\/Link>/);
for(const source of [interiorExact,realEstateExact,wizard]){
  assert.match(source,/to="\/faq">FAQ<\/Link>/);
  assert.match(source,/to="\/contact">Contact(?: Us)?<\/Link>/);
}

// Experts directory is public but does not expose direct contact data.
assert.doesNotMatch(experts,/experts-hero/);
assert.match(experts,/TRUSTED PROFESSIONALS/);
assert.match(experts,/Expert<\/span> <em>Engineers<\/em>/);
assert.match(experts,/Find trusted construction, interior and real-estate professionals/);
assert.match(experts,/More Filters/);
assert.match(experts,/View Full Profile/);
assert.match(experts,/Request Callback/);
assert.match(app,/path="\/experts\/:expertId" element={<ProfessionalDetails\/>}/);
assert.match(professionalDetail,/Completed Projects/);
assert.match(professionalDetail,/Brochures/);
assert.match(professionalDetail,/Request a Callback/);
assert.match(professionalDetail,/Direct phone numbers and email addresses are not shared publicly/);
assert.doesNotMatch(professionalDetail,/profile\.phone|profile\.email/);
assert.doesNotMatch(experts,/selected\.phone|selected\.email|expert\.phone|expert\.email/);
assert.match(experts,/publicRequest\('\/experts\?'/);
assert.match(expertsCss,/\.experts-grid/);
assert.match(expertsCss,/\.expert-card/);
assert.match(professionalDetailCss,/\.pr-cover/);
assert.match(professionalDetailCss,/\.pr-panel/);
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
assert.match(quoteLocationFields,/Type City \/ Location/);
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
