// Search-friendly server HTML for the public professionals directory. Only
// records passing the same visibility filters as the public API are linked.
const {escapeHtml}=require('./projectSeoPageService');
const SITE='https://propulsetechnologies.online';
const title='Construction & Interior Professionals in Hyderabad | ProPulse';
const description='Explore published construction and interior professionals, their real project work, services and areas served. ProPulse direct services are clearly identified.';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
function professionalDirectoryCards(profiles=[]){
  const cards=[],items=[];
  for(const profile of profiles){
    const id=Number(profile.business_profile_id);
    if(!Number.isSafeInteger(id)||id<1)continue;
    const name=clean(profile.business_name).slice(0,160);
    if(!name)continue;
    const location=[...new Set((profile.locations||[]).map(x=>clean(x.cityName)).filter(Boolean))].slice(0,3);
    const services=[...new Set((profile.services||[]).map(x=>clean(x.subserviceName||x.serviceName)).filter(Boolean))].slice(0,4);
    const isOfficial=profile.is_official===true;
    const href='/experts/'+id;
    cards.push('<article><h2><a href="'+href+'">'+escapeHtml(name)+'</a></h2>'+
      '<p>'+escapeHtml(isOfficial?'Official ProPulse construction and interior execution':'Independent marketplace professional')+'</p>'+
      (services.length?'<p>Services: '+escapeHtml(services.join(' · '))+'</p>':'')+
      (location.length?'<p>Service areas: '+escapeHtml(location.join(', '))+'</p>':'')+
      '<p><a href="'+href+'">View published professional profile</a></p></article>');
    items.push({'@type':'ListItem',position:items.length+1,url:SITE+href,name});
  }
  return {html:cards.join(''),items};
}
function renderProfessionalDirectoryHtml(template,profiles=[]){
  if(typeof template!=='string'||!template.includes('<div id="root">')||!template.includes('</head>'))
    throw new Error('Built frontend HTML template is not ready');
  const {html:cards,items}=professionalDirectoryCards(profiles);
  const canonical=SITE+'/experts';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage',url:canonical,name:title,description,inLanguage:'en-IN'},
    {'@type':'ItemList',name:'Public ProPulse professional profiles',itemListElement:items},
  ]};
  const htmlBody='<main data-seo-professionals-directory="true" style="max-width:1100px;margin:auto;padding:36px 22px;font:16px/1.6 system-ui,Arial,sans-serif;color:#263e4c">'+
    '<nav aria-label="Breadcrumb"><a href="/">Home</a> / Professionals</nav>'+
    '<h1>Construction & Interior Professionals in Hyderabad</h1>'+
    '<p>Explore construction and interior businesses listed on ProPulse. Official ProPulse execution is marked separately from independent marketplace professionals.</p>'+
    (items.length?'<section aria-label="Public professionals">'+cards+'</section>':'<p>No public professionals are currently listed.</p>')+
    '<p><a href="/projects">Watch completed project videos</a> · <a href="/contact#direct-project">Contact ProPulse for direct execution</a></p></main>';
  let html=template.replace(/<title>[^<]*<\/title>/i,'<title>'+escapeHtml(title)+'</title>');
  for(const [attr,key,value] of [
    ['name','description',description],['name','robots','index,follow,max-image-preview:large'],
    ['name','googlebot','index,follow,max-image-preview:large'],
    ['property','og:title',title],['property','og:description',description],
    ['property','og:url',canonical],['name','twitter:title',title],['name','twitter:description',description],
  ]){
    html=html.replace(new RegExp('<meta\\b[^>]*'+attr+'=["\\x27]'+key+'["\\x27][^>]*>','gi'),'');
    html=html.replace('</head>','<meta '+attr+'="'+key+'" content="'+escapeHtml(value)+'">\n</head>');
  }
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'');
  html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace('</head>','<link rel="canonical" href="'+canonical+'">\n'+
    '<script type="application/ld+json" data-propulse-directory-seo="server">'+safeJson(graph)+'</script>\n</head>');
  const start=html.indexOf('<div id="root">'),bodyEnd=html.indexOf('</body>',start);
  const end=bodyEnd<0?-1:html.lastIndexOf('</div>',bodyEnd);
  if(start<0||end<=start||!/^\s*(?:<script\b[^>]*>[\s\S]*?<\/script>\s*)*$/.test(html.slice(end+6,bodyEnd)))
    throw new Error('Unexpected public professionals HTML root boundary');
  return html.slice(0,start)+'<div id="root">'+htmlBody+'</div>'+html.slice(end+6);
}
module.exports={professionalDirectoryCards,renderProfessionalDirectoryHtml};
