// Public, date-specific ProPulse campaign catalogue, Hyderabad (Asia/Kolkata).
// Dates checked against the NFC Hyderabad 2027 holiday calendar and city-specific
// panchang sources. Moon-sighting dates and temple-specific Bonalu dates are provisional.
// No percentage discounts or free services are asserted without an approved offer.
const EVENTS = [
  ['diwali-2026','Diwali','2026-11-08','2026-11-05','2026-11-12','🪔','Festival of lights','Warm lighting, welcoming living rooms and thoughtfully planned spaces make celebrations more comfortable.',95],
  ['chhath-puja-2026','Chhath Puja','2026-11-15','2026-11-13','2026-11-17','🌅','Gratitude and togetherness','Plan safe, practical access, ventilation and easy-to-maintain family spaces for gatherings.',61],
  ['guru-nanak-jayanti-2026','Guru Nanak Jayanti','2026-11-24','2026-11-22','2026-11-25','✨','Community and service','Consider inclusive shared areas and durable, low-maintenance finishes for a welcoming home.',64],
  ['christmas-2026','Christmas','2026-12-25','2026-12-21','2026-12-28','🎄','Season of giving','Create comfortable gathering spaces with practical lighting, storage and family-friendly finishes.',70],
  ['new-year-2027','New Year','2027-01-01','2026-12-29','2027-01-04','🎇','A fresh start','Turn the plan for a new home or refreshed interior into a measured scope, budget and timeline.',82],
  ['bhogi-2027','Bhogi','2027-01-14','2027-01-12','2027-01-14','🌾','Renewal and fresh beginnings','Use the season to declutter and rethink storage, ventilation and practical room layouts.',66],
  ['makar-sankranti-2027','Makar Sankranti','2027-01-15','2027-01-14','2027-01-18','🪁','Harvest and homecoming','Plan airy courtyards, terraces and family spaces with safety and day-to-day use in mind.',88],
  ['republic-day-2027','Republic Day','2027-01-26','2027-01-23','2027-01-27','🇮🇳','Building for tomorrow','Choose transparent specifications, structural planning and long-term value for your next home.',78],
  ['vasant-panchami-2027','Vasant Panchami','2027-02-11','2027-02-09','2027-02-12','🌼','Learning and renewal','Explore calm study corners, natural light and purposeful home office layouts.',61],
  ['valentines-day-2027',"Valentine's Day",'2027-02-14','2027-02-12','2027-02-16','❤️','Spaces made for two','Think about comfortable shared living, relaxed bedrooms and personalized finishes.',59],
  ['maha-shivaratri-2027','Maha Shivaratri','2027-03-06','2027-03-04','2027-03-07','🕉️','Reflection and calm','Consider uncluttered prayer areas and balanced space planning within your broader home brief.',74],
  ['womens-day-2027',"International Women's Day",'2027-03-08','2027-03-07','2027-03-09','🌷','Homes designed for everyone','Prioritize accessibility, reliable storage, safe kitchens and flexible work-from-home areas.',57],
  ['eid-al-fitr-2027','Eid al-Fitr','2027-03-10','2027-03-09','2027-03-12','🌙','Celebration and hospitality','Design welcoming seating areas, convenient dining circulation and easy-care finishes.',79,true],
  ['holi-2027','Holi','2027-03-22','2027-03-20','2027-03-24','🎨','Colour and fresh energy','Explore washable surfaces, cheerful accents and resilient indoor-outdoor finishes.',81],
  ['good-friday-2027','Good Friday','2027-03-26','2027-03-25','2027-03-28','🕊️','Reflection and care','Consider quiet corners, natural light and comfortable spaces for family connection.',55],
  ['ugadi-2027','Ugadi','2027-04-07','2027-04-04','2027-04-09','🌿','Telugu New Year','Make room for a new chapter with considered plans for construction, kitchen functionality and family life.',91],
  ['ambedkar-jayanti-2027','Ambedkar Jayanti','2027-04-14','2027-04-13','2027-04-15','📘','Equality and opportunity','Create accessible, adaptable and well-planned homes that support daily independence.',54],
  ['sri-rama-navami-2027','Sri Rama Navami','2027-04-15','2027-04-14','2027-04-17','🏵️','Family and tradition','Discuss comfortable family gathering areas and a prayer niche when it suits your preferences.',72],
  ['earth-day-2027','Earth Day','2027-04-22','2027-04-21','2027-04-23','🌎','Build with care','Ask about daylight, ventilation, water use and material durability at the design stage.',56],
  ['labour-day-2027','Labour Day','2027-05-01','2027-04-29','2027-05-02','🛠️','Respect the makers','Plan with realistic work schedules, clear milestones and safe site practices.',58],
  ['akshaya-tritiya-2027','Akshaya Tritiya','2027-05-09','2027-05-07','2027-05-11','🌟','New beginnings','Prepare the groundwork for a home project with clarity on approvals, materials and budgets.',80],
  ['eid-al-adha-2027','Eid al-Adha','2027-05-17','2027-05-16','2027-05-19','🌙','Gathering and generosity','Give shared rooms and dining spaces thoughtful circulation, storage and lighting.',75,true],
  ['telangana-formation-day-2027','Telangana Formation Day','2027-06-02','2027-05-31','2027-06-04','🏛️','Celebrating Telangana','Explore practical home construction and interiors tailored to Hyderabad climate and lifestyles.',76],
  ['environment-day-2027','World Environment Day','2027-06-05','2027-06-04','2027-06-07','🌱','Thoughtful materials','Discuss sensible material selection, daylight, ventilation and water-saving priorities.',58],
  ['international-yoga-day-2027','International Yoga Day','2027-06-21','2027-06-19','2027-06-22','🧘','Wellness at home','Find a quiet and flexible space for movement, daylight and comfortable air flow.',53],
  ['bonalu-2027','Bonalu Season','2027-07-04','2027-07-04','2027-08-01','🌺','Telangana heritage','Make room for hospitality, family visits and welcoming entrances with easy maintenance.',76,true],
  ['guru-purnima-2027','Guru Purnima','2027-07-18','2027-07-17','2027-07-20','📚','Learning and gratitude','Create study and reading spaces that adapt as family needs change.',58],
  ['varalakshmi-vratam-2027','Varalakshmi Vratam','2027-08-13','2027-08-11','2027-08-14','🪷','Tradition and prosperity','Plan practical puja storage, gathering spaces and light where they fit your needs.',71],
  ['independence-day-2027','Independence Day','2027-08-15','2027-08-12','2027-08-16','🇮🇳','A vision for the future','Explore well-built homes with detailed specifications and transparent project decisions.',85],
  ['raksha-bandhan-2027','Raksha Bandhan','2027-08-17','2027-08-16','2027-08-19','🎁','Family connections','Design comfortable shared rooms and purposeful storage for family life.',68],
  ['janmashtami-2027','Krishna Janmashtami','2027-08-25','2027-08-23','2027-08-27','🦚','Joy and celebration','Bring warmth to family spaces, safe décor arrangements and accessible storage.',73],
  ['ganesh-chaturthi-2027','Ganesh Chaturthi','2027-09-04','2027-09-01','2027-09-07','🐘','Welcoming beginnings','Plan space for family gathering, adaptable furniture and a flexible pooja area.',89],
  ['teachers-day-2027',"Teachers' Day",'2027-09-05','2027-09-04','2027-09-06','✏️','Spaces that encourage learning','Consider efficient workstations, comfortable lighting and sound-aware study areas.',52],
  ['navratri-2027','Navratri','2027-09-30','2027-09-28','2027-10-05','🌸','Nine nights of celebration','Think through flexible gathering space, festive lighting and easy-to-refresh décor.',76],
  ['gandhi-jayanti-2027','Gandhi Jayanti','2027-10-02','2027-10-01','2027-10-03','🕊️','Simplicity and purpose','Prioritize functional spaces, responsible resource use and straightforward plans.',55],
  ['bathukamma-2027','Saddula Bathukamma','2027-10-07','2027-10-05','2027-10-08','💐','Floral traditions of Telangana','Consider welcoming verandas, usable courtyards and durable spaces for family festivities.',83],
  ['dussehra-2027','Dussehra','2027-10-09','2027-10-07','2027-10-12','🏹','A season of new projects','Compare home-building scopes and reimagine the rooms that matter most.',90],
  ['diwali-2027','Diwali','2027-10-29','2027-10-25','2027-11-02','🪔','Festival of lights','Warm lighting, welcoming living rooms and thoughtfully planned spaces make celebrations more comfortable.',96],
  ['bhai-dooj-2027','Bhai Dooj','2027-10-31','2027-10-30','2027-11-02','🪔','Together at home','Design spaces that make family visits easy, comfortable and memorable.',63],
  ['chhath-puja-2027','Chhath Puja','2027-11-04','2027-11-03','2027-11-06','🌅','Gratitude and togetherness','Consider convenient outdoor access, simple upkeep and shared family areas.',66],
]

