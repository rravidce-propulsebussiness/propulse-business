const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cover=require('../src/services/projectCoverService');
const s3=require('../src/services/s3PrivateObjectStorageService');
const {renderProjectHtml}=require('../src/services/projectSeoPageService');

const stored='private-object-s3:business-projects/7-image-1760000000000-aaaaaaaaaaaaaaaaaaaaaaaa.jpg';
const photo=cover.normalizeReference(stored);
assert(photo);
assert.equal(photo.storage,'r2');
assert.equal(photo.mime,'image/jpeg');
assert.equal(photo.key,'business-projects/7-image-1760000000000-aaaaaaaaaaaaaaaaaaaaaaaa.jpg');
for(const bad of [
  'private-object-s3:company-proofs/customer-private.jpg',
  'private-object-s3:business-projects/../../secret.jpg',
  '/uploads/business-projects/../../etc/passwd',
  'https://example.org/external.jpg',
  'private-object-s3:business-projects/7-video-1760000000000-aaaaaaaaaaaaaaaaaaaaaaaa.mp4',
]){
  assert.equal(cover.normalizeReference(bad),null,'Must never proxy arbitrary storage reference: '+bad);
}
const project={
  project_id:3,seo_slug:'modern-3bhk-interior-design-in-uppal',
  title:'Modern 3BHK Interior Design in Uppal',
  description:'An independently verified completed 3BHK interior project in Hyderabad.',
  completion_year:2026,location_text:'Uppal, Hyderabad',
  business_name:'ProPulse',
  cover_image_url:stored,is_official:true
};
assert.equal(cover.coverPathFor(project),'/project-cover/modern-3bhk-interior-design-in-uppal');
assert.equal(cover.selectCover({...project,cover_image_url:'',image_urls:[stored]}).reference,stored);
assert.equal(cover.selectCover({...project,cover_image_url:'',image_urls:[]}),null);
const source=fs.readFileSync(path.join(__dirname,'../src/routes/seoRoutes.js'),'utf8');
const wrapper=fs.readFileSync(path.join(__dirname,'../../hostinger-server.js'),'utf8');
const backend=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');
const nginx=fs.readFileSync(path.join(__dirname,'../../frontend/deploy/nginx.conf'),'utf8');
assert.match(source,/router\.get\('\/project-cover\/:projectKey'/);
assert.match(source,/getPublicProject\(match\?match\[1\]:value,\{materializeMedia:false\}\)/);
assert.match(wrapper,/requestPath\.startsWith\('\/project-cover\/'\)/);
assert.match(backend,/requestPath\.startsWith\('\/project-cover\/'\)/);
assert.match(nginx,/location \^~ \/project-cover\//);

const htmlTemplate='<html><head><title>Home</title><meta name="description" content="home" /></head>'+
'<body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';
const rendered=renderProjectHtml(htmlTemplate,project).html;
const preview='https://propulsetechnologies.online/project-cover/modern-3bhk-interior-design-in-uppal';
assert(rendered.includes('content="'+preview+'"'),'Real photo used for social meta tags');
assert(rendered.includes('src="/project-cover/modern-3bhk-interior-design-in-uppal"'),'Crawler HTML has a stable image path');
assert(!rendered.includes(stored),'Never leak private storage references into HTML');
assert(rendered.includes('summary_large_image'));
assert(rendered.includes('"image":"'+preview+'"'),'CreativeWork must identify the real project image');
const noPhoto=renderProjectHtml(htmlTemplate,{...project,cover_image_url:null}).html;
assert(!noPhoto.includes('/project-cover/'),'Without photo, no fake project image should be claimed');
assert(noPhoto.includes('/brand/propulse-logo.png'),'Use truthful company logo fallback');

const photoBytes=Buffer.from([255,216,255,0,1,2,3,4,5,6,7,8,9,10,11]);
const prevEnabled=s3.isEnabled,prevGet=s3.getObjectBuffer;
let readKey;
s3.isEnabled=()=>true;
s3.getObjectBuffer=async(key,{maxBytes}={})=>{
  readKey=key;assert.equal(maxBytes,12*1024*1024);
  return {buffer:photoBytes,contentType:'image/jpeg'};
};
(async()=>{
  try{
    const result=await cover.readCover(photo);
    assert.equal(readKey,photo.key);
    assert.deepEqual(result.buffer,photoBytes);
    assert.equal(result.contentType,'image/jpeg');
  }finally{s3.isEnabled=prevEnabled;s3.getObjectBuffer=prevGet;}
  console.log('Verified stable public image SEO, genuine-image fallback, validated storage references and server image bytes.');
})().catch(e=>{console.error(e);process.exitCode=1});
