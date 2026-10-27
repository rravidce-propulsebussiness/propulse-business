import { CONSTRUCTION_PACKAGE_CATALOG } from '../data/constructionPackageCatalog.js'
import { INTERIOR_PACKAGE_CATALOG } from '../data/interiorPackageCatalog.js'

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

// The same per-company approach as Business OS: independent editable copies,
// separate construction and interior tiers, explicitly enabled by each owner.
// Public catalogue pricing is only a suggested starting value, never published automatically.
export function createDefaultProfilePackages(industry='construction'){
  const construction=industry==='construction';
  return PROFILE_PACKAGE_TIERS.map(tier=>{
    const details=construction?CONSTRUCTION_PACKAGE_CATALOG[tier.key]:INTERIOR_PACKAGE_CATALOG[tier.key];
    return {
      _draftKey:'default-'+industry+'-'+tier.key,
      industry,
      title:tier.name,
      description:details?.description||tier.description,
      priceFrom:details?.rate??details?.price??'',
      priceUnit:details?'sqft':'unspecified',
      durationLabel:'',
      inclusions:details?.specs?Object.entries(details.specs).map(([name,value])=>name+': '+value).join('\n'):'',
      brochureUrl:'',
      brochureDisplayUrl:'',
      isPublished:false,
    };
  });
}

// Maintain all saved plans, including renamed packages and documents, without
// silently changing their industry, price, or publication status.
export function resolveProfilePackages(savedPlans=[],industry='construction'){
  const result=savedPlans.map(plan=>({...plan}));
  for(const group of ['construction','design']){
    const existing=result.filter(item=>item.industry===group);
    for(const template of createDefaultProfilePackages(group)){
      if(existing.length>=3)break;
      const matched=existing.some(item=>{
        const name=String(item.title||'').trim().toLowerCase();
        const tier=template.title.toLowerCase();
        return name===tier||name.startsWith(tier+' ')||
          (tier==='royal'&&(name==='luxury'||name.startsWith('luxury ')));
      });
      if(!matched){result.push(template);existing.push(template);}
    }
  }
  return result;
}
