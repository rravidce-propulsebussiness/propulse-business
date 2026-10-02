import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PUBLIC_SEO_ROUTES,SITE_NAME} from '../src/seo/seoConfig.js'
import {HYDERABAD_LOCALITIES,localityBySlug,localityPagePath,nearbyLocalities,serviceBySlug} from '../src/seo/hyderabadSeo.js'
import {CONSTRUCTION_PACKAGE_CATALOG} from '../src/data/constructionPackageCatalog.js'

const here=path.dirname(fileURLToPath(import.meta.url))
const dist=path.resolve(here,'../dist')
const indexPath=path.join(dist,'index.html')
const template=fs.readFileSync(indexPath,'utf8')
const configuredOrigin=String(process.env.VITE_PUBLIC_SITE_URL||'').trim().replace(/\/+$/,'')
const origin=/^https?:\/\//i.test(configuredOrigin)?configuredOrigin:''
const googleSiteVerification=String(process.env.VITE_GOOGLE_SITE_VERIFICATION||'').trim()

function escapeHtml(value=''){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;')
}

function replaceTitle(html,value){
  return html.replace(/<title>[^<]*<\/title>/i,'<title>'+escapeHtml(value)+'</title>')
}

function replaceMeta(html,attribute,key,value){
  const re=new RegExp('<meta\\s+[^>]*'+attribute+'="'+key+'"[^>]*>','i')
  const tag='<meta '+attribute+'="'+escapeHtml(key)+'" content="'+escapeHtml(value)+'">'
  if(re.test(html))return html.replace(re,tag)
  return html.replace('</head>','  '+tag+'\n  </head>')
}

function replaceCanonical(html,value){
  const tag='<link rel="canonical" href="'+escapeHtml(value)+'">'
  if(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html))return html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i,tag)
  return html.replace('</head>','  '+tag+'\n  </head>')
}

function absolute(urlPath){
  return origin?origin+urlPath:urlPath
}

function baseLinks(route){
  const links=[['Home','/'],['Hyderabad','/hyderabad'],['Get Quote','/quote'],['Find Professionals','/experts'],['Packages','/packages'],['Projects','/projects'],['How It Works','/how-it-works'],['About','/about'],['Contact','/contact']]
  if(route.type==='city-service'||route.type==='local-service')links.push(['Compare Hyderabad options','/hyderabad/'+route.serviceSlug+'/compare-options'])
  return links
}

function cityHubContent(route){
  if(route.type!=='city-hub')return ''
  const serviceLinks=['construction','interior-designers','real-estate'].map(serviceBySlug).map(service=>'<li><a href="/hyderabad/'+service.slug+'">'+escapeHtml(service.heading)+'</a></li>').join('')
  const localityLinks=HYDERABAD_LOCALITIES.map(locality=>'<li><a href="'+escapeHtml(localityPagePath('construction',locality.slug))+'">Construction in '+escapeHtml(locality.name)+'</a></li>').join('')
  return '<section style="padding:10px 0 42px"><h2>Hyderabad services</h2><ul>'+serviceLinks+'</ul><p><a href="/hyderabad/construction-cost">House construction cost in Hyderabad</a></p><h2>Construction by Hyderabad locality</h2><ul>'+localityLinks+'</ul></section>'
}

function hyderabadAreas(route){
  if(route.type!=='city-service')return ''
  const service=serviceBySlug(route.serviceSlug)
  if(!service)return ''
  return '<section style="padding:10px 0 42px"><p style="max-width:850px;line-height:1.55">'+escapeHtml(service.citySearchIntent||'')+'</p><h2>'+escapeHtml(service.label)+' across Hyderabad localities</h2><div>'+HYDERABAD_LOCALITIES.map(function(locality){
    const href=service.slug==='construction'?localityPagePath(service.slug,locality.slug):'/hyderabad/'+service.slug+'#'+locality.slug
    return '<article id="'+escapeHtml(locality.slug)+'" style="padding:10px 0"><h3 style="margin-bottom:4px"><a href="'+escapeHtml(href)+'">'+escapeHtml(service.localityHeading(locality.name))+'</a></h3><p style="max-width:850px;line-height:1.55">'+escapeHtml(service.localityText(locality.name))+'</p></article>'
  }).join('')+'</div></section>'
}

