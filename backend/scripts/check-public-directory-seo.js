'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {professionalDirectoryCards,renderProfessionalDirectoryHtml}=require('../src/services/professionalDirectorySeoPageService');
const experts=require('../src/services/publicExpertService');
const settingsService=require('../src/services/expertDirectoryService');
const pool=require('../src/config/database');

const template='<!doctype html><html><head><title>Old home</title><meta name="robots" content="noindex">'+
  '<meta name="description" content="Old home">'+
  '<script type="application/ld+json">{"@type":"WebPage"}</script></head>'+
  '<body><div id="root"><h1>Old home</h1></div><script type="module" src="/assets/app.js"></script></body></html>';
const publicRows=[
  {business_profile_id:27,business_name:'Propulse Constructions and Interiors',is_official:true,
    services:[{serviceName:'Civil Construction'},{serviceName:'Interior Design'}],
    locations:[{cityName:'Hyderabad'},{cityName:'Hyderabad'}]},
  {business_profile_id:31,business_name:'Independent Construction & Interiors',is_official:false,
    services:[{serviceName:'Construction'}],locations:[{cityName:'Hyderabad'}]},
  {business_profile_id:0,business_name:'Invalid'}
];
const html=renderProfessionalDirectoryHtml(template,publicRows);
assert(html.includes('data-seo-professionals-directory="true"'));
assert(html.includes('<title>Construction &amp; Interior Professionals in Hyderabad | ProPulse</title>'));
assert(html.includes('href="/experts/27"')&&html.includes('href="/experts/31"'));
assert(html.includes('Official ProPulse construction and interior execution'));
assert(html.includes('Independent marketplace professional'));
assert(!html.includes('href="/experts/0"'));
assert(html.includes('name="robots" content="index,follow'));
assert(html.includes('rel="canonical" href="https://propulsetechnologies.online/experts"'));
assert(html.includes('src="/assets/app.js"')&&!html.includes('Old home</h1>'));
assert.equal((html.match(/type="application\/ld\+json"/g)||[]).length,1);
const structured=JSON.parse(html.match(/data-propulse-directory-seo="server">([\s\S]*?)<\/script>/)[1]);
assert.equal(structured['@graph'].find(x=>x['@type']==='ItemList').itemListElement.length,2);
assert(!html.includes('private-object-s3:'),'Never output private storage references');
const injected=professionalDirectoryCards([{business_profile_id:19,business_name:'<img src=x onerror=alert(1)>',services:[],locations:[]}]).html;
assert(!injected.includes('<img src=x onerror=alert(1)>'));
assert(injected.includes('&lt;img src=x onerror=alert(1)&gt;'));

const read=file=>fs.readFileSync(path.resolve(__dirname,'../..',file),'utf8');
const seo=read('frontend/src/components/SeoManager.jsx');
const routes=read('backend/src/routes/seoRoutes.js');
const hostinger=read('hostinger-server.js');
const nginx=read('frontend/deploy/nginx.conf');
assert(seo.includes('function publicDetailType(pathname)'));
assert(seo.includes('if(detailType){'),'Dynamic public pages must not transiently turn noindex');
assert(seo.includes('matchesServerGraph'),'SSR schema must survive React hydration');
assert(seo.includes('index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'));
assert(seo.includes('script[data-propulse-project-seo]')&&seo.includes('script[data-propulse-expert-seo]'));
assert(routes.includes("router.get('/experts',"),'Directory must be SSR');
assert(routes.includes('listIndexableIndependentProfiles()'),'Independent profile sitemap required');
assert(hostinger.includes("req.path!=='/experts'"),'Hostinger must proxy the public directory');
assert(nginx.includes('location = /experts'),'Nginx must proxy the public directory');

const originalQuery=pool.query,originalSettings=settingsService.getSettings;
const requests=[];
settingsService.getSettings=async()=>({
  directoryEnabled:true,requireVerified:true,requireActiveMembership:false,
  allowedPlanGroups:['grow'],showProjects:true,showVideos:true,showPlans:true
});
pool.query=async(sql,params=[])=>{
  requests.push({sql,params});
  assert(sql.includes('u.is_active=TRUE')&&sql.includes('beds.is_hidden'));
  assert(sql.includes('cpdv.status='),'Verified business rule must be honored');
  assert(sql.includes('COALESCE(beds.is_official,FALSE)=FALSE'),'Official profiles should not be duplicated');
  assert(sql.includes('business_profile_services'),'Empty accounts must be excluded');
  return {rows:[{id:31,updated_at:'2026-11-01T10:00:00Z'}]};
};
(async()=>{
  try{
    const paths=await experts.listIndexableIndependentProfiles();
    assert.deepEqual(paths,[{path:'/experts/31',lastmod:'2026-11-01'}]);
    assert(requests.length===1);
    settingsService.getSettings=async()=>({directoryEnabled:false});
    assert.deepEqual(await experts.listIndexableIndependentProfiles(),[]);
    assert(requests.length===1,'Disabled directory must not query private profiles');
    console.log('Crawlable directory, dynamic SEO hydration and filtered professional sitemap verified.');
  }finally{
    pool.query=originalQuery;
    settingsService.getSettings=originalSettings;
    await pool.end();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
