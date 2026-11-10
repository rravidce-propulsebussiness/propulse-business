// Public, date-specific ProPulse campaign catalogue, Hyderabad (Asia/Kolkata).
// Dates checked against the NFC Hyderabad 2027 holiday calendar and city-specific
// panchang sources. Moon-sighting dates and temple-specific Bonalu dates are provisional.
// Owner-approved campaigns: construction benefits up to ₹5 lakh; interiors 10% off.
const EVENTS = [
  ['diwali-2026','Diwali','2026-11-08','🪔','Festival of lights','Warm lighting, welcoming living rooms and thoughtfully planned spaces make celebrations more comfortable.',95],
  ['chhath-puja-2026','Chhath Puja','2026-11-15','🌅','Gratitude and togetherness','Plan safe, practical access, ventilation and easy-to-maintain family spaces for gatherings.',61],
  ['guru-nanak-jayanti-2026','Guru Nanak Jayanti','2026-11-24','✨','Community and service','Consider inclusive shared areas and durable, low-maintenance finishes for a welcoming home.',64],
  ['christmas-2026','Christmas','2026-12-25','🎄','Season of giving','Create comfortable gathering spaces with practical lighting, storage and family-friendly finishes.',70],
  ['new-year-2027','New Year','2027-01-01','🎇','A fresh start','Turn the plan for a new home or refreshed interior into a measured scope, budget and timeline.',82],
  ['bhogi-2027','Bhogi','2027-01-14','🌾','Renewal and fresh beginnings','Use the season to declutter and rethink storage, ventilation and practical room layouts.',66],
  ['makar-sankranti-2027','Makar Sankranti','2027-01-15','🪁','Harvest and homecoming','Plan airy courtyards, terraces and family spaces with safety and day-to-day use in mind.',88],
  ['republic-day-2027','Republic Day','2027-01-26','🇮🇳','Building for tomorrow','Choose transparent specifications, structural planning and long-term value for your next home.',78],
  ['vasant-panchami-2027','Vasant Panchami','2027-02-11','🌼','Learning and renewal','Explore calm study corners, natural light and purposeful home office layouts.',61],
  ['valentines-day-2027',"Valentine's Day",'2027-02-14','❤️','Spaces made for two','Think about comfortable shared living, relaxed bedrooms and personalized finishes.',59],
  ['maha-shivaratri-2027','Maha Shivaratri','2027-03-06','🕉️','Reflection and calm','Consider uncluttered prayer areas and balanced space planning within your broader home brief.',74],
  ['womens-day-2027',"International Women's Day",'2027-03-08','🌷','Homes designed for everyone','Prioritize accessibility, reliable storage, safe kitchens and flexible work-from-home areas.',57],
  ['eid-al-fitr-2027','Eid al-Fitr','2027-03-10','🌙','Celebration and hospitality','Design welcoming seating areas, convenient dining circulation and easy-care finishes.',79,true],
  ['holi-2027','Holi','2027-03-22','🎨','Colour and fresh energy','Explore washable surfaces, cheerful accents and resilient indoor-outdoor finishes.',81],
  ['good-friday-2027','Good Friday','2027-03-26','🕊️','Reflection and care','Consider quiet corners, natural light and comfortable spaces for family connection.',55],
  ['ugadi-2027','Ugadi','2027-04-07','🌿','Telugu New Year','Make room for a new chapter with considered plans for construction, kitchen functionality and family life.',91],
  ['ambedkar-jayanti-2027','Ambedkar Jayanti','2027-04-14','📘','Equality and opportunity','Create accessible, adaptable and well-planned homes that support daily independence.',54],
  ['sri-rama-navami-2027','Sri Rama Navami','2027-04-15','🏵️','Family and tradition','Discuss comfortable family gathering areas and a prayer niche when it suits your preferences.',72],
  ['earth-day-2027','Earth Day','2027-04-22','🌎','Build with care','Ask about daylight, ventilation, water use and material durability at the design stage.',56],
  ['labour-day-2027','Labour Day','2027-05-01','🛠️','Respect the makers','Plan with realistic work schedules, clear milestones and safe site practices.',58],
  ['akshaya-tritiya-2027','Akshaya Tritiya','2027-05-08','🌟','New beginnings','Prepare the groundwork for a home project with clarity on approvals, materials and budgets.',80],
  ['eid-al-adha-2027','Eid al-Adha','2027-05-17','🌙','Gathering and generosity','Give shared rooms and dining spaces thoughtful circulation, storage and lighting.',75,true],
  ['telangana-formation-day-2027','Telangana Formation Day','2027-06-02','🏛️','Celebrating Telangana','Explore practical home construction and interiors tailored to Hyderabad climate and lifestyles.',76],
  ['environment-day-2027','World Environment Day','2027-06-05','🌱','Thoughtful materials','Discuss sensible material selection, daylight, ventilation and water-saving priorities.',58],
  ['international-yoga-day-2027','International Yoga Day','2027-06-21','🧘','Wellness at home','Find a quiet and flexible space for movement, daylight and comfortable air flow.',53],
  ['bonalu-2027','Bonalu Celebrations (indicative)','2027-07-11','🌺','Telangana heritage','Make room for hospitality, family visits and welcoming entrances with easy maintenance.',76,true],
  ['guru-purnima-2027','Guru Purnima','2027-07-18','📚','Learning and gratitude','Create study and reading spaces that adapt as family needs change.',58],
  ['varalakshmi-vratam-2027','Varalakshmi Vratam','2027-08-13','🪷','Tradition and prosperity','Plan practical puja storage, gathering spaces and light where they fit your needs.',71],
  ['independence-day-2027','Independence Day','2027-08-15','🇮🇳','A vision for the future','Explore well-built homes with detailed specifications and transparent project decisions.',85],
  ['raksha-bandhan-2027','Raksha Bandhan','2027-08-17','🎁','Family connections','Design comfortable shared rooms and purposeful storage for family life.',68],
  ['janmashtami-2027','Krishna Janmashtami','2027-08-25','🦚','Joy and celebration','Bring warmth to family spaces, safe décor arrangements and accessible storage.',73],
  ['ganesh-chaturthi-2027','Ganesh Chaturthi','2027-09-04','🐘','Welcoming beginnings','Plan space for family gathering, adaptable furniture and a flexible pooja area.',89],
  ['teachers-day-2027',"Teachers' Day",'2027-09-05','✏️','Spaces that encourage learning','Consider efficient workstations, comfortable lighting and sound-aware study areas.',52],
  ['navratri-2027','Navratri','2027-09-30','🌸','Nine nights of celebration','Think through flexible gathering space, festive lighting and easy-to-refresh décor.',76],
  ['gandhi-jayanti-2027','Gandhi Jayanti','2027-10-02','🕊️','Simplicity and purpose','Prioritize functional spaces, responsible resource use and straightforward plans.',55],
  ['bathukamma-2027','Saddula Bathukamma','2027-10-07','💐','Floral traditions of Telangana','Consider welcoming verandas, usable courtyards and durable spaces for family festivities.',83],
  ['dussehra-2027','Dussehra','2027-10-09','🏹','A season of new projects','Compare home-building scopes and reimagine the rooms that matter most.',90],
  ['diwali-2027','Diwali','2027-10-29','🪔','Festival of lights','Warm lighting, welcoming living rooms and thoughtfully planned spaces make celebrations more comfortable.',96],
  ['bhai-dooj-2027','Bhai Dooj','2027-10-31','🪔','Together at home','Design spaces that make family visits easy, comfortable and memorable.',63],
  ['chhath-puja-2027','Chhath Puja','2027-11-04','🌅','Gratitude and togetherness','Consider convenient outdoor access, simple upkeep and shared family areas.',66],
  ["dhanteras-2026","Dhanteras","2026-11-06","🪙","New beginnings and preparation","Plan a lasting home project with a thoughtful budget, written inclusions and clear decisions.",72],
  ["govardhan-puja-2026","Govardhan Puja","2026-11-10","🌿","Family and gratitude","Explore comfortable family spaces that are designed around everyday living.",68],
  ["bhai-dooj-2026","Bhai Dooj","2026-11-11","🎁","Family connections","Imagine welcoming rooms with generous seating and storage for relatives visiting.",64],
  ["devutthana-ekadashi-2026","Devutthana Ekadashi","2026-11-20","🪷","An auspicious new chapter","Review your project goals, permissions and budget before committing to construction.",52],
  ["tulsi-vivah-2026","Tulsi Vivah","2026-11-21","🌿","Home and tradition","Explore practical courtyard, balcony and prayer-area layouts for your household.",57],
  ["kartika-pournami-2026","Kartika Pournami","2026-11-24","🪔","Light and reflection","Plan a calm home with comfortable lighting, ventilation and easy-to-use rooms.",63],
  ["christmas-eve-2026","Christmas Eve","2026-12-24","⭐","Celebration preparations","Make entertaining comfortable with flexible dining layouts and simple festive styling.",48],
  ["new-years-eve-2026","New Year's Eve","2026-12-31","🎆","Looking ahead","Review the improvements you want for your home in the coming year.",56],
  ["national-youth-day-2027","National Youth Day","2027-01-12","📚","Ideas and ambition","Build more adaptable study and workspaces with efficient lighting and storage.",51],
  ["lohri-2027","Lohri","2027-01-14","🔥","Winter gathering","Plan practical outdoor seating and welcoming indoor spaces for family celebrations.",59],
  ["pongal-2027","Pongal","2027-01-15","🌾","Harvest celebrations","Create practical kitchens, welcoming dining rooms and flexible family spaces.",67],
  ["kanuma-2027","Kanuma","2027-01-16","🐄","Rural roots and gratitude","Plan durable entries, outdoor areas and family gathering zones.",65],
  ["guru-gobind-singh-jayanti-2027","Guru Gobind Singh Jayanti","2027-01-15","✨","Courage and service","Consider welcoming shared areas and accessible spaces for friends and family.",60],
  ["netaji-jayanti-2027","Netaji Subhas Chandra Bose Jayanti","2027-01-23","🇮🇳","Commitment and leadership","Plan a home project responsibly with transparent scope and documented decisions.",54],
  ["national-martyrs-day-2027","Martyrs' Day","2027-01-30","🕊️","Remembrance and reflection","Create peaceful, functional rooms that support everyday family life.",40],
  ["shivaji-jayanti-2027","Chhatrapati Shivaji Maharaj Jayanti","2027-02-19","🏛️","Heritage and resilience","Choose durable materials, thoughtful plans and long-term value.",54],
  ["guru-ravidas-jayanti-2027","Guru Ravidas Jayanti","2027-02-20","🪷","Equality and dignity","Consider accessible homes with flexible spaces for changing needs.",54],
  ["jamat-ul-vida-2027","Jumat-ul-Vida","2027-03-05","🌙","Community and reflection","Plan welcoming shared spaces and practical room circulation.",43,true],
  ["holika-dahan-2027","Holika Dahan","2027-03-21","🔥","Renewal and hope","Choose durable surfaces and easy-to-maintain family spaces.",61],
  ["nowruz-2027","Nowruz","2027-03-21","🌷","Spring new beginnings","Refresh indoor lighting, finishes and family room layouts.",61],
  ["easter-2027","Easter","2027-03-28","🐣","Hope and renewal","Explore brighter dining spaces, welcoming living rooms and flexible family layouts.",70],
  ["gudi-padwa-2027","Gudi Padwa","2027-04-07","🌿","New year and renewal","Use the season to plan thoughtfully for better storage and comfortable rooms.",62],
  ["cheti-chand-2027","Cheti Chand","2027-04-08","🌊","New beginnings","Create a project brief that balances tradition, comfort and modern everyday needs.",57],
  ["baisakhi-2027","Baisakhi","2027-04-14","🌾","Harvest and togetherness","Consider welcoming family areas, natural ventilation and practical dining spaces.",66],
  ["mahavir-jayanti-2027","Mahavir Jayanti","2027-04-19","🪷","Mindful living","Explore uncluttered spaces, natural light and materials selected for durability.",61],
  ["tagore-jayanti-2027","Rabindranath Tagore Jayanti","2027-05-07","📖","Art and imagination","Plan inspiring reading corners and creative rooms for the family.",51],
  ["mothers-day-2027","Mother's Day","2027-05-09","💐","Family appreciation","Think of ergonomic kitchens, useful storage and relaxing corners for family time.",63],
  ["buddha-purnima-2027","Buddha Purnima","2027-05-20","🪷","Peace and balance","Explore restful layouts, quiet corners and natural daylight.",64],
  ["islamic-new-year-2027","Islamic New Year","2027-06-06","🌙","A time for reflection","Consider comfortable family gathering areas with thoughtful circulation.",50,true],
  ["muharram-2027","Muharram / Ashura","2027-06-15","🕊️","Commemoration and respect","Focus on calm, practical and welcoming interiors for daily life.",42,true],
  ["kabir-jayanti-2027","Kabir Das Jayanti","2027-06-18","📚","Simplicity and wisdom","Prioritize clear plans, useful rooms and long-lasting specifications.",50],
  ["fathers-day-2027","Father's Day","2027-06-20","💙","Family connection","Explore shared living areas, reading corners and spaces for togetherness.",57],
  ["jagannath-rath-yatra-2027","Jagannath Rath Yatra","2027-07-05","🛕","Community and devotion","Plan accessible entrances, gathering spaces and practical storage.",63],
  ["tholi-ekadashi-2027","Tholi Ekadashi","2027-07-14","🪷","Auspicious season","Plan a home with clarity around layout, construction stages and materials.",51],
  ["friendship-day-2027","Friendship Day","2027-08-01","🤝","Connection and warmth","Create inviting living and dining rooms for friends and family.",55],
  ["eid-milad-un-nabi-2027","Eid Milad-un-Nabi","2027-08-15","🌙","Community and gratitude","Consider warm shared spaces and comfortable lighting.",54,true],
  ["hartalika-teej-2027","Hartalika Teej","2027-09-03","🌼","Tradition and celebration","Plan thoughtful prayer storage, welcoming rooms and practical finishes.",59],
  ["onam-2027","Onam","2027-09-12","🌸","Harvest and hospitality","Imagine spacious dining arrangements and flexible gathering areas.",68],
  ["engineers-day-2027","Engineers' Day","2027-09-15","📐","Engineering and quality","Ask detailed questions about structure, specifications, scope and project supervision.",65],
  ["bathukamma-begins-2027","Bathukamma Celebrations Begin","2027-09-30","💐","Telangana flower festival","Plan welcoming courtyards and airy family spaces for seasonal gatherings.",71],
  ["durga-ashtami-2027","Durga Ashtami","2027-10-07","🌺","Strength and celebration","Design flexible rooms and warm lighting for family gatherings.",70],
  ["maha-navami-2027","Maha Navami","2027-10-08","🪷","Celebration and reflection","Explore thoughtful home layouts, finishes and storage ideas.",67],
  ["saraswati-puja-2027","Saraswati Puja","2027-10-08","📚","Learning and creativity","Make room for study, inspiration and organized home working.",60],
  ["karwa-chauth-2027","Karwa Chauth","2027-10-18","🌙","Family and togetherness","Plan welcoming balconies, calm bedrooms and functional storage.",59],
  ["dhanteras-2027","Dhanteras","2027-10-27","🪙","Planning for prosperity","Put long-term value first with a transparent materials and project-cost brief.",72],
  ["naraka-chaturdashi-2027","Naraka Chaturdashi","2027-10-28","🪔","Fresh light","Consider useful lighting layers and comfortable, safe family spaces.",60],
  ["govardhan-puja-2027","Govardhan Puja","2027-10-30","🌿","Gratitude and family","Explore convenient dining spaces and easy-to-maintain finishes.",67],
  ["nagula-chavithi-2027","Nagula Chavithi","2027-11-02","🌿","Telugu tradition","Explore safe outdoor circulation, practical entrance spaces and easy maintenance.",58],
  ["skanda-sashti-2027","Skanda Sashti","2027-11-04","🛕","Devotion and resilience","Plan quiet family spaces and durable, thoughtful interiors.",52],
  ["devutthana-ekadashi-2027","Devutthana Ekadashi","2027-11-10","🪷","New beginnings","Set out the plot, floor plan and budget before requesting a quote.",55],
  ["tulsi-vivah-2027","Tulsi Vivah","2027-11-11","🌱","Home tradition","Consider natural light and practical balconies or courtyard arrangements.",60],
  ["guru-nanak-jayanti-2027","Guru Nanak Jayanti","2027-11-14","✨","Community and service","Create inclusive shared spaces with easy access and comfortable finishes.",69],
  ["karthika-pournami-2027","Karthika Pournami","2027-11-14","🪔","Light and reflection","Create a calm atmosphere with careful lighting, ventilation and practical rooms.",65],
  ["childrens-day-2027","Children's Day","2027-11-14","🎈","Growing together","Plan safe play areas, useful storage and adaptable study spaces.",58],
  ["constitution-day-2027","Constitution Day","2027-11-26","📜","Equality and responsibility","Explore accessible spaces and transparent decision-making for home projects.",52],
  ["national-education-day-2026","National Education Day","2026-11-11","📚","Education and opportunity","Recognise the importance of learning and inclusive opportunities for every household.",53],
  ["childrens-day-2026","Children's Day","2026-11-14","🎈","Children's wellbeing","Reflect on safe, accessible homes where children have space to learn and play.",54],
  ["birsa-munda-jayanti-2026","Birsa Munda Jayanti","2026-11-15","🌿","Indigenous heritage and courage","Honour India's Adivasi heritage and the legacy of Birsa Munda.",51],
  ["constitution-day-2026","Constitution Day","2026-11-26","📜","Rights and responsibilities","Remember India's constitutional values and the importance of equality and accessibility.",65],
  ["mumbai-attacks-remembrance-2026","26/11 Mumbai Attacks Remembrance","2026-11-26","🕯️","In memory of the victims","Remember those who lost their lives in the 2008 Mumbai terrorist attacks and honour the responders.",94],
  ["navy-day-2026","Indian Navy Day","2026-12-04","⚓","Service and dedication","Recognise the dedication of the Indian Navy and those protecting the nation's maritime interests.",64],
  ["armed-forces-flag-day-2026","Armed Forces Flag Day","2026-12-07","🇮🇳","Service and solidarity","Acknowledge the service and sacrifice of India's armed forces and their families.",65],
  ["human-rights-day-2026","Human Rights Day","2026-12-10","🕊️","Dignity for everyone","Reflect on dignity, inclusion and accessible homes and communities.",57],
  ["vijay-diwas-2026","Vijay Diwas","2026-12-16","🇮🇳","Honouring our armed forces","Remember the service and sacrifice of the armed forces during the 1971 war.",75],
  ["national-mathematics-day-2026","National Mathematics Day","2026-12-22","📐","Learning and problem-solving","Celebrate mathematical thinking, careful measurement and thoughtful design.",51],
  ["veer-baal-diwas-2026","Veer Baal Diwas","2026-12-26","🕯️","Courage and remembrance","Honour the courage and sacrifice commemorated on Veer Baal Diwas.",66],
  ["armed-forces-veterans-day-2027","Armed Forces Veterans' Day","2027-01-14","🇮🇳","Honouring veterans","Recognise the service and sacrifices of veterans and their families.",63],
  ["army-day-2027","Indian Army Day","2027-01-15","🇮🇳","Commitment and service","Recognise the courage, service and dedication of the Indian Army.",68],
  ["national-girl-child-day-2027","National Girl Child Day","2027-01-24","🎓","Equality and opportunity","Reflect on equal opportunity, education and safer spaces for girls.",56],
  ["national-voters-day-2027","National Voters' Day","2027-01-25","🗳️","Civic participation","Recognise the importance of democratic participation and informed citizenship.",62],
  ["pulwama-black-day-2027","Pulwama Black Day (Remembrance)","2027-02-14","🕯️","In memory of the CRPF personnel","On 14 February, remember the 40 CRPF personnel killed in the Pulwama attack on 14 February 2019, and honour their service.",110],
  ["national-science-day-2027","National Science Day","2027-02-28","🔬","Science and discovery","Recognise the role of scientific thinking, practical engineering and responsible innovation.",59],
  ["shaheed-diwas-march-2027","Shaheed Diwas (Bhagat Singh, Rajguru and Sukhdev)","2027-03-23","🕯️","Remembering India's freedom fighters","Honour Bhagat Singh, Shivaram Rajguru and Sukhdev Thapar and their sacrifice for India's freedom.",88],
  ["jallianwala-bagh-remembrance-2027","Jallianwala Bagh Remembrance","2027-04-13","🕯️","In memory of the victims","Remember the victims of the Jallianwala Bagh massacre of 13 April 1919.",93],
  ["panchayati-raj-day-2027","National Panchayati Raj Day","2027-04-24","🏡","Communities and local governance","Highlight the importance of effective local institutions and community development.",50],
  ["national-technology-day-2027","National Technology Day","2027-05-11","💻","Innovation and engineering","Celebrate thoughtful innovation, building technology and practical improvements to homes.",67],
  ["kargil-vijay-diwas-2027","Kargil Vijay Diwas","2027-07-26","🇮🇳","Honouring courage and service","Remember the soldiers who served and gave their lives during the 1999 Kargil conflict.",88],
  ["national-handloom-day-2027","National Handloom Day","2027-08-07","🧵","Indian craft and textiles","Recognise India's weaving traditions and the role of durable, locally made textiles in homes.",56],
  ["partition-horrors-remembrance-2027","Partition Horrors Remembrance Day","2027-08-14","🕯️","Remembering lives affected by Partition","Reflect on the loss and suffering experienced during the Partition of India in 1947.",101],
  ["national-sports-day-2027","National Sports Day","2027-08-29","🏑","Sport and wellbeing","Consider flexible spaces that encourage movement, play and family fitness.",56],
  ["hindi-diwas-2027","Hindi Diwas","2027-09-14","📖","Language and culture","Recognise India's language traditions and accessible communication.",50],
  ["indian-air-force-day-2027","Indian Air Force Day","2027-10-08","✈️","Courage and service","Recognise the contribution of the Indian Air Force and its personnel.",70],
  ["police-commemoration-day-2027","Police Commemoration Day","2027-10-21","🕯️","Honouring officers lost in service","Remember police personnel who have lost their lives in the line of duty.",88],
  ["rashtriya-ekta-diwas-2027","Rashtriya Ekta Diwas (National Unity Day)","2027-10-31","🇮🇳","Unity and shared responsibility","Reflect on national unity and the importance of inclusive communities.",55],
  ["birsa-munda-jayanti-2027","Birsa Munda Jayanti","2027-11-15","🌿","Indigenous heritage and courage","Honour India's Adivasi heritage and the legacy of Birsa Munda.",52],
  ["mumbai-attacks-remembrance-2027","26/11 Mumbai Attacks Remembrance","2027-11-26","🕯️","In memory of the victims","Remember those who lost their lives in the 2008 Mumbai terrorist attacks and honour the responders.",94],
]

