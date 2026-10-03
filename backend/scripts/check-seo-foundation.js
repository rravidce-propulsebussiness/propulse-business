const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const index=read('../frontend/index.html');
const app=read('../frontend/src/App.jsx');
const manager=read('../frontend/src/components/SeoManager.jsx');
const config=read('../frontend/src/seo/seoConfig.js');
const hyderabad=read('../frontend/src/seo/hyderabadSeo.js');
const regional=read('../frontend/src/seo/regionalSeo.js');
const guides=read('../frontend/src/seo/constructionGuides.js');
const regionalLanding=read('../frontend/src/pages/RegionalSeoLanding.jsx');
const guidePage=read('../frontend/src/pages/ConstructionGuide.jsx');
const faqKnowledge=read('../frontend/src/seo/faqKnowledge.js');
const websiteFaq=read('../frontend/src/components/WebsiteFaqSection.jsx');
const userFaq=read('../frontend/src/pages/UserFAQ.jsx');
const adminFaq=read('../frontend/src/admin/pages/AdminFaqs.jsx');
const homeownerFaqMigration=read('../backend/src/database/migrations/20261003_seed_homeowner_search_faqs.sql');
const homeownerFaqMigrationMore=read('../backend/src/database/migrations/20261003_seed_homeowner_search_faqs_more.sql');
const landing=read('../frontend/src/pages/HyderabadSeoLanding.jsx');
const home=read('../frontend/src/pages/Home.jsx');
const packages=read('../frontend/src/data/constructionPackageCatalog.js');
const buildScript=read('../frontend/scripts/generate-seo-static-pages.mjs');
const frontendPackage=JSON.parse(read('../frontend/package.json'));
const nginx=read('../frontend/deploy/nginx.conf');
const vite=read('../frontend/vite.config.js');
const dockerfile=read('../frontend/Dockerfile');
const compose=read('../deploy/compose.yml');
const server=read('src/server.js');
const seoRoutes=read('src/routes/seoRoutes.js');
const packagePage=read('../frontend/src/pages/Packages.jsx');
const requirementWizard=read('../frontend/src/pages/RequirementWizard.jsx');
const projectPage=read('../frontend/src/pages/Projects.jsx');
const aboutPage=read('../frontend/src/pages/About.jsx');
const frontendEnv=read('../frontend/.env.example');
const retiredEstimatorMigration=read('src/database/migrations/20261002_zz_disable_construction_cost_estimator.sql');

assert(index.includes('name="description"'),'Base HTML must include a meta description');
assert(index.includes('name="robots"'),'Base HTML must include robots metadata');
assert(!index.includes('rel="canonical" href="/"'),'Source HTML must not expose a root canonical that Vite treats as an asset');
assert(index.includes('property="og:title"')&&index.includes('name="twitter:card"'),'Base HTML must include social metadata');
assert(index.includes('Construction, Interiors &amp; Real Estate Services | ProPulse'),'Homepage title must be descriptive');

for(const route of ['/quote','/experts','/packages','/projects','/how-it-works','/about','/contact','/faq']){
  assert(config.includes("path:'"+route+"'"),'SEO config missing public route '+route);
  assert(seoRoutes.includes("'"+route+"'"),'Sitemap route missing '+route);
}
for(const privatePath of ['/admin','/profile','/wallet','/investment','/lead-partner']){
  assert(!seoRoutes.includes("'"+privatePath+"'"),'Private route must not appear in sitemap: '+privatePath);
}

assert(app.includes('<SeoManager/>'),'SEO manager must run inside the router');
assert(manager.includes('noindex,nofollow,noarchive'),'Non-public routes must be noindex');
assert(manager.includes('application/ld+json'),'Public routes must publish structured data');
assert(manager.includes('link[rel="canonical"]'),'Runtime SEO must maintain a canonical URL');
assert(manager.includes('VITE_PUBLIC_SITE_URL'),'Runtime SEO must support a configured canonical origin');

assert(frontendPackage.scripts.build.includes('generate-seo-static-pages.mjs'),'Production build must generate route-specific SEO HTML');
assert(buildScript.includes('data-seo-static-fallback'),'Static SEO pages must contain crawlable fallback content');
assert(buildScript.includes("fs.mkdirSync(path.dirname(target),{recursive:true})"),'Nested SEO routes must create their output directories');
assert(buildScript.includes('og:description')&&buildScript.includes('twitter:description'),'Static pages must receive route-specific social metadata');

