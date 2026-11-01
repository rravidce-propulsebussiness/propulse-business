// Initial HTML for professional detail URLs; strictly public fields only.
const {escapeHtml}=require('./projectSeoPageService');
const {shorten}=require('./projectSeoDefaults');
const SITE='https://propulsetechnologies.online';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const safeJson=obj=>JSON.stringify(obj).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const unique=items=>[...new Set(items.filter(Boolean))];
function publicProfilePath(profile){
  const id=Number(profile?.business_profile_id);
  if(!Number.isSafeInteger(id)||id<1)throw new Error('Public professional needs a valid profile ID');
  return '/experts/'+id;
}
function titleFor(profile){
  if(profile.is_official===true)return 'ProPulse Construction & Interior Design Services in Hyderabad | ProPulse';
  return shorten(clean(profile.business_name)+' | Construction & Interior Professional | ProPulse',85);
}
function descriptionFor(profile){
  const summary=clean(profile.public_summary).replace(/[*#_]/g,'');
  if(summary)return shorten(summary,158);
  return shorten(clean(profile.business_name)+' offers the listed construction and interior services. View public projects, service areas and packages on ProPulse.',158);
}
function renderPublicExpertHtml(template,profile){
  if(typeof template!=='string'||!template.includes('<div id="root">')||!template.includes('</head>'))
    throw new Error('Built frontend HTML template is not ready');
  const route=publicProfilePath(profile),canonical=SITE+route;
  const name=clean(profile.business_name).slice(0,180);
  if(!name)throw new Error('Public professional has no name');
  const official=profile.is_official===true;
  const title=titleFor(profile),description=descriptionFor(profile);
  const services=unique((profile.services||[]).map(row=>clean(row.subserviceName||row.serviceName))).slice(0,25);
  const cities=unique((profile.locations||[]).map(row=>clean(row.cityName))).slice(0,25);
  const projects=(profile.projects||[]).filter(project=>project.id&&project.title).slice(0,12).map(project=>{
    const slug=clean(project.seo_slug);
    const link='/projects/'+(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=100?slug:'project-'+project.id);
    return '<li><a href="'+escapeHtml(link)+'">'+escapeHtml(clean(project.title).slice(0,180))+'</a></li>';
  }).join('');
  const cta=official
    ?'<a href="/contact#direct-project">Request construction or interior execution directly from ProPulse</a>'
    :'<a href="'+route+'#callback">Request a callback through the marketplace</a>';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':canonical+'#webpage',name:title,url:canonical,description,inLanguage:'en-IN',mainEntity:{'@id':canonical+'#business'}},
    {'@type':official?'HomeAndConstructionBusiness':'Organization','@id':canonical+'#business',name,description,url:canonical,
      ...(official?{logo:SITE+'/brand/propulse-logo.png'}:{}),
      ...(cities.length?{areaServed:cities.map(city=>({'@type':'City',name:city}))}:{})},
    {'@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},
      {'@type':'ListItem',position:2,name:'Professionals',item:SITE+'/experts'},
      {'@type':'ListItem',position:3,name,item:canonical},
    ]},
  ]};
  const list=(items,heading)=>items.length?'<section><h2>'+heading+'</h2><ul>'+items.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul></section>':'';
  const summary=clean(profile.public_summary).replace(/[*#_]/g,'').slice(0,2200);
  const body='<main data-seo-expert-fallback="true" style="max-width:1050px;margin:auto;padding:36px 22px;font:16px/1.6 system-ui,Arial,sans-serif;color:#263e4c">'+
    '<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/experts">Professionals</a> / '+escapeHtml(name)+'</nav>'+
    '<article><header><p style="color:#c95628;font-weight:700">'+(official?'OFFICIAL PROPULSE — DIRECT CONSTRUCTION & INTERIORS':'INDEPENDENT PROPULSE MARKETPLACE PROFESSIONAL')+'</p>'+
    (official?'<img src="/brand/propulse-logo.png" alt="ProPulse logo" width="72" height="72">':'')+
    '<h1>'+escapeHtml(name)+'</h1><p>'+escapeHtml(description)+'</p></header>'+
    (summary?'<section><h2>About '+escapeHtml(name)+'</h2><p>'+escapeHtml(summary)+'</p></section>':'')+
    list(services,'Construction and interior services')+list(cities,'Published service areas')+
    (projects?'<section><h2>Completed projects</h2><ul>'+projects+'</ul></section>':'')+
    '<p>'+cta+'</p><p><a href="/projects">Browse completed project videos</a></p></article></main>';
  let html=template.replace(/<title>[^<]*<\/title>/i,'<title>'+escapeHtml(title)+'</title>');
  for(const [attr,key,value] of [
    ['name','description',description],['name','robots','index,follow,max-image-preview:large'],
    ['name','googlebot','index,follow,max-image-preview:large'],
    ['property','og:title',title],['property','og:description',description],
    ['property','og:url',canonical],['property','og:type','profile'],
    ['property','og:image',SITE+'/brand/propulse-logo.png'],
    ['name','twitter:title',title],['name','twitter:description',description],
  ]){
    html=html.replace(new RegExp('<meta\\b[^>]*'+attr+'=["\\x27]'+key+'["\\x27][^>]*>','gi'),'');
    html=html.replace('</head>','<meta '+attr+'="'+key+'" content="'+escapeHtml(value)+'">\n</head>');
  }
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'');
  html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace('</head>','<link rel="canonical" href="'+escapeHtml(canonical)+'">\n'+
    '<script type="application/ld+json" data-propulse-expert-seo="server">'+safeJson(graph)+'</script>\n</head>');
  const start=html.indexOf('<div id="root">'),bodyEnd=html.indexOf('</body>',start);
  const end=bodyEnd<0?-1:html.lastIndexOf('</div>',bodyEnd);
  if(start<0||end<=start||!/^\s*(?:<script\b[^>]*>[\s\S]*?<\/script>\s*)*$/.test(html.slice(end+6,bodyEnd)))
    throw new Error('Unexpected professional HTML root boundary');
  html=html.slice(0,start)+'<div id="root">'+body+'</div>'+html.slice(end+6);
  return {html,path:route,canonical};
}
module.exports={renderPublicExpertHtml,publicProfilePath,titleFor,descriptionFor};
