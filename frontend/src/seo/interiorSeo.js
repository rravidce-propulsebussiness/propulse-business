import {HYDERABAD_LOCALITIES} from './hyderabadSeo.js'
import {REGIONAL_STATES} from './regionalSeo.js'

const interiorNeeds=['Complete home interiors','2BHK and 3BHK interior design','Modular kitchen planning','Wardrobes and storage','Living room and bedroom interiors','False ceiling, lighting and finishes']
const interiorChecklist=['Property type and BHK','Approximate carpet area','Rooms included in the scope','Preferred design style and finishes','Budget range','Possession date and target handover']

export const INTERIOR_HUB_ROUTE={
  path:'/hyderabad/interior-designers',type:'interior-hub',serviceSlug:'interior-designers',
  title:'Interior Designers in Hyderabad | Home Interiors & Modular Kitchens | ProPulse',
  description:'Explore home interior design in Hyderabad, including complete home interiors, modular kitchens, wardrobes, living rooms and bedrooms. Plan rooms, finishes, budget and handover with ProPulse.',
  heading:'Interior Designers and Home Interiors in Hyderabad',
  summary:'Plan a complete home, apartment, villa or office interior with a clear room-wise brief, design direction, material choices, budget and delivery expectations.'
}

export const HYDERABAD_INTERIOR_LOCALITY_ROUTES=HYDERABAD_LOCALITIES.map(locality=>({
  path:'/hyderabad/interior-designers/'+locality.slug,type:'interior-locality',localitySlug:locality.slug,
  localityName:locality.name,localityZone:locality.zone,localityContext:locality.focus,
  title:'Interior Designers in '+locality.name+', Hyderabad | Home Interiors | ProPulse',
  description:'Planning home interiors in '+locality.name+', Hyderabad? Explore complete home interiors, modular kitchens, wardrobes and room-wise design planning with ProPulse.',
  heading:'Home Interior Designers in '+locality.name+', Hyderabad',
  summary:'Create a clear interior brief for your '+locality.name+' home with property type, rooms, finishes, budget and expected handover timeline.'
}))

export 
…[1 chars truncated — re-run with head/grep/tail for full output]…
rk in Hyderabad. That practical experience helped shape ProPulse around clearer scopes, comparable quotations, locality-aware requirements and better project conversations.</p>'+
    '<p style="max-width:850px;line-height:1.55">Today ProPulse also directly undertakes construction and interior design and execution, runs an independent-professional lead marketplace, and develops technology solutions.</p>'+
    '<p style="max-width:850px;line-height:1.55">We use that experience to design customer flows that reflect how real construction and interior projects are planned, quoted and discussed.</p>'+
  '</section>'
}

function constructionExperienceContent(route){
  if(route.type!=='city-service'||route.serviceSlug!=='construction')return ''
  return '<section style="padding:10px 0 42px">'+
    '<h2>Hyderabad operating background</h2>'+
    '<p style="max-width:850px;line-height:1.55">ProPulse directly undertakes home construction and interior execution in Hyderabad. Its professional marketplace separately connects customers with independent builders.</p>'+
    '<p><a href="/about#ab-industry-experience">Read the operating experience background</a></p>'+
    '<h2>Construction guides</h2><ul><li><a href="/guides">Browse all construction guides</a></li><li><a href="/guides/best-steel-for-house-construction">Best steel for house construction</a></li><li><a href="/guides/best-cement-for-house-construction">Best cement for house construction</a></li><li><a href="/guides/m-sand-vs-river-sand-house-construction">M-sand vs river sand</a></li><li><a href="/guides/prevent-cracks-in-house">How to reduce cracks in a new house</a></li><li><a href="/guides/choose-construction-contractor-hyderabad">How to choose a contractor in Hyderabad</a></li><li><a href="/guides/2bhk-interiors-hyderabad">2BHK interiors in Hyderabad</a></li></ul>'+
  '</section>'
}

