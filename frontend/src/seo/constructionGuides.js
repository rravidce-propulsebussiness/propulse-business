const section=(heading,body,bullets=[])=>({heading,body,bullets})

export const CONSTRUCTION_GUIDE_HUB_ROUTE={
  path:'/guides',
  type:'guide-hub',
  title:'Home Construction & Interior Guides | ProPulse',
  description:'Practical guides for home construction, materials, concrete quality, contractor selection, waterproofing, electrical, plumbing and interiors.',
  heading:'Home construction and interior planning guides',
  summary:'Research common construction and interior decisions, then turn the useful details into a project-specific requirement.',
}

export const CONSTRUCTION_GUIDES=[
  {
    slug:'best-steel-for-house-construction',
    type:'construction-guide',
    category:'Materials',
    title:'Best Steel for House Construction | TMT Bar Selection Guide | ProPulse',
    description:'Learn how to choose reinforcement steel for house construction, what IS 1786 means, how Fe grades differ and what to verify before buying TMT bars.',
    heading:'What is the best steel for house construction?',
    summary:'There is no single steel brand or grade that is best for every house. Start with the structural engineer’s design, verify BIS-conforming reinforcement and compare grade, ductility, test certificates, source and storage before purchase.',
    searchTerms:['best steel for house construction','best TMT bar for home construction','Fe500 vs Fe500D for house','steel for RCC house construction','IS 1786 steel for construction'],
    ctaLabel:'Get Construction Quote',
    cta:'/quote?package=standard#construction',
    note:'Structural reinforcement must follow the project’s structural design. Do not substitute bar grade, diameter or reinforcement quantity based only on an online guide.',
    sections:[
      section('Start with the structural design, not a brand ranking','The structural engineer should specify reinforcement grade, bar diameters, spacing, laps, anchorage and detailing for the actual building. A commonly marketed grade is not automatically correct for every footing, column, beam or slab.'),
      section('Check the applicable Indian reinforcement standard','For high-strength deformed bars used as reinforcement, BIS lists IS 1786:2008. The standard covers multiple Fe grades and requirements for reinforcement steel. IS 456:2000 remains a key code of practice for plain and reinforced concrete.',['Ask for BIS-conforming material from a traceable source','Match the grade to the structural drawings','Keep manufacturer test certificates and invoices','Do not accept unidentified re-rolled bars with uncertain origin']),
      section('Understand grade and ductility','Higher yield strength alone does not make a bar universally better. Ductility, elongation, bend performance, weldability where relevant and the structural design all matter. “D” variants are associated with enhanced ductility requirements within the standard.'),
      section('What to verify before steel reaches the site','Material control matters as much as the name printed on the bar.',['Correct grade and diameter against drawings','Bar markings and source traceability','Mill or manufacturer test certificate where applicable','Weight/diameter checks when required','Rust, contamination and poor storage conditions','Proper stacking above ground and protection from mud/standing water']),
      section('Questions to ask your contractor','Ask which grade is specified by the structural engineer, how steel quantity is measured, whether cutting/bending wastage is included, how substitutions are approved and who signs off reinforcement before concreting.')
    ],
  },
  {
    slug:'prevent-cracks-in-house',
    type:'construction-guide',
    category:'Construction Quality',
    title:'How to Reduce Cracks in a New House | Construction Precautions | ProPulse',
    description:'Construction precautions that can reduce the risk of cracks in a new house, including design, concrete quality, curing, joints, masonry, waterproofing and site supervision.',
    heading:'Precautions to reduce cracks in a new house',
    summary:'No practical building can be promised to remain completely crack-free. The goal is to reduce avoidable cracking through correct structural design, material control, workmanship, curing, movement detailing and timely inspection.',
    searchTerms:['how to avoid cracks in house construction','precautions to avoid cracks in home','wall cracks after construction','concrete crack prevention house','curing to prevent cracks'],
    ctaLabel:'Create Construction Requirement',
    cta:'/quote?package=standard#construction',
    note:'Wide, growing, diagonal or structural cracks should be assessed by a qualified structural professional. Cosmetic crack advice should not be used to diagnose structural safety.',
    sections:[
      section('Get the structure and foundation designed for the actual site','Soil conditions, spans, floor count, loads, openings and foundation behaviour affect cracking. Avoid copying reinforcement or footing details from another house.'),
      section('Control concrete quality and water','Uncontrolled water addition, poor batching and weak compaction can increase shrinkage, segregation and defects. Use the specified concrete grade and approved mix/process.',['Do not add water casually at site to improve workability','Compact concrete properly without over-vibration','Protect reinforcement cover and formwork dimensions','Plan pours so avoidable cold joints are reduced']),
      section('Curing is a construction process, not a finishing step','Early moisture loss and hot-weather concreting can increase cracking risk. BIS lists IS 7861 (Part 1) for hot-weather concreting practice and IS 456 for reinforced concrete practice. Follow the project engineer’s curing method and duration.'),
      section('Detail movement between different materials','Cracks often occur where RCC and masonry meet, around openings, long walls, chases and changes in geometry. Proper detailing, suitable mesh/reinforcement where specified, control joints where appropriate and sequencing can reduce recurring cracks.'),
      section('Do not ignore masonry and plaster workmanship','Block/brick quality, mortar consistency, curing, chasing for services and plaster thickness can influence non-structural cracks. Coordinate electrical/plumbing chases before final plaster where possible.'),
      section('Fix water ingress early','Leakage and repeated wetting can damage finishes and reveal or worsen defects. Roofs, toilets, balconies, external walls and plumbing penetrations need planned waterproofing and testing before finishes conceal them.')
    ],
  },
  {
    slug:'2bhk-interiors-hyderabad',
    type:'construction-guide',
    category:'Interiors',
    title:'2BHK Interiors in Hyderabad | Planning, Budget & Checklist | ProPulse',
    description:'Plan 2BHK interiors in Hyderabad with a room-by-room scope, modular kitchen and wardrobe checklist, material decisions, package references and quote comparison tips.',
    heading:'How to plan 2BHK interiors in Hyderabad',
    summary:'A useful 2BHK interior quote starts with the actual rooms, storage needs, kitchen layout, wardrobe sizes, finishes, electrical changes and move-in timeline—not only a generic per-sq-ft number.',
    searchTerms:['2bhk interiors in Hyderabad','2bhk interior design Hyderabad','2bhk interior cost Hyderabad','2bhk modular interiors Hyderabad','2bhk home interiors Hyderabad'],
    ctaLabel:'View Interior Packages',
    cta:'/packages#interior',
    sections:[
      section('Create a room-by-room scope first','Separate must-have work from optional decor so every interior company quotes the same requirement.',['Kitchen base and wall units','Master-bedroom wardrobe and loft','Second-bedroom wardrobe or study','TV/storage unit','False ceiling if required','Electrical and lighting changes','Curtains, loose furniture and decor as separate items']),
      section('Measure actual cabinet areas','Carpet area alone does not define modular-interior cost. Wardrobe width/height, kitchen running length, lofts, internal accessories and finish choices matter much more for cabinetry.'),
      section('Compare material specifications, not package names','Ask for the actual board/ply grade, laminate thickness/brand allowance, hardware range, edge treatment, internal finish, basket/accessory allowance and warranty terms.'),
      section('Keep civil and modular scope separate','Painting, electrical relocation, plumbing changes, tile work, false ceiling and masonry alterations may sit outside modular cabinetry. Make exclusions explicit before comparing quotations.'),
      section('Use one final drawing set','After design freeze, approve dimensions, internal layouts, finish codes, appliance sizes and electrical points before production. Changes after production can create delays and variation costs.')
    ],
  },
  {
    slug:'choose-construction-contractor-hyderabad',
    type:'construction-guide',
    category:'Contractor Selection',
    title:'How to Choose the Best Construction Contractor in Hyderabad | ProPulse',
    description:'Searching for the best contractor in Hyderabad? Use a practical contractor-comparison checklist covering scope, projects, materials, exclusions, milestones, warranty and contract terms.',
    heading:'How to choose the right construction contractor in Hyderabad',
    summary:'“Best contractor” depends on project fit. Compare every construction company against the same drawings, scope, materials, budget, timeline and written commercial terms before deciding.',
    searchTerms:['best contractor in Hyderabad','best construction company in Hyderabad','home construction contractor Hyderabad','house construction contractors Hyderabad','how to choose builder in Hyderabad'],
    ctaLabel:'Find ProPulse Professionals',
    cta:'/experts',
    sections:[
      section('Shortlist for project fit, not only brand visibility','A contractor experienced in a similar house type, plot condition, specification level and project size may be more relevant than the most visible name online.'),
      section('Send the same scope to every bidder','Use the same drawings, built-up area, floor count, material schedule and expected finish level. Otherwise two headline prices may represent different work.'),
      section('Check completed work and references','Review completed and in-progress projects where possible. Ask what the contractor directly manages, how supervision works and how material substitutions are approved.'),
      section('Compare exclusions line by line','Clarify approvals, architectural/structural design, soil tests, utility connections, compound walls, borewell, sump, external works, lifts, solar, interiors, taxes and escalation terms.'),
      section('Review payment and variation rules','Milestone payments should map to measurable progress. Understand how extra items, design changes and quantity variations are priced before signing.'),
      section('Prefer a written contract and handover checklist','The agreement should capture scope, specifications, timeline assumptions, payment stages, change control, warranty/defect obligations and handover deliverables.')
    ],
  },
  {
    slug:'home-construction-checklist',
    type:'construction-guide',
    category:'Planning',
    title:'Home Construction Checklist | Plot to Handover | ProPulse',
    description:'A practical home construction checklist covering site inputs, design, soil and structure, quotations, materials, execution, waterproofing, quality checks and handover.',
    heading:'Home construction checklist: plot to handover',
    summary:'Use a stage-by-stage checklist so important decisions are made before work begins rather than during expensive site changes.',
    searchTerms:['home construction checklist','house construction steps India','new home construction checklist','construction checklist for owner','house building planning checklist'],
    ctaLabel:'Get Construction Quote',
    cta:'/quote?package=standard#construction',
    sections:[
      section('Before design','Collect plot dimensions, survey information, access constraints, ownership/approval inputs, utility information and your family’s room/parking/future-floor requirements.'),
      section('Design and engineering','Freeze architectural layouts, structural design, service routes and major elevations before comparing execution quotations.'),
      section('Quotation comparison','Check scope, quantities/measurement method, material allowances, exclusions, taxes, milestones, timeline assumptions and variation rules.'),
      section('Structure and masonry','Use approved drawings and stage inspections for reinforcement, formwork, concrete, masonry openings and service sleeves before work is concealed.'),
      section('Waterproofing and services','Plan wet areas, roofs, balconies, plumbing pressure tests, electrical conduits and drainage before finishes.'),
      section('Finishes and handover','Approve samples, snag rooms systematically, test services, collect warranties/manuals, document changes and close pending items before final payment.')
    ],
  },
  {
    slug:'waterproofing-precautions-new-house',
    type:'construction-guide',
    category:'Construction Quality',
    title:'Waterproofing Precautions for a New House | ProPulse',
    description:'Plan waterproofing for roofs, toilets, balconies, external walls, basements and service penetrations with substrate preparation, detailing, testing and protection checks.',
    heading:'Waterproofing precautions for a new house',
    summary:'Waterproofing works best as a coordinated construction system. Good detailing, substrate preparation, slopes, penetrations, testing and protection matter as much as the selected product.',
    searchTerms:['waterproofing precautions new house','toilet waterproofing checklist','terrace waterproofing new construction','how to prevent leakage in new house','waterproofing during house construction'],
    ctaLabel:'Create Construction Requirement',
    cta:'/quote?package=standard#construction',
    sections:[
      section('Identify every water-risk zone before finishing','Roofs, toilets, balconies, utility areas, sunken slabs, retaining/below-grade areas and pipe penetrations need a planned detail rather than a late repair.'),
      section('Prepare the substrate correctly','Weak, dusty, uneven or contaminated surfaces can undermine many waterproofing systems. Follow the approved system requirements before application.'),
      section('Detail corners, drains and penetrations','Changes in plane, pipe sleeves, floor traps, parapet junctions and thresholds are common leakage points. Use the project detail and compatible accessories/system components.'),
      section('Get slopes and drainage right','Waterproofing should not be expected to compensate for standing water caused by poor slopes or blocked drainage. Verify falls before final finishes.'),
      section('Test before covering the system','Where appropriate for the system and area, carry out the specified pond/flood or water test before tiles/screeds conceal the waterproofing. Document defects and repairs.'),
      section('Protect completed waterproofing','Subsequent trades can puncture or damage finished layers. Control access and use the specified protective screed/board/detail before continuing.')
    ],
  },
  {
    slug:'best-cement-for-house-construction',
    type:'construction-guide',
    category:'Materials',
    title:'Best Cement for House Construction | OPC, PPC & PSC Guide | ProPulse',
    description:'Understand how to choose cement for house construction, including OPC, PPC and PSC, relevant BIS standards, storage, freshness and project-specific selection.',
    heading:'What is the best cement for house construction?',
    summary:'There is no single cement type that is best for every structural and masonry application. Match the cement to the structural design, exposure conditions, concrete mix and project specification rather than choosing only by brand.',
    searchTerms:['best cement for house construction','OPC vs PPC for house construction','PPC cement for home construction','PSC cement for house','cement for RCC house construction'],
    ctaLabel:'Get Construction Quote',
    cta:'/quote?package=standard#construction',
    note:'Cement selection for structural concrete should follow the engineer-approved specification and concrete mix. Do not change cement type mid-project without technical review.',
    sections:[
      section('Start with the specified concrete and exposure conditions','The correct cement depends on the structural design, exposure, concrete grade, mix design and construction method. Brand popularity alone is not a technical specification.'),
      section('Know the common BIS cement families','BIS lists standards including IS 269:2015 for Ordinary Portland Cement, IS 455:2015 for Portland Slag Cement and IS 1489 for Portland Pozzolana Cement.',['Verify the bag carries the appropriate conformity marking','Check the cement type against the approved specification','Keep purchase invoices and batch/source records','Avoid mixing different cement types casually in one structural pour']),
      section('Store cement correctly','Keep bags dry, raised above the floor, protected from walls/moisture and arranged so older stock can be consumed first. Lumpy or moisture-damaged cement should not be accepted casually.'),
      section('Freshness and consistency matter','Long or poor storage can affect handling and performance. Control supply so site teams are not forced to use uncertain material simply because it is already delivered.'),
      section('Ask what the quotation includes','Clarify cement type/allowance, approved brands or equivalent criteria, whether concrete is site-mixed or ready-mixed and how substitutions are approved.')
    ],
  },
  {
    slug:'m-sand-vs-river-sand-house-construction',
    type:'construction-guide',
    category:'Materials',
    title:'M-Sand vs River Sand for House Construction | ProPulse',
    description:'Compare manufactured sand and river sand for house construction, including grading, cleanliness, source quality, concrete/masonry use and what to verify before purchase.',
    heading:'M-sand vs river sand: what should you use for a house?',
    summary:'Source quality, grading and suitability for the intended work matter more than the label alone. Fine aggregates used for concrete should meet the project specification and applicable aggregate requirements.',
    searchTerms:['m sand vs river sand for house construction','best sand for concrete house','M sand for plastering','manufactured sand for RCC','IS 383 sand for concrete'],
    ctaLabel:'Get Construction Quote',
    cta:'/quote?package=standard#construction',
    note:'Concrete aggregate selection should follow the approved mix/design and material testing requirements. Plastering and masonry sands may need different grading/finish characteristics.',
    sections:[
      section('Do not compare only by price','The useful comparison is grading, cleanliness, particle shape, fines, source consistency and suitability for concrete, masonry or plastering.'),
      section('Concrete aggregate has specification requirements','BIS lists IS 383:2016 for coarse and fine aggregates for concrete. Use approved sources and test material where required by the project quality plan.'),
      section('Manufactured sand can be consistent when properly produced','A controlled crushing and screening process can provide consistent grading, but poor-quality manufactured sand can still have excess fines or unsuitable characteristics.'),
      section('River sand quality varies by source','Natural sand is not automatically superior. Silt, organic contamination, grading and legality/source traceability need attention.'),
      section('Separate concrete, masonry and plaster needs','A sand suitable for structural concrete may not automatically give the desired plaster finish. Define each use in the material schedule and quotation.')
    ],
  },
  {
    slug:'red-brick-vs-aac-block-house',
    type:'construction-guide',
    category:'Materials',
    title:'Red Brick vs AAC Block for House Construction | ProPulse',
    description:'Compare red clay brick and AAC block for house construction by weight, workmanship, services, plastering, moisture detailing and project-specific suitability.',
    heading:'Red brick vs AAC block: how should you compare them?',
    summary:'Walling choice affects dead load, labour, chasing, plaster, fixing details, thermal behaviour and execution. The right option depends on the structural and architectural design, local workmanship and project priorities.',
    searchTerms:['red brick vs AAC block','AAC blocks for house construction','red bricks for house','best blocks for house construction','AAC block vs brick cost'],
    ctaLabel:'Create Construction Requirement',
    cta:'/quote?package=standard#construction',
    sections:[
      section('Compare the complete wall system','Unit price alone misses mortar/adhesive, plaster thickness, wastage, labour productivity, chasing, lintels, fixings and waterproofing details.'),
      section('Weight can influence the structural system','AAC is generally lighter than conventional clay masonry units, but wall type and load assumptions must be coordinated with the structural design.'),
      section('Workmanship changes the outcome','Poor jointing, improper curing where required, careless chasing and weak junction detailing can create cracking or finishing problems with any walling system.'),
      section('Plan service chases and heavy fixings','Electrical/plumbing routes and wall-mounted loads should be planned early. Use appropriate anchors/fixing systems for the selected substrate.'),
      section('Ask for one written wall specification','Define unit type, dimensions, mortar/adhesive, reinforcement/mesh at junctions where specified, plaster system and external-water protection before comparing quotes.')
    ],
  },
  {
    slug:'concrete-curing-house-construction',
    type:'construction-guide',
    category:'Construction Quality',
    title:'Concrete Curing for House Construction | Why It Matters | ProPulse',
    description:'Understand why concrete curing matters, how early moisture and temperature control affect concrete and what owners should verify on a house-construction site.',
    heading:'Concrete curing: what should a homeowner check?',
    summary:'Curing helps concrete retain the moisture and temperature conditions needed for cement hydration and strength development. The project engineer should define the curing method and duration for the actual concrete and weather conditions.',
    searchTerms:['concrete curing house construction','how many days curing for concrete','slab curing house','curing to avoid cracks','concrete curing in hot weather India'],
    ctaLabel:'View Construction Checklist',
    cta:'/guides/home-construction-checklist',
    note:'Do not use a generic online curing duration as a substitute for the engineer/specification for your concrete, cement type, member and weather conditions.',
    sections:[
      section('Start curing at the correct stage','Concrete should be protected from damaging early moisture loss while avoiding disturbance of fresh surfaces. Site teams should follow the approved method for slabs, columns, beams and other members.'),
      section('Hot and windy weather increases risk','Higher temperature, low humidity and wind can accelerate surface drying. BIS guidance includes IS 7861 (Part 1) for hot-weather concreting alongside IS 456 concrete practice.'),
      section('Keep curing continuous','Intermittent wetting that allows repeated drying is not the same as maintaining suitable curing conditions. Use the approved water, membrane or covering method for the member.'),
      section('Do not confuse formwork retention with curing','Keeping formwork in place may reduce exposed surface area, but exposed faces and subsequent surfaces still need the specified curing/protection.'),
      section('Document site quality','Record pour date, concrete grade/source, cube/test references where applicable, weather concerns and curing start/inspection notes for important structural pours.')
    ],
  },
  {
    slug:'soil-test-before-house-construction',
    type:'construction-guide',
    category:'Planning',
    title:'Soil Test Before House Construction | Foundation Planning Guide | ProPulse',
    description:'Learn why soil investigation matters before house construction, what information a structural engineer may need and why copying a neighbour’s foundation can be risky.',
    heading:'Do you need a soil test before building a house?',
    summary:'Foundation design depends on site conditions, building loads and geotechnical information. A neighbour’s footing size is not a reliable substitute for investigation and structural design.',
    searchTerms:['soil test before house construction','soil testing for home construction','foundation soil test cost Hyderabad','SBC soil test house','geotechnical investigation house'],
    ctaLabel:'Get Construction Quote',
    cta:'/quote?package=standard#construction',
    note:'Foundation decisions are structural and site-specific. Use a qualified geotechnical/structural professional for investigation interpretation and foundation design.',
    sections:[
      section('Soil conditions can change over short distances','Fill, expansive soils, groundwater, rock depth and past site use can vary even within the same neighbourhood.'),
      section('The investigation should match the project','The required scope depends on building size, loads, site history and local conditions. The structural/geotechnical team should decide the appropriate investigation.'),
      section('Use results in foundation design','Bearing conditions, settlement risk and groundwater information should feed into foundation selection and structural calculations.'),
      section('Do not use “safe bearing capacity” as the only decision','Foundation performance also involves settlement, variability, groundwater, excavation conditions and structural interaction.'),
      section('Include site investigation in pre-construction planning','Ask who arranges investigation, who reviews the report and whether foundation changes are treated as a variation before construction starts.')
    ],
  },
  {
    slug:'rcc-slab-before-concrete-checklist',
    type:'construction-guide',
    category:'Construction Quality',
    title:'RCC Slab Checklist Before Concreting | Home Construction | ProPulse',
    description:'A homeowner-friendly pre-pour checklist for RCC slabs covering approved drawings, reinforcement inspection, cover, formwork, service sleeves, cleanliness and concrete planning.',
    heading:'RCC slab checklist before concrete is poured',
    summary:'The most important slab checks happen before concrete hides the reinforcement and services. Use an engineer-led pre-pour inspection rather than relying only on a visual homeowner check.',
    searchTerms:['RCC slab checklist before concrete','slab reinforcement checklist house','before slab concreting checklist','RCC slab quality checks','house slab concrete precautions'],
    ctaLabel:'View Home Construction Checklist',
    cta:'/guides/home-construction-checklist',
    note:'Reinforcement size, spacing, laps, anchorage, cover and structural details must be checked against approved drawings by qualified project personnel. This guide is not a structural inspection substitute.',
    sections:[
      section('Confirm the latest approved drawings are on site','Avoid pouring against superseded structural or service drawings. Resolve architectural openings and structural details before the pour.'),
      section('Complete the reinforcement inspection','Engineer/site quality checks should cover bar grade/diameter, spacing, laps, anchorage, extra bars, openings and supports against drawings.'),
      section('Verify cover and supports','Cover blocks/chairs should be appropriate and stable so reinforcement position does not collapse during concreting.'),
      section('Coordinate electrical and plumbing sleeves','Sleeves, conduits, drain openings and reserved penetrations should be agreed before concrete. Unplanned post-cutting can damage finished work.'),
      section('Check formwork, access and pour plan','Formwork stability, levels, cleanliness, release agent, construction joints, pump/access route, manpower, backup equipment and curing preparation should be ready before concrete arrives.')
    ],
  },
  {
    slug:'electrical-planning-new-house',
    type:'construction-guide',
    category:'MEP Planning',
    title:'Electrical Planning Checklist for a New House | ProPulse',
    description:'Plan electrical points, loads, circuits, lighting, ACs, kitchen appliances, EV/solar readiness, earthing and future needs before walls and ceilings are finished.',
    heading:'Electrical planning checklist for a new house',
    summary:'Electrical changes become expensive once masonry, plaster and ceilings are finished. Plan room functions, appliance loads, circuiting and future needs before chasing and wiring begins.',
    searchTerms:['electrical planning new house','electrical points checklist home','new house wiring checklist','electrical layout for 2bhk 3bhk','home electrical planning India'],
    ctaLabel:'Create Construction Requirement',
    cta:'/quote?package=standard#construction',
    note:'Electrical design, protection devices, conductor sizing, earthing and code compliance should be handled by qualified electrical professionals.',
    sections:[
      section('Plan room use before counting switches','Furniture, bed positions, TV walls, study desks, kitchen appliances and outdoor equipment determine useful point locations.'),
      section('List major loads separately','ACs, geysers, ovens, induction hobs, pumps, lifts, EV charging and other large loads need early planning rather than spare sockets added later.'),
      section('Coordinate lighting with ceiling design','False ceilings, profile lights, fans, sensors and feature lighting need coordinated electrical and interior drawings.'),
      section('Plan data, security and automation conduits','Internet access points, cameras, doorbells, intercom, access control and future automation can be easier to provision during construction.'),
      section('Leave a documented as-built record','Panel schedules, circuit labels, conduit routes and test records are useful for maintenance and future renovation.')
    ],
  },
  {
    slug:'plumbing-checklist-new-house',
    type:'construction-guide',
    category:'MEP Planning',
    title:'Plumbing Checklist for a New House | Water & Drainage Planning | ProPulse',
    description:'Plan water supply, drainage, toilets, kitchen, utility, tank/pump systems, sleeves, testing and maintenance access before finishes close the walls and floors.',
    heading:'Plumbing checklist for a new house',
    summary:'Good plumbing planning starts before slab sleeves, wall chases and toilet levels are fixed. Coordinate water, drainage, waterproofing and maintenance access as one system.',
    searchTerms:['plumbing checklist new house','house plumbing planning','toilet plumbing checklist','water pipe planning home','drainage planning house construction'],
    ctaLabel:'Create Construction Requirement',
    cta:'/quote?package=standard#construction',
    sections:[
      section('Freeze fixture locations early','WC, basin, shower, kitchen sink, washing machine, dishwasher and outdoor taps affect pipe routes and drainage levels.'),
      section('Coordinate sleeves and vertical shafts','Plan service shafts and slab/wall penetrations before structural and masonry work is closed.'),
      section('Separate water and drainage decisions','Supply pressure/storage, hot water, rainwater and soil/waste drainage each need coordinated sizing, routing and access.'),
      section('Test before concealment','Pressure/leak testing and drainage checks should happen before tiles, ceilings or boxing make repairs difficult.'),
      section('Keep valves and cleanouts accessible','Future maintenance should not require unnecessary demolition. Mark concealed routes and retain as-built information.')
    ],
  },
  {
    slug:'wall-putty-primer-paint-sequence',
    type:'construction-guide',
    category:'Finishes',
    title:'Wall Putty, Primer & Paint Sequence for a New House | ProPulse',
    description:'Understand the typical wall-finish workflow from plaster/drying and surface preparation through putty, primer and paint, plus common causes of peeling and patchiness.',
    heading:'Putty, primer and paint: what sequence should a new house follow?',
    summary:'A good paint finish depends heavily on substrate dryness, plaster quality and surface preparation. Product sequence should follow the selected paint system and manufacturer instructions.',
    searchTerms:['wall putty primer paint sequence','painting process new house','putty before primer or after','new plaster painting checklist','how to avoid paint peeling new house'],
    ctaLabel:'View Home Construction Checklist',
    cta:'/guides/home-construction-checklist',
    sections:[
      section('Do not rush a wet wall into finishing','Moisture, active leakage or insufficiently dried plaster can contribute to blistering, efflorescence, peeling and colour variation.'),
      section('Repair the substrate before decorative coats','Remove loose material, repair cracks appropriately, address dampness and achieve the required surface flatness before the selected finishing system.'),
      section('Follow one compatible manufacturer system','Putty, primer and topcoat compatibility, dilution, drying intervals and number of coats should follow product instructions rather than a generic universal sequence.'),
      section('Use sample approvals for colour and sheen','Lighting, wall texture and batch variation affect appearance. Approve representative samples before completing large areas.'),
      section('Protect finished paint from later trades','Carpentry, electrical, plumbing and moving work can damage final coats. Sequence final touch-ups close to handover.')
    ],
  },
  {
    slug:'modular-kitchen-planning-hyderabad',
    type:'construction-guide',
    category:'Interiors',
    title:'Modular Kitchen Planning in Hyderabad | Layout & Material Checklist | ProPulse',
    description:'Plan a modular kitchen in Hyderabad by layout, appliance sizes, storage, countertop, shutters, hardware, electrical/plumbing points and installation sequence.',
    heading:'How to plan a modular kitchen in Hyderabad',
    summary:'The best kitchen quotation starts after appliance sizes, plumbing/electrical points, cabinet modules, storage needs and finish level are clear.',
    searchTerms:['modular kitchen Hyderabad','modular kitchen planning Hyderabad','kitchen interior cost Hyderabad','best modular kitchen layout','modular kitchen checklist'],
    ctaLabel:'View Interior Packages',
    cta:'/packages#interior',
    sections:[
      section('Fix appliance sizes before cabinet production','Refrigerator, hob, chimney, oven, microwave, dishwasher and sink sizes affect module widths and service points.'),
      section('Choose layout from room geometry and workflow','Straight, L-shaped, parallel, U-shaped and island layouts each have different aisle and service implications.'),
      section('Define cabinet material and finish separately','Internal board/ply, shutter material, laminate/acrylic/PU finish, edge treatment and moisture exposure should be explicit in the quote.'),
      section('Specify hardware and accessories','Hinges, channels, baskets, corner units, tall units and lift-up systems can materially change cost and usability.'),
      section('Coordinate countertop, dado and services','Counter level, backsplash/dado, sink cutout, gas line, RO, sockets and under-cabinet lighting should be coordinated before installation.')
    ],
  },
  {
    slug:'wardrobe-materials-plywood-mdf-hdhmr',
    type:'construction-guide',
    category:'Interiors',
    title:'Plywood vs MDF vs HDHMR for Wardrobes | Interior Material Guide | ProPulse',
    description:'Compare common wardrobe substrate choices such as plywood, MDF and HDHMR by moisture exposure, finish, screw holding, machining and project-specific use.',
    heading:'Plywood vs MDF vs HDHMR: what should you use for wardrobes?',
    summary:'There is no universal “best board” for every wardrobe. Select the substrate based on moisture exposure, finish type, hardware, machining requirements, budget and the interior specification.',
    searchTerms:['plywood vs MDF wardrobe','HDHMR vs plywood wardrobe','best wood for wardrobe','wardrobe material Hyderabad','best board for modular wardrobe'],
    ctaLabel:'View Interior Packages',
    cta:'/packages#interior',
    sections:[
      section('Separate substrate from surface finish','The internal board and the visible finish are different decisions. A laminate, veneer, acrylic or painted finish can be applied over different suitable substrates.'),
      section('Consider moisture exposure','Wardrobes near damp external walls, wet areas or poor ventilation need more attention to moisture-resistant detailing and building dampness.'),
      section('Check screw holding and hardware use','Heavy shutters, pull-outs and repeated hardware loads can make edge quality, density and fixing method important.'),
      section('Match the board to the finish process','Painted routed shutters, laminate shutters and veneer work can favour different substrates and fabrication methods.'),
      section('Ask for exact brand/grade/thickness in the quotation','Avoid generic words like “premium board.” Write substrate type, grade, thickness, finish, edge treatment and hardware range into the scope.')
    ],
  },

  {
    slug:'2bhk-interior-cost-hyderabad-2026',
    type:'construction-guide', category:'Interior Costs',
    title:'2BHK Interior Cost in Hyderabad (2026) | Room-wise Budget Guide | ProPulse',
    description:'Plan a 2BHK interior budget in Hyderabad with indicative package ranges, room-wise costs, inclusions, exclusions and a quotation checklist.',
    heading:'How much does a 2BHK interior cost in Hyderabad in 2026?',
    summary:'A 2BHK interior budget depends on cabinet sizes, room scope, materials, hardware, finishes and civil or electrical changes. Published Hyderabad guides show wide variation, so compare the same itemised scope rather than one headline package price.',
    searchTerms:['2BHK interior cost Hyderabad 2026','2BHK flat interior design price','2BHK modular kitchen and wardrobe cost','2BHK interior package Hyderabad','room wise interior cost 2BHK'],
    ctaLabel:'Plan Your Interior Requirement', cta:'/quote?package=standard#interior',
    note:'These are indicative market references from published Hyderabad vendor/platform guides, not ProPulse quotations or guaranteed rates. Confirm dimensions, quantities, brands, taxes, installation, civil work and exclusions in a current written BOQ before budgeting or paying an advance.',
    sections:[
      section('Start with a realistic budget range','Published 2026 Hyderabad guides vary materially. NoBroker reports a broad ₹5 lakh–₹18 lakh range, with standard packages around ₹8 lakh–₹12 lakh and premium around ₹13 lakh–₹18 lakh. Livvouge publishes essential packages around ₹4.5 lakh–₹6 lakh, premium around ₹7 lakh–₹10 lakh and luxe from ₹11 lakh. These are different providers’ package definitions, not a like-for-like market average. Use them as a first planning envelope only.'),
      section('Understand what a 2BHK package may include','A typical core scope may include a modular kitchen, wardrobes for two bedrooms, a TV unit, selected storage, basic false ceiling and lighting. Some packages include painting or basic electrical work; others charge separately. Beds, sofas, dining tables, appliances, curtains, decor, bathroom renovations, extensive civil work, AC work and balcony furniture may be excluded. Ask for a room-by-room inclusion schedule.',['Kitchen: base and wall cabinets, shutters, countertop and accessories—confirm what is included','Bedrooms: wardrobe dimensions, lofts, drawers, internal accessories and dressing units','Living/dining: TV console, wall panelling, shoe storage, crockery or pooja units','Ceiling and lighting: covered area, gypsum design, wiring, fixtures and drivers','Site work: painting, electrical relocation, plumbing, dismantling and debris removal']),
      section('Build a room-wise estimate before comparing vendors','For each room, record dimensions and quantities rather than relying on flat area alone. Kitchen cabinetry is often priced by running length or module; wardrobes by elevation area or specified unit; ceilings by covered area; and electrical changes by points and fittings. A small change in loft height, drawer count, shutter finish or hardware can shift the total.'),
      section('Know the major cost drivers','The biggest drivers are total cabinetry, kitchen layout, wardrobe size, board/plywood grade, laminate/acrylic/veneer/PU finish, hardware brand and accessory count. Full-height wall panelling, fluted details, glass shutters, profile lighting, quartz counters and custom furniture add cost. A compact home can still be expensive if it has dense custom storage and premium finishes.'),
      section('Compare quotations on the same specification','Ask every vendor to quote against the same approved drawings and BOQ.',['Exact width, height and depth of every cabinet','Board type, grade, thickness and internal finish','Laminate/veneer/acrylic/PU brand, code and thickness','Hinge, channel, lift-up and basket brand/model or allowance','Edge band thickness, back-panel thickness and installation method','Countertop, sink, hob, chimney, handles and accessories—supply or owner-supplied','GST, transport, installation, design fees and civil/electrical exclusions','Payment milestones, delivery schedule, warranty and snag rectification']),
      section('Keep contingency and decisions in the right order','Finalise appliance sizes, kitchen layout, electrical points, plumbing, ceiling levels and wardrobe internals before factory production. Keep a separate contingency for site discoveries and approved variations. Do not treat a per-square-foot package rate as a complete quote unless its area basis and inclusions are explicit.'),
      section('A practical 2BHK budget checklist','Before requesting a final estimate, prepare your floor plan, carpet area, room dimensions, family storage needs, appliance list, preferred finish level, move-in date and a list of must-have versus optional work. This turns a broad “2BHK interior cost” search into a comparable project brief.')
    ],
    sources:[
      {label:'NoBroker — 2 BHK Interior Design Cost in Hyderabad (published 10 April 2026)',url:'https://www.nobroker.in/interiors/design-guides/2-bhk-interior-design-cost-in-hyderabad/'},
      {label:'Livvouge — 2BHK & 3BHK Interior Design Cost in Hyderabad (published 5 September 2026)',url:'https://www.livvouge.com/blog/2bhk-3bhk-interior-design-cost-hyderabad'},
      {label:'Member of Architecture — 2BHK Interior Design Cost in Hyderabad (published 29 October 2026)',url:'https://www.memberofarchitecture.com/blog/6ae353d359e3e1f78572-2bhk-interior-design-cost-hyderabad-2026'}
    ]
  },
  {
    slug:'3bhk-interior-cost-hyderabad-2026',
    type:'construction-guide', category:'Interior Costs',
    title:'3BHK Interior Cost in Hyderabad (2026) | Complete Budget Guide | ProPulse',
    description:'Explore 3BHK interior cost references in Hyderabad, room-wise scope, kitchen and wardrobe budgets, finish choices and quotation checks.',
    heading:'How much does a 3BHK interior cost in Hyderabad in 2026?',
    summary:'A 3BHK needs more storage and often an additional bedroom workspace or wardrobe, but the final price is driven by scope and specification—not simply the number of bedrooms.',
    searchTerms:['3BHK interior cost Hyderabad 2026','3BHK interior design price Hyderabad','3 bedroom flat interior budget','3BHK modular kitchen wardrobe cost','3BHK interior package comparison'],
    ctaLabel:'Plan Your Interior Requirement', cta:'/quote?package=standard#interior',
    note:'Published vendor ranges are indicative and not directly comparable because package inclusions, apartment size, taxes and finish levels differ. Get a site-measured BOQ with explicit inclusions and exclusions.',
    sections:[
      section('What published Hyderabad guides indicate','For 2026, Livvouge publishes essential 3BHK packages around ₹6.5 lakh–₹8.5 lakh, premium around ₹9.5 lakh–₹14 lakh and luxe from ₹16 lakh. Parthu Interiors publishes essential around ₹6.5 lakh–₹9.5 lakh, premium around ₹9.5 lakh–₹15 lakh and luxury around ₹16 lakh–₹25 lakh. These are provider-specific guide prices; they are not a guaranteed quote or a single citywide rate.'),
      section('Why two 3BHK homes can have very different budgets','A 1,200 sq ft apartment with only essential wardrobes and a compact kitchen is not comparable with a larger home that includes three full wardrobes, a tall pantry, study units, crockery storage, a pooja unit, layered ceilings, decorative wall panels and loose furniture. Carpet area is only one input; actual cabinet dimensions and included work matter.'),
      section('Room-wise scope to define','Write down the expected work for each space.',['Kitchen: layout, cabinet running length, tall units, countertop and accessories','Master bedroom: wardrobe, loft, dresser, bed-back panel and side tables','Bedroom two and three: wardrobes, study desks, bookshelves and storage','Living/dining: TV unit, foyer/shoe storage, crockery and pooja unit','Ceiling/lighting: rooms covered, cove details, profile lights and fixtures','Other: utility cabinets, balcony storage, painting, electrical and civil changes']),
      section('Choose where to spend and where to simplify','Prioritise durable carcass construction, reliable hinges/channels, good edge sealing and functional storage. Save budget by limiting decorative panelling, using a consistent laminate palette, simplifying ceiling layers and phasing optional loose furniture. Premium surface finishes are visible, but concealed construction and hardware affect daily use.'),
      section('How to compare 3BHK interior quotations','Use one drawing set and BOQ for every vendor. Check cabinet dimensions, board grade/thickness, finish codes, hardware models, accessories, countertop, electrical points, ceiling area, taxes, installation, transport, warranty and timeline. Ask vendors to identify provisional quantities and owner-supplied items.'),
      section('Plan production and installation around site readiness','Complete measurements after critical civil changes. Confirm appliance and plumbing points before kitchen fabrication; confirm flooring and ceiling levels before tall storage and ceiling installation. Agree on access, lift booking, working hours, material storage, debris removal and a snag list before handover.'),
      section('A useful 3BHK project brief','Share the floor plan, carpet area, room dimensions, number of occupants, storage needs, appliance list, preferred finish tier, budget ceiling and move-in deadline. Ask for a phased option—essential first, optional upgrades separately—so you can compare scope without losing control of cost.')
    ],
    sources:[
      {label:'Livvouge — 2BHK & 3BHK Interior Design Cost in Hyderabad (5 September 2026)',url:'https://www.livvouge.com/blog/2bhk-3bhk-interior-design-cost-hyderabad'},
      {label:'Parthu Interiors — Interior Design Cost in Hyderabad (2026)',url:'https://parthuinteriors.in/blog/how-much-does-interior-design-cost-in-hyderabad'},
      {label:'Fleegl — 3BHK Interior Cost in Hyderabad (updated 24 August 2026)',url:'https://fleegl.in/blog/3bhk-interior-design-cost-hyderabad'}
    ]
  },
  {
    slug:'tv-unit-cost-hyderabad-2026',
    type:'construction-guide', category:'Interior Costs',
    title:'TV Unit Cost in Hyderabad (2026) | Design & Material Price Guide | ProPulse',
    description:'Compare TV unit costs in Hyderabad by width, floating or full-wall design, laminate, fluted panels, storage, lighting and installation scope.',
    heading:'How much does a TV unit cost in Hyderabad in 2026?',
    summary:'TV unit pricing depends on the width and height, storage volume, substrate, finish, wall panelling, lighting, hardware and cable-management details. Compare a measured design—not only a style photo.',
    searchTerms:['TV unit cost Hyderabad 2026','how much does TV unit cost','TV cabinet price Hyderabad','floating TV unit price','fluted TV panel cost'],
    ctaLabel:'Discuss Your Interior Design', cta:'/quote?package=standard#interior',
    note:'The price examples below are published vendor estimates and may exclude GST, stone cladding, electrical changes or site-specific work. Obtain a dimensioned drawing and itemised BOQ for your wall.',
    sections:[
      section('Indicative TV unit price bands','A Hyderabad 2026 guide from Hyderabad Listings places a basic TV unit around ₹25,000–₹60,000. AlcorOne publishes indicative examples around ₹45,000–₹65,000 for a low-profile floating laminate unit, ₹65,000–₹95,000 for a floor-standing cabinet and ₹1.2 lakh–₹2.2 lakh for a full-height wall panel. Fleegl lists broader tiers from ₹35,000–₹65,000 basic to ₹1.6 lakh–₹3.5 lakh+ premium. These are not equivalent designs; dimensions and inclusions differ.'),
      section('Choose the design type before asking for a price','A floating console uses less floor space but needs suitable wall anchoring and concealed wiring. A floor-standing cabinet can provide more storage and easier access. A full-wall design may include panels, shelves, display niches and concealed doors, increasing material and installation work. Fluted backdrops, stone-look surfaces and glass display units add further cost.'),
      section('Measure the wall and television together','Record wall width, ceiling height, TV size, viewing distance, sofa position, socket locations, internet/router needs and door/window positions. The TV centre and console height should be checked against actual seating comfort; do not copy a measurement blindly from an online image.'),
      section('Materials and finishes affect both price and maintenance','Ask what the carcass and shutters are made from, including board/ply grade and thickness. Laminate is generally easier to specify and maintain; veneer or PU finishes require different care and finishing processes. Fluted profiles collect dust, while glass and glossy finishes show fingerprints. Confirm edge treatment and surface codes.'),
      section('Do not forget cable management and ventilation','Plan power, HDMI, internet and speaker routes before panelling. Provide accessible service openings and ventilation for set-top boxes, consoles and routers. Avoid sealing heat-producing devices inside an unventilated compartment. Keep electrical work and extra sockets itemised.'),
      section('What a proper TV unit quotation should include','Ask for wall and cabinet dimensions, carcass and shutter materials, board thickness, laminate/veneer/PU codes, edge banding, hardware, shelves, drawers, back panel, wall panelling, lighting drivers, wiring, anchoring, transport, installation, GST and warranty. Stone or tile cladding should be a separate line item.'),
      section('Ways to control cost without making the unit look unfinished','Use one main finish and one accent, keep the console proportionate to the TV, avoid unnecessary full-wall cladding, use open shelves selectively and plan lighting only where it adds function. A clean cable route and aligned joints often matter more than adding multiple decorative materials.')
    ],
    sources:[
      {label:'Hyderabad Listings — 2 BHK Interior Design Cost in Hyderabad (TV unit reference)',url:'https://hyderabadlistings.com/blog/2-bhk-interior-design-cost-hyderabad'},
      {label:'AlcorOne — TV Unit Interior Design Hyderabad (2026)',url:'https://www.alcorone.com/blog/tv-unit-interior-guide-hyderabad/'},
      {label:'Fleegl — Premium TV Unit Design Ideas Hyderabad (2026)',url:'https://fleegl.in/blog/tv-unit-design-ideas-hyderabad'}
    ]
  },
  {
    slug:'modular-kitchen-cost-hyderabad-2026',
    type:'construction-guide', category:'Interior Costs',
    title:'Modular Kitchen Cost in Hyderabad (2026) | Layout & Cabinet Budget | ProPulse',
    description:'Understand modular kitchen cost in Hyderabad by layout, running length, cabinet materials, shutters, countertop, hardware and accessories.',
    heading:'How much does a modular kitchen cost in Hyderabad in 2026?',
    summary:'A modular kitchen quote depends on layout and measured cabinet length, not just the flat’s BHK label. Compare carcass, shutters, hardware, countertop, accessories and installation separately.',
    searchTerms:['modular kitchen cost Hyderabad 2026','2BHK modular kitchen cost','L shaped kitchen cost Hyderabad','modular kitchen price per running foot','kitchen cabinet cost Hyderabad'],
    ctaLabel:'Plan Your Interior Requirement', cta:'/quote?package=standard#interior',
    note:'Published rates vary by kitchen dimensions and package scope. Appliance prices, plumbing/electrical relocation, civil work, countertop and GST may be excluded. Treat online prices as planning references only.',
    sections:[
      section('Why there is no single modular kitchen price','An 8-foot straight kitchen, a 12-foot L-shaped kitchen and a U-shaped kitchen with tall pantry storage have different cabinet quantities and hardware needs. Some quotes price base and wall units by running foot; others price individual modules or a complete package. Confirm exactly what the quoted running length includes.'),
      section('Published Hyderabad reference points','Hyderabad Listings publishes an indicative ₹85,000–₹2.2 lakh range for an example L-shaped kitchen, depending on laminate or acrylic finish and hardware. Livvouge notes an L-shaped kitchen starting around ₹1.6 lakh. Member of Architecture’s 2BHK line-item estimate places kitchen cabinetry at ₹1.2 lakh–₹1.8 lakh budget, ₹2 lakh–₹3.5 lakh mid and ₹3.8 lakh–₹5.5 lakh premium for its stated example. These are provider-specific estimates with different dimensions and specifications.'),
      section('Select the layout around workflow and available space','Common options include straight, L-shaped, parallel and U-shaped kitchens. Choose based on room dimensions, door/window positions, sink and hob locations, refrigerator clearance and safe aisle width. An island should only be considered when circulation remains comfortable after stools, appliance doors and drawers are accounted for.'),
      section('Specify carcass, shutters and finish separately','The carcass is the cabinet structure; the shutter is the visible door. Ask for board or plywood type, grade, thickness, internal finish, edge sealing and moisture protection. Then specify laminate, acrylic, membrane, veneer or PU finish by brand and code. A premium-looking shutter does not compensate for poorly specified cabinet construction.'),
      section('Hardware and accessories can change the total','List hinges, drawer channels, tandem boxes, lift-up systems, bottle pull-outs, corner units, cutlery trays, tall pantry baskets and bin systems. Confirm brand/model or a clear allowance, load rating and warranty. “Soft close” alone is not a sufficient hardware specification.'),
      section('Countertop, sink and services must be clear','State whether granite or quartz is included, the thickness and edge profile, sink and hob cut-outs, backsplash, sink, faucet and installation. Plan chimney ducting, RO, gas, water purifier, dishwasher, refrigerator, sockets and under-cabinet lighting before fabrication.'),
      section('Kitchen quotation checklist','Ask for a dimensioned layout and elevations, cabinet running lengths, module schedule, carcass and shutter specification, finish codes, hardware schedule, accessories, countertop, sink/faucet, installation, transport, taxes, civil/plumbing/electrical exclusions, warranty and completion timeline.'),
      section('Where to save and where not to cut corners','Simplify decorative shutters and reduce rarely used accessories if budget is tight. Do not compromise on accurate measurement, safe wall fixing, appropriate moisture detailing near the sink, reliable hinges/channels, edge sealing or service access. Finalise appliance dimensions before production.')
    ],
    sources:[
      {label:'Hyderabad Listings — 2 BHK Interior Design Cost in Hyderabad (kitchen examples)',url:'https://hyderabadlistings.com/blog/2-bhk-interior-design-cost-hyderabad'},
      {label:'Livvouge — 2BHK & 3BHK Interior Design Cost in Hyderabad (2026)',url:'https://www.livvouge.com/blog/2bhk-3bhk-interior-design-cost-hyderabad'},
      {label:'Member of Architecture — 2BHK Interior Design Cost in Hyderabad (2026)',url:'https://www.memberofarchitecture.com/blog/6ae353d359e3e1f78572-2bhk-interior-design-cost-hyderabad-2026'}
    ]
  },


  {
    slug:'plywood-quality-tests-bis-303-710',
    type:'construction-guide', category:'Interior Materials',
    title:'How to Check Plywood Quality | BIS Tests, IS 303 & IS 710 | ProPulse',
    description:'Learn how to check plywood quality before buying, understand IS 303:2024 and IS 710:2024, and review the key laboratory tests and site inspection checklist.',
    heading:'How do you check plywood quality before buying for interiors?',
    summary:'A good plywood purchase is verified through the current BIS standard and licence scope, declared grade and thickness, traceable supply and relevant test evidence. Visual inspection is useful, but it cannot certify internal bonding or water resistance.',
    searchTerms:['how to check plywood quality','plywood quality test at site','IS 303 2024 plywood','IS 710 2024 marine plywood','BWR vs BWP plywood test','plywood glue shear test','plywood water resistance test'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Do not try to certify plywood by soaking, boiling, bending or burning a small offcut at home. Standard tests require controlled specimen preparation and laboratory methods. Ask for the manufacturer’s current BIS licence details and relevant test reports; verify the licence and scope independently.',
    sections:[
      section('Start by identifying the correct standard','BIS lists IS 303:2024 as Plywood for General Purposes (fourth revision) and IS 710:2024 as Marine Plywood (third revision). These are not interchangeable labels. Ask the supplier which standard, grade, type and intended application are declared for the actual product. Confirm the current BIS licence, manufacturer, factory and product scope rather than relying on a logo printed on a sheet.'),
      section('Understand what the main plywood tests tell you','The BIS standards compendium and BIS laboratory listings identify several performance checks.',['Water-resistance test: evaluates performance under the standard’s specified water exposure','Glue-shear strength and adhesion of plies: assess bonding between veneers and risk of delamination','Moisture content: measures moisture in the panel at testing','Static bending strength and modulus of elasticity: assess strength and stiffness under bending','Workmanship and finish: checks surface and manufacturing quality','Dimensional checks: include thickness, squareness and edge straightness','Formaldehyde content or emission: relates to indoor exposure requirements in the applicable standard']),
      section('What to inspect when sheets arrive at site','Visual inspection helps catch handling damage and obvious defects, but cannot reveal every internal core gap or bonding problem.',['Match the invoice, brand, standard, grade, thickness and sheet dimensions to the purchase order','Check printed markings and batch/manufacturer traceability','Inspect faces and edges for damage, open splits, blisters, severe patches or delamination','Measure representative sheets with a suitable thickness gauge and compare with declared tolerances','Count sheets and photograph labels before stacking','Keep delivery documents and supplier test declarations']),
      section('MR, BWR and BWP are not simply marketing words','Ask the supplier to state the exact grade under the applicable standard and provide supporting compliance evidence. Do not assume every “waterproof” claim means the same test regime. Marine plywood under IS 710:2024 has its own specification; it should be selected for the intended service conditions, not as a universal upgrade for every wardrobe or dry-area cabinet.'),
      section('Why a bucket or boiling-water test is not proof','A home soak test does not control sample size, exposure, temperature, conditioning, specimen selection or evaluation. A sheet that survives a quick soak may still fail a required standard test; a poorly performed test may also damage a good sheet. Use a competent laboratory for compliance testing and request the test report for the same product/grade.'),
      section('Choose the board for its actual location','Wardrobe carcasses, dry shelves, kitchen cabinets and sink-base units have different exposure and loading. Specify board type, grade, thickness, finish, edge sealing and support spacing for each use. Even moisture-resistant plywood can be damaged by persistent leaks, unsealed edges or standing water. Waterproofing and plumbing leak control remain essential.'),
      section('A plywood purchase checklist','Before approving a brand or material substitution, write the standard and edition, grade, thickness, manufacturer, BIS licence details, test evidence, sheet dimensions, quantity, rate, transport, storage and replacement terms into the purchase order.')
    ],
    sources:[
      {label:'BIS — IS 303:2024, Plywood for General Purposes',url:'https://www.bis.gov.in/is-303-2024/?lang=en'},
      {label:'BIS — IS 710:2024, Marine Plywood',url:'https://www.bis.gov.in/is-710-2024/?lang=en'},
      {label:'BIS — Compendium of Indian Standards on Plywood (2025)',url:'https://www.services.bis.gov.in/tmp/compendium_2025-06-02-04-13-12.pdf'},
      {label:'BIS Laboratory Information Management System — IS 303 tests',url:'https://lims.bis.gov.in/home/search_is_number/?is_number__doc_no=303'},
      {label:'Institute of Wood Science and Technology — Specimen Testing',url:'https://iwst.icfre.gov.in/woodspecimentesting.html'}
    ]
  },
  {
    slug:'cabinet-hinge-types-overlay-inset-soft-close',
    type:'construction-guide',category:'Interior Hardware',
    title:'Types of Cabinet Hinges | Overlay, Inset, Half Overlay & Soft Close | ProPulse',
    description:'Understand concealed cabinet hinge types, overlay and inset applications, soft-close mechanisms, opening angles and how to specify hinges for kitchens and wardrobes.',
    heading:'What are the different types of cabinet hinges for modular interiors?',
    summary:'The right hinge depends on cabinet construction, door position, door size and weight, opening angle, nearby obstructions and the required closing action. “Soft close” is a function, while overlay and inset describe how the door sits against the cabinet.',
    searchTerms:['types of cabinet hinges','full overlay vs half overlay hinge','inset hinge vs overlay hinge','soft close hinge for kitchen cabinet','110 degree vs 165 degree hinge','best wardrobe hinges'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Hinge count, drilling dimensions, mounting plates and load limits must follow the exact manufacturer’s technical data for the door size, weight and material. Do not copy a generic hinge-count rule.',
    sections:[
      section('First understand the door application','Full overlay doors cover most of the cabinet side; half overlay doors share a central partition with another door; inset doors sit within the cabinet opening. These applications require different hinge geometry and mounting positions. Confirm the cabinet construction and reveal gaps before ordering.'),
      section('Common hinge types used in interiors','Concealed cup hinges are common in modular kitchens and wardrobes because the mechanism is hidden when the door is closed. Butt hinges are visible and are used in some traditional furniture. Special hinges are available for corner cabinets, thick or profiled doors, glass/aluminium frames, angled cabinets and wide-opening applications.'),
      section('Soft-close, self-close and push-to-open are different functions','Soft-close uses damping to slow the door near closing. Some hinge systems integrate the damper; others use a separate add-on. Self-closing refers to the spring action that pulls a door closed. Push-to-open systems are designed for handleless fronts and require compatible hardware and correct door gaps. Confirm the actual product mechanism rather than relying on sales terminology.'),
      section('Choose the opening angle for the cabinet layout','Common catalogues include standard opening angles such as around 95°, 100°, 107° or 110°, while special wide-angle hinges can open further for corner or pull-out access. More opening is not always better: adjacent walls, handles, appliances and drawer fronts may obstruct movement. Check the manufacturer’s clearance diagrams.'),
      section('How to select hinges for a wardrobe or kitchen','Check door height, width, thickness, weight, material, overlay/inset position, cabinet side thickness, opening angle, mounting plate and adjustment range. Tall or heavy shutters may need a different hinge or more hinges; use the maker’s door-weight and height guidance.'),
      section('What to check in the hardware quotation','Ask for brand, exact series/model, hinge application, opening angle, integrated or add-on damping, mounting plate, screw/press-in fixing, corrosion suitability where relevant, warranty and service availability. “Premium soft-close hinge” is not a complete specification.'),
      section('Installation and maintenance checks','During handover, check even gaps, flush alignment, smooth travel, full opening without collision, reliable closing and secure fixing. Re-adjust after the cabinet settles if the manufacturer permits. Keep hinges clean and avoid hanging loads on doors. Replace damaged screws or stripped substrate with an approved repair method.')
    ],
    sources:[
      {label:'Blum India — Hinge Systems Overview',url:'https://www.blum.com/in/en/products/hingesystems/overview/'},
      {label:'Blum — CLIP top BLUMOTION range',url:'https://www.blum.com/in/en/products/hingesystems/clip-top-blumotion/programme/'},
      {label:'Hettich India — Furniture Hinges',url:'https://www.hettich.com/en-in/products/hinges'},
      {label:'Hettich eShop — Hinge filters by overlay, inset and opening angle',url:'https://shop.hettich.com/in_EN/Hinges/c/group2264954678785'}
    ]
  },
  {
    slug:'interior-finishes-laminate-acrylic-veneer-pu-membrane',
    type:'construction-guide',category:'Interior Materials',
    title:'Interior Finish Types Compared | Laminate, Acrylic, Veneer, PU & Membrane | ProPulse',
    description:'Compare laminate, acrylic, veneer, PU paint, membrane, PET and glass finishes for kitchens, wardrobes and TV units by appearance, maintenance and cost drivers.',
    heading:'What is the difference between laminate, acrylic, veneer, PU and membrane finishes?',
    summary:'A finish is the visible surface, while the board or plywood below is the substrate. Compare the complete panel system—including edge treatment, adhesive, fabrication and maintenance—not only the surface name.',
    searchTerms:['types of interior finishes','laminate vs acrylic finish','PU vs duco finish','veneer vs laminate','membrane vs laminate shutters','best finish for kitchen cabinets'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Performance varies by manufacturer, product line, substrate and fabrication quality. Ask for physical samples, technical data and cleaning instructions; do not assume one finish is always more durable than another.',
    sections:[
      section('Separate the substrate from the finish','Plywood, MDF, HDHMR and particleboard are substrates. Laminate, acrylic, veneer, paint, membrane and PET are surface or finish systems. A premium finish cannot correct a weak, damp or poorly constructed carcass. Specify both layers independently.'),
      section('Decorative laminate','Laminate is a factory-made decorative sheet bonded to a substrate. It is available in matte, gloss, textured, suede and wood-look designs. It offers many patterns and is commonly used for wardrobes, kitchens and TV units. Check sheet thickness, brand/code, surface texture, edge banding, joint placement and cleaning instructions.'),
      section('Acrylic and PET surfaces','Acrylic and PET-faced panels can provide a smooth, contemporary surface in gloss or matte variants depending on the product. Ask about scratch resistance, fingerprints, colour consistency, edge finish, repair options and compatible cleaners. High gloss can show smudges and reflections more clearly.'),
      section('Natural veneer','Veneer is a thin layer of real wood applied to a suitable substrate and finished with polish or coating. Grain and shade vary naturally, so approve the actual veneer sequence and sample. Veneer can be refinished in some systems but generally needs more careful maintenance than many standard laminate surfaces.'),
      section('PU paint, lacquer and duco terminology','These terms are sometimes used loosely in the market. Ask the fabricator to state the exact coating system, primer, number of coats, sheen, colour code, curing process and repair method. Painted finishes can create seamless colours and routed profiles, but quality depends heavily on surface preparation, controlled application and curing.'),
      section('Membrane and wrapped shutters','Membrane shutters use a film wrapped over a profiled substrate, often to cover routed edges and decorative profiles. Confirm film specification, substrate, adhesive/process, heat exposure limits and repair options. Poorly controlled heat or moisture can cause lifting or peeling in unsuitable applications.'),
      section('Glass, metal and fluted details','Glass shutters and metal trims add contrast and can be used selectively in display units. Confirm safety glass type, frame details, edge protection and cleaning. Fluted panels add texture but collect dust in grooves; use them where maintenance is practical.'),
      section('How to choose finishes room by room','For kitchens, prioritise cleaning, moisture detailing, edge protection and access to repair. For wardrobes, consider fingerprints, abrasion, sunlight and the visual scale of the room. For TV units, balance glare, dust, cable access and wall-panel maintenance. Approve samples under the actual room lighting.'),
      section('What to include in the finish schedule','Record the substrate type/grade/thickness, surface finish, brand and code, colour, texture, sheen, edge band, adhesive/process, location, sample approval and maintenance instructions. Attach signed samples or product references to the BOQ to prevent substitutions.')
    ],
    sources:[
      {label:'BIS — IS 303:2024, Plywood for General Purposes',url:'https://www.bis.gov.in/is-303-2024/?lang=en'},
      {label:'Blum India — Hinge Systems Overview (hardware coordination)',url:'https://www.blum.com/in/en/products/hingesystems/overview/'}
    ]
  },


  {
    slug:'plywood-vs-mdf-vs-hdhmr-interiors',
    type:'construction-guide',category:'Interior Materials',
    title:'Plywood vs MDF vs HDHMR | Which Board Is Best for Interiors? | ProPulse',
    description:'Compare plywood, MDF and HDHMR for wardrobes, kitchen cabinets and furniture by moisture exposure, strength, screw holding, finish and cost.',
    heading:'Plywood vs MDF vs HDHMR: which board should you choose?',
    summary:'There is no single best board for every interior. Choose the substrate based on the location, expected load, moisture exposure, shutter design, finish system, hardware and documented product specification.',
    searchTerms:['plywood vs MDF vs HDHMR','which board is best for kitchen cabinets','HDHMR vs plywood wardrobe','MDF vs plywood for furniture','best board for modular interiors'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Board names alone do not establish quality or suitability. Ask for manufacturer, product grade, thickness, technical data, applicable standard or test report, and confirm the actual use with the designer/fabricator.',
    sections:[
      section('Understand what each board is','Plywood is made by bonding layers of veneer, typically with alternating grain directions. MDF is a wood-fibre panel made by pressing fibres with resin under heat and pressure. HDHMR is a high-density, moisture-resistant engineered fibreboard category sold by different manufacturers. Product properties vary by manufacturer and grade.'),
      section('Compare the practical trade-offs','Plywood is often selected where panel strength, screw fixing and certain moisture-exposure requirements matter. MDF provides a smooth, consistent surface that can suit painted or routed profiles, but edge fixing and prolonged wetting need care. HDHMR products are marketed for higher density and moisture resistance than standard MDF, but the exact performance must be checked in the manufacturer’s technical data.'),
      section('Choose by room and exposure','Dry wardrobe shelves, bedroom shutters, kitchen carcasses and sink-base cabinets are not identical applications. Near sinks, plumbing joints and wet utility areas, prevent leaks, seal edges and provide ventilation regardless of board type. Do not treat a “moisture resistant” label as permission for continuous water exposure.'),
      section('Consider shutter design and finish','Flat laminate shutters, routed painted shutters, membrane profiles and veneer finishes can favour different substrates and fabrication methods. Ask the fabricator to confirm compatibility of the board, adhesive, primer, coating and edge treatment as one tested system.'),
      section('Check hardware fixing and shelf spans','Heavy shutters, wide shelves, pull-outs and frequently used drawers impose different loads. Ask for the board thickness, support spacing, fixing method and manufacturer guidance for hinges, channels and accessories. A stronger board cannot compensate for an undersized fixing or unsupported span.'),
      section('Compare cost on a complete panel specification','A fair comparison includes board price, thickness, wastage, machining, edge banding, finish, hardware fixing, installation and expected maintenance. A low sheet price may not be the lowest finished-cabinet cost if it needs additional reinforcement or finishing work.'),
      section('What to write in the BOQ','Specify board manufacturer and product, grade, thickness, intended location, finish, edge treatment, back-panel details, shelf supports, hardware and warranty. Ask to approve a sample and retain product labels or invoices for traceability.')
    ],
    sources:[
      {label:'BIS — IS 303:2024, Plywood for General Purposes',url:'https://www.bis.gov.in/is-303-2024/?lang=en'},
      {label:'BIS — IS 710:2024, Marine Plywood',url:'https://www.bis.gov.in/is-710-2024/?lang=en'},
      {label:'BIS — Compendium of Indian Standards on Plywood',url:'https://www.services.bis.gov.in/tmp/compendium_2025-06-02-04-13-12.pdf'}
    ]
  },
  {
    slug:'laminate-thickness-08mm-vs-1mm-interiors',
    type:'construction-guide',category:'Interior Materials',
    title:'0.8mm vs 1mm Laminate | Thickness, Uses & Selection Guide | ProPulse',
    description:'Understand 0.8mm and 1mm decorative laminate choices for wardrobes, kitchen shutters and furniture, including substrate, balancing, edge details and maintenance.',
    heading:'Is 0.8mm or 1mm laminate better for home interiors?',
    summary:'A thicker laminate is not automatically the right choice for every panel. Selection depends on the manufacturer’s product range, application, substrate, bonding method, panel size, edge detailing and finish.',
    searchTerms:['0.8mm vs 1mm laminate','which laminate thickness is best','1mm laminate for kitchen shutters','0.8mm laminate for wardrobe','laminate thickness for furniture'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Confirm the actual nominal thickness and tolerance from the selected manufacturer’s datasheet. Decorative laminate thickness is only one part of the finished panel system.',
    sections:[
      section('What the thickness number tells you','The 0.8mm and 1mm labels refer to the nominal thickness of a decorative laminate sheet, not the total thickness or strength of the finished shutter. The substrate, adhesive, pressing process, panel size and support all influence the final result.'),
      section('Where 0.8mm and 1mm may be considered','Both thicknesses are used in interior applications depending on the product line and fabricator specification. A thicker sheet may provide a different feel or handling characteristics, but it does not automatically make a cabinet waterproof, impact-proof or structurally stronger. Follow the laminate maker’s recommended application.'),
      section('Do not ignore balancing on the reverse side','Panels can warp when the face and back are not balanced appropriately. Ask whether the reverse side uses a balancing laminate or another specified backing system compatible with the face material and substrate.'),
      section('Check edge finishing and joints','Inspect edge banding, corner quality, seams, adhesive marks, alignment and exposed edges. A well-specified face laminate with poor edge execution can still fail visually and in service.'),
      section('Approve the actual colour and texture sample','Laminate shade, gloss and texture can look different under showroom, daylight and warm indoor lighting. Approve a physical sample with the product code and batch/lot reference; check it beside flooring, wall paint and other finishes.'),
      section('How to compare two laminate quotations','Compare brand and series, product code, nominal thickness, finish/texture, substrate, adhesive/process, backing, edge band, area/quantity, wastage, installation and warranty. Do not compare only “1mm premium” against “0.8mm standard.”'),
      section('Care and maintenance','Use the manufacturer’s cleaning guidance. Avoid abrasive pads, harsh solvents and prolonged standing water at joints or edges. Repair chips and water ingress early, because the substrate below the decorative surface can be affected.')
    ],
    sources:[
      {label:'Greenlam — Decorative laminates product information',url:'https://www.greenlam.com/'},
      {label:'Merino — Decorative laminates product information',url:'https://www.merinolaminates.com/'}
    ]
  },
  {
    slug:'modular-kitchen-drawer-channels-tandem-box-systems',
    type:'construction-guide',category:'Interior Hardware',
    title:'Kitchen Drawer Channels vs Tandem Box Systems | Hardware Guide | ProPulse',
    description:'Compare telescopic drawer slides, concealed runners and tandem box systems for modular kitchens by extension, load, adjustment, accessories and maintenance.',
    heading:'What is the difference between drawer channels and tandem box systems?',
    summary:'Drawer hardware affects usable storage, smooth movement and serviceability. Compare the complete drawer system—including runner, box sides, front adjustment and rated load—not only whether it has soft close.',
    searchTerms:['drawer channels vs tandem box','tandem box system kitchen','telescopic channel vs concealed runner','soft close drawer channel','best kitchen drawer hardware'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Load capacity and installation dimensions are product-specific. Use the hardware manufacturer’s technical catalogue for the exact model and drawer width.',
    sections:[
      section('Understand a basic telescopic channel','A telescopic slide is commonly mounted to the drawer and cabinet sides and may use multiple sliding members to provide partial or full extension. Quality, load rating, length, fixing and alignment vary by model.'),
      section('Understand concealed runners and tandem boxes','Concealed runners are mounted beneath or alongside a drawer so the mechanism is less visible. Tandem box systems use a coordinated metal drawer-side and runner system, often with integrated adjustment and accessory options. Product names and features differ by manufacturer.'),
      section('Compare extension and usable access','Check whether the drawer is partial, full or over extension, and whether the back of the drawer is accessible when open. Confirm clearance with adjacent doors, handles, appliances and internal partitions.'),
      section('Compare load rating properly','Check the stated dynamic load capacity and the conditions under which it applies. Drawer width, depth, contents, mounting and cycle use can affect performance. Do not assume every runner in a brand family has the same rating.'),
      section('Soft close and push-to-open options','Soft-close damping slows the drawer near closure. Push-to-open hardware is designed for handleless fronts and requires correct gaps and alignment. Some systems combine functions; others require separate compatible components. Confirm the exact model and accessories.'),
      section('Choose accessories for the actual storage','Cutlery trays, plate holders, bottle dividers, inner drawers and waste bins should match drawer dimensions and the user’s routine. Accessories reduce usable internal space and may affect the required load rating.'),
      section('What to check at installation and handover','Check smooth travel, equal gaps, front adjustment, full extension, soft-close action, stability under the intended load and access to adjustment screws. Ask for brand/model, warranty, spare-part availability and care instructions.')
    ],
    sources:[
      {label:'Blum India — Drawer Systems',url:'https://www.blum.com/in/en/products/boxsystems/overview/'},
      {label:'Hettich India — Drawer Systems',url:'https://www.hettich.com/en-in/products/drawer-systems'}
    ]
  },
  {
    slug:'wardrobe-interior-layout-accessories-guide',
    type:'construction-guide',category:'Interior Planning',
    title:'Wardrobe Interior Layout & Accessories | Drawers, Lofts & Hanging Space | ProPulse',
    description:'Plan wardrobe internals with hanging sections, shelves, drawers, lofts, shoe storage, pull-outs and accessories based on clothing, room space and daily use.',
    heading:'How should you plan the inside of a wardrobe?',
    summary:'A useful wardrobe is designed around what the household stores and how often it is accessed. Plan clear internal dimensions, hanging lengths, shelf spacing, drawer access and door swing before choosing accessories.',
    searchTerms:['wardrobe internal design ideas','wardrobe accessories list','wardrobe hanging space dimensions','wardrobe drawers and shelves layout','wardrobe loft design'],
    ctaLabel:'Plan Your Interior Requirement',cta:'/quote?package=standard#interior',
    note:'Dimensions below should be site-measured and coordinated with the selected hardware and clothing needs. Avoid treating generic online dimensions as mandatory standards.',
    sections:[
      section('List what the wardrobe must store','Separate long garments, shirts, trousers, folded clothes, sarees, bags, footwear, jewellery, bedding and seasonal storage. Count users and decide which items need daily access versus high-level storage.'),
      section('Plan hanging zones and clear heights','Provide hanging sections based on actual garment lengths and hanger type. Check rod strength, fixing into the cabinet sides or supports and clear space below. Long garments need a different arrangement from shirts or folded trousers.'),
      section('Design shelves and drawers around access','Frequently used items are easier to reach in drawers or mid-height shelves. Very deep shelves can hide items at the back; use pull-outs or divide the storage where appropriate. Check drawer opening against bed, door and walking clearance.'),
      section('Use lofts for occasional storage','Lofts can store luggage, blankets and seasonal items, but require safe access and suitable shutter hardware. Check ceiling level, access height, ventilation and whether the loft doors can open without obstruction.'),
      section('Select accessories only where they solve a problem','Trouser pull-outs, tie racks, jewellery trays, laundry baskets, pull-down hanging rails and shoe pull-outs can improve organisation but add cost and reduce usable cabinet space. Confirm exact dimensions and rated load.'),
      section('Coordinate lighting and electrical safety','Wardrobe lights should not obstruct drawers or hinges. Plan sensor location, driver access, wiring routes and safe electrical installation before the wardrobe is closed. Avoid inaccessible drivers that cannot be serviced.'),
      section('Check the final drawing and BOQ','Approve internal elevations with dimensions, shelf count, drawer sizes, rod locations, hardware model, board thickness, finish code, edge treatment, loft details and accessory schedule. Keep one signed drawing as the production reference.')
    ],
    sources:[
      {label:'Blum India — Storage and cabinet solutions',url:'https://www.blum.com/in/en/products/'},
      {label:'Hettich India — Furniture fittings and storage solutions',url:'https://www.hettich.com/en-in/products'}
    ]
  },

]

export function guideBySlug(slug){
  return CONSTRUCTION_GUIDES.filter(Boolean).find(item=>item.slug===String(slug||'').toLowerCase())||null
}

export const CONSTRUCTION_GUIDE_ROUTES=CONSTRUCTION_GUIDES.filter(Boolean).map(item=>({
  path:'/guides/'+item.slug,
  type:'construction-guide',
  guideSlug:item.slug,
  title:item.title,
  description:item.description,
  heading:item.heading,
  summary:item.summary,
  searchTerms:item.searchTerms,
}))
