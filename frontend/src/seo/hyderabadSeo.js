export const HYDERABAD_LOCALITIES=[
  {slug:'uppal',name:'Uppal',zone:'East Hyderabad'},
  {slug:'kothapet',name:'Kothapet',zone:'East Hyderabad'},
  {slug:'lb-nagar',name:'LB Nagar',zone:'East Hyderabad'},
  {slug:'vanasthalipuram',name:'Vanasthalipuram',zone:'East Hyderabad'},
  {slug:'dilsukhnagar',name:'Dilsukhnagar',zone:'East Hyderabad'},
  {slug:'gachibowli',name:'Gachibowli',zone:'West Hyderabad'},
  {slug:'kondapur',name:'Kondapur',zone:'West Hyderabad'},
  {slug:'madhapur',name:'Madhapur',zone:'West Hyderabad'},
  {slug:'hitec-city',name:'HITEC City',zone:'West Hyderabad'},
  {slug:'manikonda',name:'Manikonda',zone:'West Hyderabad'},
  {slug:'kokapet',name:'Kokapet',zone:'West Hyderabad'},
  {slug:'narsingi',name:'Narsingi',zone:'West Hyderabad'},
  {slug:'tellapur',name:'Tellapur',zone:'West Hyderabad'},
  {slug:'nallagandla',name:'Nallagandla',zone:'West Hyderabad'},
  {slug:'kukatpally',name:'Kukatpally',zone:'North-West Hyderabad'},
  {slug:'miyapur',name:'Miyapur',zone:'North-West Hyderabad'},
  {slug:'kompally',name:'Kompally',zone:'North Hyderabad'},
  {slug:'ameenpur',name:'Ameenpur',zone:'North-West Hyderabad'},
  {slug:'banjara-hills',name:'Banjara Hills',zone:'Central Hyderabad'},
  {slug:'jubilee-hills',name:'Jubilee Hills',zone:'Central Hyderabad'},
]

export const HYDERABAD_SERVICES={
  construction:{
    slug:'construction',
    label:'Construction',
    heading:'Home Construction in Hyderabad',
    title:'Home Construction in Hyderabad | Contractors & Quotes | ProPulse',
    description:'Planning home construction in Hyderabad? Share your plot, built-up area, budget and timeline on ProPulse and discover relevant construction businesses serving your project area.',
    summary:'Create one structured construction requirement for Hyderabad and make your plot location, scope, budget and timeline clear before you compare project-specific responses.',
    quoteHash:'construction',
    intro:'Planning an independent house, villa, renovation or other construction project',
    needs:['Independent house construction','Villa or duplex construction','Renovation and structural work','Commercial construction requirement','Construction estimate and quotation'],
    checklist:['Plot and site location','Approximate built-up area','Number of floors','Budget range','Preferred start timeline','Material or package preferences'],
    localityHeading:name=>'Construction in '+name,
    localityText:name=>'For a construction site in '+name+', include the exact site location, approximate built-up area, floors, budget and preferred timeline so businesses can understand the scope before responding.',
  },
  'interior-designers':{
    slug:'interior-designers',
    label:'Interior Design',
    heading:'Interior Designers in Hyderabad',
    title:'Interior Designers in Hyderabad | Home Interiors | ProPulse',
    description:'Looking for interior designers in Hyderabad? Share your BHK, rooms, style, budget and possession timeline on ProPulse and explore relevant interior businesses serving your area.',
    summary:'Create one clear Hyderabad interior requirement for your apartment, villa or house and compare responses against the same rooms, finishes, budget and timeline.',
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
    title:'Brick&Bolt Alternatives in Hyderabad | Compare Construction Options | ProPulse',
    description:'Comparing Brick&Bolt with local construction companies in Hyderabad? Use ProPulse to structure one construction requirement and discover relevant businesses serving your project area.',
    heading:'Comparing Brick&Bolt and local construction options in Hyderabad?',
    summary:'ProPulse is not a construction contractor. It helps you prepare one structured requirement and discover relevant businesses so you can compare actual project-specific responses.',
    brands:['Brick&Bolt'],
  },
  'interior-designers':{
    serviceSlug:'interior-designers',
    path:'/hyderabad/interior-designers/compare-options',
    title:'Compare Livspace, HomeLane & DesignCafe in Hyderabad | ProPulse',
    description:'Comparing Livspace, HomeLane, DesignCafe, NoBroker Interiors or local interior designers in Hyderabad? ProPulse helps you submit one requirement and explore relevant business options.',
    heading:'Comparing Livspace, HomeLane, DesignCafe and local interior options?',
    summary:'ProPulse is a requirement and discovery platform, not an interior execution brand. Use one structured brief to explore relevant Hyderabad businesses alongside the brands you are already researching.',
    brands:['Livspace','HomeLane','DesignCafe','NoBroker Interiors'],
  },
  'real-estate':{
    serviceSlug:'real-estate',
    path:'/hyderabad/real-estate/compare-options',
    title:'Compare NoBroker, MagicBricks & 99acres Options in Hyderabad | ProPulse',
    description:'Comparing NoBroker, MagicBricks, 99acres and local property professionals in Hyderabad? ProPulse lets you submit a structured property requirement and explore relevant responses.',
    heading:'Comparing property portals and local real-estate options in Hyderabad?',
    summary:'ProPulse does not replace a property listing portal. It gives you another route: submit a clear property requirement and let relevant businesses understand what you actually need.',
    brands:['NoBroker','MagicBricks','99acres'],
  },
}

export function serviceBySlug(slug){
  return HYDERABAD_SERVICES[String(slug||'').toLowerCase()]||null
}

export function comparisonByService(slug){
  return COMPARISONS[String(slug||'').toLowerCase()]||null
}

export function localityGroups(){
  const groups=new Map()
  HYDERABAD_LOCALITIES.forEach(locality=>{
    if(!groups.has(locality.zone))groups.set(locality.zone,[])
    groups.get(locality.zone).push(locality)
  })
  return [...groups.entries()].map(([zone,localities])=>({zone,localities}))
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

export const HYDERABAD_COMPARISON_SEO_ROUTES=Object.values(COMPARISONS).map(item=>({
  ...item,
  type:'comparison',
}))

export const HYDERABAD_SEO_ROUTES=[
  ...HYDERABAD_SERVICE_SEO_ROUTES,
  ...HYDERABAD_COMPARISON_SEO_ROUTES,
]

export function hyderabadSeoEntry(serviceSlug,comparison=false){
  if(comparison)return comparisonByService(serviceSlug)
  const service=serviceBySlug(serviceSlug)
  if(!service)return null
  return HYDERABAD_SERVICE_SEO_ROUTES.find(item=>item.serviceSlug===service.slug)||null
}