function regionalConstructionContent(route){
  if(route.type!=='state-construction-hub'&&route.type!=='district-construction')return ''
  const state=stateBySlug(route.stateSlug)
  if(!state)return ''
  const packages=Object.values(CONSTRUCTION_PACKAGE_CATALOG)
  const money=value=>'₹'+Number(value||0).toLocaleString('en-IN')
  const packageList='<ul>'+packages.map(item=>'<li><strong>'+escapeHtml(item.name)+' '+escapeHtml(money(item.rate))+'/sq ft reference</strong> — <a href="/quote?package='+escapeHtml(item.key)+'#construction">Get '+escapeHtml(item.name)+' quote</a></li>').join('')+'</ul>'
  if(route.type==='state-construction-hub'){
    const districts=state.districts.map(item=>'<li><a href="'+escapeHtml(districtPath(state.slug,item.slug))+'">Construction in '+escapeHtml(item.name)+' district</a> — '+escapeHtml(item.centers.join(', '))+'</li>').join('')
    return '<section style="padding:10px 0 42px"><h2>Construction across all '+state.districtCount+' '+escapeHtml(state.name)+' districts</h2><p style="max-width:850px;line-height:1.55">Choose the district where your project site is located, compare construction package references and create one consistent requirement before reviewing businesses.</p><ul>'+districts+'</ul><h2>Construction package starting points</h2>'+packageList+'<h2>Construction knowledge guides</h2><ul><li><a href="/guides">Browse all construction guides</a></li><li><a href="/guides/best-steel-for-house-construction">Best steel for house construction</a></li><li><a href="/guides/best-cement-for-house-construction">Best cement for house construction</a></li><li><a href="/guides/m-sand-vs-river-sand-house-construction">M-sand vs river sand</a></li><li><a href="/guides/soil-test-before-house-construction">Soil test before construction</a></li><li><a href="/guides/home-construction-checklist">Home construction checklist</a></li></ul></section>'
  }
  const district=districtBySlug(route.stateSlug,route.districtSlug)
  if(!district)return ''
  const centers=district.centers.map(name=>'<li>'+escapeHtml(name)+' — add the exact locality, PIN or site pin in your requirement</li>').join('')
  const related=state.districts.filter(item=>item.slug!==district.slug).slice(0,8).map(item=>'<li><a href="'+escapeHtml(districtPath(state.slug,item.slug))+'">Construction in '+escapeHtml(item.name)+'</a></li>').join('')
  return '<section style="padding:10px 0 42px">'+
    '<h2>Construction in '+escapeHtml(district.name)+' district</h2><p style="max-width:850px;line-height:1.55">Use one site-specific brief for builders and construction companies across '+escapeHtml(district.name)+'. Keep built-up area, floor count, drawings, specifications, budget and timeline consistent.</p>'+
    '<h2>Major areas to specify</h2><ul>'+centers+'</ul>'+
    '<h2>Construction packages</h2>'+packageList+
    '<h2>How to compare construction companies in '+escapeHtml(district.name)+'</h2><ol><li>Use the same built-up area and floor count.</li><li>Compare material specifications and exclusions.</li><li>Review relevant completed work.</li><li>Confirm milestones, variation rules, warranties and handover scope.</li></ol>'+
    '<h2>Common district construction searches</h2><ul>'+route.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>'+
    '<h2>Construction knowledge guides</h2><ul><li><a href="/guides">Browse all construction guides</a></li><li><a href="/guides/best-steel-for-house-construction">Best steel for house construction</a></li><li><a href="/guides/best-cement-for-house-construction">Best cement for house construction</a></li><li><a href="/guides/m-sand-vs-river-sand-house-construction">M-sand vs river sand</a></li><li><a href="/guides/soil-test-before-house-construction">Soil test before construction</a></li><li><a href="/guides/choose-construction-contractor-hyderabad">How to compare contractors</a></li><li><a href="/guides/home-construction-checklist">Home construction checklist</a></li></ul>'+
    '<h2>Other '+escapeHtml(state.name)+' districts</h2><ul>'+related+'</ul>'+
    '<p><a href="/quote?package=standard#construction">Get construction quote</a> · <a href="/packages#construction">View construction packages</a></p>'+
  '</section>'
}

function comparisonDisclosure(route){
  if(route.type!=='comparison'||!Array.isArray(route.brands))return ''
  const searches=Array.isArray(route.searchTerms)&&route.searchTerms.length?'<h2>Common Hyderabad comparison searches</h2><ul>'+route.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>':''
  return '<section style="padding:10px 0 42px"><h2>Independent comparison note</h2><p style="max-width:850px;line-height:1.55">ProPulse is independent and is not affiliated with or endorsed by '+route.brands.map(escapeHtml).join(', ')+'. Brand names are shown only because customers may be researching these options. Check each provider directly before deciding.</p><p style="max-width:850px;line-height:1.55">'+escapeHtml(route.searchIntent||'')+'</p>'+searches+'</section>'
}


