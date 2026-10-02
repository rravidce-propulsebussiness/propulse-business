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
const buildScript=read('../frontend/scripts/generate-seo-static-pages.mjs');
const frontendPackage=JSON.parse(read('../frontend/package.json'));
const nginx=read('../frontend/deploy/nginx.conf');
const vite=read('../frontend/vite.config.js');
const dockerfile=read('../frontend/Dockerfile');
const compose=read('../deploy/compose.yml');
const server=read('src/server.js');
const seoRoutes=read('src/routes/seoRoutes.js');

assert(index.includes('name="description"'),'Base HTML must include a meta description');
assert(index.includes('name="robots"'),'Base HTML must include robots metadata');
assert(!index.includes('rel="canonical" href="/"'),'Source HTML must not expose a root canonical that Vite treats as an asset');
assert(index.includes('property="og:title"')&&index.includes('name="twitter:card"'),'Base HTML must include social metadata');
assert(index.includes('Construction, Interiors &amp; Real Estate Services | ProPulse'),'Homepage title must be descriptive');

for(const route of ['/quote','/experts','/packages','/projects','/how-it-works','/about','/contact','/faq']){
  assert(config.includes("path:\'"+route+"\'"),'SEO config missing public route '+route);
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
assert(compose.includes('VITE_PUBLIC_SITE_URL: ${PUBLIC_SITE_URL:-}'),'Deployment must pass the public site origin into the frontend build');

for(const route of ['/hyderabad','/hyderabad/construction','/hyderabad/interior-designers','/hyderabad/real-estate']){
  assert(seoRoutes.includes("'"+route+"'"),'Hyderabad sitemap missing '+route);
}
for(const route of ['/hyderabad/construction/compare-options','/hyderabad/interior-designers/compare-options','/hyderabad/real-estate/compare-options']){
  assert(seoRoutes.includes("'"+route+"'"),'Comparison sitemap missing '+route);
}
assert(app.includes('path="/hyderabad"'),'React router must expose the Hyderabad city hub');
assert(app.includes('/hyderabad/:serviceSlug'),'React router must expose Hyderabad SEO hubs');
assert(app.includes('/hyderabad/:serviceSlug/:localitySlug'),'React router must expose crawlable Hyderabad locality pages');
assert(app.includes('/hyderabad/:serviceSlug/compare-options'),'React router must expose Hyderabad comparison pages');
assert(config.includes('HYDERABAD_SEO_ROUTES'),'Global SEO config must include Hyderabad routes');
assert(hyderabad.includes('HYDERABAD_CITY_SEO_ROUTE'),'Hyderabad SEO data must expose a city hub');
assert(hyderabad.includes('HYDERABAD_LOCALITY_SEO_ROUTES'),'Hyderabad SEO data must expose locality routes');

for(const locality of ['Uppal','Kothapet','LB Nagar','Gachibowli','Kondapur','Kukatpally','Miyapur','Kokapet','Narsingi','Tellapur']){
  assert(hyderabad.includes("name:'"+locality+"'"),'Hyderabad locality index missing '+locality);
}
for(const localitySlug of ['uppal','kothapet','lb-nagar','gachibowli','kondapur','kukatpally','miyapur','kokapet','narsingi','tellapur']){
  assert(seoRoutes.includes("'"+localitySlug+"'"),'Hyderabad construction sitemap locality missing '+localitySlug);
}
assert(seoRoutes.includes("...HYDERABAD_CONSTRUCTION_LOCALITIES.map(locality=>'/hyderabad/construction/'+locality)"),'Sitemap must generate construction locality URLs');
assert(!seoRoutes.includes('/hyderabad/interior-designers/kothapet'),'Interior locality doorway URLs must not be mass-generated yet');
for(const brand of ['Brick&Bolt','BuildNext','Livspace','HomeLane','DesignCafe','NoBroker Interiors','Decorpot','MagicBricks','99acres']){
  assert(hyderabad.includes("'"+brand+"'"),'Comparison SEO content missing '+brand);
}
assert(landing.includes('ProPulse is independent'),'Comparison page must disclose brand independence');
assert(landing.includes('COMMON PROJECT INTENT'),'Construction locality pages must provide useful search-intent content');
assert(landing.includes('COMPARE LIKE FOR LIKE'),'Construction locality pages must teach quote comparison rather than only repeat keywords');
assert(manager.includes("route.type==='local-service'"),'Structured data should identify locality service context');
assert(buildScript.includes('localityContent(route)'),'Static SEO output must include crawlable locality content');
assert(buildScript.includes('application/ld+json'),'Static SEO output must include JSON-LD before JavaScript executes');

console.log('Technical and Hyderabad SEO regression checks passed.');
