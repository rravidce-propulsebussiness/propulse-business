// Server-rendered crawlable project case study. React replaces the fallback on hydration.
// Data comes exclusively from the published, public-project service; no private media URLs
// or customer contact records are embedded here.
const SITE_ORIGIN='https://propulsetechnologies.online';
const {coverPathFor}=require('./projectCoverService');
const videoSeo=require('./projectVideoSeoService');
const PROJECT_PREFIX='/projects/';
const META_DESCRIPTION_LENGTH=180;
const safeText=(value,max=3000)=>String(value??'').trim().slice(0,max);
const escapeHtml=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const safeJson=(data)=>JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  .replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

function canonicalProjectPath(project){
  const slug=safeText(project.seo_slug,100);
  if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return PROJECT_PREFIX+slug;
  const id=Number(project.project_id??project.id);
  if(!Number.isSafeInteger(id)||id<1)throw new Error('Published project has no valid public ID');
  return PROJECT_PREFIX+'project-'+id;
}
function descriptionFor(project){
  const text=safeText(project.seo_description||project.description,3000)
    .replace(/\s+/g,' ');
  if(text)return text.slice(0,META_DESCRIPTION_LENGTH);
  return 'Explore this completed '+safeText(project.project_type||'construction or interior',90)+
    ' project'+(project.location_text?' in '+safeText(project.location_text,120):'')+
    ', with project scope and published work by '+safeText(project.business_name||'ProPulse',90)+'.';
}
function meta(html,attribute,key,value){
  const target='<meta '+attribute+'="'+key+'" content="'+escapeHtml(value)+'" />';
  const regex=new RegExp('<meta\\s+[^>]*\\b'+attribute+'=["\\x27]'+key+'["\\x27][^>]*>','gi');
  const matches=html.match(regex)||[];
  if(matches.length)return html.replace(regex,(match,offset)=>offset===html.search(regex)?target:'');
  return html.replace('</head>','  '+target+'\n</head>');
}
function fallback(project,path){
  const title=escapeHtml(safeText(project.title,180));
  const publishedBy=escapeHtml(safeText(project.business_name||'ProPulse',180));
  const location=safeText(project.location_text,180);
  const area=safeText(project.area_text,120);
  const type=safeText(project.project_type,120);
  const year=Number(project.completion_year);
  const desc=escapeHtml(safeText(project.description||project.seo_description,3000));
  const short=escapeHtml(descriptionFor(project));
  const facts=[
    type?'<li><strong>Project type:</strong> '+escapeHtml(type)+'</li>':'',
    location?'<li><strong>Location:</strong> '+escapeHtml(location)+'</li>':'',
    Number.isInteger(year)?'<li><strong>Completed:</strong> '+year+'</li>':'',
    area?'<li><strong>Area:</strong> '+escapeHtml(area)+'</li>':'',
    '<li><strong>Published by:</strong> '+publishedBy+'</li>',
  ].filter(Boolean).join('');
  const official=project.is_official===true;
  const videoPath=videoSeo.contentPath(project);
  const videoPoster=videoSeo.thumbnailPath(project);
  const video=videoPath?'<figure style="margin:20px 0"><video controls playsinline preload="metadata"'+
      (videoPoster?' poster="'+escapeHtml(videoPoster)+'"':'')+
      ' src="'+escapeHtml(videoPath)+'" style="width:100%;height:auto;max-width:1000px">'+
      'Your browser cannot play this project video. <a href="'+escapeHtml(videoPath)+'">Watch the completed project video</a>'+
      '</video></figure>':'';
  const photoPath=coverPathFor(project);
  const photo=photoPath?'<figure style="margin:20px 0"><img src="'+escapeHtml(photoPath)+'" alt="'+title+' completed project photograph" style="width:100%;height:auto;max-width:1000px"></figure>':'';
  const contact=official
    ?'<a href="/contact#direct-project">Request construction or interior services directly from ProPulse</a>'
    :'<a href="/experts">Compare independent construction and interior professionals</a>';
  const budget=project.budget_text?'<p><strong>Reported project budget:</strong> '+escapeHtml(safeText(project.budget_text,120))+'</p>':'';
  return '<main data-seo-project-fallback="true" style="max-width:1050px;margin:auto;padding:36px 22px;font:16px/1.6 system-ui,Arial,sans-serif;color:#263e4c">'+
    '<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/projects">Completed projects</a> / '+title+'</nav>'+
    '<article><header><p style="color:#c95628;font-weight:700">'+(official?'OFFICIAL PROPULSE COMPLETED PROJECT':'PUBLISHED PROFESSIONAL PROJECT')+'</p>'+
    '<h1 style="font-size:clamp(26px,4vw,44px);line-height:1.14">'+title+'</h1>'+
    '<p>'+short+'</p>'+video+(video?'':photo)+'</header><section aria-label="Project facts"><h2>Project overview</h2><ul>'+facts+'</ul>'+budget+'</section>'+
    (desc?'<section><h2>About this completed project</h2><p style="white-space:pre-line">'+desc+'</p></section>':'')+
    '<section><h2>Explore a similar project</h2><p>'+contact+'</p><p><a href="/projects">View more completed projects</a></p></section>'+
    '</article></main>';
}
function projectSchema(project,canonical,description,coverImageUrl=null){
  const name=safeText(project.seo_title||project.title,180);
  const publishedBy=safeText(project.business_name||'ProPulse',180);
  const location=safeText(project.location_text,180);
  const work={
    '@type':'CreativeWork',name,url:canonical,description,
    ...(coverImageUrl?{image:coverImageUrl}:{}),
    author:{'@type':'Organization',name:publishedBy},
    ...(location?{contentLocation:{'@type':'Place',name:location}}:{}),
    ...(project.project_type?{about:safeText(project.project_type,120)}:{}),
    ...(project.published_at&&!Number.isNaN(new Date(project.published_at).getTime())
      ?{datePublished:new Date(project.published_at).toISOString().slice(0,10)}:{}),
  };
  const crumbs=[
    {'@type':'ListItem',position:1,name:'Home',item:SITE_ORIGIN+'/'},
    {'@type':'ListItem',position:2,name:'Completed projects',item:SITE_ORIGIN+'/projects'},
    {'@type':'ListItem',position:3,name,item:canonical},
  ];
  return {'@context':'https://schema.org','@graph':[
    {'@type':'Organization','@id':SITE_ORIGIN+'/#organization',name:'ProPulse',url:SITE_ORIGIN+'/',logo:SITE_ORIGIN+'/brand/propulse-logo.png'},
    {'@type':'WebPage','@id':canonical+'#webpage',name,url:canonical,description,inLanguage:'en-IN',
      isPartOf:{'@type':'WebSite',name:'ProPulse',url:SITE_ORIGIN+'/'},
      mainEntity:{'@id':canonical+'#project'}},
    {'@id':canonical+'#project',...work},
    {'@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:crumbs},
    ...(videoSeo.videoObject(project)?[videoSeo.videoObject(project)]:[]),
  ]};
}
function renderProjectHtml(template,project){
  if(typeof template!=='string'||!template.includes('<div id="root">')||!template.includes('</head>'))
    throw new Error('Built frontend HTML template is not ready');
  const path=canonicalProjectPath(project);
  const canonical=SITE_ORIGIN+path;
  const name=safeText(project.seo_title||project.title,180);
  const title=name+' | ProPulse';
  const description=descriptionFor(project);
  const coverPath=coverPathFor(project);
  const thumbPath=videoSeo.thumbnailPath(project);
  const imageUrl=thumbPath?SITE_ORIGIN+thumbPath:coverPath?SITE_ORIGIN+coverPath:SITE_ORIGIN+'/brand/propulse-logo.png';
  let html=template.replace(/<title>[^<]*<\/title>/i,'<title>'+escapeHtml(title)+'</title>');
  html=meta(html,'name','description',description);
  html=meta(html,'name','robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  html=meta(html,'name','googlebot','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  html=meta(html,'name','twitter:title',title);
  html=meta(html,'name','twitter:description',description);
  html=meta(html,'name','twitter:card',(thumbPath||coverPath)?'summary_large_image':'summary');
  html=meta(html,'name','twitter:image',imageUrl);
  html=meta(html,'name','twitter:image:alt',thumbPath?name+' - video thumbnail':coverPath?name+' - completed project photograph':'ProPulse logo');
  html=meta(html,'property','og:title',title);
  html=meta(html,'property','og:description',description);
  html=meta(html,'property','og:url',canonical);
  html=meta(html,'property','og:type','article');
  html=meta(html,'property','og:image',imageUrl);
  if(thumbPath)html=meta(html,'property','og:video:image',imageUrl);
  html=meta(html,'property','og:image:alt',thumbPath?name+' - video thumbnail':coverPath?name+' - completed project photograph':'ProPulse logo');
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'');
  html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace('</head>',
    '  <link rel="canonical" href="'+escapeHtml(canonical)+'" />\n'+
    '  <script type="application/ld+json" data-propulse-project-seo="server">'+
      safeJson(projectSchema(project,canonical,description,(thumbPath||coverPath)?imageUrl:null))+'</script>\n</head>');
  // Built home HTML is pre-rendered for SEO. Replace only root fallback,
  // keeping the boot loader, fingerprinted scripts and styles untouched.
  const start=html.indexOf('<div id="root">');
  // Vite puts the hashed module script in <head> in production builds;
  // the source index has it after #root. Neither position can locate
  // the closing root element reliably. The published root is the last
  // closing div before </body> in both layouts.
  const bodyEnd=html.indexOf('</body>',start);
  const end=bodyEnd<0?-1:html.lastIndexOf('</div>',bodyEnd);
  if(start<0||bodyEnd<0||end<=start)throw new Error('Built frontend root boundary is invalid');
  if(!/^\s*$/.test(html.slice(end+6,bodyEnd))&&!/^\s*(?:<script\b[^>]*>[\s\S]*?<\/script>\s*)+$/.test(html.slice(end+6,bodyEnd))){
    throw new Error('Unexpected markup after project root; refusing unsafe HTML replacement');
  }
  html=html.slice(0,start)+'<div id="root">'+fallback(project,path)+'</div>'+html.slice(end+6);
  return {html,path,canonical};
}
module.exports={renderProjectHtml,canonicalProjectPath,descriptionFor,escapeHtml};