function interiorLandingContent(route){
  if(!['interior-hub','interior-locality','interior-state-hub','interior-district'].includes(route.type))return ''
  const area=route.localityName||route.districtName||route.stateName||'Hyderabad'
  const links=route.type==='interior-hub'?HYDERABAD_LOCALITIES.map(item=>'<li><a href="/hyderabad/interior-designers/'+escapeHtml(item.slug)+'">Interior designers in '+escapeHtml(item.name)+'</a></li>').join(''):route.type==='interior-state-hub'?stateBySlug(route.stateSlug).districts.map(item=>'<li><a href="/'+escapeHtml(route.stateSlug)+'/interior-designers/'+escapeHtml(item.slug)+'">Interior design in '+escapeHtml(item.name)+'</a></li>').join(''):''
  const centers=(route.majorCenters||[]).map(item=>'<li>'+escapeHtml(item)+'</li>').join('')
  return '<section style="padding:18px 0 44px"><h2>Interior design planning in '+escapeHtml(area)+'</h2><p style="max-width:850px;line-height:1.65">Plan complete home interiors, modular kitchens, wardrobes, living rooms, bedrooms, false ceiling, lighting and office interiors. Start with property type, carpet area, rooms, measurements, style preferences, material choices, budget and target handover.</p><h2>Interior services</h2><ul>'+interiorNeeds.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul><h2>Details to prepare before requesting an interior estimate</h2><ul>'+interiorChecklist.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul>'+(centers?'<h2>Major areas in '+escapeHtml(area)+' district</h2><ul>'+centers+'</ul>':'')+(links?'<h2>Explore interior design by location</h2><ul>'+links+'</ul>':'')+'<h2>How to compare interior quotations</h2><ol><li>Compare the same rooms and dimensions.</li><li>Confirm material brands, board grades, finishes and hardware.</li><li>Check inclusions, exclusions, installation and warranty.</li><li>Agree milestones, payment terms and handover scope.</li></ol><p><a href="/quote#interiors">Start an interior requirement</a> · <a href="/packages#interior">Explore interior packages</a> · <a href="/projects">Explore projects</a></p></section>'
}

function fallback(route){
  const nav=baseLinks(route).map(item=>'<a href="'+item[1]+'" style="margin-right:14px;color:#173f5e">'+escapeHtml(item[0])+'</a>').join('')
  return '<main data-seo-static-fallback="true" style="font-family:Arial,sans-serif;max-width:1100px;margin:0 auto;padding:32px;color:#173f5e">'+
    '<header style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap"><a href="/" aria-label="'+escapeHtml(SITE_NAME)+' home"><img src="/brand/propulse-logo.svg" alt="'+escapeHtml(SITE_NAME)+'" width="180" height="48"></a><nav aria-label="Primary">'+nav+'</nav></header>'+
    '<section style="padding:72px 0 34px"><p style="font-weight:700;color:#f05b24">PROPULSE BUSINESS</p><h1 style="max-width:850px;font-size:44px;line-height:1.08;margin:12px 0">'+escapeHtml(route.heading)+'</h1><p style="max-width:780px;font-size:18px;line-height:1.6">'+escapeHtml(route.summary)+'</p><p style="max-width:780px;line-height:1.6">'+escapeHtml(route.description)+'</p><p><a href="/quote" style="font-weight:700;color:#d94f22">Start your requirement</a> · <a href="/experts" style="font-weight:700;color:#173f5e">Find professionals</a></p></section>'+
    businessIdentityContent(route)+homepageSeoContent(route)+cityHubContent(route)+hyderabadAreas(route)+constructionExperienceContent(route)+localityContent(route)+costGuideContent(route)+guideContent(route)+regionalConstructionContent(route)+interiorLandingContent(route)+homeownerFaqContent(route)+aboutExperienceContent(route)+comparisonDisclosure(route)+'</main>'
}

