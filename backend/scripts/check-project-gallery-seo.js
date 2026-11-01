const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {renderProjectListingHtml}=require('../src/services/projectListingSeoService');
const template='<!doctype html><html><head><title>Homepage</title>'+
'<meta name="description" content="Homepage description">'+
'<link rel="canonical" href="https://propulsetechnologies.online/">'+
'<script type="application/ld+json">{"@type":"WebPage","name":"Home"}</script>'+
'</head><body><div id="root"><div><h1>Generic Home</h1></div></div>'+
'<script type="module" src="/assets/app.js"></script></body></html>';
const original='private-object-s3:business-projects/original-private.mp4';
const project={
 project_id:3,seo_slug:'modern-3bhk-interior-design-in-uppal',
 title:'Modern 3BHK Interior Design in Uppal, Hyderabad',
 location_text:'Uppal, Hyderabad',completion_year:2026,is_official:true,
 video_url:'private-object-s3:business-project-redacted/7-3-'+'a'.repeat(32)+'.mp4',
 video_thumbnail_url:'private-object-s3:business-project-thumbnails/7-3-'+'b'.repeat(32)+'.jpg',
 video_published_at:'2026-10-30T00:00:00.000Z',
 cover_image_url:original
};
const html=renderProjectListingHtml(template,[project]);
const link='/projects/modern-3bhk-interior-design-in-uppal';
assert(html.includes('data-seo-project-gallery="true"'),'Gallery must have crawlable content');
assert(html.includes('href="'+link+'"'),'Project link must be a real HTML anchor');
assert(html.includes('src="/project-video-thumbnail/modern-3bhk-interior-design-in-uppal"'),
  'Video still should appear without a separate cover photo');
assert(html.includes('Completed ProPulse project'),'First-party attribution must be correct');
assert(html.includes('Uppal, Hyderabad'));
assert(html.includes('href="/contact#direct-project"'),'Direct-hire CTA is separate from marketplace');
assert(html.includes('src="/assets/app.js"'),'React client bundle must remain intact');
assert(!html.includes('Generic Home'),'Home SEO fallback must be replaced');
assert(!html.includes(original),'Original private upload must not leak');
assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Only one gallery canonical');
assert(html.includes('href="https://propulsetechnologies.online/projects"'),
  'Gallery canonical must point to /projects');
const data=html.match(/data-propulse-project-gallery-seo="server">([\s\S]*?)<\/script>/)?.[1];
assert(data,'Gallery must have server-authored schema');
const graph=JSON.parse(data)['@graph'];
const list=graph.find(x=>x['@type']==='ItemList');
assert.equal(list.itemListElement.length,1);
assert.equal(list.itemListElement[0].url,'https://propulsetechnologies.online'+link);

const xss=renderProjectListingHtml(template,[{...project,title:'<script>alert(1)</script> & finished'}]);
assert(!xss.includes('<script>alert(1)</script>'),'Untrusted titles must be escaped');
assert(xss.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; finished'));
const empty=renderProjectListingHtml(template,[]);
assert(empty.includes('No completed projects are currently published.'));
assert(!empty.includes('href="'+link+'"'));

const wrapper=fs.readFileSync(path.join(__dirname,'../../hostinger-server.js'),'utf8');
const nginx=fs.readFileSync(path.join(__dirname,'../../frontend/deploy/nginx.conf'),'utf8');
const seoRoutes=fs.readFileSync(path.join(__dirname,'../src/routes/seoRoutes.js'),'utf8');
const publicService=fs.readFileSync(path.join(__dirname,'../src/services/publicExpertService.js'),'utf8');
assert(wrapper.includes("req.path==='/projects'"),'Hostinger must proxy the gallery URL');
assert(nginx.includes('location = /projects'),'Nginx must proxy the gallery URL');
assert(seoRoutes.includes("router.get('/projects',async(req,res)=>"),'Gallery needs server HTML handler');
assert(publicService.includes('materializeMedia?await materializeProjectMedia(result.rows):result.rows'),
  'SSR must avoid generating signed private media links');
console.log('Crawlable video gallery anchors, JSON-LD, authentic thumbnails and XSS protection passed.');
