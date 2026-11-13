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

const HYDERABAD_INTERIOR_LOCALITY_ROUTES=HYDERABAD_LOCALITIES.map(locality=>({
  path:'/hyderabad/interior-designers/'+locality.slug,type:'interior-locality',localitySlug:locality.slug,
  localityName:locality.name,localityZone:locality.zone,localityContext:locality.focus,
  title:'Interior Designers in '+locality.name+', Hyderabad | Home Interiors | ProPulse',
  description:'Planning home interiors in '+locality.name+', Hyderabad? Explore complete home interiors, modular kitchens, wardrobes and room-wise design planning with ProPulse.',
  heading:'Home Interior Designers in '+locality.name+', Hyderabad',
  summary:'Create a clear interior brief for your '+locality.name+' home with property type, rooms, finishes, budget and expected handover timeline.'
}))

const REGIONAL_INTERIOR_ROUTES=Object.values(REGIONAL_STATES).flatMap(state=>[
  {path:'/'+state.slug+'/interior-designers',type:'interior-state-hub',stateSlug:state.slug,stateName:state.name,
   title:'Interior Designers in '+state.name+' | Home & Office Interiors | ProPulse',
   description:'Explore interior design planning across '+state.name+'. Select a district and prepare a clear brief for home interiors, modular kitchens, wardrobes and office spaces.',
   heading:'Interior Design Services across '+state.name,
   summary:'Choose your district and outline property type, rooms, design preferences, budget and handover timing before reviewing interior options.'},
  ...state.districts.map(district=>({
    path:'/'+state.slug+'/interior-designers/'+district.slug,type:'interior-district',stateSlug:state.slug,stateName:state.name,
    districtSlug:district.slug,districtName:district.name,majorCenters:district.centers,districtRegion:district.region,
    title:'Interior Designers in '+district.name+' District | Home Interiors | ProPulse',
    description:'Planning home or office interiors in '+district.name+' district, '+state.name+'? Explore room-wise design, modular kitchens, wardrobes, materials and project planning with ProPulse.',
    heading:'Interior Design in '+district.name+' District, '+state.name,
    summary:'Prepare one interior project brief for '+district.name+' district with property type, rooms, finishes, budget and delivery expectations.'
  }))
])

export const INTERIOR_SEO_ROUTES=[INTERIOR_HUB_ROUTE,...HYDERABAD_INTERIOR_LOCALITY_ROUTES,...REGIONAL_INTERIOR_ROUTES]
export {interiorNeeds,interiorChecklist}