export const FESTIVAL_EVENTS = EVENTS.map(([slug,name,date,start,end,icon,theme,inspiration,priority,tentative=false])=>({
  slug,name,date,start,end,icon,theme,inspiration,priority,tentative,
}))

export const CAMPAIGN_SERVICES={
  construction:{
    key:'construction', label:'Construction',slug:'construction',name:'Home Construction',
    title:'House Construction Offers',
    action:'Plan My Home Construction',
    to:'/quote#construction',
    core:'independent houses, villas and turnkey residential construction',
    checklist:[
      'Confirm the plot location, site conditions, dimensions and required permissions.',
      'List the built-up area, number of floors, architectural and structural drawing status.',
      'Compare structural materials, finishing allowances, exclusions, milestone payments and quality controls.',
      'Ask for a project-specific quotation, written execution schedule and handover commitments.',
    ],
    benefits:[
      ['Start with your plot','Site location, dimensions, approval status and floors guide the brief.'],
      ['Compare the whole scope','Discuss structure, masonry, waterproofing, MEP and finishing allowances.'],
      ['Understand the estimate','Request a written quote with materials, inclusions, exclusions and milestone terms.'],
    ],
    question:'What should I share for a festive construction quote?',
    answer:'Share your plot location and dimensions, estimated built-up area, floors, drawings if available, preferred specifications and budget range.',
  },
  interiors:{
    key:'interiors',label:'Interiors',slug:'interiors',name:'Interior Design',
    title:'Interior Design Offers',
    action:'Plan My Home Interiors',
    to:'/quote#interiors',
    core:'modular kitchens, wardrobes, living rooms, false ceilings and turnkey home interiors',
    checklist:[
      'Identify the property type, city, room sizes and possession or renovation timeline.',
      'Prioritize the kitchen, wardrobes, living areas, lighting and storage needs.',
      'Choose finish and hardware preferences with drawings and item-wise specifications.',
      'Request a room-wise proposal, installation milestones, clear exclusions and warranty terms.',
    ],
    benefits:[
      ['Plan room by room','Start with kitchen, wardrobes, living spaces and practical storage.'],
      ['Choose materials deliberately','Compare plywood grades, finishes, hardware and lighting before execution.'],
      ['Know what is included','Review room-wise BOQ, drawings, installation scope and agreed timelines.'],
    ],
    question:'What details are needed for a festive interior design quote?',
    answer:'Share your home location, 2BHK/3BHK or villa layout, rooms to design, possession date, budget and preferred finishes.',
  },
}

