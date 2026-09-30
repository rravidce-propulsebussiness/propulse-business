const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

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

assert.match(home,/generatedHeroUrl/);
assert.match(home,/propulse-home-hero-3d/);
assert.match(home,/HeroArchitectureVideo/);
assert.match(home,/captureStream\(30\)/);
assert.match(home,/className="hc-architecture-video-element"/);
assert.match(home,/className="hc-video-hero"/);
assert.match(home,/card-construction/);
assert.match(home,/card-interior/);
assert.match(home,/card-property/);
assert.match(home,/\/quote#construction/);
assert.match(home,/\/quote#interiors/);
assert.match(home,/\/quote#property/);

assert.match(homeCss,/\.hc-video-hero/);
assert.match(homeCss,/\.hc-architecture-video-element/);
assert.match(homeCss,/\.hc-video-service-card/);
assert.match(homeCss,/hcVideoCardFloat/);
assert.match(homeCss,/hcVideoLivePulse/);

const heroBase64=Array.from({length:11},(_,index)=>
  read('../frontend/public/media/propulse-home-hero-3d/'+String(index).padStart(2,'0')+'.b64').trim()
).join('');
const heroBytes=Buffer.from(heroBase64,'base64');
assert(heroBytes.length>30000,'Generated homepage artwork must decode to a real image');
assert.strictEqual(heroBytes.subarray(0,4).toString('ascii'),'RIFF','Hero must be RIFF/WebP');
assert.strictEqual(heroBytes.subarray(8,12).toString('ascii'),'WEBP','Hero must be WebP');

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

console.log('Approved public UI mockup checks passed.');
