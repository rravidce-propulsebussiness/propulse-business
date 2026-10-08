// Curated architectural and interior design references, not customer jobs.
// Keep these distinct from the verified, completion-year professional feed.
// These entries are intentionally not backed by fake DB business accounts.
const img=(id,width=1100)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`
export const PORTFOLIO_CONCEPTS = [
  {
    id:'sample-courtyard',sample:true,category:'construction',type:'Residential Construction',
    title:'The Courtyard Residence',area:'Example layout · 3,250 sq ft',
    packageName:'Signature Construction',
    description:'Warm modern residential architecture with an open family layout, natural finishes and daylight-oriented spaces.',
    image:img('photo-1600585154340-be6161a56a0c'),
    images:[img('photo-1600585152915-d208bec867a1'),img('photo-1600047509807-ba8f99d2cdde')],
    sampleSpecs:['Illustrative RCC structure and masonry scope','Space, elevation and ventilation coordination','Flooring and material palette options','Electrical and plumbing planning','Exterior finishing and waterproofing concepts'],
  },
  {
    id:'sample-warm-home',sample:true,category:'design',type:'Residential Interiors',
    title:'The Warm Minimal Home',area:'Example layout · 1,580 sq ft',
    packageName:'Premium Interiors',
    description:'Contemporary interiors exploring natural oak tones, functional storage, warm lighting and a calm family setting.',
    image:img('photo-1600210492486-724fe5c67fb0'),
    images:[img('photo-1600607687939-ce8a6c25118c'),img('photo-1600566753086-00f18fb6b3ea')],
    sampleSpecs:['Modular kitchen design concept','Wardrobe and TV wall planning','False ceiling and layered lighting','Practical storage layout','Finish and hardware selection options'],
  },
  {
    id:'sample-duplex',sample:true,category:'construction',type:'Residential Construction',
    title:'The Contemporary Duplex',area:'Example layout · 2,940 sq ft',
    packageName:'Classic Construction',
    description:'A two-level home concept focused on clean elevations, flowing family spaces and a well-considered staircase.',
    image:img('photo-1600607687920-4e2a09cf159d'),
    images:[img('photo-1600047509807-ba8f99d2cdde'),img('photo-1600585154340-be6161a56a0c')],
    sampleSpecs:['RCC structure and masonry planning','Staircase, balcony and access design','Flooring and wall finish options','Doors, windows and fixtures','Waterproofing and painting scope'],
  },
  {
    id:'sample-kitchen',sample:true,category:'design',type:'Modular Kitchen',
    title:'A Kitchen Made for Living',area:'Example layout · 220 sq ft',
    packageName:'Modular Kitchen',
    description:'An inviting modular kitchen reference with neat storage, practical work zones and contrasting materials.',
    image:img('photo-1556911220-bff31c812dba'),
    images:[img('photo-1600607687939-ce8a6c25118c')],
    sampleSpecs:['Layout and cabinet planning','Countertop and backsplash selection','Drawer, pantry and corner storage options','Task and ambient lighting','Appliance and service provisions'],
  },
  {
    id:'sample-villa',sample:true,category:'design',type:'Residential Interiors',
    title:'Quiet Luxury Living',area:'Example layout · 1,880 sq ft',
    packageName:'Elite Interiors',
    description:'Layered neutral materials, decorative lighting and integrated cabinetry create a refined interior design direction.',
    image:img('photo-1600566753086-00f18fb6b3ea'),
    images:[img('photo-1600566753190-17f0baa2a6c3'),img('photo-1600566753051-f0b89df2dd90')],
    sampleSpecs:['Fixed furniture design references','Kitchen and utility storage','Premium-look finish comparisons','Decorative and ambient lighting','Wardrobe and media wall layouts'],
  },
  {
    id:'sample-workspace',sample:true,category:'design',type:'Commercial Interiors',
    title:'The Modern Workspace',area:'Example layout · 2,300 sq ft',
    packageName:'Commercial Fit-Out',
    description:'An adaptable workspace concept with collaborative zones, welcoming reception and comfortable working areas.',
    image:img('photo-1497366754035-f200968a6e72'),
    images:[img('photo-1497366811353-6870744d04b2')],
    sampleSpecs:['Reception and waiting area concept','Workstation and partition layouts','Meeting room planning','Data, power and lighting provisions','Material and furniture schedule'],
  },
]
// Stable shareable URLs until replaced by genuine business-uploaded work.
export const findPortfolioConcept=id=>PORTFOLIO_CONCEPTS.find(project=>project.id===id)||null
