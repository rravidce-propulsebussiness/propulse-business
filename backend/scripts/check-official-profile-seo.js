const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {renderPublicExpertHtml,publicProfilePath}=require('../src/services/publicExpertSeoPageService');
const pool=require('../src/config/database');
const experts=require('../src/services/publicExpertService');

const example={
  business_profile_id:27,business_name:'Propulse Constructions and Interiors',
  is_official:true,public_headline:'Construction and Interiors in Hyderabad',
  public_summary:'ProPulse provides construction and interior execution in Hyderabad.',
  services:[{serviceName:'Civil Construction'},{serviceName:'Interior Design'}],
  locations:[{cityName:'Hyderabad'},{cityName:'Hyderabad'}],
  projects:[{id:3,title:'Completed 3BHK Interior Design in Uppal',
    seo_slug:'3bhk-interior-design-uppal-hyderabad'}]
};
const template='<!doctype html><html lang="en-IN"><head><title>Homepage</title>'+
  '<meta name="robots" content="noindex"><meta name="description" content="Homepage">'+
  '<script type="application/ld+json">{"@type":"WebSite"}</script></head>'+
  '<body><div id="root"><h1>Old homepage</h1></div><script type="module" src="/assets/app.js"></script></body></html>';
const {html,path:route}=renderPublicExpertHtml(template,example);
assert.equal(route,'/experts/27');
assert(html.includes('data-seo-expert-fallback="true"'),'SSR professional profile must contain visible HTML');
assert(html.includes('<h1>Propulse Constructions and Interiors</h1>'));
assert(html.includes('Civil Construction')&&html.includes('Interior Design'));
assert(html.includes('href="/projects/3bhk-interior-design-uppal-hyderabad"'));
assert(html.includes('href="/contact#direct-project"'),'Official ProPulse enquiry must stay direct');
assert(!html.includes('Old homepage'));
assert(html.includes('src="/assets/app.js"'),'React hydration must keep its script');
assert(html.includes('name="robots" content="index,follow'));
assert(html.includes('rel="canonical" href="https://propulsetechnologies.online/experts/27"'));
assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
assert.equal((html.match(/type="application\/ld\+json"/g)||[]).length,1);
const json=html.match(/data-propulse-expert-seo="server">([\s\S]*?)<\/script>/)?.[1];
assert(json);
const schema=JSON.parse(json);
assert(schema['@graph'].some(entry=>entry['@type']==='HomeAndConstructionBusiness'
  &&entry.name==='Propulse Constructions and Interiors'));
assert(!html.includes('private-object-s3:'),'Never leak original media references');
assert.equal(publicProfilePath(example),'/experts/27');
assert.throws(()=>publicProfilePath({business_profile_id:0}),/valid profile ID/);

const independent=renderPublicExpertHtml(template,{
  ...example,business_profile_id:15,is_official:false,
  business_name:'Independent Test Interiors',
  public_summary:'Public professional services',
  projects:[{id:12,title:'<img src=x onerror=alert(1)>',seo_slug:''}]
}).html;
assert(!independent.includes('HomeAndConstructionBusiness'));
assert(independent.includes('INDEPENDENT PROPULSE MARKETPLACE PROFESSIONAL'));
assert(!independent.includes('href="/contact#direct-project"'));
assert(independent.includes('href="/experts/15#callback"'));
assert(!independent.includes('<img src=x onerror=alert(1)>'));
const injected=renderPublicExpertHtml(template,{
  ...example,business_name:'"><script>alert(1)</script>'
}).html;
assert(!injected.includes('"><script>alert(1)</script>'));
assert(injected.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

const src=(name)=>fs.readFileSync(path.resolve(__dirname,'../..',name),'utf8');
const routes=src('backend/src/routes/seoRoutes.js');
const hostinger=src('hostinger-server.js');
const nginx=src('frontend/deploy/nginx.conf');
const frontend=src('frontend/src/pages/ProfessionalDetails.jsx');
assert(routes.includes("router.get('/experts/:expertId'"),'Express must server-render professional profile URLs');
assert(routes.includes('listIndexableOfficialProfiles()'),'Main XML sitemap needs official profile URLs');
assert(hostinger.includes('Professional detail pages must return server-rendered'));
assert(nginx.includes('location ~ ^/experts/[1-9][0-9]*/?$'));
assert(frontend.includes("document.title=title"),'React must refresh the title after hydration');
assert(frontend.includes("['robots','index,follow,max-image-preview:large']"),
  'SPA navigation must not leave public professional profiles noindexed');
assert(frontend.includes('Official enquiries are separate from marketplace leads.'));

const originalQuery=pool.query;
pool.query=async(sql,params=[])=>{
  assert.equal(params.length,0);
  assert(sql.includes('beds.is_official=TRUE'));
  for(const condition of ['beds.is_hidden','u.is_active=TRUE','bp.public_profile_enabled'])
    assert(sql.includes(condition));
  return {rows:[{id:27,updated_at:'2026-11-01T00:00:00Z'}]};
};
(async()=>{
  try{
    const entries=await experts.listIndexableOfficialProfiles();
    assert.deepEqual(entries,[{path:'/experts/27',lastmod:'2026-11-01'}]);
    console.log('Official ProPulse SSR profile, canonical, direct CTA, sitemap and safety verified.');
  }finally{
    pool.query=originalQuery;
    await pool.end();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
