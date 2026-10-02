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
const constructionEstimatorSeed=read('src/database/migrations/20260929_z_construction_estimator_seed.sql');
const packagePage=read('../frontend/src/pages/Packages.jsx');
const estimatorPage=read('../frontend/src/pages/EstimatorWizard.jsx');
const projectPage=read('../frontend/src/pages/Projects.jsx');
const frontendEnv=read('../frontend/.env.example');

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
assert(hyderabad.includes('HYDERABAD_CITY_SEO_ROUTE'),'Hyderabad SEO data must expose a city hub');
assert(hyderabad.includes('HYDERABAD_CONSTRUCTION_COST_ROUTE'),'Hyderabad SEO data must expose the construction cost guide');
assert(hyderabad.includes('HYDERABAD_LOCALITY_SEO_ROUTES'),'Hyderabad SEO data must expose locality routes');

for(const locality of ['Uppal','Kothapet','LB Nagar','Gachibowli','Kondapur','Kukatpally','Miyapur','Kokapet','Narsingi','Tellapur']){
  assert(hyderabad.includes("name:'"+locality+"'"),'Hyderabad locality index missing '+locality);
}
for(const localitySlug of ['uppal','kothapet','lb-nagar','vanasthalipuram','dilsukhnagar','gachibowli','kondapur','madhapur','hitec-city','manikonda','kokapet','narsingi','tellapur','nallagandla','kukatpally','miyapur','kompally','ameenpur','banjara-hills','jubilee-hills']){
  assert(hyderabad.includes("slug:'"+localitySlug+"'"),'Frontend Hyderabad locality missing '+localitySlug);
  assert(seoRoutes.includes("'"+localitySlug+"'"),'Hyderabad construction sitemap locality missing '+localitySlug);
}
assert(seoRoutes.includes("...HYDERABAD_CONSTRUCTION_LOCALITIES.map(locality=>'/hyderabad/construction/'+locality)"),'Sitemap must generate construction locality URLs');
assert(!seoRoutes.includes('/hyderabad/interior-designers/kothapet'),'Interior locality doorway URLs must not be mass-generated yet');
for(const brand of ['Brick&Bolt','BuildNext','Livspace','HomeLane','DesignCafe','NoBroker Interiors','Decorpot','MagicBricks','99acres']){
  assert(hyderabad.includes("'"+brand+"'"),'Comparison SEO content missing '+brand);
}
for(const term of ['Brick&Bolt Hyderabad','BuildNext Hyderabad','Livspace Hyderabad','HomeLane Hyderabad','DesignCafe Hyderabad','NoBroker Interiors Hyderabad','Decorpot Hyderabad','NoBroker Hyderabad','MagicBricks Hyderabad','99acres Hyderabad']){
  assert(hyderabad.includes("'"+term+"'"),'Company search variant missing '+term);
}
assert(landing.includes('COMMON SEARCHES'),'Comparison pages must visibly explain company-name searches');
assert(buildScript.includes('Common Hyderabad comparison searches'),'Static comparison pages must expose company-name searches');

assert(home.includes('to="/hyderabad/construction"'),'Homepage must link to the Hyderabad construction hub');
assert(home.includes('to="/hyderabad/construction-cost"'),'Homepage must link to the Hyderabad construction cost guide');
assert(home.includes('to="/hyderabad/interior-designers"'),'Homepage must link to the Hyderabad interiors hub');
assert(home.includes('to="/hyderabad/real-estate"'),'Homepage must link to the Hyderabad real-estate hub');
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
assert(constructionEstimatorSeed.includes("'construction-cost-estimator'"),'Construction estimator seed key must remain construction-cost-estimator');
assert(landing.includes('/estimate/construction-cost-estimator'),'Construction cost guide must link to the seeded estimator');
assert(landing.includes('to="/hyderabad/construction/compare-options"'),'Cost guide must link to construction comparison');
assert(buildScript.includes('/hyderabad/construction/compare-options'),'Static cost guide must link to construction comparison');
assert(buildScript.includes('/estimate/construction-cost-estimator'),'Static cost guide must link to the seeded estimator');
assert(!landing.includes('to="/estimate/construction"'),'SEO pages must not use the invalid construction estimator route');
assert(packagePage.includes('to="/hyderabad/construction-cost"'),'Construction packages must link to the Hyderabad cost guide');
assert(estimatorPage.includes("flowKey==='construction-cost-estimator'?'/hyderabad/construction-cost'"),'Construction estimator must link back to the Hyderabad cost guide');

assert(packages.includes('rate: 1750')&&packages.includes('rate: 1899')&&packages.includes('rate: 2099'),'Construction package catalog must expose current planning rates');
assert(buildScript.includes('costGuideContent(route)'),'Static SEO output must include crawlable construction cost content');
assert(buildScript.includes('CONSTRUCTION_PACKAGE_CATALOG'),'Static construction cost content must use the shared package catalog');
assert(landing.includes('COMMON PROJECT INTENT'),'Construction locality pages must provide useful search-intent content');
assert(landing.includes('COMPARE LIKE FOR LIKE'),'Construction locality pages must teach quote comparison rather than only repeat keywords');
assert(manager.includes("route.type==='local-service'"),'Structured data should identify locality service context');
assert(buildScript.includes('localityContent(route)'),'Static SEO output must include crawlable locality content');
assert(buildScript.includes('application/ld+json'),'Static SEO output must include JSON-LD before JavaScript executes');

console.log('Technical and Hyderabad SEO regression checks passed.');