function localityContent(route){
  if(route.type!=='local-service')return ''
  const service=serviceBySlug(route.serviceSlug)
  const locality=localityBySlug(route.localitySlug)
  if(!service||!locality)return ''
  const nearby=nearbyLocalities(locality)
  return '<section style="padding:10px 0 42px">'+
    '<h2>Common construction searches around '+escapeHtml(locality.name)+'</h2><ul>'+route.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>'+
    '<h2>What to include in a construction quote request</h2><ul>'+service.checklist.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul>'+
    '<h2>Compare quotations consistently</h2><p style="max-width:850px;line-height:1.55">Use the same site scope, built-up area, floor count, specifications, budget assumptions and timeline when you compare contractors or construction companies.</p>'+
    '<h2>Nearby Hyderabad construction areas</h2><ul>'+nearby.map(item=>'<li><a href="'+escapeHtml(localityPagePath('construction',item.slug))+'">Construction in '+escapeHtml(item.name)+'</a></li>').join('')+'</ul>'+
    '<p><a href="/estimate/construction-cost-estimator">Try the construction estimator</a> · <a href="/quote#construction">Start a construction requirement</a></p>'+
  '</section>'
}


function costGuideContent(route){
  if(route.type!=='cost-guide')return ''
  const packages=Object.values(CONSTRUCTION_PACKAGE_CATALOG)
  const areas=[1000,1500,2000]
  const money=value=>'₹'+Number(value||0).toLocaleString('en-IN')
  const rates='<ul>'+packages.map(item=>'<li><strong>'+escapeHtml(item.name)+': '+escapeHtml(money(item.rate))+'/sq ft</strong> — '+escapeHtml(item.specs?.Architecture||'Package specifications apply.')+'</li>').join('')+'</ul>'
  const examples='<table style="border-collapse:collapse;width:100%;max-width:850px"><thead><tr><th style="text-align:left;padding:8px;border:1px solid #ddd">Built-up area</th>'+packages.map(item=>'<th style="text-align:left;padding:8px;border:1px solid #ddd">'+escapeHtml(item.name)+'</th>').join('')+'</tr></thead><tbody>'+areas.map(area=>'<tr><th style="text-align:left;padding:8px;border:1px solid #ddd">'+area.toLocaleString('en-IN')+' sq ft</th>'+packages.map(item=>'<td style="padding:8px;border:1px solid #ddd">'+escapeHtml(money(area*item.rate))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'
  return '<section style="padding:10px 0 42px">'+
    '<h2>Current ProPulse construction package reference rates</h2><p style="max-width:850px;line-height:1.55">These are ProPulse brochure reference rates for initial planning. They are not a Hyderabad-wide market average or a final contractor quotation.</p>'+rates+
    '<h2>Example built-up-area budgets</h2>'+examples+
    '<h2>What changes the final house construction cost?</h2><ul><li>Soil and foundation requirements</li><li>Number of floors and structural design</li><li>Site access and logistics</li><li>Material and finishing specifications</li><li>Electrical, plumbing and waterproofing scope</li><li>Approvals, external works and package exclusions</li></ul>'+
    '<h2>Common Hyderabad construction cost searches</h2><ul>'+route.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>'+
    '<p><a href="/estimate/construction-cost-estimator">Use the construction estimator</a> · <a href="/packages#construction">Compare construction packages</a> · <a href="/hyderabad/construction/compare-options">Compare construction options</a> · <a href="/quote#construction">Request construction quotes</a></p>'+
  '</section>'
}


function projectsAuthorityContent(route){
  if(route.path!=='/projects')return ''
  const localitySlugs=['kondapur','madhapur','kokapet','manikonda','kukatpally','miyapur','narsingi','tellapur','banjara-hills','jubilee-hills']
  const localityLinks=localitySlugs.map(localityBySlug).filter(Boolean).map(locality=>'<li><a href="'+escapeHtml(localityPagePath('construction',locality.slug))+'">Construction in '+escapeHtml(locality.name)+'</a></li>').join('')
  return '<section style="padding:10px 0 42px">'+
    '<h2>Explore Hyderabad services and construction areas</h2>'+
    '<p style="max-width:850px;line-height:1.55">Use project inspiration as a starting point, then open the relevant Hyderabad planning page to compare scope, cost inputs and locality-specific construction requirements.</p>'+
    '<ul><li><a href="/hyderabad/construction">Home Construction in Hyderabad</a></li><li><a href="/hyderabad/interior-designers">Interior Designers in Hyderabad</a></li><li><a href="/hyderabad/real-estate">Real Estate Services in Hyderabad</a></li><li><a href="/hyderabad/construction-cost">House construction cost in Hyderabad</a></li>'+localityLinks+'</ul>'+
  '</section>'
}


function aboutExperienceContent(route){
  if(route.path!=='/about')return ''
  return '<section style="padding:10px 0 42px">'+
    '<h2>Prior construction and interiors operating experience</h2>'+
    '<p style="max-width:850px;line-height:1.55">Before ProPulse, our operating background included SG Homes in Kukatpally, Hyderabad, across residential construction and interior execution. That practical experience helped shape ProPulse around clearer scopes, comparable quotations, locality-aware requirements and better project conversations.</p>'+
    '<p style="max-width:850px;line-height:1.55">SG Homes is referenced as prior industry experience, not as a current ProPulse subsidiary or marketplace listing.</p>'+
    '<p><a href="https://www.google.com/maps/place/SG+Homes/data=!4m2!3m1!1s0x0:0x71d9e2c71741db9b?sa=X&ved=1t:2428&ictx=111">View SG Homes on Google Maps</a> · <a href="https://in.linkedin.com/company/sghome">View SG Homes on LinkedIn</a></p>'+
  '</section>'
}

function constructionExperienceContent(route){
  if(route.type!=='city-service'||route.serviceSlug!=='construction')return ''
  return '<section style="padding:10px 0 42px">'+
    '<h2>Hyderabad operating background</h2>'+
    '<p style="max-width:850px;line-height:1.55">ProPulse is a technology and requirement platform. Its Hyderabad construction journey is informed by prior operating experience through SG Homes in Kukatpally, including residential construction and interior execution.</p>'+
    '<p><a href="/about#ab-industry-experience">Read the SG Homes experience background</a></p>'+
  '</section>'
}

function comparisonDisclosure(route){
  if(route.type!=='comparison'||!Array.isArray(route.brands))return ''
  const searches=Array.isArray(route.searchTerms)&&route.searchTerms.length?'<h2>Common Hyderabad comparison searches</h2><ul>'+route.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>':''
  return '<section style="padding:10px 0 42px"><h2>Independent comparison note</h2><p style="max-width:850px;line-height:1.55">ProPulse is independent and is not affiliated with or endorsed by '+route.brands.map(escapeHtml).join(', ')+'. Brand names are shown only because customers may be researching these options. Check each provider directly before deciding.</p><p style="max-width:850px;line-height:1.55">'+escapeHtml(route.searchIntent||'')+'</p>'+searches+'</section>'
}

function fallback(route){
  const nav=baseLinks(route).map(item=>'<a href="'+item[1]+'" style="margin-right:14px;color:#173f5e">'+escapeHtml(item[0])+'</a>').join('')
  return '<main data-seo-static-fallback="true" style="font-family:Arial,sans-serif;max-width:1100px;margin:0 auto;padding:32px;color:#173f5e">'+
    '<header style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap"><a href="/" aria-label="'+escapeHtml(SITE_NAME)+' home"><img src="/brand/propulse-logo.svg" alt="'+escapeHtml(SITE_NAME)+'" width="180" height="48"></a><nav aria-label="Primary">'+nav+'</nav></header>'+
    '<section style="padding:72px 0 34px"><p style="font-weight:700;color:#f05b24">PROPULSE BUSINESS</p><h1 style="max-width:850px;font-size:44px;line-height:1.08;margin:12px 0">'+escapeHtml(route.heading)+'</h1><p style="max-width:780px;font-size:18px;line-height:1.6">'+escapeHtml(route.summary)+'</p><p style="max-width:780px;line-height:1.6">'+escapeHtml(route.description)+'</p><p><a href="/quote" style="font-weight:700;color:#d94f22">Start your requirement</a> · <a href="/experts" style="font-weight:700;color:#173f5e">Find professionals</a></p></section>'+
    cityHubContent(route)+hyderabadAreas(route)+constructionExperienceContent(route)+localityContent(route)+costGuideContent(route)+projectsAuthorityContent(route)+aboutExperienceContent(route)+comparisonDisclosure(route)+'</main>'
}

function breadcrumbItems(route){
  const items=[{'@type':'ListItem',position:1,name:'Home',item:absolute('/')}]
  if(!route.path.startsWith('/hyderabad'))return [...items,{'@type':'ListItem',position:2,name:route.heading,item:absolute(route.path)}]
  items.push({'@type':'ListItem',position:2,name:'Hyderabad',item:absolute('/hyderabad')})
  if(route.type==='city-hub')return items
  if(route.type==='cost-guide')return [...items,{'@type':'ListItem',position:3,name:'Construction Cost',item:absolute(route.path)}]
  if(route.type==='city-service')return [...items,{'@type':'ListItem',position:3,name:route.heading,item:absolute(route.path)}]
  if(route.type==='local-service')return [...items,{'@type':'ListItem',position:3,name:'Construction',item:absolute('/hyderabad/construction')},{'@type':'ListItem',position:4,name:route.localityName,item:absolute(route.path)}]
  if(route.type==='comparison')return [...items,{'@type':'ListItem',position:3,name:serviceBySlug(route.serviceSlug)?.label||route.serviceSlug,item:absolute('/hyderabad/'+route.serviceSlug)},{'@type':'ListItem',position:4,name:'Compare options',item:absolute(route.path)}]
  return items
}

function staticJsonLd(route){
  const page={
    '@context':'https://schema.org',
    '@type':route.type==='city-hub'?'CollectionPage':'WebPage',
    name:route.title,
    url:absolute(route.path),
    description:route.description,
    inLanguage:'en-IN',
    isPartOf:{'@type':'WebSite',name:SITE_NAME,url:absolute('/')},
  }
  if(route.type==='cost-guide')page.about={'@type':'Service',name:'House construction cost planning',areaServed:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(route.type==='city-service'||route.type==='local-service')page.about={'@type':'Service',name:route.serviceSlug==='construction'?'Home construction':route.serviceSlug==='interior-designers'?'Interior design':'Real estate services',areaServed:route.type==='local-service'?{'@type':'Place',name:route.localityName+', Hyderabad, Telangana, India'}:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  const data=[{'@context':'https://schema.org','@type':'Organization',name:SITE_NAME,url:absolute('/'),logo:absolute('/brand/propulse-logo.png')},page,{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:breadcrumbItems(route)}]
  return JSON.stringify(data).replaceAll('</script','<\\/script')
}

function render(route){
  const canonical=absolute(route.path)
  let html=template
  html=replaceTitle(html,route.title)
  html=replaceMeta(html,'name','description',route.description)
  html=replaceMeta(html,'name','robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  html=replaceMeta(html,'name','googlebot','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  if(googleSiteVerification)html=replaceMeta(html,'name','google-site-verification',googleSiteVerification)
  html=replaceMeta(html,'property','og:title',route.title)
  html=replaceMeta(html,'property','og:description',route.description)
  html=replaceMeta(html,'property','og:url',canonical)
  html=replaceMeta(html,'property','og:image',absolute('/brand/propulse-logo.png'))
  html=replaceMeta(html,'name','twitter:title',route.title)
  html=replaceMeta(html,'name','twitter:description',route.description)
  html=replaceMeta(html,'name','twitter:image',absolute('/brand/propulse-logo.png'))
  html=replaceCanonical(html,canonical)
  html=html.replace('</head>','  <script type="application/ld+json" data-propulse-seo="jsonld">'+staticJsonLd(route)+'</script>\n  </head>')
  html=html.replace('<div id="root"></div>','<div id="root">'+fallback(route)+'</div>')
  return html
}

for(const route of PUBLIC_SEO_ROUTES){
  const html=render(route)
  if(route.path==='/')fs.writeFileSync(indexPath,html)
  else{
    const target=path.join(dist,route.path.slice(1)+'.html')
    fs.mkdirSync(path.dirname(target),{recursive:true})
    fs.writeFileSync(target,html)
  }
}

console.log('Generated SEO HTML for '+PUBLIC_SEO_ROUTES.length+' public routes.')
