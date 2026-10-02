export const HYDERABAD_LOCALITIES=[
  {slug:'uppal',name:'Uppal',zone:'East Hyderabad',nearby:['kothapet','lb-nagar','dilsukhnagar']},
  {slug:'kothapet',name:'Kothapet',zone:'East Hyderabad',nearby:['lb-nagar','dilsukhnagar','uppal']},
  {slug:'lb-nagar',name:'LB Nagar',zone:'East Hyderabad',nearby:['kothapet','vanasthalipuram','dilsukhnagar']},
  {slug:'vanasthalipuram',name:'Vanasthalipuram',zone:'East Hyderabad',nearby:['lb-nagar','kothapet','dilsukhnagar']},
  {slug:'dilsukhnagar',name:'Dilsukhnagar',zone:'East Hyderabad',nearby:['kothapet','lb-nagar','uppal']},
  {slug:'gachibowli',name:'Gachibowli',zone:'West Hyderabad',nearby:['kondapur','madhapur','hitec-city','manikonda']},
  {slug:'kondapur',name:'Kondapur',zone:'West Hyderabad',nearby:['gachibowli','hitec-city','madhapur','nallagandla']},
  {slug:'madhapur',name:'Madhapur',zone:'West Hyderabad',nearby:['hitec-city','kondapur','gachibowli','jubilee-hills']},
  {slug:'hitec-city',name:'HITEC City',zone:'West Hyderabad',nearby:['madhapur','kondapur','gachibowli','jubilee-hills']},
  {slug:'manikonda',name:'Manikonda',zone:'West Hyderabad',nearby:['gachibowli','narsingi','kokapet','jubilee-hills']},
  {slug:'kokapet',name:'Kokapet',zone:'West Hyderabad',nearby:['narsingi','manikonda','gachibowli','tellapur']},
  {slug:'narsingi',name:'Narsingi',zone:'West Hyderabad',nearby:['kokapet','manikonda','gachibowli','tellapur']},
  {slug:'tellapur',name:'Tellapur',zone:'West Hyderabad',nearby:['nallagandla','kokapet','narsingi','gachibowli']},
  {slug:'nallagandla',name:'Nallagandla',zone:'West Hyderabad',nearby:['tellapur','kondapur','gachibowli','miyapur']},
  {slug:'kukatpally',name:'Kukatpally',zone:'North-West Hyderabad',nearby:['miyapur','hitec-city','kondapur','ameenpur']},
  {slug:'miyapur',name:'Miyapur',zone:'North-West Hyderabad',nearby:['kukatpally','ameenpur','nallagandla','kondapur']},
  {slug:'kompally',name:'Kompally',zone:'North Hyderabad',nearby:['kukatpally','miyapur','ameenpur']},
  {slug:'ameenpur',name:'Ameenpur',zone:'North-West Hyderabad',nearby:['miyapur','kukatpally','nallagandla','kompally']},
  {slug:'banjara-hills',name:'Banjara Hills',zone:'Central Hyderabad',nearby:['jubilee-hills','madhapur','hitec-city','manikonda']},
  {slug:'jubilee-hills',name:'Jubilee Hills',zone:'Central Hyderabad',nearby:['banjara-hills','madhapur','hitec-city','manikonda']},
]

export const HYDERABAD_CITY_SEO_ROUTE={
  path:'/hyderabad',
  type:'city-hub',
  title:'Construction, Interiors & Real Estate in Hyderabad | ProPulse',
  description:'Start a construction, interior-design or real-estate requirement in Hyderabad with ProPulse. Explore locality-aware pages, project planning tools and relevant registered businesses.',
  heading:'Construction, interiors and real estate in Hyderabad',
  summary:'Choose the Hyderabad service you need, then narrow the requirement by locality, scope, budget and timeline before you compare relevant responses.',
}

