const express=require('express');
const fs=require('fs');
const path=require('path');
const {renderProjectHtml}=require('../services/projectSeoPageService');
const {renderProjectListingHtml}=require('../services/projectListingSeoService');
const {renderPublicExpertHtml}=require('../services/publicExpertSeoPageService');
const {renderProfessionalDirectoryHtml}=require('../services/professionalDirectorySeoPageService');
const coverService=require('../services/projectCoverService');
const videoSeo=require('../services/projectVideoSeoService');
const s3Storage=require('../services/s3PrivateObjectStorageService');

const router=express.Router();
const publicExpertService=require('../services/publicExpertService');

const HYDERABAD_CONSTRUCTION_LOCALITIES=[
  'uppal','habsiguda','tarnaka','nagole','kothapet','lb-nagar','saroornagar','vanasthalipuram','hayathnagar','dilsukhnagar',
  'gachibowli','financial-district','nanakramguda','kondapur','madhapur','hitec-city','manikonda','kokapet','narsingi','tellapur','nallagandla',
  'tolichowki','mehdipatnam','attapur',
  'kukatpally','ferozguda','balanagar','bowenpally','miyapur','bachupally','pragathi-nagar','ameenpur','kompally',
  'banjara-hills','jubilee-hills',
  'ghatkesar','pocharam','boduppal','peerzadiguda','medipally','ecil','kapra','alwal','suchitra','quthbullapur','jeedimetla','medchal','shamirpet',
  'shamshabad','tukkuguda','adibatla','nadergul','rajendranagar','bandlaguda-jagir','puppalaguda',
  'patancheru','chandanagar','lingampally','beeramguda','kollur','mokila','shankarpally',
  'keesara','nagaram','dammaiguda','rampally','cherlapally','sainikpuri','yapral','safilguda','malkajgiri',
  'karmanghat','champapet','hastinapuram','meerpet','badangpet','balapur','turkayamjal','ibrahimpatnam','bongloor','maheshwaram',
  'nizampet','mallampet','dundigal','gandimaisamma','bhel','ramachandrapuram','velimela','osman-nagar','gandipet','manchirevula','moinabad',
  'secunderabad','begumpet','ameerpet','panjagutta','somajiguda','khairatabad','amberpet','ramanthapur',
];

const TELANGANA_DISTRICTS=[
  'adilabad','bhadradri-kothagudem','hanumakonda','hyderabad','jagtial','jangaon','jayashankar-bhupalpally','jogulamba-gadwal','kamareddy',
  'karimnagar','khammam','kumuram-bheem-asifabad','mahabubabad','mahabubnagar','mancherial','medak','medchal-malkajgiri','mulugu',
  'nagarkurnool','nalgonda','narayanpet','nirmal','nizamabad','peddapalli','rajanna-sircilla','rangareddy','sangareddy','siddipet',
  'suryapet','vikarabad','wanaparthy','warangal','yadadri-bhuvanagiri',
];

const ANDHRA_PRADESH_DISTRICTS=[
  'alluri-sitharama-raju','anakapalli','anantapuramu','annamayya','bapatla','chittoor','east-godavari','eluru','guntur','kakinada',
  'dr-br-ambedkar-konaseema','krishna','kurnool','markapuram','nandyal','ntr','palnadu','parvathipuram-manyam','polavaram','prakasam',
  'sri-potti-sriramulu-nellore','sri-sathya-sai','srikakulam','tirupati','visakhapatnam','vizianagaram','west-godavari','ysr-kadapa',
];

const CONSTRUCTION_GUIDES=[
  'best-steel-for-house-construction',
  'prevent-cracks-in-house',
  '2bhk-interiors-hyderabad',
  'choose-construction-contractor-hyderabad',
  'home-construction-checklist',
  'waterproofing-precautions-new-house',
  'best-cement-for-house-construction',
  'm-sand-vs-river-sand-house-construction',
  'red-brick-vs-aac-block-house',
  'concrete-curing-house-construction',
  'soil-test-before-house-construction',
  'rcc-slab-before-concrete-checklist',
  'electrical-planning-new-house',
  'plumbing-checklist-new-house',
  'wall-putty-primer-paint-sequence',
  'modular-kitchen-planning-hyderabad',
  'wardrobe-materials-plywood-mdf-hdhmr',
];

