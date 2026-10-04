const district=(slug,name,centers,region)=>({slug,name,centers,region})

export const REGIONAL_STATES={
  telangana:{
    slug:'telangana',
    name:'Telangana',
    districtCount:33,
    title:'Construction Companies in Telangana | District-wise Builders & Quotes | ProPulse',
    description:'Explore construction companies, builders, packages and quote planning across all 33 Telangana districts. Choose your district and create one structured construction requirement on ProPulse.',
    heading:'Construction services across Telangana',
    summary:'Choose your Telangana district, review construction package references and create a clear project brief before comparing relevant builders or construction companies.',
    districts:[
      district('adilabad','Adilabad',['Adilabad','Utnoor','Boath'],'North Telangana'),
      district('bhadradri-kothagudem','Bhadradri Kothagudem',['Kothagudem','Bhadrachalam','Palwancha'],'East Telangana'),
      district('hanumakonda','Hanumakonda',['Hanumakonda','Kazipet','Warangal urban belt'],'North-East Telangana'),
      district('hyderabad','Hyderabad',['Hyderabad','Secunderabad','Central Hyderabad'],'Hyderabad Metropolitan'),
      district('jagtial','Jagtial',['Jagtial','Korutla','Metpally'],'North Telangana'),
      district('jangaon','Jangaon',['Jangaon','Ghanpur Station','Palakurthi'],'Central Telangana'),
      district('jayashankar-bhupalpally','Jayashankar Bhupalpally',['Bhupalpally','Mahadevpur','Kataram'],'North-East Telangana'),
      district('jogulamba-gadwal','Jogulamba Gadwal',['Gadwal','Alampur','Ieeja'],'South Telangana'),
      district('kamareddy','Kamareddy',['Kamareddy','Banswada','Yellareddy'],'North-West Telangana'),
      district('karimnagar','Karimnagar',['Karimnagar','Huzurabad','Choppadandi'],'North Telangana'),
      district('khammam','Khammam',['Khammam','Madhira','Sathupalli'],'East Telangana'),
      district('kumuram-bheem-asifabad','Kumuram Bheem Asifabad',['Asifabad','Kagaznagar','Rebbena'],'North Telangana'),
      district('mahabubabad','Mahabubabad',['Mahabubabad','Dornakal','Maripeda'],'East Telangana'),
      district('mahabubnagar','Mahabubnagar',['Mahabubnagar','Jadcherla','Bhoothpur'],'South Telangana'),
      district('mancherial','Mancherial',['Mancherial','Bellampalli','Mandamarri'],'North Telangana'),
      district('medak','Medak',['Medak','Narsapur','Ramayampet'],'West Telangana'),
      district('medchal-malkajgiri','Medchal-Malkajgiri',['Medchal','Malkajgiri','Keesara'],'Hyderabad Metropolitan'),
      district('mulugu','Mulugu',['Mulugu','Eturnagaram','Venkatapur'],'North-East Telangana'),
      district('nagarkurnool','Nagarkurnool',['Nagarkurnool','Kalwakurthy','Achampet'],'South Telangana'),
      district('nalgonda','Nalgonda',['Nalgonda','Miryalaguda','Devarakonda'],'South-East Telangana'),
      district('narayanpet','Narayanpet',['Narayanpet','Makthal','Kosgi'],'South-West Telangana'),
      district('nirmal','Nirmal',['Nirmal','Bhainsa','Khanapur'],'North Telangana'),
      district('nizamabad','Nizamabad',['Nizamabad','Bodhan','Armoor'],'North-West Telangana'),
      district('peddapalli','Peddapalli',['Peddapalli','Ramagundam','Manthani'],'North Telangana'),
      district('rajanna-sircilla','Rajanna Sircilla',['Sircilla','Vemulawada','Mustabad'],'North Telangana'),
      district('rangareddy','Rangareddy',['Shamshabad','Rajendranagar','Ibrahimpatnam'],'Hyderabad Metropolitan'),
      district('sangareddy','Sangareddy',['Sangareddy','Patancheru','Zaheerabad'],'West Telangana'),
      district('siddipet','Siddipet',['Siddipet','Gajwel','Husnabad'],'Central Telangana'),
      district('suryapet','Suryapet',['Suryapet','Kodad','Huzurnagar'],'South-East Telangana'),
      district('vikarabad','Vikarabad',['Vikarabad','Tandur','Parigi'],'West Telangana'),
      district('wanaparthy','Wanaparthy',['Wanaparthy','Kothakota','Pebbair'],'South Telangana'),
      district('warangal','Warangal',['Warangal','Narsampet','Wardhannapet'],'North-East Telangana'),
      district('yadadri-bhuvanagiri','Yadadri Bhuvanagiri',['Bhongir','Choutuppal','Yadagirigutta'],'East Hyderabad Growth Belt'),
    ],
  },
  'andhra-pradesh':{
    slug:'andhra-pradesh',
    name:'Andhra Pradesh',
    districtCount:28,
    title:'Construction Companies in Andhra Pradesh | District-wise Builders & Quotes | ProPulse',
    description:'Explore construction companies, builders, packages and quote planning across all 28 Andhra Pradesh districts. Choose your district and create one structured construction requirement on ProPulse.',
    heading:'Construction services across Andhra Pradesh',
    summary:'Choose your Andhra Pradesh district, review construction package references and create a clear project brief before comparing relevant builders or construction companies.',
    districts:[
      district('alluri-sitharama-raju','Alluri Sitharama Raju',['Paderu','Araku Valley','Chintapalle'],'North Coastal / Eastern Ghats'),
      district('anakapalli','Anakapalli',['Anakapalli','Narsipatnam','Yelamanchili'],'North Coastal Andhra'),
      district('anantapuramu','Anantapuramu',['Anantapur','Guntakal','Tadipatri'],'Rayalaseema'),
      district('annamayya','Annamayya',['Rayachoti','Madanapalle belt','Rajampet belt'],'Rayalaseema'),
      district('bapatla','Bapatla',['Bapatla','Chirala','Repalle'],'Coastal Andhra'),
      district('chittoor','Chittoor',['Chittoor','Palamaner','Kuppam'],'Rayalaseema'),
      district('east-godavari','East Godavari',['Rajamahendravaram','Rajanagaram','Kovvur'],'Godavari Region'),
      district('eluru','Eluru',['Eluru','Nuzvid','Jangareddygudem'],'Coastal Andhra'),
      district('guntur','Guntur',['Guntur','Tenali','Mangalagiri belt'],'Capital Region / Coastal Andhra'),
      district('kakinada','Kakinada',['Kakinada','Peddapuram','Tuni'],'Godavari Coast'),
      district('dr-br-ambedkar-konaseema','Dr. B.R. Ambedkar Konaseema',['Amalapuram','Mandapeta','Ramachandrapuram'],'Konaseema / Godavari Delta'),
      district('krishna','Krishna',['Machilipatnam','Gudivada','Vuyyuru'],'Krishna Delta'),
      district('kurnool','Kurnool',['Kurnool','Adoni','Yemmiganur'],'Rayalaseema'),
      district('markapuram','Markapuram',['Markapuram','Giddalur','Kanigiri'],'Western Prakasam Region'),
      district('nandyal','Nandyal',['Nandyal','Srisailam','Dhone belt'],'Rayalaseema'),
      district('ntr','NTR',['Vijayawada','Nandigama','Jaggayyapeta'],'Capital Region / Krishna Valley'),
      district('palnadu','Palnadu',['Narasaraopet','Piduguralla','Gurazala'],'Palnadu Region'),
      district('parvathipuram-manyam','Parvathipuram Manyam',['Parvathipuram','Salur','Palakonda'],'North Coastal / Eastern Ghats'),
      district('polavaram','Polavaram',['Rampachodavaram','Chinturu','Polavaram region'],'Godavari Agency Region'),
      district('prakasam','Prakasam',['Ongole','Chimakurthy','Addanki'],'South Coastal Andhra'),
      district('sri-potti-sriramulu-nellore','Sri Potti Sriramulu Nellore',['Nellore','Kavali','Atmakur'],'South Coastal Andhra'),
      district('sri-sathya-sai','Sri Sathya Sai',['Puttaparthi','Hindupur','Dharmavaram'],'Rayalaseema'),
      district('srikakulam','Srikakulam',['Srikakulam','Palasa','Amadalavalasa'],'North Coastal Andhra'),
      district('tirupati','Tirupati',['Tirupati','Srikalahasti','Gudur'],'South Coastal / Rayalaseema Gateway'),
      district('visakhapatnam','Visakhapatnam',['Visakhapatnam','Gajuwaka','Bheemunipatnam'],'North Coastal Andhra'),
      district('vizianagaram','Vizianagaram',['Vizianagaram','Bobbili','Nellimarla'],'North Coastal Andhra'),
      district('west-godavari','West Godavari',['Bhimavaram','Tadepalligudem','Tanuku'],'Godavari Delta'),
      district('ysr-kadapa','YSR Kadapa',['Kadapa','Proddatur','Pulivendula'],'Rayalaseema'),
    ],
  },
}