export const HYDERABAD_CONSTRUCTION_COST_ROUTE={
  path:'/hyderabad/construction-cost',
  type:'cost-guide',
  serviceSlug:'construction',
  title:'House Construction Cost in Hyderabad | Per Sq Ft Guide | ProPulse',
  description:'Plan house construction cost in Hyderabad using ProPulse package reference rates, built-up-area examples, cost drivers and a construction estimator before requesting actual quotations.',
  heading:'House construction cost in Hyderabad',
  summary:'Use current ProPulse construction package reference rates to build a preliminary Hyderabad budget, understand what can change the final cost and move from a per-sq-ft estimate to an actual project quotation.',
  searchTerms:[
    'house construction cost in Hyderabad',
    'construction cost per sq ft in Hyderabad',
    'construction cost per sft in Hyderabad',
    'home construction cost Hyderabad',
    'G+1 construction cost Hyderabad',
    'building construction cost in Hyderabad',
  ],
}

export const HYDERABAD_SERVICES={
  construction:{
    slug:'construction',
    label:'Construction',
    heading:'Home Construction in Hyderabad',
    title:'Home Construction in Hyderabad | Contractors & Quotes | ProPulse',
    description:'Planning home construction in Hyderabad? Share your plot, built-up area, budget and timeline on ProPulse and discover relevant construction businesses serving your project area.',
    summary:'Create one structured construction requirement for Hyderabad and make your plot location, scope, budget and timeline clear before you compare project-specific responses.',
    citySearchIntent:'Whether you searched for home construction in Hyderabad, a construction company in Hyderabad, house construction contractors, builders in Hyderabad or turnkey home construction, compare providers against one consistent project scope.',
    quoteHash:'construction',
    intro:'Planning an independent house, villa, renovation or other construction project',
    needs:['Independent house construction','Villa or duplex construction','Renovation and structural work','Commercial construction requirement','Construction estimate and quotation'],
    checklist:['Plot and site location','Approximate built-up area','Number of floors','Budget range','Preferred start timeline','Material or package preferences'],
    localityHeading:name=>'Construction in '+name,
    localityText:name=>'For a construction site in '+name+', include the exact site location, approximate built-up area, floors, budget and preferred timeline so businesses can understand the scope before responding.',
    localityTitle:name=>'Construction in '+name+', Hyderabad | Contractors & Quotes | ProPulse',
    localityDescription:name=>'Planning construction in '+name+', Hyderabad? Share plot size, built-up area, floors, budget and timeline on ProPulse and discover relevant construction businesses for your requirement.',
    localitySummary:name=>'Create one clear construction brief for a site in '+name+', Hyderabad, then compare project-specific responses against the same scope, budget and timeline.',
    searchTerms:name=>[
      'home construction in '+name,
      'house construction contractors in '+name,
      'construction company in '+name,
      'builders in '+name,
      'turnkey construction in '+name,
    ],
  },
  'interior-designers':{
    slug:'interior-designers',
    label:'Interior Design',
    heading:'Interior Designers in Hyderabad',
    title:'Interior Designers in Hyderabad | Home Interiors | ProPulse',
    description:'Looking for interior designers in Hyderabad? Share your BHK, rooms, style, budget and possession timeline on ProPulse and explore relevant interior businesses serving your area.',
    summary:'Create one clear Hyderabad interior requirement for your apartment, villa or house and compare responses against the same rooms, finishes, budget and timeline.',
    citySearchIntent:'If you are searching for interior designers in Hyderabad, home interiors, modular kitchen designers or complete home interior companies, keep the same rooms, materials, budget and delivery expectations when comparing options.',
    quoteHash:'interiors',
    intro:'Planning interiors for an apartment, villa, independent house or office',
    needs:['Complete home interiors','2BHK and 3BHK interiors','Modular kitchen and wardrobes','Living and bedroom interiors','False ceiling, lighting and finishes'],
    checklist:['Property type and BHK','Approximate carpet or built-up area','Rooms in scope','Budget range','Preferred style','Possession or start timeline'],
    localityHeading:name=>'Interior Designers in '+name,
    localityText:name=>'If your home is in '+name+', add the property type, BHK, rooms in scope, preferred finishes, budget and possession timeline so interior businesses can respond to the same brief.',
  },
  'real-estate':{
    slug:'real-estate',
    label:'Real Estate',
    heading:'Real Estate Services in Hyderabad',
    title:'Real Estate Services in Hyderabad | Property Requirements | ProPulse',
    description:'Looking to buy, sell, rent or invest in Hyderabad property? Submit a structured real-estate requirement on ProPulse and connect with relevant property businesses.',
    summary:'Define your Hyderabad property intent, preferred areas, property type, BHK or plot need, budget and timeline in one requirement before reviewing responses.',
    citySearchIntent:'For searches such as real-estate agents in Hyderabad, property consultants, flats for sale, rental requirements or investment property, start by fixing the locality, property type, budget and timing.',
    quoteHash:'property',
    intro:'Looking to buy, sell, rent or evaluate a property requirement',
    needs:['Property purchase requirement','Property sale requirement','Rental requirement','Plot or land requirement','Investment property requirement'],
    checklist:['Buy, sell, rent or invest intent','Preferred locality','Property type','BHK or plot requirement','Budget range','Possession or move timeline'],
    localityHeading:name=>'Property and Real Estate in '+name,
    localityText:name=>'For a property requirement around '+name+', state whether you want to buy, sell, rent or invest, then add the property type, preferred budget and timing so the requirement is specific.',
  },
}

