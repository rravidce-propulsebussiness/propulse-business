const BUILD_PRIMARY_SCOPES=['turnkey','civil_structure','finishing'];

const BUILD_PROJECT_TYPE={
  residential:'house',
  commercial:'commercial',
  renovation:'house',
  extension:'extension',
  house_construction:'house',
  commercial_building:'commercial',
  building_extension:'extension',
};

const PLOT_AREA_YARDS={
  under_100:90,
  '100_200':150,
  above_200:250,
};

function plotAreaYards(value){
  const numeric=Number(value);
  if(Number.isFinite(numeric)&&numeric>0)return numeric;
  return PLOT_AREA_YARDS[String(value||'')]||0;
}

const DISPLAY={
  project_type:{residential:'Residential',commercial:'Commercial',renovation:'Renovation',extension:'Extension',house_construction:'Residential',commercial_building:'Commercial',building_extension:'Extension'},
  property_type:{residential:'Residential',commercial:'Commercial'},
  quality:{standard:'Standard',premium:'Premium',luxury:'Royal'},
  construction_package:{turnkey:'Turnkey construction',structure_only:'Civil / structure only',finishing_only:'Finishing work only'},
  site_access:{normal:'Normal site access',restricted:'Restricted / narrow access'},
  timeline:{immediately:'Immediately',within_30_days:'Within 30 days',one_to_three_months:'1–3 months',three_to_six_months:'3–6 months',later:'Later / exploring'},
};

const PAYMENT_SCHEDULE=[
  [5,'Booking, site review and design coordination'],
  [10,'Excavation, footing and foundation stage'],
  [12,'Plinth, columns and ground-floor structural stage'],
  [13,'Ground-floor slab / first structural milestone'],
  [13,'Upper-floor structural works'],
  [12,'Masonry, frames and rough civil works'],
  [10,'Internal/external plaster and waterproofing'],
  [10,'Electrical and plumbing rough-in'],
  [8,'Flooring, doors, windows and painting'],
  [5,'Fixtures, testing, final finishing and snag closure'],
  [2,'Handover'],
];

const PACKAGE_SPECIFICATIONS={
  standard:[
    ['Architecture & engineering','Basic floor-plan coordination, structural design basis, electrical and plumbing routing drawings.'],
    ['Structure','RCC framed structure with engineer-approved steel, cement, concrete grade and aggregate suitable for the design.'],
    ['Masonry','AAC blocks or quality red bricks as finalized for the project and local availability.'],
    ['Flooring','Standard vitrified / ceramic tile allowance suitable for residential construction.'],
    ['Kitchen','Granite or equivalent platform allowance, standard ceramic dado and stainless-steel sink allowance.'],
    ['Doors & windows','Main door, internal flush doors and uPVC/aluminium windows within standard package allowances.'],
    ['Bathrooms','Wall/floor tile allowance, sanitaryware and CP fittings in standard range; waterproofing for wet areas.'],
    ['Electrical','FR/FRLS copper wiring, modular switches and concealed conduits in standard range.'],
    ['Painting','Wall putty, primer, interior emulsion and exterior weather-resistant paint system.'],
    ['Water storage & misc.','Sump/overhead tank, basic railings and gate allowances subject to drawings and site conditions.'],
  ],
  premium:[
    ['Architecture & engineering','Detailed floor-plan coordination, structural design basis, services planning and elevation-design allowance.'],
    ['Structure','RCC framed structure with engineer-approved premium-grade reinforcement and branded cement/concrete system or equivalent.'],
    ['Masonry','Premium AAC / first-class brick masonry with improved plaster and finishing allowances.'],
    ['Flooring','Higher-value vitrified / large-format tile allowance; upgraded staircase and parking finish allowances.'],
    ['Kitchen','Upgraded granite/quartz-equivalent platform allowance, premium dado tiles and sink/fittings allowance.'],
    ['Doors & windows','Upgraded main door allowance, laminated internal doors and premium uPVC/aluminium window system.'],
    ['Bathrooms','Higher tile, sanitaryware and CP fitting allowances plus wet-area waterproofing.'],
    ['Electrical','FRLS copper wiring, upgraded modular switches, concealed conduits and standard provision planning.'],
    ['Painting','Premium interior emulsion system, exterior weatherproof coating and elevation-texture allowance where applicable.'],
    ['Water storage & misc.','Upgraded gate/railing/tank allowances; final quantities follow architectural and structural drawings.'],
  ],
  luxury:[
    ['Architecture & engineering','Enhanced architectural coordination, structural design basis, services planning and premium elevation/design allowance.'],
    ['Structure','RCC framed structure with engineer-approved high-spec reinforcement/concrete system and enhanced quality-control allowance.'],
    ['Masonry','Premium block/brick system with higher finishing, alignment and surface-preparation allowances.'],
    ['Flooring','Premium large-format tile/stone allowance with upgraded staircase, balcony and parking finishes.'],
    ['Kitchen','Premium stone/quartz-equivalent platform allowance, designer dado and upgraded sink/fitting allowances.'],
    ['Doors & windows','Premium main-door allowance, upgraded internal-door finishes and higher-spec window/glazing system.'],
    ['Bathrooms','Premium tile, sanitaryware, CP fitting and shower-system allowances with full wet-area waterproofing.'],
    ['Electrical','Premium modular range, FRLS wiring, concealed conduits and expanded provision planning.'],
    ['Painting','Premium interior/exterior coating system with designer texture/elevation finish allowances.'],
    ['Water storage & misc.','Higher gate, railing, tank and external-work allowances subject to design and site conditions.'],
  ],
};