function breadcrumbItems(route){
  const items=[{'@type':'ListItem',position:1,name:'Home',item:absolute('/')}]
  if(route.type==='guide-hub')return [...items,{'@type':'ListItem',position:2,name:'Guides',item:absolute('/guides')}]
  if(route.type==='construction-guide')return [...items,{'@type':'ListItem',position:2,name:'Guides',item:absolute('/guides')},{'@type':'ListItem',position:3,name:route.heading,item:absolute(route.path)}]
  if(route.type==='interior-state-hub')return [...items,{'@type':'ListItem',position:2,name:route.stateName,item:absolute(route.path)}]
  if(route.type==='interior-district')return [...items,{'@type':'ListItem',position:2,name:route.stateName,item:absolute('/'+route.stateSlug+'/interior-designers')},{'@type':'ListItem',position:3,name:route.districtName,item:absolute(route.path)}]
  if(route.type==='interior-locality')return [...items,{'@type':'ListItem',position:2,name:'Hyderabad',item:absolute('/hyderabad/interior-designers')},{'@type':'ListItem',position:3,name:route.localityName,item:absolute(route.path)}]
  if(route.type==='state-construction-hub')return [...items,{'@type':'ListItem',position:2,name:route.stateName,item:absolute(route.path)}]
  if(route.type==='district-construction')return [...items,{'@type':'ListItem',position:2,name:route.stateName,item:absolute('/'+route.stateSlug+'/construction')},{'@type':'ListItem',position:3,name:route.districtName,item:absolute(route.path)}]
  if(!route.path.startsWith('/hyderabad'))return [...items,{'@type':'ListItem',position:2,name:route.heading,item:absolute(route.path)}]
  items.push({'@type':'ListItem',position:2,name:'Hyderabad',item:absolute('/hyderabad')})
  if(route.type==='interior-hub')return [...items,{'@type':'ListItem',position:2,name:'Hyderabad',item:absolute(route.path)}]
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
    '@type':(route.type==='city-hub'||route.type==='guide-hub')?'CollectionPage':route.type==='construction-guide'?'Article':'WebPage',
    name:route.title,
    url:absolute(route.path),
    description:route.description,
    inLanguage:'en-IN',
    isPartOf:{'@type':'WebSite',name:SITE_NAME,url:absolute('/')},
  }
  if(route.type==='construction-guide'){page.headline=route.heading;page.articleSection='Home construction and interiors';page.publisher={'@type':'Organization',name:SITE_NAME,url:absolute('/')};page.mainEntityOfPage=absolute(route.path)}
  if(route.type==='cost-guide')page.about={'@type':'Service',name:'House construction cost planning',areaServed:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(['interior-hub','interior-locality','interior-state-hub','interior-district'].includes(route.type))page.about={'@type':'Service',name:'Interior design and execution',areaServed:route.type==='interior-locality'?{'@type':'Place',name:route.localityName+', Hyderabad, Telangana, India'}:route.type==='interior-district'?{'@type':'AdministrativeArea',name:route.districtName+' district, '+route.stateName+', India'}:route.type==='interior-state-hub'?{'@type':'AdministrativeArea',name:route.stateName+', India'}:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(route.type==='city-service'||route.type==='local-service')page.about={'@type':'Service',name:route.serviceSlug==='construction'?'Home construction':route.serviceSlug==='interior-designers'?'Interior design':'Real estate services',areaServed:route.type==='local-service'?{'@type':'Place',name:route.localityName+', Hyderabad, Telangana, India'}:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(route.type==='state-construction-hub'||route.type==='district-construction')page.about={'@type':'Service',name:'Home construction',areaServed:route.type==='district-construction'?{'@type':'AdministrativeArea',name:route.districtName+' district, '+route.stateName+', India'}:{'@type':'AdministrativeArea',name:route.stateName+', India'}}
  const organization={'@context':'https://schema.org','@type':'Organization',name:SITE_NAME,url:absolute('/'),logo:absolute('/brand/propulse-logo.png')}
  const website={'@context':'https://schema.org','@type':'WebSite',name:SITE_NAME,url:absolute('/'),inLanguage:'en-IN',description:route.path==='/'?route.description:undefined}
  const data=route.path==='/'?[
    organization,
    website,
    page,
    {'@context':'https://schema.org','@type':'Service',name:'House and villa construction',serviceType:'Residential house construction',description:'Plan residential house and villa construction in Hyderabad with a defined project scope, material preferences and estimate request.',areaServed:{'@type':'City',name:'Hyderabad',containedInPlace:{'@type':'State',name:'Telangana'}},provider:{'@type':'Organization',name:SITE_NAME,url:absolute('/')},url:absolute('/')},

  ]:[organization,page,{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:breadcrumbItems(route)}]
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