assert(server.includes("require('./routes/seoRoutes')")&&server.includes("app.use('/',seoRoutes)"),'Backend must expose robots and sitemap routes');
assert(seoRoutes.includes("router.get('/robots.txt'")&&seoRoutes.includes("router.get('/sitemap.xml'"),'robots.txt and sitemap.xml routes are required');
assert(seoRoutes.includes('PUBLIC_APP_URL')&&seoRoutes.includes('Sitemap: '),'SEO routes must build production-aware sitemap URLs');

assert(vite.includes("'/robots.txt'")&&vite.includes("'/sitemap.xml'"),'Vite dev server must proxy SEO endpoints');
assert(nginx.includes('location = /robots.txt')&&nginx.includes('location = /sitemap.xml'),'Production frontend must proxy SEO endpoints');
assert(nginx.includes('X-Robots-Tag "noindex, nofollow, noarchive"'),'Private SPA routes must emit X-Robots-Tag noindex');
assert(nginx.includes('try_files $uri $uri.html $uri/ /index.html'),'Nginx must serve route-specific SEO HTML before SPA fallback');

assert(dockerfile.includes('ARG VITE_PUBLIC_SITE_URL'),'Frontend image must accept the canonical public origin');
assert(compose.includes('VITE_PUBLIC_SITE_URL: \${PUBLIC_SITE_URL:-}'),'Deployment must pass the public site origin into the frontend build');
assert(dockerfile.includes('ARG VITE_GOOGLE_SITE_VERIFICATION'),'Frontend image must accept an optional Search Console verification token');
assert(compose.includes('VITE_GOOGLE_SITE_VERIFICATION: \${GOOGLE_SITE_VERIFICATION:-}'),'Deployment must pass the Search Console verification token into the frontend build');
assert(frontendEnv.includes('VITE_GOOGLE_SITE_VERIFICATION='),'Frontend env example must document Search Console verification');
assert(manager.includes('VITE_GOOGLE_SITE_VERIFICATION'),'Runtime SEO must support Search Console verification');
assert(manager.includes('google-site-verification'),'Runtime SEO must use the Google verification meta name');
assert(buildScript.includes('googleSiteVerification'),'Static SEO generation must support Search Console verification');
assert(buildScript.includes("'google-site-verification'"),'Static SEO generation must emit the Google verification meta name');