const PUBLIC_PATHS=[
  '/',
  '/quote',
  '/experts',
  '/packages',
  '/projects',
  '/technology',
  '/how-it-works',
  '/about',
  '/contact',
  '/faq',
  '/hyderabad',
  '/hyderabad/construction',
  '/hyderabad/construction-cost',
  '/hyderabad/interior-designers',
  '/hyderabad/real-estate',
  ...HYDERABAD_CONSTRUCTION_LOCALITIES.map(locality=>'/hyderabad/construction/'+locality),
  '/telangana/construction',
  ...TELANGANA_DISTRICTS.map(district=>'/telangana/construction/'+district),
  '/andhra-pradesh/construction',
  ...ANDHRA_PRADESH_DISTRICTS.map(district=>'/andhra-pradesh/construction/'+district),
  '/guides',
  ...CONSTRUCTION_GUIDES.map(guide=>'/guides/'+guide),
  '/hyderabad/construction/compare-options',
  '/hyderabad/interior-designers/compare-options',
  '/hyderabad/real-estate/compare-options',
];

const PRODUCTION_SITE_ORIGIN='https://propulsetechnologies.online';
function safeOrigin(req){
  // Requests addressed to the production ProPulse site must have canonical
  // robots/sitemap URLs even when OAuth or SPA environment settings point to
  // another origin. In particular, never advertise the Business OS domain.
  // Keep non-production hosts configurable for staging and local development.
  const requestHosts=[req.get('host'),req.get('x-forwarded-host')];
  if(requestHosts.some(value=>{
    const hostname=String(value||'').split(',')[0].trim();
    return /^(?:www\.)?propulsetechnologies\.online(?::(?:80|443))?$/i.test(hostname);
  }))return PRODUCTION_SITE_ORIGIN;

  const configured=String(process.env.PUBLIC_APP_URL||process.env.FRONTEND_URL||'').trim();
  if(configured){
    try{
      const url=new URL(configured);
      if(['http:','https:'].includes(url.protocol))return url.origin;
    }catch{}
  }
  const forwardedProto=String(req.get('x-forwarded-proto')||'').split(',')[0].trim().toLowerCase();
  const protocol=['http','https'].includes(forwardedProto)?forwardedProto:(req.protocol==='https'?'https':'http');
  const forwardedHost=String(req.get('x-forwarded-host')||'').split(',')[0].trim();
  const host=forwardedHost||String(req.get('host')||'').trim();
  if(/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(host))return protocol+'://'+host;
  return 'http://localhost:5173';
}

function xmlEscape(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&apos;");
}

router.get('/robots.txt',(req,res)=>{
  const origin=safeOrigin(req);
  res.type('text/plain');
  res.setHeader('Cache-Control','public, max-age=3600');
  res.send([
    'User-agent: OAI-SearchBot',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /dashboard',
    'Disallow: /professionals',
    'Disallow: /professional-requests',
    'Disallow: /profile',
    'Disallow: /wallet',
    'Disallow: /membership',
    'Disallow: /notifications',
    'Disallow: /purchased-leads',
    'Disallow: /my-leads',
    'Disallow: /investment/',
    'Disallow: /lead-partner/',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /dashboard',
    'Disallow: /professionals',
    'Disallow: /professional-requests',
    'Disallow: /profile',
    'Disallow: /wallet',
    'Disallow: /membership',
    'Disallow: /notifications',
    'Disallow: /purchased-leads',
    'Disallow: /my-leads',
    'Disallow: /investment/',
    'Disallow: /lead-partner/',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /dashboard',
    'Disallow: /professionals',
    'Disallow: /professional-requests',
    'Disallow: /profile',
    'Disallow: /wallet',
    'Disallow: /membership',
    'Disallow: /notifications',
    'Disallow: /purchased-leads',
    'Disallow: /my-leads',
    'Disallow: /investment/',
    'Disallow: /lead-partner/',
    '',
    'Sitemap: '+origin+'/sitemap.xml',
    'Sitemap: '+origin+'/video-sitemap.xml',
    ''
  ].join('\n'));
});

