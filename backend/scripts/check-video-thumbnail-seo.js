const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const video=require('../src/services/projectVideoSeoService');
const {renderProjectHtml}=require('../src/services/projectSeoPageService');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const projectId=3,slug='modern-3bhk-interior-design-in-uppal';
const playback='private-object-s3:business-project-redacted/7-3-'+'a'.repeat(32)+'.mp4';
const thumbnail='private-object-s3:business-project-thumbnails/7-3-'+'b'.repeat(32)+'.jpg';
const ready={
  project_id:projectId,seo_slug:slug,title:'Modern 3BHK Interiors in Uppal',
  seo_description:'Completed real 3BHK interior work in Hyderabad.',
  location_text:'Uppal, Hyderabad',completion_year:2026,
  is_official:true,business_name:'ProPulse',video_url:playback,
  video_thumbnail_url:thumbnail,
  video_published_at:'2026-10-30T10:30:00Z',video_duration_seconds:'43.15'
};
assert.equal(video.thumbnailPath(ready),'/project-video-thumbnail/'+slug);
assert.equal(video.contentPath(ready),'/project-video-stream/'+slug+'.mp4');
assert.equal(video.thumbnailReference(ready),'business-project-thumbnails/7-3-'+'b'.repeat(32)+'.jpg');
assert.equal(video.playbackReference(ready),'business-project-redacted/7-3-'+'a'.repeat(32)+'.mp4');
assert.equal(video.videoObject(ready)['@type'],'VideoObject');
assert.equal(video.videoObject(ready).uploadDate,'2026-10-30T10:30:00.000Z');
assert.equal(video.videoObject(ready).duration,'PT43S');
assert.equal(video.videoObject(ready).thumbnailUrl,
  'https://propulsetechnologies.online/project-video-thumbnail/'+slug);
assert.equal(video.videoObject(ready).contentUrl,
  'https://propulsetechnologies.online/project-video-stream/'+slug+'.mp4');
assert.equal(video.videoObject({...ready,video_thumbnail_url:null}),null,
  'Do not claim video rich results without a real thumbnail');
assert.equal(video.videoObject({...ready,video_published_at:null,published_at:null}),null,
  'Do not invent upload dates');
assert.equal(video.thumbnailReference({...ready,video_thumbnail_url:'private-object-s3:business-projects/original-video.mp4'}),null,
  'Original video uploads are never valid thumbnails');
assert.equal(video.playbackReference({...ready,video_url:'private-object-s3:business-projects/original-video.mp4'}),null,
  'Original video uploads are never served as public playback');
assert.equal(video.thumbnailReference({...ready,project_id:99}),null,'Mismatched project thumbnail must be denied');
assert.equal(video.playbackReference({...ready,project_id:99}),null,'Mismatched project video must be denied');

const htmlTemplate='<!doctype html><html><head><title>Home</title><meta name="description" content="site"></head>'+
'<body><div id="root"><main>generic page</main></div><script type="module" src="/assets/app.js"></script></body></html>';
const page=renderProjectHtml(htmlTemplate,ready).html;
const graphText=page.match(/data-propulse-project-seo="server">([\s\S]*?)<\/script>/)?.[1];
assert(graphText,'Project page must contain initial JSON-LD');
const graph=JSON.parse(graphText)['@graph'];
const object=graph.find(entity=>entity['@type']==='VideoObject');
assert(object,'Real ready video gets VideoObject on initial response');
assert.equal(object.thumbnailUrl,'https://propulsetechnologies.online/project-video-thumbnail/'+slug);
assert.equal(object.contentUrl,'https://propulsetechnologies.online/project-video-stream/'+slug+'.mp4');
assert(page.includes('<video controls playsinline'),'Video must be embedded in crawlable project HTML');
assert(page.includes('poster="/project-video-thumbnail/'+slug+'"'),'Stable thumbnail used as player poster');
assert(page.includes('og:video:image'),'Video SEO image metadata is present');
assert(page.includes('summary_large_image'),'Video thumbnail is used for social preview');
assert(!page.includes(playback),'Private R2 playback reference must never leak into HTML');
assert(!page.includes(thumbnail),'Private R2 thumbnail reference must never leak into HTML');
assert(!page.includes('original-video.mp4'),'Original upload must remain inaccessible');
assert(!renderProjectHtml(htmlTemplate,{...ready,video_url:null,video_thumbnail_url:null}).html.includes('"VideoObject"'),
  'Missing video must not generate invented video structured data');

const publicService=read('backend/src/services/publicExpertService.js');
assert(publicService.includes('video_thumbnail_source_url='),'Thumbnail must match original source reference');
assert(publicService.includes('publicRedactedVideoReadySql(alias)'),'Thumbnails depend on a processed ready video');
const routes=read('backend/src/routes/seoRoutes.js');
assert(routes.includes("router.get('/project-video-thumbnail/:projectKey'"));
assert(routes.includes("router.get('/project-video-stream/:projectKey.mp4'"));
assert(routes.includes('getPublicProject(match?match[1]:key,{materializeMedia:false})'));
assert(routes.includes('s3Storage.getMediaGetUrl(derivativeKey'),'Video redirects exclusively to the playback derivative');
const wrapper=read('hostinger-server.js');
const backend=read('backend/src/server.js');
const nginx=read('frontend/deploy/nginx.conf');
for(const route of ['/project-video-thumbnail/','/project-video-stream/']){
  assert(wrapper.includes("requestPath.startsWith('"+route+"')"));
  assert(backend.includes("requestPath.startsWith('"+route+"')"));
  assert(nginx.includes('location ^~ '+route));
}
const ddl=read('backend/src/database/migrations/20261101_video_thumbnail_metadata.sql');
for(const field of ['video_thumbnail_url','video_thumbnail_source_url','video_duration_seconds']){
  assert(ddl.includes(field),'Video thumbnail migration must add '+field);
}
const worker=read('video-redactor/worker.py');
assert(worker.includes('generate_thumbnail(processed,thumbnail)'));
assert(worker.includes('backfill_existing_thumbnail(connection,client)'));
assert(worker.includes('video_thumbnail_source_url=%s'));
assert(worker.includes('"ContentType":"image/jpeg"'));
assert(!worker.includes('detect_contact_boxes'),'Video thumbnails must not reintroduce masking');
const syntax=spawnSync('python3',['-c','import ast, pathlib; ast.parse(pathlib.Path("video-redactor/worker.py").read_text())'],
  {cwd:root,encoding:'utf8',timeout:10000});
if(syntax.error&&syntax.error.code!=='ENOENT')throw syntax.error;
if(!syntax.error)assert.equal(syntax.status,0,'Python video thumbnail worker must parse: '+syntax.stderr);
console.log('Video SEO, authentic thumbnail, privacy-safe media paths, initial HTML and migration tests passed.');
