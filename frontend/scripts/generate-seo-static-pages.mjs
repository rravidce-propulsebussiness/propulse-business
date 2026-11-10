import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PUBLIC_SEO_ROUTES,SITE_NAME} from '../src/seo/seoConfig.js'
import {HYDERABAD_LOCALITIES,localityBySlug,localityPagePath,nearbyLocalities,serviceBySlug} from '../src/seo/hyderabadSeo.js'
import {CONSTRUCTION_PACKAGE_CATALOG} from '../src/data/constructionPackageCatalog.js'
import {districtBySlug,districtPath,stateBySlug} from '../src/seo/regionalSeo.js'
import {CONSTRUCTION_GUIDES,guideBySlug} from '../src/seo/constructionGuides.js'
import {SEO_FAQ_CATEGORIES,homeownerSeoFaqs} from '../src/seo/faqKnowledge.js'
import {interiorNeeds,interiorChecklist} from '../src/seo/interiorSeo.js'
import {HYDERABAD_HOMEOWNER_TOPIC_GROUPS} from '../src/seo/hyderabadHomeownerTopics.js'
import {INTERIOR_HOMEOWNER_TOPIC_GROUPS} from '../src/seo/interiorHomeownerTopics.js'
import {PUBLISHED_HOMEOWNER_ANSWERS} from '../src/seo/homeownerPublishedAnswers.js'
import {FESTIVAL_EVENTS,CAMPAIGN_SERVICES,festivalBySlug,festivalPath} from '../src/seo/festiveCampaigns.js'

const here=path.dirname(fileURLToPath(import.meta.url))
const dist=path.resolve(here,'../dist')
const indexPath=path.join(dist,'index.html')
const template=fs.readFileSync(indexPath,'utf8')
const configuredOrigin=String(process.env.VITE_PUBLIC_SITE_URL||'').trim().replace(/\/+$/,'')
const parsedConfiguredOrigin=/^https?:\/\//i.test(configuredOrigin)?new URL(configuredOrigin):null
const isProductionDomain=parsedConfiguredOrigin&&(parsedConfiguredOrigin.hostname==='propulsetechnologies.online'||parsedConfiguredOrigin.hostname.endsWith('.propulsetechnologies.online'))
const origin=isProductionDomain?'https://propulsetechnologies.online':parsedConfiguredOrigin?parsedConfiguredOrigin.origin:'https://propulsetechnologies.online'
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
  const links=[['Home','/'],['Festival Offers','/offers'],['Hyderabad','/hyderabad'],['Guides','/guides'],['Get Quote','/quote'],['Find Professionals','/experts'],['Technology','/technology'],['Packages','/packages'],['Projects','/projects'],['How It Works','/how-it-works'],['About','/about'],['Contact','/contact']]
  if(route.type==='interior-hub'||route.type==='interior-locality'||route.type==='interior-state-hub'||route.type==='interior-district')links.push(['Interior Solutions','/hyderabad/interior-designers'])
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
  const packages=Object.values(CONSTRUCTION_PACKAGE_CATALOG)
  const money=value=>'₹'+Number(value||0).toLocaleString('en-IN')
  const packageCards=packages.map(item=>'<article style="padding:16px;border:1px solid #ddd;border-radius:10px"><h3>'+escapeHtml(item.name)+' package</h3><p><strong>'+escapeHtml(money(item.rate))+'/sq ft reference</strong></p><p>'+escapeHtml(item.specs?.Architecture||'Package specifications apply.')+'</p><p><a href="/quote?package='+escapeHtml(item.key)+'#construction">Get '+escapeHtml(item.name)+' quote</a></p></article>').join('')
  const nearbyCards=nearby.map(item=>'<li><a href="'+escapeHtml(localityPagePath('construction',item.slug))+'">Construction in '+escapeHtml(item.name)+'</a> — contractors, packages and quote planning</li>').join('')
  return '<section style="padding:10px 0 42px">'+
    '<h2>Construction in '+escapeHtml(locality.name)+', Hyderabad</h2>'+
    '<p style="max-width:850px;line-height:1.55">'+escapeHtml(route.localityContext||service.localityText(locality.name))+'</p>'+
    '<p><a href="/quote?package=standard#construction">Get construction quote in '+escapeHtml(locality.name)+'</a> · <a href="/packages#construction">View construction packages</a></p>'+
    '<h2>Construction packages for '+escapeHtml(locality.name)+'</h2><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:900px">'+packageCards+'</div>'+
    '<h2>How to find the right construction partner in '+escapeHtml(locality.name)+'</h2><ol><li>Use the same built-up area, floors and drawings for every quotation.</li><li>Compare materials, exclusions and finishing allowances.</li><li>Review relevant completed work and project experience.</li><li>Confirm milestones, variation rules, warranties and handover terms.</li></ol>'+
    '<h2>Common construction searches around '+escapeHtml(locality.name)+'</h2><ul>'+route.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>'+
    '<h2>What to include in a construction quote request</h2><ul>'+service.checklist.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul>'+
    '<h2>Related home construction questions</h2><ul>'+
      '<li><a href="/guides/best-steel-for-house-construction">What is the best steel for house construction?</a></li>'+
      '<li><a href="/guides/2bhk-interiors-hyderabad">2BHK interiors in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides/choose-construction-contractor-hyderabad">How to choose the best contractor in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides/prevent-cracks-in-house">Precautions to reduce cracks in a new house</a></li>'+
      '<li><a href="/guides/home-construction-checklist">Home construction checklist</a></li>'+
      '<li><a href="/guides/waterproofing-precautions-new-house">Waterproofing precautions for a new house</a></li>'+
      '<li><a href="/guides/best-cement-for-house-construction">Best cement for house construction in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides/m-sand-vs-river-sand-house-construction">M-sand vs river sand for a home in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides/soil-test-before-house-construction">Soil test before building in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides/electrical-planning-new-house">Electrical planning for a new house in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides/modular-kitchen-planning-hyderabad">Modular kitchen planning in '+escapeHtml(locality.name)+'</a></li>'+
      '<li><a href="/guides">Browse all construction and interior guides</a></li>'+
    '</ul>'+
    '<h2>Nearby construction areas</h2><ul>'+nearbyCards+'</ul>'+
    '<p><a href="/hyderabad/construction">View all Hyderabad construction areas</a> · <a href="/hyderabad/construction-cost">Hyderabad construction cost guide</a></p>'+
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
    '<p><a href="/quote?package=standard#construction">Get a construction quote</a> · <a href="/packages#construction">Compare construction packages</a> · <a href="/hyderabad/construction/compare-options">Compare construction options</a> · <a href="/quote#construction">Request construction quotes</a></p>'+
  '</section>'
}