// Exactly three inclusive IST calendar dates: the two days before the observance and the observance day.
// UTC-only arithmetic avoids daylight-saving and local-machine timezone drift.
export function dateOffset(isoDate,days){
  const value=new Date(isoDate+'T00:00:00.000Z')
  if(Number.isNaN(value.getTime())||value.toISOString().slice(0,10)!==isoDate)throw Error('Invalid festival date: '+isoDate)
  value.setUTCDate(value.getUTCDate()+days)
  return value.toISOString().slice(0,10)
}
const MEMORIAL_IDS=new Set([
  'pulwama-black-day-2027','mumbai-attacks-remembrance-2026','mumbai-attacks-remembrance-2027',
  'partition-horrors-remembrance-2027','jallianwala-bagh-remembrance-2027',
  'shaheed-diwas-march-2027','national-martyrs-day-2027','police-commemoration-day-2027',
])
export const FESTIVAL_EVENTS = EVENTS.map(([slug,name,date,icon,theme,inspiration,priority,tentative=false])=>({
  slug,name,date,start:dateOffset(date,-2),end:date,icon,theme,inspiration,priority,tentative,
  kind:MEMORIAL_IDS.has(slug)?'remembrance':'occasion',
})).sort((a,b)=>a.date.localeCompare(b.date)||b.priority-a.priority)


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
      ['Compare the whole scope','Discuss structure, masonry, waterproofing, electrical and plumbing work, and finishing allowances.'],
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
      ['Know what is included','Review the item-wise cost breakdown, drawings, installation scope and agreed timelines.'],
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
export function activeFestivals(date=indiaToday()){
  return FESTIVAL_EVENTS.filter(event=>campaignStatus(event,date)==='active')
    .sort((a,b)=>b.priority-a.priority||a.date.localeCompare(b.date))
}
export function activeFestival(date=indiaToday()){
  return activeFestivals(date)[0]||null
}
export function festivalSeoRoutes(){
  return FESTIVAL_EVENTS.flatMap(event=>Object.values(CAMPAIGN_SERVICES).map(service=>{
    const year=event.date.slice(0,4)
    const title=event.kind==='remembrance'
      ?event.name+' '+year+' | '+service.name+' & Responsible Spaces | ProPulse'
      :event.name+' '+year+' '+service.title+' in Hyderabad | ProPulse'
    const description=event.kind==='remembrance'
      ?'A respectful remembrance of '+event.name+' '+year+' by ProPulse, Hyderabad. '+event.inspiration+' Learn how '+service.name.toLowerCase()+' can support safe, functional and inclusive communities, without promotional claims.'
      :'Explore '+event.name+' '+year+' '+service.name.toLowerCase()+' planning in Hyderabad with ProPulse. '+event.inspiration+' '+(service.key==='construction'?'Construction benefits up to ₹5 lakh':'10% off interiors')+' for eligible projects. Written quotation terms apply.'
    return {
      path:festivalPath(event,service.key),
      type:'festive-offer',title,description,
      heading:event.name+' '+year+' — '+service.name+' in Hyderabad',
      summary:'A '+event.name+'-inspired way to plan '+service.core+' in Hyderabad. Explore practical ideas and request a written project-specific estimate.',
      festivalSlug:event.slug,festivalName:event.name,festivalDate:event.date,
      campaignStart:event.start,campaignEnd:event.end,campaignTentative:event.tentative,campaignKind:event.kind,
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
