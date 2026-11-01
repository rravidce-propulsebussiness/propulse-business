// Public video-first portfolio gallery for HTML crawlers. React retains the
// interactive gallery after hydration; no authenticated/media storage values
// are embedded in the initial response.
const {canonicalProjectPath,escapeHtml}=require('./projectSeoPageService');
const videoSeo=require('./projectVideoSeoService');
const SITE='https://propulsetechnologies.online';
const title='Completed Construction & Interior Project Videos in Hyderabad | ProPulse';
const description='Watch completed home construction and interior design project videos by ProPulse and eligible independent professionals in Hyderabad. Explore actual execution, locations and project details.';
const text=(value,max=300)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
const jsonSafe=obj=>JSON.stringify(obj).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');

function projectCards(items){
  const cards=[];
  const entries=[];
  for(const item of items){
    const link=canonicalProjectPath(item);
    const name=text(item.title,180);
    if(!name)continue;
    const location=text(item.location_text,180);
    const isOfficial=item.is_official===true;
    const image=videoSeo.thumbnailPath(item);
    const label=isOfficial?'Completed ProPulse project':'Independent professional project';
    cards.push(
      '<article style="border:1px solid #dce3e7;border-radius:14px;overflow:hidden;background:white">'+
      '<a href="'+escapeHtml(link)+'" style="display:block;padding:18px;color:#243f50;text-decoration:none" aria-label="'+escapeHtml('Watch '+name)+'">'+
      (image?'<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(name+' completed-project video thumbnail')+
        '" width="480" height="270" loading="lazy" style="width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:9px">':'')+
      '<p style="font-size:12px;color:#b24c27;font-weight:700">'+label+'</p>'+
      '<h2 style="font-size:20px;margin:8px 0">'+escapeHtml(name)+'</h2>'+
      (location?'<p>Location: '+escapeHtml(location)+'</p>':'')+
      '<p>Watch completed project video and explore the details.</p></a>'+
      (isOfficial&&item.public_profile_enabled!==false&&Number.isSafeInteger(Number(item.business_profile_id))&&Number(item.business_profile_id)>0
        ?'<p style="margin:0;padding:0 18px 18px"><a href="/experts/'+Number(item.business_profile_id)+'">View official ProPulse professional profile</a></p>':'')+
      '</article>'
    );
    entries.push({'@type':'ListItem',position:entries.length+1,
      url:SITE+link,name});
  }
  return {cards:cards.join(''),entries};
}
function renderProjectListingHtml(template,projects=[]){
  if(typeof template!=='string'||!template.includes('<div id="root">')||!template.includes('</head>')){
    throw new Error('Published frontend HTML template missing');
  }
  const {cards,entries}=projectCards(Array.isArray(projects)?projects:[]);
  const body='<main data-seo-project-gallery="true" style="background:#f8fafb;min-height:70vh;padding:40px 20px;color:#263e4c;font:16px/1.55 system-ui,sans-serif">'+
    '<div style="max-width:1100px;margin:auto"><nav aria-label="Breadcrumb"><a href="/">Home</a> / Completed projects</nav>'+
    '<h1 style="font-size:clamp(27px,4vw,43px)">Completed Construction &amp; Interior Project Videos</h1>'+
    '<p>Watch real completed home construction and interior execution videos from ProPulse and eligible independent professionals. Videos are the primary project content; no project photograph upload is required.</p>'+
    (entries.length?'<section aria-label="Published completed projects" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px;margin:30px 0">'+cards+'</section>':
      '<p>No completed projects are currently published.</p>')+
    '<p><a href="/contact#direct-project">Request construction or interior services directly from ProPulse</a></p>'+
    '</div></main>';
  const canonical=SITE+'/projects';
  const seoGraph={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage',name:title,url:canonical,description,inLanguage:'en-IN',
      isPartOf:{'@type':'WebSite',name:'ProPulse',url:SITE+'/'}},
    {'@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},
      {'@type':'ListItem',position:2,name:'Completed projects',item:canonical}]},
    {'@type':'ItemList',name:'Published completed projects',itemListElement:entries}
  ]};
  let html=template.replace(/<title>[^<]*<\/title>/i,'<title>'+escapeHtml(title)+'</title>');
  html=html.replace(/<meta\b[^>]*name=["']description["'][^>]*>/gi,'');
  html=html.replace(/<meta\b[^>]*property=["']og:(title|description|url)["'][^>]*>/gi,'');
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'');
  html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace('</head>',
    '<meta name="description" content="'+escapeHtml(description)+'">'+
    '<meta property="og:title" content="'+escapeHtml(title)+'">'+
    '<meta property="og:description" content="'+escapeHtml(description)+'">'+
    '<meta property="og:url" content="'+canonical+'">'+
    '<link rel="canonical" href="'+canonical+'">'+
    '<script type="application/ld+json" data-propulse-project-gallery-seo="server">'+jsonSafe(seoGraph)+'</script>'+
    '</head>');
  const start=html.indexOf('<div id="root">');
  const bodyEnd=html.indexOf('</body>',start);
  const end=bodyEnd<0?-1:html.lastIndexOf('</div>',bodyEnd);
  if(start<0||end<=start||
    !/^\s*(?:<script\b[^>]*>[\s\S]*?<\/script>\s*)*$/.test(html.slice(end+6,bodyEnd))){
    throw new Error('Unexpected published HTML root boundary');
  }
  return html.slice(0,start)+'<div id="root">'+body+'</div>'+html.slice(end+6);
}
module.exports={renderProjectListingHtml,projectCards};