function guideContent(route){
  if(route.type==='guide-hub'){
    const categories=[...new Set(CONSTRUCTION_GUIDES.map(item=>item.category))]
    return '<section style="padding:10px 0 42px">'+categories.map(category=>{
      const links=CONSTRUCTION_GUIDES.filter(item=>item.category===category).map(item=>'<li><a href="/guides/'+escapeHtml(item.slug)+'">'+escapeHtml(item.heading)+'</a> — '+escapeHtml(item.summary)+'</li>').join('')
      return '<h2>'+escapeHtml(category)+' guides</h2><ul>'+links+'</ul>'
    }).join('')+'<p><a href="/quote?package=standard#construction">Get construction quote</a> · <a href="/packages">View packages</a></p></section>'
  }
  if(route.type!=='construction-guide')return ''
  const guide=guideBySlug(route.guideSlug)
  if(!guide)return ''
  const sections=guide.sections.map((item,index)=>'<section style="padding:14px 0"><p style="font-weight:700;color:#f05b24">'+String(index+1).padStart(2,'0')+'</p><h2>'+escapeHtml(item.heading)+'</h2><p style="max-width:850px;line-height:1.65">'+escapeHtml(item.body)+'</p>'+(item.bullets?.length?'<ul>'+item.bullets.map(b=>'<li>'+escapeHtml(b)+'</li>').join('')+'</ul>':'')+'</section>').join('')
  const related=[...CONSTRUCTION_GUIDES.filter(item=>item.slug!==guide.slug&&item.category===guide.category),...CONSTRUCTION_GUIDES.filter(item=>item.slug!==guide.slug&&item.category!==guide.category)].slice(0,6).map(item=>'<li><a href="/guides/'+escapeHtml(item.slug)+'">'+escapeHtml(item.heading)+'</a></li>').join('')
  return '<section style="padding:10px 0 42px">'+
    (guide.note?'<aside style="padding:12px;border:1px solid #f0c5b4;background:#fff8f4"><strong>Important</strong><p>'+escapeHtml(guide.note)+'</p></aside>':'')+
    sections+
    '<h2>Related searches</h2><ul>'+guide.searchTerms.map(term=>'<li>'+escapeHtml(term)+'</li>').join('')+'</ul>'+
    '<h2>Related guides</h2><ul>'+related+'</ul>'+
    '<p><a href="'+escapeHtml(guide.cta)+'">'+escapeHtml(guide.ctaLabel)+'</a> · <a href="/guides">Browse all guides</a> · <a href="/packages">View packages</a></p>'+
  '</section>'
}

function homeownerFaqContent(route){
  if(route.path!=='/faq')return ''
  const faqs=homeownerSeoFaqs()
  return '<section style="padding:10px 0 42px">'+SEO_FAQ_CATEGORIES.map(category=>{
    const items=faqs.filter(item=>item.category===category.key)
    return '<section style="padding:18px 0"><h2>'+escapeHtml(category.label)+' FAQs</h2><p style="max-width:850px;line-height:1.55">'+escapeHtml(category.description)+'</p>'+items.map(item=>'<article style="padding:14px 0;border-bottom:1px solid #e4ebef"><h3>'+escapeHtml(item.question)+'</h3><p style="max-width:900px;line-height:1.65">'+escapeHtml(item.answer)+'</p></article>').join('')+'</section>'
  }).join('')+'<p><a href="/guides">Browse construction guides</a> · <a href="/quote">Start a project requirement</a> · <a href="/experts">Find professionals</a></p></section>'
}