const EXCLUSIONS=[
  'Government approvals, statutory fees, betterment/development charges and utility deposits unless explicitly included.',
  'Loose furniture, appliances, decorative light fixtures, fans and home-automation equipment unless specifically listed.',
  'Borewell, compound wall, lift, solar system, major external development and landscaping unless explicitly included.',
  'Rock excavation, dewatering, retaining systems, soil replacement or extraordinary foundation treatment unless priced after site/soil review.',
  'GST or other applicable taxes unless the selected Admin rate configuration explicitly includes them.',
];

const TERMS=[
  'This is an indicative ProPulse quotation generated from the information submitted by the customer and Admin-configured planning rates.',
  'Final contractor pricing may change after site inspection, measurements, drawings, structural design, soil/site conditions, brand selections and detailed scope review.',
  'Any change in built-up area, floors, specification level, scope, site access or drawings can change the quotation.',
  'The detailed commercial contract, warranty commitments, brand schedule, taxes and delivery timeline are agreed directly with the business selected by the customer.',
  'Quotation validity: 30 days from generation unless a business provides a different written validity period.',
];

function money(value){
  const number=Number(value||0);
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number.isFinite(number)?number:0);
}
function number(value){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:0;
}
function display(map,key,fallback='—'){return map?.[key]||fallback}

function specificationsFor(packageKey,quality){
  const all=PACKAGE_SPECIFICATIONS[quality]||PACKAGE_SPECIFICATIONS.standard;
  if(packageKey==='structure_only'){
    return all.filter(([label])=>['Architecture & engineering','Structure','Masonry','Water storage & misc.'].includes(label));
  }
  if(packageKey==='finishing_only'){
    return all.filter(([label])=>['Flooring','Kitchen','Doors & windows','Bathrooms','Electrical','Painting','Water storage & misc.'].includes(label));
  }
  return all;
}

function primaryBuildPackage(scope){
  const selected=Array.isArray(scope)?scope:[];
  if(selected.includes('civil_structure'))return 'structure_only';
  if(selected.includes('finishing'))return 'finishing_only';
  return 'turnkey';
}

function buildEstimatorAnswers(answers={}){
  const packageKey=primaryBuildPackage(answers.construction_scope);
  if(!answers.built_up_area)throw new Error('Enter or confirm the planned total built-up area to generate a detailed quotation.');
  return{
    project_location:answers.project_location,
    project_type:BUILD_PROJECT_TYPE[answers.project_type]||'house',
    own_plot:answers.own_plot,
    plot_area:plotAreaYards(answers.plot_area),
    built_up_area:answers.built_up_area,
    floors:answers.floors,
    construction_package:packageKey,
    quality:answers.quality,
    basement:false,
    site_access:answers.site_access||'normal',
    timeline:answers.timeline,
    additional_requirement:answers.additional_requirement||'',
  };
}