router.get('/sitemap.xml',async(req,res)=>{
  const origin=safeOrigin(req);
  let projects=[];
  let officialProfiles=[];
  let independentProfiles=[];
  try{
    projects=await publicExpertService.listIndexableProjectPaths();
    officialProfiles=await publicExpertService.listIndexableOfficialProfiles();
    independentProfiles=await publicExpertService.listIndexableIndependentProfiles();
  }catch(error){
    // A temporary database outage must not make the static site sitemap fail.
    console.error('Public project sitemap lookup failed:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
  }
  const body=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_PATHS.map(path=>'  <url><loc>'+xmlEscape(origin+(path==='/'?'/':path))+'</loc></url>'),
    ...officialProfiles.map(profile=>'  <url><loc>'+xmlEscape(origin+profile.path)+'</loc>'+ (profile.lastmod?'<lastmod>'+xmlEscape(profile.lastmod)+'</lastmod>':'')+'</url>'),
    ...independentProfiles.map(profile=>'  <url><loc>'+xmlEscape(origin+profile.path)+'</loc>'+ (profile.lastmod?'<lastmod>'+xmlEscape(profile.lastmod)+'</lastmod>':'')+'</url>'),
    ...projects.map(project=>'  <url><loc>'+xmlEscape(origin+project.path)+'</loc>'+
      (project.lastmod?'<lastmod>'+xmlEscape(project.lastmod)+'</lastmod>':'')+'</url>'),
    '</urlset>',
    ''
  ].join('\n');
  // Set the XML media type explicitly so shared hosting/proxy layers do not
  // let Express or a static fallback label this response as HTML or plain text.
  res.setHeader('Content-Type','application/xml; charset=utf-8');
  if(!res.getHeader('Cache-Control'))res.setHeader('Cache-Control','public, max-age=3600');
  res.status(200).send(body);
});

// Google's video sitemap points only to publicly eligible video watch pages,
// their authentic video-derived JPEG frames and stable processed playback URLs.
// No original R2 object references or user contact data are listed.
router.get('/video-sitemap.xml',async(req,res)=>{
  const origin=safeOrigin(req);
  let videos;
  try{
    videos=await publicExpertService.listIndexableVideoEntries();
  }catch(error){
    console.error('Video sitemap lookup failed:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Retry-After','30');
    return res.status(503).type('text/plain').send('Video sitemap temporarily unavailable');
  }
  const body=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    ...videos.map(entry=>{
      const video=entry.video;
      const duration=Number(video.duration?.match(/^PT(\d+)S$/)?.[1]);
      return [
        '  <url>',
        '    <loc>'+xmlEscape(origin+entry.path)+'</loc>',
        ...(entry.lastmod?['    <lastmod>'+xmlEscape(entry.lastmod)+'</lastmod>']:[]),
        '    <video:video>',
        '      <video:thumbnail_loc>'+xmlEscape(video.thumbnailUrl)+'</video:thumbnail_loc>',
        '      <video:title>'+xmlEscape(video.name)+'</video:title>',
        '      <video:description>'+xmlEscape(video.description)+'</video:description>',
        '      <video:content_loc>'+xmlEscape(video.contentUrl)+'</video:content_loc>',
        '      <video:publication_date>'+xmlEscape(video.uploadDate)+'</video:publication_date>',
        ...(Number.isInteger(duration)&&duration>0&&duration<=28800
          ?['      <video:duration>'+duration+'</video:duration>']:[]),
        '    </video:video>',
        '  </url>',
      ].join('\n');
    }),
    '</urlset>',
    '',
  ].join('\n');
  res.type('application/xml');
  res.setHeader('Cache-Control','public, max-age=900');
  return res.send(body);
});