function businessIdentityContent(route){
  if(route.path==='/'){
    return '<section style="padding:10px 0 42px"><h2>House construction company in Hyderabad</h2>'+
      '<p>ProPulse helps homeowners plan independent-house and villa construction in Hyderabad. Prepare a project brief with your plot location, plot dimensions, built-up area, number of floors, drawings, material and finish preferences, budget and intended timeline before requesting an estimate.</p>'+
      '<h2>Construction services</h2><ul><li><a href="/hyderabad/construction">House construction in Hyderabad</a></li><li><a href="/hyderabad/construction-cost">Construction cost planning guide</a></li><li><a href="/packages">Construction packages and scope options</a></li><li><a href="/guides/home-construction-checklist">Home construction checklist</a></li><li><a href="/guides/choose-construction-contractor-hyderabad">How to choose a construction contractor</a></li></ul>'+
      '<h2>How to compare a construction estimate</h2><p>Compare quotations using the same built-up area, structural drawings, material specifications, inclusions, exclusions, taxes, milestone schedule, variation rules, quality checks and handover terms. Indicative estimates are not final quotations; the actual site and approved scope determine the price.</p>'+
      '<h2>Explore construction and related services</h2><p>ProPulse also offers interior planning, a marketplace for independent professionals and technology for construction businesses. Marketplace professionals are independent businesses and are not automatically ProPulse employees.</p>'+
      '<p><a href="/quote#construction">Request a construction estimate</a> · <a href="/contact">Talk to ProPulse</a> · <a href="/experts">Find independent professionals</a> · <a href="/technology">Explore technology</a></p></section>'
  }
  if(route.path==='/technology'){
    return '<section style="padding:10px 0 42px"><h2>Business OS for construction and interior companies</h2>'+
      '<p>ProPulse technology helps companies manage CRM, quotations, projects, procurement, daily reporting, quality checks, client communication and finance.</p>'+
      '<p>The ProPulse professional marketplace also offers project leads and service profiles for independent construction and interior professionals.</p>'+
      '<p><a href="/professionals">Professional portal</a> · <a href="/contact">Contact ProPulse</a></p></section>'
  }
  return ''
}

function homepageSeoContent(route){
  if(route.path!=='/')return ''
  return '<section style="padding:42px 0;border-top:1px solid #e4ebef"><h2>House Construction &amp; Home Interiors in Hyderabad, Planned Around You</h2>'+
    '<p style="max-width:850px;line-height:1.75">ProPulse helps homeowners take a more informed approach to residential construction and interior projects in Hyderabad. Start with your plot, location, built-up area, floor requirements, preferred materials, finish expectations and budget. These details help shape a clear project brief before an estimate or consultation.</p>'+
    '<p style="max-width:850px;line-height:1.75">Whether you are planning an independent house, a villa, a turnkey construction project, a modular kitchen or complete home interiors, compare the scope, specifications, timelines and commercial terms before making a decision.</p>'+
    '<p><a href="/packages">Explore construction and interior packages</a> · <a href="/hyderabad/construction-cost">Understand house construction costs</a> · <a href="/experts">Find construction and interior professionals</a></p>'+
    '<h2>Planning a Construction or Interior Project?</h2>'+
    '<article><h3>Does ProPulse provide house construction in Hyderabad?</h3><p>ProPulse directly undertakes selected independent-house and villa construction projects. Project location, scope, specifications and availability are reviewed before a proposal is confirmed.</p></article>'+
    '<article><h3>What details are needed for a construction estimate?</h3><p>Share your plot dimensions, location, planned built-up area, number of floors, drawings if available, preferred specifications, budget and expected timeline.</p></article>'+
    '<article><h3>Can I explore interior design and turnkey options?</h3><p>Yes. You can discuss room-wise interior requirements, modular kitchens, finishes and turnkey scope. The final inclusions and exclusions should be agreed in writing.</p></article>'+
    '<article><h3>Can I compare independent construction professionals?</h3><p>Explore published professional profiles and project information on ProPulse. Check credentials, relevant work, references and written commercial terms before appointing a provider.</p></article>'+
    '<p><a href="/faq">Browse more construction, interior and property FAQs</a></p></section>'
}

