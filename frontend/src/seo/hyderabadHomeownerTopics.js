// Research-led editorial topic map. These are content opportunities, not measured keyword-volume rankings.
const subjectGroups={
  "Construction Cost & Budget": [
    "independent house construction cost per square foot",
    "100 square yard house construction budget",
    "150 square yard house construction budget",
    "200 square yard house construction budget",
    "2BHK independent house construction budget",
    "3BHK independent house construction budget",
    "G+1 house construction budget",
    "G+2 house construction budget",
    "villa construction budget",
    "grey structure construction cost"
  ],
  "Plot, Plans & Permissions": [
    "plot dimensions and house planning",
    "west-facing house floor plan",
    "east-facing house floor plan",
    "north-facing house floor plan",
    "south-facing house floor plan",
    "GHMC building permission application",
    "BuildNow building permission application",
    "HMDA layout and land-use verification",
    "occupancy certificate for an individual house",
    "documents to verify before buying a plot"
  ],
  "Architecture & Space Planning": [
    "small plot house floor plan",
    "20 by 30 feet house plan",
    "30 by 40 feet house plan",
    "duplex house floor plan",
    "narrow plot house design",
    "staircase placement in a small house",
    "natural ventilation and daylight planning",
    "Vastu considerations in house planning",
    "parking and setback planning",
    "future first-floor expansion planning"
  ],
  "Materials & Procurement": [
    "cement grade selection for house construction",
    "OPC versus PPC cement for a home",
    "TMT steel grade selection",
    "Fe500 versus Fe500D reinforcement steel",
    "AAC blocks versus red bricks",
    "M-sand versus river sand",
    "coarse aggregate size for RCC work",
    "waterproof plywood versus BWR plywood",
    "tile selection for home flooring",
    "door and window material selection"
  ],
  "Structure & Concrete Quality": [
    "soil test before house construction",
    "foundation type selection for a residential plot",
    "RCC footing reinforcement checks",
    "column size and structural design review",
    "beam reinforcement inspection",
    "slab concrete grade selection",
    "ready mix concrete versus site mix",
    "concrete slump test at site",
    "curing schedule for RCC slabs",
    "structural engineer site inspection checklist"
  ],
  "Construction Stages & Execution": [
    "house construction step-by-step process",
    "excavation and foundation stage checklist",
    "plinth beam construction checklist",
    "RCC column and beam execution",
    "brickwork quality inspection",
    "plumbing rough-in before plastering",
    "electrical conduit planning before plastering",
    "internal and external plastering checklist",
    "flooring installation sequence",
    "house handover and snagging checklist"
  ],
  "Waterproofing, Repairs & Defects": [
    "terrace waterproofing for Hyderabad homes",
    "bathroom sunken slab waterproofing",
    "balcony leakage repair",
    "external wall seepage treatment",
    "basement water leakage prevention",
    "dampness on ground floor walls",
    "hairline cracks in plaster",
    "diagonal cracks near doors and windows",
    "concrete honeycombing repair assessment",
    "roof heat reduction and insulation"
  ],
  "Interior Design & Full Home Costs": [
    "1BHK interior design scope",
    "2BHK interior design cost",
    "3BHK interior design cost",
    "4BHK interior design cost",
    "villa interior design budget",
    "turnkey home interiors versus carpenter work",
    "interior design quotation comparison",
    "interior design project timeline",
    "interior materials and hardware specifications",
    "interior design warranty and handover checklist"
  ],
  "Room-by-Room Interior Ideas": [
    "modular kitchen design and cost",
    "parallel kitchen layout planning",
    "L-shaped kitchen storage planning",
    "kitchen loft and tall unit design",
    "master bedroom wardrobe planning",
    "sliding wardrobe versus hinged wardrobe",
    "kids bedroom storage and study design",
    "living room TV unit and storage design",
    "pooja unit design for compact homes",
    "bathroom vanity and mirror cabinet design"
  ],
  "Renovation, Utilities & Smart Homes": [
    "old house renovation cost",
    "bathroom renovation budget",
    "kitchen renovation without changing plumbing",
    "house painting cost and finish selection",
    "electrical rewiring in an old house",
    "plumbing replacement in an old house",
    "solar rooftop system planning for a house",
    "rainwater harvesting for an independent house",
    "sump and overhead tank capacity planning",
    "home automation and smart lighting planning"
  ]
}
const intentTemplates=[s=>`How much does ${s} cost in Hyderabad?`,
s=>`Step-by-step guide to ${s} in Hyderabad`,
s=>`Homeowner checklist for ${s} in Hyderabad`,
s=>`Common mistakes to avoid with ${s} in Hyderabad`,
s=>`What should you compare before choosing ${s} in Hyderabad?`,
s=>`Materials, measurements and specifications for ${s} in Hyderabad`,
s=>`How long does ${s} take for a Hyderabad home?`,
s=>`Questions to ask a contractor or designer about ${s}`,
s=>`How to plan and budget for ${s} in Hyderabad`,
s=>`When should a Hyderabad homeowner hire a professional for ${s}?`]

export const HYDERABAD_HOMEOWNER_TOPIC_GROUPS=Object.entries(subjectGroups).map(([category,items])=>({
  category,
  topics:items.flatMap(subject=>intentTemplates.map((template,index)=>({
    id:category.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+items.indexOf(subject)+'-'+index,
    subject,
    title:template(subject),
    intent:['Cost','How-to','Checklist','Problem prevention','Comparison','Materials & specifications','Timeline','Expert questions','Planning','Professional advice'][index],
  }))),
}));
export const HYDERABAD_HOMEOWNER_TOPICS=HYDERABAD_HOMEOWNER_TOPIC_GROUPS.flatMap(group=>group.topics.map(topic=>({...topic,category:group.category})));