export function stateBySlug(slug){
  return REGIONAL_STATES[String(slug||'').toLowerCase()]||null
}

export function districtBySlug(stateSlug,districtSlug){
  const state=stateBySlug(stateSlug)
  return state?.districts.find(item=>item.slug===String(districtSlug||'').toLowerCase())||null
}

export function districtPath(stateSlug,districtSlug){
  return '/'+stateSlug+'/construction/'+districtSlug
}

export const REGIONAL_STATE_SEO_ROUTES=Object.values(REGIONAL_STATES).map(state=>({
  path:'/'+state.slug+'/construction',
  type:'state-construction-hub',
  stateSlug:state.slug,
  stateName:state.name,
  title:state.title,
  description:state.description,
  heading:state.heading,
  summary:state.summary,
}))

export const REGIONAL_DISTRICT_SEO_ROUTES=Object.values(REGIONAL_STATES).flatMap(state=>
  state.districts.map(item=>({
    path:districtPath(state.slug,item.slug),
    type:'district-construction',
    stateSlug:state.slug,
    stateName:state.name,
    districtSlug:item.slug,
    districtName:item.name,
    districtRegion:item.region,
    majorCenters:item.centers,
    title:'Construction Company in '+item.name+' District | Builders & Quotes | ProPulse',
    description:'Looking for construction companies, builders or contractors in '+item.name+' district, '+state.name+'? Compare construction packages, major service areas and request project-specific quotes on ProPulse.',
    heading:'Construction in '+item.name+' district, '+state.name,
    summary:'Create one construction requirement for '+item.name+' district, compare package starting points and give relevant builders the same scope, budget and timeline before reviewing quotations.',
    searchTerms:[
      'construction company in '+item.name,
      'builders in '+item.name,
      'construction contractors in '+item.name,
      'home construction in '+item.name,
      'house construction company in '+item.name,
      'construction services in '+item.name+' district',
      ...item.centers.flatMap(center=>[
        'construction in '+center,
        'construction company in '+center,
      ]),
    ],
  }))
)

export const REGIONAL_SEO_ROUTES=[
  ...REGIONAL_STATE_SEO_ROUTES,
  ...REGIONAL_DISTRICT_SEO_ROUTES,
]