function aboutExperienceContent(route){
  if(route.path!=='/about')return ''
  return '<section style="padding:10px 0 42px">'+
    '<h2>Prior construction and interiors operating experience</h2>'+
    '<p style="max-width:850px;line-height:1.55">Before ProPulse, our operating background included hands-on residential construction and interior execution work in Hyderabad. That practical experience helped shape ProPulse around clearer scopes, comparable quotations, locality-aware requirements and better project conversations.</p>'+
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

function blogHubContent(route){
  if(!['blog-hub','construction-blog','interior-blog'].includes(route.type))return ''
  if(route.type==='construction-blog'||route.type==='interior-blog'){
    const interior=route.type==='interior-blog'
    const groups=interior?INTERIOR_HOMEOWNER_TOPIC_GROUPS:HYDERABAD_HOMEOWNER_TOPIC_GROUPS.filter(group=>group.category!=='Interior design & renovation searches')
    const topics=groups.map(group=>{
      const items=group.topics.map(topic=>{
        const published=PUBLISHED_HOMEOWNER_ANSWERS[topic.title]
        const answer=published
          ? '<div class="blog-topic-answer"><strong>Published answer</strong><p>'+escapeHtml(published.answer)+'</p>'+(published.sources.length?'<div class="blog-topic-sources"><strong>Official references</strong>'+published.sources.map(source=>'<a href="'+escapeHtml(source.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(source.label)+' ↗</a>').join('')+'</div>':'')+'</div>'
          : '<p class="blog-topic-unpublished">Full answer in preparation. This is a planned topic, not a published answer.</p>'
        return '<li style="padding:14px 0;border-bottom:1px solid #edf0f1"><strong>'+escapeHtml(topic.title)+'</strong>'+answer+'</li>'
      }).join('')
      return '<details class="blog-topic-group"><summary><span>'+escapeHtml(group.category)+'</span><b>'+group.topics.length+' questions</b><i>+</i></summary><ol>'+items+'</ol></details>'
    }).join('')
    return '<section style="padding:10px 0 42px"><h2>'+escapeHtml(route.heading)+'</h2><p style="max-width:850px;line-height:1.65">'+escapeHtml(route.summary)+'</p><p>Questions with complete responses show the answer and official references below. Other entries are clearly marked as planned topics; an editorial brief is not presented as an answer. Cost ranges should be dated and itemised, and Vastu is described as a personal or traditional preference rather than a building requirement.</p>'+topics+'<p><a href="/blog">All blog categories</a> · <a href="/quote">Start a project requirement</a></p></section>'
  }
  const articles=CONSTRUCTION_GUIDES.map(item=>'<li><a href="/guides/'+escapeHtml(item.slug)+'">'+escapeHtml(item.heading)+'</a> — '+escapeHtml(item.summary)+'</li>').join('')
  const topicGroups=HYDERABAD_HOMEOWNER_TOPIC_GROUPS.map(group=>'<details><summary>'+escapeHtml(group.category)+' ('+group.topics.length+' topic ideas)</summary><ol>'+group.topics.map(topic=>'<li><strong>'+escapeHtml(topic.title)+'</strong><p>'+escapeHtml(topic.description||'Practical homeowner guidance and checks.')+'</p></li>').join('')+'</ol></details>').join('')
  return '<section style="padding:10px 0 42px"><h2>Practical construction and interior articles</h2><p style="max-width:850px;line-height:1.65">The ProPulse Journal brings together practical reading for homeowners planning construction, interiors and property improvements. Use each article as a starting point, then confirm project-specific decisions with qualified professionals.</p><h2>Browse published articles</h2><ul>'+articles+'</ul><h2>Homeowner questions informed by Google search research</h2><p>These distinct homeowner questions are informed by Google Trends research guidance and public search-result patterns. Google Trends reports relative interest, while exact monthly search-volume estimates require Google Ads Keyword Planner. Each question includes a practical explanation of the information a homeowner needs.</p>'+topicGroups+'<p><a href="/guides">Browse the full knowledge guide library</a> · <a href="/quote">Start a project requirement</a></p></section>'
}

function trustGuideContent(route){
  if(!['construction-trust-guide','interior-trust-guide'].includes(route.type))return ''
  const interior=route.type==='interior-trust-guide'
  const sections=interior?[
    ['Check completed interiors and execution capability','Review comparable homes and actual completed work. A 3D render shows intent; inspect installed finishes, alignment, drawer movement and who manages each trade.',['Multiple completed projects','Permitted site visit and owner reference','Clear split between in-house and subcontracted work']],
    ['Finalise a room-wise scope','Define dimensions, storage, appliances, finishes and exclusions before comparing package prices.',['Kitchen, wardrobes, lofts and storage','TV, shoe, crockery and study units','Ceiling, lights, electrical changes and painting']],
    ['Verify boards, plywood and finishes','Ask for exact board type, grade, thickness, manufacturer and intended use. Select materials for the exposure and load; protect edges in moisture-prone zones.',['Board grade and thickness by application','Laminate, acrylic, veneer or paint finish','Edge-band thickness and finish quality','Written approval for substitutions']],
    ['Compare hinges, channels and accessories','Identify hardware by brand or approved equivalent, product series, extension, load rating where relevant, soft-close function and warranty.',['Hinge type and soft-close function','Drawer channel extension and load rating','Lift-up systems, baskets and pull-outs']],
    ['Check drawings and service coordination','Approve measured layouts and elevations. Coordinate appliance dimensions, electrical points, plumbing, ventilation, ceiling and access panels before production.',['Room-wise plans and elevations','Appliance schedule','Electrical, lighting and plumbing drawings','Final site measurement and signed revision']],
    ['Review BOQ, timeline, payments and warranty','Document unit-wise quantities, material codes, installation stages, payment milestones, delivery, snag rectification and after-sales support.',['Transport, installation and taxes','Milestone payments and change orders','Warranty duration, exclusions and service process']]
  ]:[
    ['Verify the company and accountable team','Confirm legal business name, address, relevant registrations and tax details where applicable, named project contact and site supervisor. Match the quotation issuer, contracting entity and payment recipient.',['Legal identity and relevant registrations','Named project manager and site supervisor','Written responsibility for defects and variations']],
    ['Inspect comparable completed projects','Ask for projects similar to your plot, building type, floor count, finish level and budget. Photographs alone are not proof; request a permitted visit and customer reference.',['Multiple completed projects','Clarify subcontracted work','Ask about defects and handover experience']],
    ['Check drawings and engineering responsibility','The home must be designed for its actual plot, soil, loads, spans and intended use. Structural design and reinforcement details must come from qualified professionals.',['Architectural drawings and revisions','Soil investigation where required','Structural drawings and design responsibility','MEP coordination']],
    ['Compare the BOQ, not only the rate','Compare identical drawings and specifications. Check measurement basis, quantities, material standards, taxes, provisional items and exclusions.',['Foundation, RCC, masonry, plaster and waterproofing','Steel, cement and concrete specifications','Electrical, plumbing, windows, flooring and painting','Taxes, external works and variation rules']],
    ['Inspect quality control during execution','Ask how materials are stored, who checks reinforcement before concreting, how concrete is placed and cured, and how waterproofing is tested.',['Pre-pour inspection and engineer sign-off','Concrete and curing records as specified','Waterproofing test records','Stage-wise inspection notes']],
    ['Put payments, schedule and warranty in writing','Tie payments to verifiable progress. Document milestones, substitutions, delay handling, defect reporting, retention if agreed and handover.',['Milestone-linked payment schedule','Written variation process','Completion timeline','Defect-liability and warranty terms','Handover checklist']]
  ]
  const faqs=interior?[
    ['How do I choose the best interior designers in Hyderabad?','Compare completed projects, drawings, room-wise BOQs, material and hardware specifications, installation quality, timelines and written warranty terms.'],
    ['How much do 2BHK interiors cost in Hyderabad?','Cost depends on rooms, dimensions, storage, board and finish choices, hardware, ceiling, electrical work, appliances and installation. Request a dated, itemised quote.'],
    ['Which plywood is best for home interiors?','There is no single board for every location. Select a documented grade suitable for exposure, load and application.'],
    ['What should an interior design agreement include?','Rooms, drawings, dimensions, material codes, hardware, inclusions, exclusions, taxes, installation, timeline, milestones, warranty and snag rectification.']
  ]:[
    ['Which is the number one construction company in Hyderabad?','There is no universal, independently verified number-one builder for every project. The right choice depends on project type, location, technical scope, budget, delivery record and contract terms.'],
    ['What should a house construction quotation include?','Drawings, specifications, measurement basis, material standards, labour scope, taxes, exclusions, provisional items, payment milestones, timeline and variation procedure.'],
    ['Is a per-square-foot rate enough to compare builders?','No. Compare the same built-up-area basis, structural scope, materials, finishes, services, taxes and exclusions.'],
    ['Should I pay the full construction amount in advance?','Avoid paying the full amount upfront. Agree a written milestone schedule tied to measurable progress and documented checks.']
  ]
  return '<section style="padding:10px 0 42px"><h2>Evidence before promises</h2><p>Ask for documents, real project references, named responsibility and written scope. ProPulse directly undertakes construction and interior execution in Hyderabad and also helps customers discover independent businesses through its marketplace. Check the named contracting entity and responsibilities in the quotation and agreement before paying.</p><h2>'+ (interior?'Six checks before hiring an interior company':'Six checks before hiring a construction company') +'</h2>'+sections.map((item,index)=>'<article style="padding:18px 0;border-bottom:1px solid #e4e9ed"><h3>'+String(index+1)+'. '+escapeHtml(item[0])+'</h3><p style="max-width:900px;line-height:1.65">'+escapeHtml(item[1])+'</p><ul>'+item[2].map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul></article>').join('')+'<h2>Compare quotations fairly</h2><p>'+(interior?'Share the same room list, measured dimensions, finish schedule, hardware expectations and appliance details.':'Share the same plot, built-up area, floors, drawings, structural scope and material specifications.')+' Compare exclusions and taxes as carefully as the headline price. There is no universal ranking that proves one company is best for every homeowner.</p><h2>Frequently asked questions</h2>'+faqs.map(([q,a])=>'<article style="padding:14px 0;border-bottom:1px solid #e4e9ed"><h3>'+escapeHtml(q)+'</h3><p>'+escapeHtml(a)+'</p></article>').join('')+'<h2>Continue planning in Hyderabad</h2><ul><li><a href="/hyderabad/construction">Construction in Hyderabad</a></li><li><a href="/hyderabad/interior-designers">Interior design in Hyderabad</a></li><li><a href="/construction-blog">Construction blog</a></li><li><a href="/interior-blog">Interior blog</a></li><li><a href="/quote">'+(interior?'Start an interior':'Start a construction')+' requirement</a></li></ul></section>'
}

function fallback(route){
  const nav=baseLinks(route).map(item=>'<a href="'+item[1]+'" style="margin-right:14px;color:#173f5e">'+escapeHtml(item[0])+'</a>').join('')
  return '<main data-seo-static-fallback="true" style="font-family:Arial,sans-serif;max-width:1100px;margin:0 auto;padding:32px;color:#173f5e">'+
    '<header style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap"><a href="/" aria-label="'+escapeHtml(SITE_NAME)+' home"><img src="/brand/propulse-logo.svg" alt="'+escapeHtml(SITE_NAME)+'" width="180" height="48"></a><nav aria-label="Primary">'+nav+'</nav></header>'+
    '<section style="padding:72px 0 34px"><p style="font-weight:700;color:#f05b24">PROPULSE BUSINESS</p><h1 style="max-width:850px;font-size:44px;line-height:1.08;margin:12px 0">'+escapeHtml(route.heading)+'</h1><p style="max-width:780px;font-size:18px;line-height:1.6">'+escapeHtml(route.summary)+'</p><p style="max-width:780px;line-height:1.6">'+escapeHtml(route.description)+'</p><p><a href="/quote" style="font-weight:700;color:#d94f22">Start your requirement</a> · <a href="/experts" style="font-weight:700;color:#173f5e">Find professionals</a></p></section>'+
    businessIdentityContent(route)+trustGuideContent(route)+blogHubContent(route)+homepageSeoContent(route)+cityHubContent(route)+hyderabadAreas(route)+constructionExperienceContent(route)+localityContent(route)+costGuideContent(route)+guideContent(route)+regionalConstructionContent(route)+interiorLandingContent(route)+homeownerFaqContent(route)+aboutExperienceContent(route)+comparisonDisclosure(route)+festiveContent(route)+'</main>'
}


function festiveContent(route){
  if(route.type==='festival-hub'){
    return '<section style="padding:24px 0 56px"><h2>Festival calendar for home construction and interiors in Hyderabad</h2>'+
      '<p>Each occasion has two separately written service pages: one for residential construction planning and one for home interior design. Festival dates are based on Hyderabad/India Standard Time; moon-sighting and temple-specific dates remain provisional.</p>'+
      '<ul>'+FESTIVAL_EVENTS.map(event=>
        '<li style="padding:10px 0"><strong>'+escapeHtml(event.name)+' '+escapeHtml(event.date.slice(0,4))+'</strong> · '+
        escapeHtml(event.date)+(event.tentative?' (indicative)':'')+' — '+
        '<a href="'+escapeHtml(festivalPath(event,'construction'))+'">Construction planning</a> | '+
        '<a href="'+escapeHtml(festivalPath(event,'interiors'))+'">Interior design ideas</a></li>'
      ).join('')+'</ul>'+
      '<p>Promotional pricing, discounts or additional benefits apply only if agreed in a written quote. Browse <a href="/packages">current project packages</a> or <a href="/quote">start a project enquiry</a>.</p></section>'
  }
  if(route.type!=='festive-offer')return ''
  const event=festivalBySlug(route.festivalSlug)
  const service=CAMPAIGN_SERVICES[route.serviceType]
  if(!event||!service)return ''
  if(event.kind==='remembrance'){
    const sibling=service.key==='construction'?'interiors':'construction'
    const focus=service.key==='construction'
      ?'Safety-conscious house construction begins with documented drawings, structural specifications, durable materials, waterproofing and inclusive access.'
      :'Responsible interior design considers accessibility, safe circulation, natural light, indoor comfort, durable finishes and practical storage.'
    return '<section style="padding:30px 0 60px;max-width:960px">'+
      '<p style="font-weight:700">IN RESPECTFUL REMEMBRANCE · HYDERABAD</p>'+
      '<h2>'+escapeHtml(event.name)+' '+escapeHtml(event.date.slice(0,4))+' — '+escapeHtml(service.name)+'</h2>'+
      '<p>'+escapeHtml(event.inspiration)+'</p>'+
      '<p>Observed '+escapeHtml(event.date)+'. This is a solemn commemorative page by ProPulse, Hyderabad. It does not advertise a festival sale, discount or promotional benefit.</p>'+
      '<h2>We remember, honour and reflect</h2>'+
      '<p>Our thoughts are with the people and families remembered on this occasion. This message is intended to honour their memory with dignity and respect.</p>'+
      '<h2>'+escapeHtml(service.name)+' and responsible spaces</h2>'+
      '<p>'+escapeHtml(focus)+' This is general educational information, separate from the remembrance observance; it is not a commercial offer.</p>'+
      '<h2>Frequently asked questions</h2>'+
      '<h3>What does '+escapeHtml(event.name)+' commemorate?</h3><p>'+escapeHtml(event.inspiration)+'</p>'+
      '<h3>Are there promotions connected with this day?</h3><p>No. ProPulse does not link promotional offers to days of remembrance.</p>'+
      '<p><a href="'+escapeHtml(festivalPath(event,sibling))+'">Visit the separate '+escapeHtml(CAMPAIGN_SERVICES[sibling].name)+' remembrance page</a> · '+
      '<a href="/offers">Browse other important dates</a> · <a href="/about">About ProPulse</a></p>'+
      '<p><small>Displayed '+escapeHtml(event.start)+' through '+escapeHtml(event.end)+' (IST), two days before and on the day of remembrance.</small></p>'+
      '</section>'
  }
  const year=event.date.slice(0,4)
  const heading=event.name+' '+year+' '+service.name+' project planning in Hyderabad'
  const materialIntro=service.key==='construction'
    ? 'A house-construction proposal should cover site conditions, structural drawings, the built-up area, floors, steel and cement specifications, waterproofing, mechanical and electrical work, finishes and scope exclusions. Site measurements and permission requirements influence the final quotation.'
    : 'An interior-design proposal should start with the floor plan and room-wise needs: modular kitchens, wardrobes, living-room storage, lighting, false ceilings, work areas and installation constraints. Choose materials, hardware and finishes only after reviewing usage, budget and maintenance needs.'
  const promiseNote='Construction benefits up to ₹5 lakh and 10% off interiors apply to eligible projects during the campaign window. Scope, eligibility, discount basis, taxes and exclusions are confirmed in your written ProPulse quotation.'
  const availability='ProPulse discusses selected construction and interior projects in Hyderabad, subject to a location and scope review. Independent marketplace professionals, where featured, operate separately from ProPulse direct execution.'
  const sibling=service.key==='construction'?'interiors':'construction'
  const siblingName=CAMPAIGN_SERVICES[sibling].name
  return '<section style="padding:28px 0 54px;max-width:940px">'+
    '<p style="color:#8b5d3c;font-weight:700">'+escapeHtml(event.theme)+' · '+escapeHtml(event.date)+' · Hyderabad, Telangana'+(event.tentative?' · indicative date':'' )+'</p>'+
    '<h2>'+escapeHtml(heading)+'</h2>'+
    '<p>'+escapeHtml(event.inspiration)+'</p>'+
    '<p>Considering '+escapeHtml(service.core)+'? This '+escapeHtml(event.name)+' season is an opportunity to organize ideas into an actionable brief, rather than rush into materials or pricing before the project requirements are clear.</p>'+
    '<p>'+escapeHtml(materialIntro)+'</p>'+
    '<h2>Ideas to take from the '+escapeHtml(event.name)+' season</h2>'+
    '<p>'+escapeHtml(event.inspiration)+' The best result comes from matching these ideas to the actual property dimensions, local conditions and everyday routines.</p>'+
    '<ul>'+service.benefits.map(([name,details])=>'<li><strong>'+escapeHtml(name)+':</strong> '+escapeHtml(details)+'</li>').join('')+'</ul>'+
    '<h2>Checklist before asking for a '+escapeHtml(event.name)+' quote</h2>'+
    '<ol>'+service.checklist.map(text=>'<li>'+escapeHtml(text)+'</li>').join('')+'</ol>'+
    '<p>'+escapeHtml(availability)+'</p>'+
    '<h2>Frequently asked questions</h2>'+
    '<h3>'+escapeHtml(service.question)+'</h3><p>'+escapeHtml(service.answer)+'</p>'+
    '<h3>Is there a guaranteed '+escapeHtml(event.name)+' discount?</h3><p>'+escapeHtml(promiseNote)+'</p>'+
    '<h3>Can I ask for an estimate after '+escapeHtml(event.name)+'?</h3><p>Yes. Share the relevant project details for a current quote. Campaign dates do not limit ordinary project enquiries.</p>'+
    '<h3>How does ProPulse handle projects in Hyderabad?</h3><p>'+escapeHtml(availability)+'</p>'+
    '<p><a href="'+escapeHtml(service.to)+'">Request a '+escapeHtml(service.name.toLowerCase())+' quotation</a> · '+
    '<a href="'+escapeHtml(festivalPath(event,sibling))+'">Explore '+escapeHtml(event.name)+' '+escapeHtml(siblingName.toLowerCase())+'</a> · '+
    '<a href="/offers">See all festival campaigns</a></p>'+
    '<p><small>Campaign dates: '+escapeHtml(event.start)+' through '+escapeHtml(event.end)+' (IST). '+escapeHtml(promiseNote)+'</small></p>'+
  '</section>'
}

function breadcrumbItems(route){
  const items=[{'@type':'ListItem',position:1,name:'Home',item:absolute('/')}]
  if(route.type==='festival-hub')return [...items,{'@type':'ListItem',position:2,name:'Festival offers',item:absolute('/offers')}];
  if(route.type==='festive-offer')return [...items,{'@type':'ListItem',position:2,name:'Festival offers',item:absolute('/offers')},{'@type':'ListItem',position:3,name:route.festivalName+' '+route.serviceName,item:absolute(route.path)}];
  if(route.type==='blog-hub')return [...items,{'@type':'ListItem',position:2,name:'Blog',item:absolute('/blog')}];
  if(route.type==='construction-blog'||route.type==='interior-blog')return [...items,{'@type':'ListItem',position:2,name:'Blog',item:absolute('/blog')},{'@type':'ListItem',position:3,name:route.type==='interior-blog'?'Interior Blog':'Construction Blog',item:absolute(route.path)}];
  if(route.type==='construction-trust-guide'||route.type==='interior-trust-guide')return [...items,{'@type':'ListItem',position:2,name:'Hyderabad',item:absolute('/hyderabad')},{'@type':'ListItem',position:3,name:route.heading,item:absolute(route.path)}]
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
    '@type':(['city-hub','guide-hub','blog-hub','construction-blog','interior-blog'].includes(route.type))?'CollectionPage':route.type==='construction-guide'?'Article':(['construction-trust-guide','interior-trust-guide'].includes(route.type)?'Article':'WebPage'),
    name:route.title,
    url:absolute(route.path),
    description:route.description,
    inLanguage:'en-IN',
    isPartOf:{'@type':'WebSite',name:SITE_NAME,url:absolute('/')},
  }
  if(route.type==='construction-guide'||['construction-trust-guide','interior-trust-guide'].includes(route.type)){page.headline=route.heading;page.articleSection='Home construction and interiors';page.publisher={'@type':'Organization',name:SITE_NAME,url:absolute('/')};page.mainEntityOfPage=absolute(route.path)}
  if(route.type==='festive-offer')page.about={'@type':'Service',name:route.serviceName+' planning',serviceType:route.serviceName,areaServed:{'@type':'City',name:'Hyderabad, Telangana, India'}};
  if(route.type==='cost-guide')page.about={'@type':'Service',name:'House construction cost planning',areaServed:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(['interior-hub','interior-locality','interior-state-hub','interior-district'].includes(route.type))page.about={'@type':'Service',name:'Interior design and execution',areaServed:route.type==='interior-locality'?{'@type':'Place',name:route.localityName+', Hyderabad, Telangana, India'}:route.type==='interior-district'?{'@type':'AdministrativeArea',name:route.districtName+' district, '+route.stateName+', India'}:route.type==='interior-state-hub'?{'@type':'AdministrativeArea',name:route.stateName+', India'}:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(route.type==='city-service'||route.type==='local-service')page.about={'@type':'Service',name:route.serviceSlug==='construction'?'Home construction':route.serviceSlug==='interior-designers'?'Interior design':'Real estate services',areaServed:route.type==='local-service'?{'@type':'Place',name:route.localityName+', Hyderabad, Telangana, India'}:{'@type':'City',name:'Hyderabad, Telangana, India'}}
  if(route.type==='state-construction-hub'||route.type==='district-construction')page.about={'@type':'Service',name:'Home construction',areaServed:route.type==='district-construction'?{'@type':'AdministrativeArea',name:route.districtName+' district, '+route.stateName+', India'}:{'@type':'AdministrativeArea',name:route.stateName+', India'}}
  const organization={'@context':'https://schema.org','@type':'Organization',name:SITE_NAME,url:absolute('/'),logo:absolute('/brand/propulse-logo.png')}
  const website={'@context':'https://schema.org','@type':'WebSite',name:SITE_NAME,url:absolute('/'),inLanguage:'en-IN',description:route.path==='/'?route.description:undefined}
  const faqGraph=route.type==='festive-offer'&&route.campaignKind==='remembrance'?{'@context':'https://schema.org','@type':'FAQPage',mainEntity:[
    {'@type':'Question',name:'What does '+route.festivalName+' commemorate?',acceptedAnswer:{'@type':'Answer',text:route.festivalInspiration}},
    {'@type':'Question',name:'Are there promotions associated with this observance?',acceptedAnswer:{'@type':'Answer',text:'No. This is a respectful memorial, not a festival discount campaign.'}},
  ]}:route.type==='festive-offer'?{'@context':'https://schema.org','@type':'FAQPage',mainEntity:[
    {'@type':'Question',name:CAMPAIGN_SERVICES[route.serviceType].question,acceptedAnswer:{'@type':'Answer',text:CAMPAIGN_SERVICES[route.serviceType].answer}},
    {'@type':'Question',name:'Is there a guaranteed '+route.festivalName+' discount?',acceptedAnswer:{'@type':'Answer',text:'Construction benefits up to ₹5 lakh and 10% off interiors apply to eligible projects during the campaign window. Scope, eligibility, discount basis, taxes and exclusions are confirmed in your written quotation.'}},
    {'@type':'Question',name:'Can I ask for an estimate after '+route.festivalName+'?',acceptedAnswer:{'@type':'Answer',text:'Yes, project enquiries remain available beyond a campaign period.'}},
  ]}:null
  const data=route.path==='/'?[
    organization,
    website,
    page,
    {'@context':'https://schema.org','@type':'Service',name:'House and villa construction',serviceType:'Residential house construction',description:'Plan residential house and villa construction in Hyderabad with a defined project scope, material preferences and estimate request.',areaServed:{'@type':'City',name:'Hyderabad',containedInPlace:{'@type':'State',name:'Telangana'}},provider:{'@type':'Organization',name:SITE_NAME,url:absolute('/')},url:absolute('/')},

  ]:[organization,page,{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:breadcrumbItems(route)}]
  if(faqGraph)data.push(faqGraph)
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
