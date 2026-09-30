const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const readBuffer=relative=>fs.readFileSync(path.join(root,relative));

const app=read('../frontend/src/App.jsx');
const home=read('../frontend/src/pages/Home.jsx');
const homeCss=read('../frontend/src/pages/Home.css');
const quote=read('../frontend/src/pages/Solutions.jsx');
const quoteCss=read('../frontend/src/pages/Solutions.css');
const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const packages=read('../frontend/src/pages/Packages.jsx');
const publicHeader=read('../frontend/src/styles/PublicMarketingHeader.css');
const contact=read('../frontend/src/pages/Contact.jsx');
const projects=read('../frontend/src/pages/Projects.jsx');
const about=read('../frontend/src/pages/About.jsx');
const howItWorks=read('../frontend/src/pages/HowItWorks.jsx');

assert.match(app,/path="\/quote" element={<Solutions\/>}/);
assert.match(app,/path="\/solutions" element={<LegacySolutionRedirect\/>}/);
assert.match(app,/targetHash=hash\?'#'\+hash/);

assert.match(home,/className="hc-expert-hero"/);
assert.match(home,/TRUSTED EXPERTS FOR YOUR HOME/);
assert.match(home,/Find the <em>Right Experts\.<\/em>/);
assert.match(home,/Verified Professionals/);
assert.match(home,/Branded Material Options/);
assert.match(home,/Warranty-backed Options/);
assert.match(home,/Free Consultation/);
assert.match(home,/Find Right/);
assert.match(home,/Branded/);
assert.match(home,/Warranty/);
assert.match(home,/Transparent/);
assert.match(home,/Homeowner/);
assert.match(home,/\/quote#construction/);
assert.match(home,/\/packages/);
assert.doesNotMatch(home,/className="hc-video-hero"/);
assert.doesNotMatch(home,/HeroJourneyVideo/);

assert.match(homeCss,/\.hc-expert-hero/);
assert.match(homeCss,/\.hc-expert-visual/);
assert.match(homeCss,/\.hc-expert-float/);
assert.match(homeCss,/\.hc-expert-network/);
assert.match(homeCss,/\.hc-professionals-card/);
assert.match(homeCss,/\.hc-materials-card/);
assert.match(homeCss,/\.hc-warranty-card/);
assert.match(homeCss,/hcExpertLine/);
assert.match(homeCss,/hcExpertFloat/);

assert.match(quote,/What do you need help with\?/);
assert.match(quote,/quote-service-grid/);
assert.match(quote,/Construction/);
assert.match(quote,/Interiors/);
assert.match(quote,/Real Estate/);
assert.match(quote,/\/quote'\+location\.search\+'#'/);
assert.match(quoteCss,/quoteCardRise/);
assert.match(quoteCss,/quoteFlowIn/);
assert.match(quoteCss,/\.quote-flow \.rq-premium-hero/);
assert.match(quoteCss,/\.quote-flow \.irx-hero/);
assert.match(quoteCss,/\.quote-flow \.rex-hero/);

assert.match(wizard,/flowKey === 'property'/);
assert.match(wizard,/RealEstateRequirementExact/);
assert.match(packages,/\/quote\?package=/);
assert.match(publicHeader,/Approved homepage \/ quote mockup/);
assert.match(contact,/PublicContact/);
assert.match(contact,/audience=website/);
assert.match(contact,/Reach the ProPulse Team/);
assert.match(contact,/to="\/contact"/);
assert.doesNotMatch(contact,/Navigate to="\/#contact"/);

for(const source of [home,quote,packages,projects,about,howItWorks,contact]){
  assert.match(source,/Professionals/);
  assert.match(source,/to="\/login"/);
}
assert.match(publicHeader,/\.public-professional-btn/);
assert.match(publicHeader,/Quote \+ professional public header actions/);

assert.match(home,/Why Homeowners/);
assert.match(home,/Choose <em>ProPulse\.<\/em>/);
assert.match(home,/hc-why-underline/);
assert.match(home,/hc-why-arrow/);
assert.doesNotMatch(home,/We make the first step easier: explain what you need/);
assert.match(homeCss,/\.hc-why-grid article/);
assert.match(homeCss,/\.hc-why-arrow/);
assert.match(homeCss,/hcWhyGlow/);
assert.match(homeCss,/hcWhyIconFloat/);

assert.match(home,/hc-how-premium/);
assert.match(home,/Tell Us Your Requirement/);
assert.match(home,/We Find the Right Experts/);
assert.match(home,/Choose the Best Option/);
assert.match(home,/Start Your Home Journey/);
assert.match(home,/senior engineers, architects, or trusted partners/);
assert.doesNotMatch(home,/We Structure the Brief/);
assert.doesNotMatch(home,/Discuss Your Options/);
assert.doesNotMatch(home,/Move Your Home Forward/);
assert.doesNotMatch(home,/Simple by design/);
assert.doesNotMatch(home,/Start your home journey in a few clear steps\./);
assert.match(homeCss,/\.hc-how-premium-card/);
assert.match(homeCss,/\.hc-how-photo-wrap/);
assert.match(homeCss,/\.hc-how-connector/);
assert.match(homeCss,/hcHowFloat/);
assert.match(homeCss,/hcHowConnector/);

assert.match(home,/Home Inspiration/);
assert.match(home,/Warm Modern Villa/);
assert.match(home,/Courtyard Living/);
assert.match(home,/Wood & Marble Kitchen/);
assert.match(home,/Hotel-Style Bedroom/);
assert.match(home,/Japandi Living Room/);
assert.doesNotMatch(home,/Premium Apartments/);
assert.doesNotMatch(home,/Gated Communities/);
assert.doesNotMatch(home,/Ideas for your next step/);
assert.match(homeCss,/\.hc-inspiration-card/);
assert.match(homeCss,/\.hc-inspiration-icon/);
assert.match(homeCss,/\.hc-inspiration-cta/);
assert.match(homeCss,/hcInspirationIcon/);

assert.doesNotMatch(home,/How ProPulse <em>Guides Your Home Journey<\/em>/);
assert.doesNotMatch(home,/Designed Around Homeowner Concerns/);
assert.doesNotMatch(home,/HOMEOWNER_VALUES/);
assert.doesNotMatch(homeCss,/\.hc-guided-journey/);

assert.match(home,/className="hc-expert-float hc-consultation-card" aria-label="Free consultation available"/);
assert.match(home,/className="hc-expert-float hc-warranty-card" aria-label="Warranty-backed options"/);
assert.doesNotMatch(home,/hc-consultation-card" type="button"/);
assert.doesNotMatch(home,/hc-warranty-card" to=/);
assert.match(home,/Paints/);
assert.match(home,/Cement/);
assert.match(home,/Tiles/);
assert.match(home,/Hardware/);
assert.match(homeCss,/pointer-events:none/);
assert.match(homeCss,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);

console.log('Approved public UI mockup checks passed.');