const COMPARISONS={
  construction:{
    serviceSlug:'construction',
    path:'/hyderabad/construction/compare-options',
    title:'Compare Brick&Bolt, BuildNext & Local Builders in Hyderabad | ProPulse',
    description:'Comparing Brick&Bolt, BuildNext or local construction companies in Hyderabad? Use ProPulse to structure one construction requirement and discover relevant businesses serving your project area.',
    heading:'Comparing Brick&Bolt, BuildNext and local construction options in Hyderabad?',
    summary:'ProPulse is not a construction contractor. It helps you prepare one structured requirement and discover relevant businesses so you can compare actual project-specific responses.',
    brands:['Brick&Bolt','BuildNext'],
    searchIntent:'If you are searching for a Brick&Bolt alternative in Hyderabad, a BuildNext alternative in Hyderabad, or local house-construction contractors, compare every option against the same project scope rather than a generic brand ranking.',
  },
  'interior-designers':{
    serviceSlug:'interior-designers',
    path:'/hyderabad/interior-designers/compare-options',
    title:'Compare Livspace, HomeLane, DesignCafe & Hyderabad Interiors | ProPulse',
    description:'Comparing Livspace, HomeLane, DesignCafe, NoBroker Interiors, Decorpot or local interior designers in Hyderabad? ProPulse helps you submit one requirement and explore relevant business options.',
    heading:'Comparing Livspace, HomeLane, DesignCafe and other Hyderabad interior options?',
    summary:'ProPulse is a requirement and discovery platform, not an interior execution brand. Use one structured brief to explore relevant Hyderabad businesses alongside the brands you are already researching.',
    brands:['Livspace','HomeLane','DesignCafe','NoBroker Interiors','Decorpot'],
    searchIntent:'For searches such as Livspace alternatives in Hyderabad, HomeLane alternatives, DesignCafe alternatives, NoBroker Interiors alternatives or Decorpot alternatives, use the same room scope, materials, budget and delivery expectations when you compare quotations.',
  },
  'real-estate':{
    serviceSlug:'real-estate',
    path:'/hyderabad/real-estate/compare-options',
    title:'Compare NoBroker, MagicBricks & 99acres Options in Hyderabad | ProPulse',
    description:'Comparing NoBroker, MagicBricks, 99acres and local property professionals in Hyderabad? ProPulse lets you submit a structured property requirement and explore relevant responses.',
    heading:'Comparing property portals and local real-estate options in Hyderabad?',
    summary:'ProPulse does not replace a property listing portal. It gives you another route: submit a clear property requirement and let relevant businesses understand what you actually need.',
    brands:['NoBroker','MagicBricks','99acres'],
    searchIntent:'If you are comparing NoBroker, MagicBricks, 99acres or local real-estate professionals in Hyderabad, define the same locality, property type, budget and timing before reviewing the available options.',
  },
}