export function festivalPath(event,service){return '/offers/'+event.slug+'/'+service}
export function festivalBySlug(slug){return FESTIVAL_EVENTS.find(event=>event.slug===slug)||null}
export function indiaToday(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(now).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]))
  return parts.year+'-'+parts.month+'-'+parts.day
}
export function campaignStatus(event,date=indiaToday()){
  if(date<event.start)return 'upcoming'
  if(date>event.end)return 'past'
  return 'active'
}
export function activeFestival(date=indiaToday()){
  return [...FESTIVAL_EVENTS].filter(event=>campaignStatus(event,date)==='active')
    .sort((a,b)=>b.priority-a.priority||a.date.localeCompare(b.date))[0]||null
}
export function festivalSeoRoutes(){
  return FESTIVAL_EVENTS.flatMap(event=>Object.values(CAMPAIGN_SERVICES).map(service=>{
    const year=event.date.slice(0,4)
    const title=event.name+' '+year+' '+service.title+' in Hyderabad | ProPulse'
    const description='Explore '+event.name+' '+year+' '+service.name.toLowerCase()+' planning in Hyderabad with ProPulse. '+event.inspiration+' Request a scope-based quote; promotional terms require written confirmation.'
    return {
      path:festivalPath(event,service.key),
      type:'festive-offer',title,description,
      heading:event.name+' '+year+' — '+service.name+' in Hyderabad',
      summary:'A '+event.name+'-inspired way to plan '+service.core+' in Hyderabad. Explore practical ideas and request a written project-specific estimate.',
      festivalSlug:event.slug,festivalName:event.name,festivalDate:event.date,
      campaignStart:event.start,campaignEnd:event.end,campaignTentative:event.tentative,
      festivalTheme:event.theme,festivalInspiration:event.inspiration,
      serviceType:service.key,serviceName:service.name,
    }
  }))
}
export const FESTIVE_SEO_ROUTES=[{
  path:'/offers',type:'festival-hub',
  title:'Festival Construction & Interior Offers Calendar Hyderabad 2026–27 | ProPulse',
  description:'Browse 2026–2027 festival-themed home construction and interior design campaigns in Hyderabad. Explore Diwali, Sankranti, Republic Day, Ugadi, Bathukamma, Dussehra and more.',
  heading:'Festival construction and interior offers calendar for Hyderabad',
  summary:'Explore more than a year of festival-inspired planning pages for independent houses, villas, modular kitchens and full home interiors in Hyderabad.',
},...festivalSeoRoutes()]
