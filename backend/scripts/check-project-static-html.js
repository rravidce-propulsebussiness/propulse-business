const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {renderProjectHtml,canonicalProjectPath}=require('../src/services/projectSeoPageService');

const template=String.raw`<!doctype html><html lang="en-IN"><head><title>Homepage title</title>
<meta name="description" content="Homepage description">
<meta name="robots" content="index,follow">
<meta property="og:title" content="Homepage title">
<meta property="og:url" content="/">
<meta name="twitter:title" content="Homepage title">
<link rel="canonical" href="https://propulsetechnologies.online/">
<script type="application/ld+json" data-propulse-seo="jsonld">{"@type":"WebPage","name":"Homepage"}</script>
</head><body><div id="propulse-boot-screen"></div><div id="root"><main><h1>Generic homepage fallback</h1></main></div><script type="module" crossorigin src="/assets/main123.js"></script></body></html>`;
const sample={
  project_id:3,
  seo_slug:'modern-3bhk-interior-design-in-uppal-hyderabad-luxury-home-interiors',
  title:'Modern 3BHK Interior Design in Uppal, Hyderabad',
  project_type:'Interior Design',
  location_text:'Uppal, Hyderabad',
  completion_year:2026,
  business_name:'Propulse Constructions and Interiors',
  is_official:true,
  description:'Completed residential interiors with modern kitchen, wardrobes and feature walls.',
  video_url:'private-object-s3:business-projects/original-private-video',
  image_urls:['private-object-s3:business-projects/secret-image'],
  seo_description:'Modern 3BHK interiors at Uppal in Hyderabad.',
  published_at:'2026-10-25T07:30:00.000Z',
};
const {html,path:pagePath,canonical}=renderProjectHtml(template,sample);
assert.equal(pagePath,'/projects/'+sample.seo_slug);
assert.equal(canonical,'https://propulsetechnologies.online'+pagePath);
assert.match(html,/<title>Modern 3BHK Interior Design in Uppal, Hyderabad \| ProPulse<\/title>/);
assert.match(html,/<meta name="description" content="Modern 3BHK interiors at Uppal in Hyderabad." \/>/);
assert.match(html,/data-seo-project-fallback="true"/);
assert.match(html,/<h1[^>]*>Modern 3BHK Interior Design in Uppal, Hyderabad<\/h1>/);
assert.match(html,/Uppal, Hyderabad/);
assert.match(html,/href="\/contact#direct-project"/);
assert.match(html,/href="\/projects"/);
assert.match(html,/href="https:\/\/propulsetechnologies\.online\/projects\/modern-3bhk/);
assert.match(html,/src="\/assets\/main123\.js"/);
assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Only one canonical link should be present');
assert.equal((html.match(/type="application\/ld\+json"/g)||[]).length,1,'Homepage structured data must be replaced');
const embedded=html.match(/<script type="application\/ld\+json" data-propulse-project-seo="server">([\s\S]*?)<\/script>/)?.[1];
assert(embedded,'Expected JSON-LD data in server-rendered HTML');
const structured=JSON.parse(embedded);
assert(structured['@graph'].some(item=>item['@type']==='BreadcrumbList'));
assert(structured['@graph'].some(item=>item['@type']==='CreativeWork'&&item.contentLocation?.name==='Uppal, Hyderabad'));
assert(!html.includes('private-object-s3:'),'Private media must not be present in the crawler HTML');
assert(!html.includes('Generic homepage fallback'),'SSR must replace the homepage fallback');

const withUnsafe={
  ...sample,
  title:'"<script>alert(1)</script> & house',
  description:'This is <b>not</b> HTML; <img src=x onerror=alert(1)>'
};
const unsafe=renderProjectHtml(template,withUnsafe).html;
assert(!unsafe.includes('<script>alert(1)</script>'),'Project title must be escaped');
assert(!unsafe.includes('<img src=x onerror=alert(1)>'),'Project description must be escaped');
assert(unsafe.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert(!unsafe.includes('</script> & house'),'JSON-LD must not contain raw script end');
assert.equal(canonicalProjectPath({project_id:55,seo_slug:''}),'/projects/project-55');
assert.throws(()=>canonicalProjectPath({seo_slug:''}),/valid public ID/);

const files={
  routes:fs.readFileSync(path.join(__dirname,'../src/routes/seoRoutes.js'),'utf8'),
  wrapper:fs.readFileSync(path.join(__dirname,'../../hostinger-server.js'),'utf8'),
  nginx:fs.readFileSync(path.join(__dirname,'../../frontend/deploy/nginx.conf'),'utf8'),
};
assert.match(files.routes,/router\.get\('\/projects\/:projectKey'/);
assert.match(files.routes,/publicExpertService\.getPublicProject/);
assert.match(files.routes,/status\(404\)/);
assert.match(files.routes,/status\(503\)/);
assert.match(files.wrapper,/backendRoute\(req\.path\)\?proxyToBackend/);
assert.match(files.wrapper,/Published project detail pages must be crawled/);
assert.match(files.nginx,/location ~ \^\/projects\//);
console.log('Server-rendered project SEO HTML, escaped JSON-LD, canonical URL and missing-project handling verified.');