export function serviceBySlug(slug){
  return HYDERABAD_SERVICES[String(slug||'').toLowerCase()]||null
}

export function comparisonByService(slug){
  return COMPARISONS[String(slug||'').toLowerCase()]||null
}

export function localityBySlug(slug){
  return HYDERABAD_LOCALITIES.find(item=>item.slug===String(slug||'').toLowerCase())||null
}

export function nearbyLocalities(locality){
  if(!locality)return []
  const direct=(locality.nearby||[]).map(localityBySlug).filter(Boolean)
  if(direct.length>=4)return direct.slice(0,4)
  const seen=new Set([locality.slug,...direct.map(item=>item.slug)])
  const sameZone=HYDERABAD_LOCALITIES.filter(item=>item.zone===locality.zone&&!seen.has(item.slug))
  return [...direct,...sameZone].slice(0,4)
}

export function localityGroups(){
  const groups=new Map()
  HYDERABAD_LOCALITIES.forEach(locality=>{
    if(!groups.has(locality.zone))groups.set(locality.zone,[])
    groups.get(locality.zone).push(locality)
  })
  return [...groups.entries()].map(([zone,localities])=>({zone,localities}))
}

export function localityPagePath(serviceSlug,localitySlug){
  const service=serviceBySlug(serviceSlug)
  const locality=localityBySlug(localitySlug)
  if(!service||!locality)return '/hyderabad'
  if(service.slug==='construction')return '/hyderabad/construction/'+locality.slug
  return '/hyderabad/'+service.slug+'#'+locality.slug
}

export const HYDERABAD_SERVICE_SEO_ROUTES=Object.values(HYDERABAD_SERVICES).map(service=>({
  path:'/hyderabad/'+service.slug,
  type:'city-service',
  serviceSlug:service.slug,
  title:service.title,
  description:service.description,
  heading:service.heading,
  summary:service.summary,
}))

export const HYDERABAD_LOCALITY_SEO_ROUTES=HYDERABAD_LOCALITIES.map(locality=>{
  const service=HYDERABAD_SERVICES.construction
  return {
    path:'/hyderabad/construction/'+locality.slug,
    type:'local-service',
    serviceSlug:service.slug,
    localitySlug:locality.slug,
    localityName:locality.name,
    localityZone:locality.zone,
    title:service.localityTitle(locality.name),
    description:service.localityDescription(locality.name),
    heading:'Construction in '+locality.name+', Hyderabad',
    summary:service.localitySummary(locality.name),
    searchTerms:service.searchTerms(locality.name),
  }
})

export const HYDERABAD_COMPARISON_SEO_ROUTES=Object.values(COMPARISONS).map(item=>({
  ...item,
  type:'comparison',
}))

export const HYDERABAD_SEO_ROUTES=[
  HYDERABAD_CITY_SEO_ROUTE,
  HYDERABAD_CONSTRUCTION_COST_ROUTE,
  ...HYDERABAD_SERVICE_SEO_ROUTES,
  ...HYDERABAD_LOCALITY_SEO_ROUTES,
  ...HYDERABAD_COMPARISON_SEO_ROUTES,
]

export function hyderabadSeoEntry(serviceSlug,comparison=false){
  if(comparison)return comparisonByService(serviceSlug)
  const service=serviceBySlug(serviceSlug)
  if(!service)return null
  return HYDERABAD_SERVICE_SEO_ROUTES.find(item=>item.serviceSlug===service.slug)||null
}

export function localitySeoEntry(serviceSlug,localitySlug){
  return HYDERABAD_LOCALITY_SEO_ROUTES.find(item=>item.serviceSlug===serviceSlug&&item.localitySlug===localitySlug)||null
}
