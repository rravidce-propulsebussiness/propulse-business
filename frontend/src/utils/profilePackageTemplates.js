import { CONSTRUCTION_PACKAGE_CATALOG } from '../data/constructionPackageCatalog.js'

// The public construction package catalogue remains the single source of
// default pricing/specifications. Each business may customise its own copy.
export const PROFILE_PACKAGE_TIERS = [
  {key:'standard',name:'Standard',description:'Dependable materials and practical finishes for a quality home.'},
  {key:'premium',name:'Premium',description:'Upgraded branded materials, fittings and finish allowances.'},
  {key:'royal',name:'Royal',description:'Higher-spec construction with premium finishes and allowances.'},
]

export function getPreferredPackageIndustry(selectedServices=[],industries=[]){
  const names=selectedServices.map(item=>industries.find(industry=>String(industry.id)===String(item.industryId))?.name||'').join(' ').toLowerCase()
  if(/construction|civil|building/.test(names))return 'construction'
  if(/interior|design/.test(names))return 'design'
  if(/real estate|property/.test(names))return 'property'
  return 'construction'
}

export function createDefaultProfilePackages(industry='construction'){
  const construction=industry==='construction'
  return PROFILE_PACKAGE_TIERS.map(tier=>{
    const details=CONSTRUCTION_PACKAGE_CATALOG[tier.key]
    return {
      _draftKey:'default-'+tier.key,
      industry,
      title:tier.name,
      description:construction?tier.description:'',
      priceFrom:construction?details.rate:'',
      priceUnit:construction?'sqft':'unspecified',
      durationLabel:'',
      inclusions:construction?Object.entries(details.specs).map(([name,value])=>name+': '+value).join('\n'):'',
      brochureUrl:'',
      brochureDisplayUrl:'',
      // Unconfigured non-construction plans must never be published with
      // made-up pricing or specifications.
      isPublished:construction,
    }
  })
}

// Show exactly the three familiar slots. Match saved packages by tier name
// before falling back to their saved order; this preserves previous edits,
// documents and industry choices even when the package title was changed.
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
    if(saved)return {...saved,industry:saved.industry||industry}
    const other=savedPlans.findIndex((_,i)=>!used.has(i))
    if(other>=0){
      used.add(other)
      return {...savedPlans[other],industry:savedPlans[other].industry||industry}
    }
    return templates[index]
  })
}