// Stable publicly eligible cover URLs replace short-lived R2 presigned URLs
// in social previews. A hidden/unpublished project always returns 404.
router.get('/project-cover/:projectKey',async(req,res)=>{
  const value=String(req.params.projectKey||'').trim();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)||value.length>100){
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(404).type('text/plain').send('Cover unavailable');
  }
  const match=/^project-([1-9]\d*)$/.exec(value);
  try{
    const project=await publicExpertService.getPublicProject(match?match[1]:value,{materializeMedia:false});
    const photo=coverService.selectCover(project);
    if(!photo){
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-Robots-Tag','noindex');
      return res.status(404).type('text/plain').send('Cover unavailable');
    }
    const {buffer,contentType}=await coverService.readCover(photo);
    res.setHeader('Cache-Control','public, max-age=300');
    res.setHeader('X-Content-Type-Options','nosniff');
    return res.status(200).type(contentType).send(buffer);
  }catch(error){
    if(error?.code==='COVER_NOT_FOUND'||error?.providerStatus===404||error?.code==='ENOENT'){
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-Robots-Tag','noindex');
      return res.status(404).type('text/plain').send('Cover unavailable');
    }
    console.error('Project cover unavailable:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(503).type('text/plain').send('Project cover temporarily unavailable');
  }
});

// Expose only the JPEG frame generated from an approved-for-public-playback
// derivative. Original uploaded video and private R2 keys are never revealed.
router.get('/project-video-thumbnail/:projectKey',async(req,res)=>{
  const key=String(req.params.projectKey||'');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)||key.length>100){
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(404).end();
  }
  const match=/^project-([1-9]\d*)$/.exec(key);
  try{
    const project=await publicExpertService.getPublicProject(match?match[1]:key,{materializeMedia:false});
    if(!videoSeo.thumbnailPath(project)){
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-Robots-Tag','noindex');
      return res.status(404).end();
    }
    const image=await videoSeo.readThumbnail(project);
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Content-Length',String(image.length));
    res.setHeader('Cache-Control','public,max-age=300');
    return res.status(200).send(image);
  }catch(error){
    if(error?.providerStatus===404)return res.status(404).end();
    console.error('Public video thumbnail failed:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Retry-After','30');
    return res.status(503).end();
  }
});

// Stable media URL for video search engines. Each request redirects to a short-
// lived signed *playback derivative*, never to the private original upload.
// Range and seek requests are passed directly to R2 after the redirect.
router.get('/project-video-stream/:projectKey.mp4',async(req,res)=>{
  const key=String(req.params.projectKey||'');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)||key.length>100){
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(404).end();
  }
  const match=/^project-([1-9]\d*)$/.exec(key);
  try{
    const project=await publicExpertService.getPublicProject(match?match[1]:key,{materializeMedia:false});
    const derivativeKey=videoSeo.playbackReference(project);
    if(!derivativeKey){
      res.setHeader('Cache-Control','no-store');
      return res.status(404).end();
    }
    const signed=await s3Storage.getMediaGetUrl(derivativeKey,{expiresSeconds:600});
    res.setHeader('Cache-Control','no-store');
    return res.redirect(302,signed);
  }catch(error){
    console.error('Public project video redirect failed:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
    return res.status(503).end();
  }
});

// The portfolio index must expose discoverable <a href> links to actual
// published videos on the initial HTML response, without JavaScript execution.
router.get('/projects',async(req,res)=>{
  const accept=String(req.get('accept')||'');
  if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))
    return res.status(406).end();
  try{
    const items=await publicExpertService.listRecentProjects({page:1,pageSize:18,materializeMedia:false});
    const builtIndex=[
      path.resolve(__dirname,'../../hostinger-frontend/index.html'),
      path.resolve(__dirname,'../../../frontend/dist/index.html'),
    ].find(file=>fs.existsSync(file));
    if(!builtIndex)throw new Error('Published project gallery HTML template missing');
    const html=renderProjectListingHtml(fs.readFileSync(builtIndex,'utf8'),items.data);
    res.setHeader('Cache-Control','no-cache,must-revalidate');
    return res.status(200).type('html').send(html);
  }catch(error){
    console.error('Crawlable project gallery unavailable:',error?.message||error);
    res.setHeader('X-Robots-Tag','noindex');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Retry-After','30');
    return res.status(503).type('text/plain').send('Project gallery temporarily unavailable');
  }
});