export async function calculateRequirementQuotation({flowKey,answers,publicRequest}){
  if(flowKey!=='build')return null;
  const estimator=await publicRequest('/customer-flows/construction-cost-estimator');
  const estimatorAnswers=buildEstimatorAnswers(answers);
  const result=await publicRequest('/customer-flows/construction-cost-estimator/calculate',{
    method:'POST',
    body:JSON.stringify({flowToken:estimator.flowToken,answers:estimatorAnswers}),
  });
  return buildConstructionQuotation({answers,estimatorAnswers,result});
}

export function buildConstructionQuotation({answers={},estimatorAnswers={},result={}}){
  const builtUp=number(estimatorAnswers.built_up_area);
  const plotArea=number(estimatorAnswers.plot_area);
  const floors=Math.max(1,number(estimatorAnswers.floors)||1);
  const minimum=number(result.minimum);
  const maximum=number(result.maximum);
  const quality=String(estimatorAnswers.quality||'standard');
  const packageKey=String(estimatorAnswers.construction_package||'turnkey');
  const effectiveMin=builtUp?minimum/builtUp:0;
  const effectiveMax=builtUp?maximum/builtUp:0;
  const averageFloorArea=builtUp/floors;
  const generatedAt=result.createdAt?new Date(result.createdAt):new Date();
  const validUntil=new Date(generatedAt.getTime()+30*24*60*60*1000);
  const paymentSchedule=PAYMENT_SCHEDULE.map(([percent,milestone])=>({
    percent,
    milestone,
    minimum:minimum*percent/100,
    maximum:maximum*percent/100,
  }));

  return{
    kind:'construction',
    title:'Construction Quotation',
    calculationId:result.calculationId||'',
    generatedAt:generatedAt.toISOString(),
    validUntil:validUntil.toISOString(),
    currency:'INR',
    minimum,
    maximum,
    minimumText:money(minimum),
    maximumText:money(maximum),
    effectiveRateMin:effectiveMin,
    effectiveRateMax:effectiveMax,
    effectiveRateText:effectiveMin===effectiveMax?money(effectiveMin)+'/sq ft':money(effectiveMin)+' - '+money(effectiveMax)+'/sq ft',
    project:{
      projectType:display(DISPLAY.project_type,answers.project_type,String(answers.project_type||'—')),
      propertyType:display(DISPLAY.property_type,answers.property_type,String(answers.property_type||'—')),
      plotArea,
      builtUpArea:builtUp,
      floors,
      averageFloorArea,
      ownPlot:answers.own_plot===true?'Yes':answers.own_plot===false?'No':'—',
      constructionPackage:display(DISPLAY.construction_package,packageKey,packageKey),
      quality:display(DISPLAY.quality,quality,quality),
      siteAccess:display(DISPLAY.site_access,estimatorAnswers.site_access,estimatorAnswers.site_access),
      timeline:display(DISPLAY.timeline,answers.timeline,String(answers.timeline||'—')),
      additional:String(answers.additional_requirement||'').trim(),
    },
    costBreakdown:Array.isArray(result.breakdown)?result.breakdown.map(item=>({
      label:item.label,
      kind:item.kind,
      minimum:number(item.minimum),
      maximum:number(item.maximum),
      minimumText:money(item.minimum),
      maximumText:money(item.maximum),
    })):[],
    specifications:specificationsFor(packageKey,quality),
    paymentSchedule,
    estimatedDuration: floors>=4?'8 - 12 months':floors===3?'7 - 10 months':floors===2?'6 - 9 months':'5 - 8 months',
    exclusions:EXCLUSIONS,
    terms:TERMS,
    disclaimer:String(result.disclaimer||TERMS[0]),
  };
}