for(const route of ['/hyderabad','/hyderabad/construction','/hyderabad/construction-cost','/hyderabad/interior-designers','/hyderabad/real-estate']){
  assert(seoRoutes.includes("'"+route+"'"),'Hyderabad sitemap missing '+route);
}
for(const route of ['/hyderabad/construction/compare-options','/hyderabad/interior-designers/compare-options','/hyderabad/real-estate/compare-options']){
  assert(seoRoutes.includes("'"+route+"'"),'Comparison sitemap missing '+route);
}
assert(app.includes('path="/hyderabad"'),'React router must expose the Hyderabad city hub');
assert(app.includes('path="/hyderabad/construction-cost"'),'React router must expose the Hyderabad construction cost guide');
assert(app.includes('/hyderabad/:serviceSlug'),'React router must expose Hyderabad SEO hubs');
assert(app.includes('/hyderabad/:serviceSlug/:localitySlug'),'React router must expose crawlable Hyderabad locality pages');
assert(app.includes('/hyderabad/:serviceSlug/compare-options'),'React router must expose Hyderabad comparison pages');
assert(config.includes('HYDERABAD_SEO_ROUTES'),'Global SEO config must include Hyderabad routes');
assert(userFaq.includes('audience="homeowner"'),'Public FAQ page must load homeowner FAQs');
assert(websiteFaq.includes("homeownerSeoFaqs"),'Public FAQ must include the crawlable homeowner FAQ fallback library');
assert(websiteFaq.includes("construction:'Construction'")&&websiteFaq.includes("interiors:'Interiors'")&&websiteFaq.includes("property:'Real Estate'"),'Public FAQ must label Construction, Interiors and Real Estate categories');
assert(websiteFaq.includes("setSearchParams({category:item.key})"),'FAQ category tabs must create shareable category-filter URLs');
assert(websiteFaq.includes("item.keywords"),'FAQ search must include related keywords');
assert(faqKnowledge.includes("Why is a lintel necessary above doors and windows?"),'FAQ library must answer lintel search intent');
assert(faqKnowledge.includes("What causes honeycombing in concrete?"),'FAQ library must answer honeycombing search intent');
assert(faqKnowledge.includes("Why do cracks form in a new house?"),'FAQ library must answer crack search intent');
assert(faqKnowledge.includes("Which steel is stronger for house construction: Fe500 or Fe500D?"),'FAQ library must answer reinforcement-grade search intent');
assert(faqKnowledge.includes("Which material is best for home construction?"),'FAQ library must answer material-selection search intent');
assert(faqKnowledge.includes("Plywood, MDF or HDHMR: which is best for wardrobes?"),'FAQ library must answer wardrobe-material search intent');
assert(faqKnowledge.includes("What is RERA and why should a homebuyer check it?"),'FAQ library must answer RERA search intent');
assert(faqKnowledge.includes("What is carpet area?"),'FAQ library must answer carpet-area search intent');
assert(faqKnowledge.includes("What is a slump test and why is it done?"),'FAQ library must answer concrete slump-test search intent');
assert(faqKnowledge.includes("Why do cracks often appear where a wall meets a beam or column?"),'FAQ library must answer RCC-masonry junction crack intent');
assert(faqKnowledge.includes("Gypsum ceiling or POP ceiling: which is better?"),'FAQ library must answer false-ceiling material intent');
assert(faqKnowledge.includes("Is bank loan approval proof that a property is legally safe?"),'FAQ library must answer property legal-check intent');
assert(faqKnowledge.includes("What should I verify before buying an open plot?"),'FAQ library must answer open-plot due-diligence intent');
assert((faqKnowledge.match(/faq\('/g)||[]).length>=120,'Homeowner FAQ knowledge library must contain at least 120 searchable Q&As');
assert(homeownerFaqMigration.includes("INSERT INTO faq_entries"),'Homeowner FAQ migration must seed the existing FAQ table');
assert((homeownerFaqMigration.match(/\('homeowner'/g)||[]).length>=60,'Initial FAQ migration must seed at least 60 homeowner questions');
assert((homeownerFaqMigrationMore.match(/\('homeowner'/g)||[]).length>=50,'Second FAQ migration must seed at least 50 additional homeowner questions');
assert(adminFaq.includes("searchable public Construction, Interiors and Real Estate FAQ centre"),'Admin FAQ manager must identify the homeowner knowledge centre');
assert(buildScript.includes('homeownerFaqContent(route)'),'Static SEO must prerender homeowner FAQ answers');
assert(buildScript.includes("route.path!=='/faq'"),'FAQ prerender must be scoped to /faq');
assert(!manager.includes("'@type':'FAQPage'")&&!buildScript.includes("'@type':'FAQPage'"),'Deprecated FAQPage rich-result schema must remain disabled');
assert(config.includes('CONSTRUCTION_GUIDE_HUB_ROUTE'),'Global SEO config must include the construction guide hub');
assert(config.includes('CONSTRUCTION_GUIDE_ROUTES'),'Global SEO config must include construction guide routes');
assert(app.includes('path="/guides"'),'React router must expose the construction guide hub');
assert(app.includes('path="/guides/:guideSlug"'),'React router must expose construction guide pages');
assert(seoRoutes.includes("'/guides'"),'Sitemap must expose the construction guide hub');
for(const guideSlug of ['best-steel-for-house-construction','prevent-cracks-in-house','2bhk-interiors-hyderabad','choose-construction-contractor-hyderabad','home-construction-checklist','waterproofing-precautions-new-house','best-cement-for-house-construction','m-sand-vs-river-sand-house-construction','red-brick-vs-aac-block-house','concrete-curing-house-construction','soil-test-before-house-construction','rcc-slab-before-concrete-checklist','electrical-planning-new-house','plumbing-checklist-new-house','wall-putty-primer-paint-sequence','modular-kitchen-planning-hyderabad','wardrobe-materials-plywood-mdf-hdhmr']){
  assert(guides.includes("slug:'"+guideSlug+"'"),'Construction guide data missing '+guideSlug);
  assert(seoRoutes.includes("'"+guideSlug+"'"),'Construction guide sitemap missing '+guideSlug);
}
assert(guides.includes('best steel for house construction'),'Steel guide must target steel-selection search intent');
assert(guides.includes('best contractor in Hyderabad'),'Contractor guide must target contractor-selection search intent');
assert(guides.includes('2bhk interiors in Hyderabad'),'Interior guide must target 2BHK interior search intent');
assert(guides.includes('how to avoid cracks in house construction'),'Crack guide must target crack-prevention search intent');
assert(guides.includes('IS 1786:2008'),'Steel guide must reference the current reinforcement standard');
assert(guides.includes('IS 456:2000'),'Construction guide content must reference reinforced-concrete practice');
assert(guides.includes('IS 269:2015'),'Cement guide must reference the current OPC standard');
assert(guides.includes('IS 383:2016'),'Sand guide must reference the aggregate standard');
assert(guides.includes('best cement for house construction'),'Guide library must target cement-selection intent');
assert(guides.includes('m sand vs river sand for house construction'),'Guide library must target sand-comparison intent');
assert(guides.includes('soil test before house construction'),'Guide library must target soil-investigation intent');
assert(guides.includes('electrical planning new house'),'Guide library must target electrical-planning intent');
assert(guides.includes('modular kitchen Hyderabad'),'Guide library must target modular-kitchen intent');
assert(guidePage.includes('guide-hub-index'),'Guide UI must include a category-based knowledge hub');
assert(guidePage.includes('Browse all guides'),'Article pages must link back to the guide hub');
assert(manager.includes("route.type==='guide-hub'"),'Runtime SEO must expose CollectionPage handling for the guide hub');
assert(buildScript.includes("route.type==='guide-hub'"),'Static SEO must prerender CollectionPage handling for the guide hub');
assert(guidePage.includes('guide-search-intent'),'Guide pages must visibly expose related search intent');
assert(guidePage.includes('RELATED SEARCHES'),'Guide pages must label related search intent');
assert(buildScript.includes('guideContent(route)'),'Static SEO must prerender construction guide content');
assert(manager.includes("route.type==='construction-guide'?'Article'"),'Runtime SEO must expose Article schema for guide pages');
assert(buildScript.includes("route.type==='construction-guide'?'Article'"),'Static SEO must prerender Article schema for guide pages');

assert(config.includes('REGIONAL_SEO_ROUTES'),'Global SEO config must include state and district routes');
assert(app.includes("RegionalSeoLanding"),'React router must load regional SEO landing pages');
assert(app.includes('path="/:stateSlug/construction/:districtSlug"'),'React router must expose district construction pages');
assert(app.includes('path="/:stateSlug/construction"'),'React router must expose state construction hubs');
assert(regional.includes("districtCount:33"),'Telangana SEO data must reflect 33 districts');
assert(regional.includes("districtCount:28"),'Andhra Pradesh SEO data must reflect the current 28-district structure');
assert(regional.includes("district('markapuram'")&&regional.includes("district('polavaram'"),'Andhra Pradesh SEO data must include the 2026 Markapuram and Polavaram districts');
assert(regional.includes("REGIONAL_DISTRICT_SEO_ROUTES"),'Regional SEO data must generate district routes');
assert(regionalLanding.includes('CHOOSE YOUR DISTRICT'),'State construction hubs must expose district discovery');
assert(regionalLanding.includes('MAJOR AREAS TO SPECIFY'),'District pages must include useful location prompts');
assert(regional.includes("...item.centers.flatMap(center=>["),'Regional SEO data must target major-center construction searches without creating thin town URLs');
assert(regionalLanding.includes("...district.centers.flatMap(center=>["),'District landing pages must visibly expose major-center construction search intent');
assert(regionalLanding.includes('FIND THE RIGHT CONSTRUCTION PARTNER'),'District pages must teach construction-provider comparison');
assert(regionalLanding.includes("'/quote?package='+item.key+'#construction'"),'District package cards must link to package-specific quote flows');
assert(seoRoutes.includes("'/telangana/construction'")&&seoRoutes.includes("'/andhra-pradesh/construction'"),'Sitemap must expose both state construction hubs');
assert(seoRoutes.includes("...TELANGANA_DISTRICTS.map(district=>'/telangana/construction/'+district)"),'Sitemap must generate Telangana district construction routes');
assert(seoRoutes.includes("...ANDHRA_PRADESH_DISTRICTS.map(district=>'/andhra-pradesh/construction/'+district)"),'Sitemap must generate Andhra Pradesh district construction routes');
assert(buildScript.includes('regionalConstructionContent(route)'),'Static SEO must prerender state and district construction content');
assert(manager.includes("route.type==='state-construction-hub'||route.type==='district-construction'"),'Runtime structured data must understand regional construction routes');
for(const districtSlug of ['karimnagar','rangareddy','medchal-malkajgiri','sangareddy','visakhapatnam','guntur','ntr','tirupati','markapuram','polavaram']){
  assert(regional.includes("district('"+districtSlug+"'"),'Regional district data missing '+districtSlug);
  assert(seoRoutes.includes("'"+districtSlug+"'"),'Regional district sitemap missing '+districtSlug);
}

assert(hyderabad.includes('HYDERABAD_CITY_SEO_ROUTE'),'Hyderabad SEO data must expose a city hub');
assert(hyderabad.includes('HYDERABAD_CONSTRUCTION_COST_ROUTE'),'Hyderabad SEO data must expose the construction cost guide');
assert(hyderabad.includes('HYDERABAD_LOCALITY_SEO_ROUTES'),'Hyderabad SEO data must expose locality routes');

for(const locality of ['Uppal','Kothapet','LB Nagar','Gachibowli','Kondapur','Kukatpally','Miyapur','Kokapet','Narsingi','Tellapur']){
  assert(hyderabad.includes("name:'"+locality+"'"),'Hyderabad locality index missing '+locality);
}
for(const localitySlug of ['uppal','habsiguda','tarnaka','nagole','kothapet','lb-nagar','saroornagar','vanasthalipuram','hayathnagar','dilsukhnagar','gachibowli','financial-district','nanakramguda','kondapur','madhapur','hitec-city','manikonda','kokapet','narsingi','tellapur','nallagandla','tolichowki','mehdipatnam','attapur','kukatpally','ferozguda','balanagar','bowenpally','miyapur','bachupally','pragathi-nagar','ameenpur','kompally','banjara-hills','jubilee-hills','ghatkesar','pocharam','boduppal','peerzadiguda','medipally','ecil','kapra','alwal','suchitra','quthbullapur','jeedimetla','medchal','shamirpet','shamshabad','tukkuguda','adibatla','nadergul','rajendranagar','bandlaguda-jagir','puppalaguda','patancheru','chandanagar','lingampally','beeramguda','kollur','mokila','shankarpally','keesara','nagaram','dammaiguda','rampally','cherlapally','sainikpuri','yapral','safilguda','malkajgiri','karmanghat','champapet','hastinapuram','meerpet','badangpet','balapur','turkayamjal','ibrahimpatnam','bongloor','maheshwaram','nizampet','mallampet','dundigal','gandimaisamma','bhel','ramachandrapuram','velimela','osman-nagar','gandipet','manchirevula','moinabad','secunderabad','begumpet','ameerpet','panjagutta','somajiguda','khairatabad','amberpet','ramanthapur']){
  assert(hyderabad.includes("slug:'"+localitySlug+"'"),'Frontend Hyderabad locality missing '+localitySlug);
  assert(seoRoutes.includes("'"+localitySlug+"'"),'Hyderabad construction sitemap locality missing '+localitySlug);
}
assert(seoRoutes.includes("...HYDERABAD_CONSTRUCTION_LOCALITIES.map(locality=>'/hyderabad/construction/'+locality)"),'Sitemap must generate construction locality URLs');
assert(!seoRoutes.includes('/hyderabad/interior-designers/kothapet'),'Interior locality doorway URLs must not be mass-generated yet');
for(const brand of ['Brick&Bolt','BuildNext','JSW One Homes','Livspace','HomeLane','DesignCafe',"D'LIFE Interiors",'NoBroker Interiors','Decorpot','MagicBricks','99acres','Housing.com','Square Yards']){
  assert(hyderabad.includes(brand),'Comparison SEO content missing '+brand);
}
for(const term of ['Brick&Bolt Hyderabad','BuildNext Hyderabad','JSW One Homes Hyderabad','Livspace Hyderabad','HomeLane Hyderabad','DesignCafe Hyderabad',"D'LIFE Interiors Hyderabad",'NoBroker Interiors Hyderabad','Decorpot Hyderabad','NoBroker Hyderabad','MagicBricks Hyderabad','99acres Hyderabad','Housing.com Hyderabad','Square Yards Hyderabad']){
  assert(hyderabad.includes(term),'Company search variant missing '+term);
}
assert(hyderabad.includes('JSW One Homes alternative Hyderabad'),'Construction comparison must target JSW One Homes alternative intent');
assert(hyderabad.includes("D'LIFE Interiors alternative Hyderabad"),'Interior comparison must target D\'LIFE alternative intent');
assert(hyderabad.includes('Housing.com alternative Hyderabad'),'Real-estate comparison must target Housing.com alternative intent');
assert(hyderabad.includes('Square Yards alternative Hyderabad'),'Real-estate comparison must target Square Yards alternative intent');
assert(landing.includes('COMMON SEARCHES'),'Comparison pages must visibly explain company-name searches');
assert(buildScript.includes('Common Hyderabad comparison searches'),'Static comparison pages must expose company-name searches');

assert(home.includes('to="/hyderabad/construction"'),'Homepage must link to the Hyderabad construction hub');
assert(home.includes('to="/hyderabad/construction-cost"'),'Homepage must link to the Hyderabad construction cost guide');
assert(home.includes('to="/hyderabad/interior-designers"'),'Homepage must link to the Hyderabad interiors hub');
assert(home.includes('to="/hyderabad/real-estate"'),'Homepage must link to the Hyderabad real-estate hub');
assert(home.includes('to="/telangana/construction"'),'Homepage must link to the Telangana construction district hub');
assert(home.includes('to="/andhra-pradesh/construction"'),'Homepage must link to the Andhra Pradesh construction district hub');
for(const guidePath of ['/guides/best-steel-for-house-construction','/guides/prevent-cracks-in-house','/guides/choose-construction-contractor-hyderabad','/guides/2bhk-interiors-hyderabad','/guides/home-construction-checklist','/guides/waterproofing-precautions-new-house','/guides/best-cement-for-house-construction','/guides/m-sand-vs-river-sand-house-construction','/guides/soil-test-before-house-construction']){
  assert(home.includes('to="'+guidePath+'"'),'Homepage construction guide link missing '+guidePath);
  assert(landing.includes('to="'+guidePath+'"'),'Hyderabad/locality guide link missing '+guidePath);
}
assert(home.includes('to="/guides"'),'Homepage must link to the guide hub');
assert(home.includes('<Link to="/faq">FAQ</Link>'),'Homeowner homepage must expose FAQ navigation');
assert(userFaq.includes('PublicFaqHeader'),'Public FAQ page must use a homeowner header when logged out');
assert(userFaq.includes('to="/faq"'),'Public FAQ header must expose an active FAQ link');
assert(userFaq.includes('to="/guides"'),'Public FAQ header must link to the guides hub');
assert(userFaq.includes("loggedIn?<UserHeader/>:<PublicFaqHeader/>"),'Logged-in users must retain the existing user header while public homeowners get the customer FAQ header');
assert(regionalLanding.includes('to="/guides"'),'Regional construction hubs must link to the guide hub');
assert(regionalLanding.includes('/guides/best-steel-for-house-construction'),'Regional construction hubs must link to material guides');
assert(regionalLanding.includes('/guides/home-construction-checklist'),'Regional construction hubs must link to planning guides');
for(const outerPath of ['/hyderabad/construction/ghatkesar','/hyderabad/construction/shamshabad','/hyderabad/construction/patancheru']){
  assert(home.includes('to="'+outerPath+'"'),'Homepage metro-belt linking missing '+outerPath);
}
assert(buildScript.includes('homeRegionalCoverage(route)'),'Static homepage must expose regional construction coverage');
assert(aboutPage.includes('PRIOR OPERATING EXPERIENCE'),'About page must retain generic prior operating experience context');
assert(aboutPage.includes('hands-on residential construction and interior execution work in Hyderabad'),'About page must describe the prior experience generically');
assert(landing.includes('prior hands-on residential construction and interior execution experience in Hyderabad'),'Hyderabad construction hub must retain generic operating experience context');
assert(buildScript.includes('aboutExperienceContent(route)'),'Static About HTML must include generic operating experience');
assert(buildScript.includes('constructionExperienceContent(route)'),'Static Hyderabad construction HTML must include generic operating experience context');
for(const source of [aboutPage,landing,buildScript,config]){
  assert(!/SG Homes|SG_HOMES|sghome/i.test(source),'Public SEO source must not contain the removed prior-company name or links');
}
assert(projectPage.includes('pj-hyderabad-authority'),'Projects page must expose a Hyderabad authority section');
assert(projectPage.includes('HYDERABAD_PROJECT_SEO_LINKS'),'Projects page must maintain explicit locality SEO links');
for(const localityPath of ['/hyderabad/construction/kondapur','/hyderabad/construction/madhapur','/hyderabad/construction/kokapet','/hyderabad/construction/manikonda','/hyderabad/construction/kukatpally','/hyderabad/construction/miyapur','/hyderabad/construction/narsingi','/hyderabad/construction/tellapur']){
  assert(projectPage.includes("to:'"+localityPath+"'"),'Projects authority linking missing '+localityPath);
}
assert(buildScript.includes('projectsAuthorityContent(route)'),'Static projects page must expose Hyderabad authority content');
assert(buildScript.includes('Explore Hyderabad services and construction areas'),'Static projects authority section must remain descriptive');
for(const localityPath of ['/hyderabad/construction/uppal','/hyderabad/construction/kothapet','/hyderabad/construction/lb-nagar','/hyderabad/construction/gachibowli','/hyderabad/construction/kondapur']){
  assert(home.includes('to="'+localityPath+'"'),'Homepage internal linking missing '+localityPath);
}
assert(landing.includes('ProPulse is independent'),'Comparison page must disclose brand independence');
assert(landing.includes('CONSTRUCTION_PACKAGE_CATALOG'),'Construction cost guide must use the shared package catalog');
assert(landing.includes('QUICK BUDGET EXAMPLES'),'Construction cost guide must provide useful built-up-area examples');
assert(landing.includes('G+1 construction cost in Hyderabad'),'Construction cost guide must answer G+1 search intent');
assert(app.includes('path="/estimate/construction-cost-estimator"'),'Legacy construction estimator URL must have an explicit retirement redirect');
assert(app.includes('to="/quote?package=standard#construction"'),'Legacy construction estimator must redirect to the standard construction quote flow');
assert(!landing.includes('/estimate/construction-cost-estimator'),'Public Hyderabad SEO pages must not link to the retired estimator');
assert(!buildScript.includes('/estimate/construction-cost-estimator'),'Static SEO HTML must not link to the retired estimator');
assert(landing.includes('/quote?package=standard#construction'),'Construction SEO CTAs must use the direct standard quote flow');
assert(buildScript.includes('/quote?package=standard#construction'),'Static construction SEO CTAs must use the direct standard quote flow');
assert(retiredEstimatorMigration.includes("WHERE key='construction-cost-estimator'"),'Retirement migration must target the legacy construction estimator');
assert(retiredEstimatorMigration.includes('is_active=FALSE'),'Retirement migration must deactivate the legacy construction estimator');
assert(nginx.includes('location = /estimate/construction-cost-estimator'),'Production nginx must intercept the retired estimator URL');
assert(nginx.includes('return 301 "/quote?package=standard#construction"'),'Production nginx must permanently redirect retired estimator URLs to the standard quote flow');
assert(requirementWizard.includes("get('package')"),'Quote flow must read the package query parameter');
assert(requirementWizard.includes("standard: 'standard'"),'Standard package query must map into the construction quote answers');
assert(landing.includes('to="/hyderabad/construction/compare-options"'),'Cost guide must link to construction comparison');
assert(buildScript.includes('/hyderabad/construction/compare-options'),'Static cost guide must link to construction comparison');
assert(packagePage.includes('to="/hyderabad/construction-cost"'),'Construction packages must link to the Hyderabad cost guide');

assert(packages.includes('rate: 1750')&&packages.includes('rate: 1899')&&packages.includes('rate: 2099'),'Construction package catalog must expose current planning rates');
assert(buildScript.includes('costGuideContent(route)'),'Static SEO output must include crawlable construction cost content');
assert(buildScript.includes('CONSTRUCTION_PACKAGE_CATALOG'),'Static construction cost content must use the shared package catalog');
assert(hyderabad.includes("'construction in '+name"),'Locality SEO must target direct construction-in-area intent');
assert(hyderabad.includes("'construction contractors near '+name"),'Locality SEO must target nearby contractor intent');
assert(hyderabad.includes("'house construction company in '+name"),'Locality SEO must target house-construction company intent');
assert(hyderabad.includes("'home builders in '+name"),'Locality SEO must target home-builder intent');
assert(hyderabad.includes("'best contractor in '+name"),'Locality SEO must target best-contractor search intent without making a ranking claim');
assert(hyderabad.includes("'house construction cost in '+name"),'Locality SEO must target construction-cost search intent');
assert(hyderabad.includes("'2bhk interior in '+name"),'Locality SEO must target related 2BHK interior search intent');
assert(hyderabad.includes("'best cement for house construction in '+name"),'Locality SEO must target cement-selection intent');
assert(hyderabad.includes("'m sand vs river sand in '+name"),'Locality SEO must target sand-comparison intent');
assert(hyderabad.includes("'soil test for house construction in '+name"),'Locality SEO must target soil-test intent');
assert(hyderabad.includes("'electrical planning for new house in '+name"),'Locality SEO must target electrical-planning intent');
assert(hyderabad.includes("'modular kitchen in '+name"),'Locality SEO must target modular-kitchen intent');
assert(hyderabad.includes("'wardrobe interiors in '+name"),'Locality SEO must target wardrobe-interior intent');
assert(landing.includes('2BHK interiors in {locality.name}'),'Locality pages must connect localized 2BHK interior searches to the interior guide');
assert(landing.includes('How to choose the best contractor in {locality.name}'),'Locality pages must connect contractor search intent to the selection guide');
assert(landing.includes('What is the best steel for house construction?'),'Locality pages must surface steel-selection guidance');
assert(landing.includes('Precautions to reduce cracks in a new house'),'Locality pages must surface crack-prevention guidance');
assert(landing.includes('Best cement for house construction in {locality.name}'),'Locality pages must surface localized cement-selection guidance');
assert(landing.includes('M-sand vs river sand for a home in {locality.name}'),'Locality pages must surface localized sand-comparison guidance');
assert(landing.includes('Soil test before building in {locality.name}'),'Locality pages must surface localized soil-test guidance');
assert(landing.includes('Electrical planning for a new house in {locality.name}'),'Locality pages must surface localized electrical-planning guidance');
assert(landing.includes('Modular kitchen planning in {locality.name}'),'Locality pages must surface localized modular-kitchen guidance');
assert(landing.includes('to="/guides"'),'Hyderabad/locality pages must link to the guide hub');
assert(hyderabad.includes("'builders near '+name"),'Locality SEO must target nearby builder intent');
assert(hyderabad.includes("'best construction company in '+name"),'Locality SEO must cover best-company search intent without making a ranking claim');
assert(hyderabad.includes("name:'Ferozguda'"),'Ferozguda locality must be included');
assert(hyderabad.includes("name:'Keesara'"),'Keesara locality must be included');
assert(hyderabad.includes("name:'Maheshwaram'"),'Maheshwaram locality must be included');
assert(hyderabad.includes("name:'Moinabad'"),'Moinabad locality must be included');
assert(hyderabad.includes("name:'Nizampet'"),'Nizampet locality must be included');
assert(hyderabad.includes("name:'Dammaiguda'"),'Dammaiguda locality must be included');
assert(hyderabad.includes("name:'Sainikpuri'"),'Sainikpuri locality must be included');
assert(hyderabad.includes("name:'Meerpet'"),'Meerpet locality must be included');
assert(hyderabad.includes("name:'Maheshwaram'"),'Maheshwaram locality must be included');
assert(hyderabad.includes("name:'Gandipet'"),'Gandipet locality must be included');
assert(hyderabad.includes("name:'Ramachandrapuram'"),'Ramachandrapuram locality must be included');
assert(hyderabad.includes("name:'Secunderabad'"),'Secunderabad locality must be included');
assert(hyderabad.includes("name:'Begumpet'"),'Begumpet locality must be included');
assert(hyderabad.includes("name:'Ameerpet'"),'Ameerpet locality must be included');
assert(hyderabad.includes("name:'Amberpet'"),'Amberpet locality must be included');
assert(landing.includes('locality-homepage'),'Locality SEO pages must use the mini-homepage layout');
assert(landing.includes('CONSTRUCTION PACKAGES'),'Locality landing pages must show construction packages');
assert(landing.includes('FIND THE RIGHT CONSTRUCTION PARTNER'),'Locality landing pages must include partner-comparison guidance');
assert(landing.includes('NEARBY CONSTRUCTION AREAS'),'Locality landing pages must expose nearby-area discovery');
assert(landing.includes('Construction in {locality.name}: common questions'),'Visible FAQ content must remain on locality landing pages');
assert(regionalLanding.includes('Construction in {district.name}: common questions'),'Visible FAQ content must remain on district landing pages');
assert(!manager.includes("'@type':'FAQPage'"),'Runtime SEO should not emit deprecated FAQPage rich-result schema');
assert(!buildScript.includes("'@type':'FAQPage'"),'Static SEO should not emit deprecated FAQPage rich-result schema');
assert(landing.includes("'/quote?package='+item.key+'#construction'"),'Locality package cards must link into package-specific construction quotes');
assert(buildScript.includes('Construction packages for '),'Static locality pages must prerender package content');
assert(buildScript.includes('How to find the right construction partner in '),'Static locality pages must prerender partner-comparison content');
assert(buildScript.includes('What is the best steel for house construction?'),'Static locality pages must prerender steel-guide links');
assert(buildScript.includes('Precautions to reduce cracks in a new house'),'Static locality pages must prerender crack-prevention links');
assert(buildScript.includes('2BHK interiors in '),'Static locality pages must prerender localized 2BHK interior intent');
assert(buildScript.includes('Popular construction guides'),'Static homepage must prerender construction guide links');
assert(buildScript.includes('best-cement-for-house-construction'),'Static SEO must prerender cement-guide links');
assert(buildScript.includes('m-sand-vs-river-sand-house-construction'),'Static SEO must prerender sand-guide links');
assert(buildScript.includes('soil-test-before-house-construction'),'Static SEO must prerender soil-test guide links');
assert(buildScript.includes('guide.type')||buildScript.includes("route.type==='guide-hub'"),'Static SEO must understand the guide hub');
assert(landing.includes('SEARCH INTENT AROUND'),'Construction locality pages must provide useful visible search-intent content');
assert(landing.includes('How to compare construction companies in'),'Construction locality pages must teach provider comparison rather than only repeat keywords');
assert(manager.includes("route.type==='local-service'"),'Structured data should identify locality service context');
assert(buildScript.includes('localityContent(route)'),'Static SEO output must include crawlable locality content');
assert(buildScript.includes('application/ld+json'),'Static SEO output must include JSON-LD before JavaScript executes');

console.log('Technical and Hyderabad SEO regression checks passed.');