// Initial project HTML contains the actual published case study and JSON-LD.
// User-facing React navigation still hydrates the same page with photos/videos.
router.get('/projects/:projectKey',async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
  const accept=String(req.get('accept')||'');
  if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))
    return res.status(406).end();
  const key=String(req.params.projectKey||'').trim();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)||key.length>100){
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(404).type('text/plain').send('Project not found');
  }
  const idMatch=/^project-([1-9]\d*)$/.exec(key);
  try{
    const project=await publicExpertService.getPublicProject(idMatch?idMatch[1]:key,{materializeMedia:false});
    if(!project){
      res.setHeader('X-Robots-Tag','noindex');
      res.setHeader('Cache-Control','no-store');
      return res.status(404).type('text/plain').send('Published project not found');
    }
    const builtIndex=[
      path.resolve(__dirname,'../../hostinger-frontend/index.html'),
      path.resolve(__dirname,'../../../frontend/dist/index.html'),
    ].find(file=>fs.existsSync(file));
    if(!builtIndex){
      res.setHeader('Retry-After','10');
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-Robots-Tag','noindex');
      return res.status(503).type('text/plain').send('Project page is temporarily unavailable');
    }
    const {html,path:canonicalPath}=renderProjectHtml(fs.readFileSync(builtIndex,'utf8'),project);
    if(req.path!==canonicalPath)return res.redirect(301,canonicalPath);
    res.setHeader('Cache-Control','no-cache, must-revalidate');
    return res.status(200).type('html').send(html);
  }catch(error){
    console.error('Crawlable project page failed:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex');
    res.setHeader('Retry-After','30');
    return res.status(503).type('text/plain').send('Project page temporarily unavailable');
  }
});


// Directory crawlers receive real public profile links without executing React.
router.get('/experts',async(req,res)=>{
  const accept=String(req.get('accept')||'');
  if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))
    return res.status(406).end();
  try{
    const profiles=await publicExpertService.listPublicExperts({page:1,pageSize:48});
    const builtIndex=[
      path.resolve(__dirname,'../../hostinger-frontend/index.html'),
      path.resolve(__dirname,'../../../frontend/dist/index.html'),
    ].find(file=>fs.existsSync(file));
    if(!builtIndex)throw new Error('Public professional directory HTML template missing');
    const html=renderProfessionalDirectoryHtml(fs.readFileSync(builtIndex,'utf8'),profiles.data);
    res.setHeader('Cache-Control','no-cache,must-revalidate');
    return res.status(200).type('html').send(html);
  }catch(error){
    console.error('Public professional directory crawl failed:',error?.message||error);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex');
    res.setHeader('Retry-After','30');
    return res.status(503).type('text/plain').send('Professional directory temporarily unavailable');
  }
});

// Public professional profiles must be returned as business-specific initial
// HTML, not the generic React shell. Exclude private/hidden or ineligible ones.
router.get('/experts/:expertId',async(req,res)=>{
  const key=String(req.params.expertId||'');
  if(!/^[1-9]\d*$/.test(key)){
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(404).type('text/plain').send('Professional not found');
  }
  try{
    const profile=await publicExpertService.getPublicExpert(key);
    if(!profile){
      res.setHeader('X-Robots-Tag','noindex');
      res.setHeader('Cache-Control','no-store');
      return res.status(404).type('text/plain').send('Public professional profile not found');
    }
    const builtIndex=[
      path.resolve(__dirname,'../../hostinger-frontend/index.html'),
      path.resolve(__dirname,'../../../frontend/dist/index.html'),
    ].find(file=>fs.existsSync(file));
    if(!builtIndex){
      res.setHeader('Retry-After','10');
      res.setHeader('X-Robots-Tag','noindex');
      return res.status(503).type('text/plain').send('Professional profile temporarily unavailable');
    }
    const {html}=renderPublicExpertHtml(fs.readFileSync(builtIndex,'utf8'),profile);
    res.setHeader('Cache-Control','no-cache,must-revalidate');
    return res.status(200).type('html').send(html);
  }catch(error){
    console.error('Professional SEO page unavailable:',error?.message||error);
    res.setHeader('Retry-After','30');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex');
    return res.status(503).type('text/plain').send('Professional profile temporarily unavailable');
  }
});

router.resolveSeoOrigin=safeOrigin;
module.exports=router;
