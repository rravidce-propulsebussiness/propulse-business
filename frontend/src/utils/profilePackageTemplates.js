// The same three construction package tiers and editable material fields as
// Business OS. Starter text is illustrative, not an endorsed contractor offer:
// every company must review its copy, set its own rate and explicitly publish.
export const PROFILE_PACKAGE_TIERS = [
  {key:'standard',name:'Standard',description:'Standard construction materials and essential finishes. Edit every specification to match your company.'},
  {key:'premium',name:'Premium',description:'Enhanced materials, finishes and allowances. Confirm brands, grades and inclusions.'},
  {key:'royal',name:'Royal',description:'High-spec construction with premium finishes. Specify your actual brands and scope.'},
]

// Mirrors the Business OS construction package editor's default 16 categories;
// all brand, rate and allowance fields remain blank until the professional edits them.
const CONSTRUCTION_STARTERS=[
  ['Architectural plans','2D floor plans, structural drawings, 3D elevation, soil test','none','included'],
  ['Steel / TMT','As per approved structural engineer design','none','included'],
  ['Cement','Structural and masonry grades as specified','none','included'],
  ['Sand & aggregates','Approved quarry and applicable aggregate sizes','none','included'],
  ['Bricks / blocks','Wall thickness and material specifications','none','included'],
  ['Flooring tiles','Tiles for living, dining and bedrooms','sqft','allowance'],
  ['Bathroom fittings','Sanitary ware, taps, showers and CP fittings','bathroom','allowance'],
  ['Main door','Main entrance door, frame, hardware and finish','door','allowance'],
  ['Internal doors','Door shutter, frame, fittings and polish','door','allowance'],
  ['Windows','UPVC / aluminium windows including hardware','sqft','allowance'],
  ['Kitchen & countertop','Kitchen platform, sink and backsplash','sqft','allowance'],
  ['Electrical','Copper wiring, conduits and switches','none','included'],
  ['Plumbing','Water supply and drainage, pipe brand and grade','none','included'],
  ['Painting','Putty, primer and interior / exterior finish coats','none','included'],
  ['Railings & metal works','Staircase railings, gates and grills','running_ft','allowance'],
  ['Exclusions & warranty','Clarify exclusions, workmanship and warranty','none','included'],
]
const INTERIOR_STARTERS=[
  ['Design & drawings','Layout, elevations, 3D views and revision allowance','none','included'],
  ['Kitchen cabinetry','Carcass material, shutters and laminate','running_ft','included'],
  ['Kitchen hardware','Hinges, channels, baskets and handle brand','none','included'],
  ['Wardrobes','Carcass grade, shutter finish and accessories','sqft','included'],
  ['TV unit & furniture','Dimensions, cabinet material and finish','none','included'],
  ['False ceiling','Gypsum brand, frame and paint scope','sqft','included'],
  ['Lighting & electrical','Point, fixture, switch and wiring specification','point','included'],
  ['Painting & polishing','Surface preparation, brands and coats','none','included'],
  ['Countertop','Quartz, granite or other surface and allowance','sqft','allowance'],
  ['Delivery & installation','Transport, handling, installation and site cleaning','none','included'],
  ['Warranty & exclusions','Workmanship, hardware warranty and scope exclusions','none','included'],
]
const PROPERTY_STARTERS=[
  ['Consultation','Scope of property consultation and coordination','none','included'],
  ['Site visit','Number of visits and locations included','none','included'],
  ['Documentation','Document review and available services','none','included'],
  ['Legal due diligence','Clearly identify included and excluded legal checks','none','excluded'],
  ['Registration coordination','Clarify fee and registration support','none','included'],
  ['Taxes & government fees','Specify charges payable directly by customer','none','excluded'],
]

export const editableStarterSpecifications=(industry='construction')=>{
  const source=industry==='design'?INTERIOR_STARTERS:industry==='property'?PROPERTY_STARTERS:CONSTRUCTION_STARTERS
  return source.map(([title,description,unit,pricingTreatment])=>({
    title,description,unit,pricingTreatment,brand:'',grade:'',allowanceValue:'',
  }))
}

export function getPreferredPackageIndustry(selectedServices=[],industries=[]){
  const names=selectedServices.map(item=>industries.find(industry=>String(industry.id)===String(item.industryId))?.name||'').join(' ').toLowerCase()
  if(/construction|civil|building/.test(names))return 'construction'
  if(/interior|design/.test(names))return 'design'
  if(/real estate|property/.test(names))return 'property'
  return 'construction'
}

export function createDefaultProfilePackages(industry='construction'){
  const unit=industry==='property'?'project':'sqft'
  return PROFILE_PACKAGE_TIERS.map(tier=>({
    _draftKey:'default-'+tier.key,
    industry,
    title:tier.name,
    description:industry==='construction'?tier.description:'',
    priceFrom:'', // never treat ProPulse catalogue reference prices as company prices
    priceUnit:unit,
    durationLabel:'',
    inclusions:'', // source of truth is the structured, itemized specification
    specSections:editableStarterSpecifications(industry),
    brochureUrl:'',
    brochureDisplayUrl:'',
    isPublished:false, // explicit rate + professional confirmation required
  }))
}

// Keep exactly three slots. Never replace a saved business rate, brochure or
// edited specification. Fill only missing structured rows in the editor, as
// unsaved suggestions for the professional to review before their next save.
export function resolveProfilePackages(savedPlans=[],industry='construction'){
  const templates=createDefaultProfilePackages(industry)
  const used=new Set()
  const slots=PROFILE_PACKAGE_TIERS.map(tier=>{
    const index=savedPlans.findIndex((plan,i)=>!used.has(i)&&(
      new RegExp('^'+tier.name+'(?:\\b|$)','i').test(String(plan.title||'').trim())||
      (tier.key==='royal'&&/^luxury(?:\\b|$)/i.test(String(plan.title||'').trim()))
    ))
    if(index<0)return null
    used.add(index)
    return savedPlans[index]
  })
  return slots.map((saved,index)=>{
    if(!saved){
      const other=savedPlans.findIndex((_,i)=>!used.has(i))
      if(other>=0){used.add(other);saved=savedPlans[other]}
    }
    if(!saved)return templates[index]
    const selectedIndustry=saved.industry||industry
    return {
      ...saved,
      industry:selectedIndustry,
      specSections:Array.isArray(saved.specSections)&&saved.specSections.length
        ? saved.specSections
        : editableStarterSpecifications(selectedIndustry),
    }
  })
}
