// Interior homeowner questions: article briefs, not monthly search-volume rankings.
// Cost guides must use dated itemised estimates. Vastu is described as traditional belief,
// never as a replacement for structural design, safety, ventilation or approved plans.
const groups = {
"Interior costs & budgets":[
["How much does a 2BHK interior cost in Hyderabad?","Room-wise estimate for kitchen, wardrobes, TV unit, ceiling, painting, lighting, hardware, taxes and exclusions."],
["How much does a 3BHK interior cost in Hyderabad?","Compare essential, standard and premium scope with transparent room-wise assumptions."],
["How much does a TV unit cost in Hyderabad?","Compare floating consoles, wall panels and full-height storage by dimensions, material, finish, lighting and hardware."],
["How much does a simple TV unit cost?","Explain a basic storage-and-panel design and the choices that change its price."],
["What is the cost of a premium TV unit with fluted panels?","Break down panel area, finish, lighting, storage, wiring and installation."],
["How much does a modular kitchen cost for a 2BHK?","Estimate by layout, running length, carcass grade, shutter finish, countertop and accessories."],
["How much does a wardrobe cost in Hyderabad?","Explain how dimensions, lofts, drawers, sliding hardware, board and finish affect price."],
["How much does a false ceiling cost for a 2BHK flat?","Compare simple, full-room and layered ceilings including framing and lights."],
["What is included in a complete 2BHK interior package?","List typical inclusions and exclusions such as loose furniture, appliances, curtains, civil work and taxes."],
["How can I reduce home interior cost without losing quality?","Prioritise durable carcasses and hardware, simplify decorative surfaces and phase optional work."]
],
"TV units & living room design":[
["Which TV unit design is best for a small living room?","Compare floating consoles, compact wall panels and closed storage while preserving circulation."],
["What is the ideal height for a TV unit?","Explain sofa height, screen centre and how to test viewing comfort before installation."],
["Which material is best for a TV unit: plywood, MDF or HDHMR?","Compare load, screw holding, moisture, routing and finish for different applications."],
["Should I choose a floating or floor-standing TV unit?","Compare storage, wall strength, cleaning, cable concealment and installation."],
["How do I hide wires in a TV unit?","Plan conduits, sockets, data points, ventilation and access before panelling."],
["Which laminate colour is best for a TV unit?","Coordinate wood tones, wall paint, flooring, daylight and room size."],
["Are fluted panels good for a TV unit?","Explain cleaning, dust collection, substrate and panel spacing."],
["What should I include in a TV unit quotation?","Check dimensions, board grade, finish, hardware, back panel, wiring, lighting and installation."]
],
"Laminates, plywood & finishes":[
["Which laminate is best for home interiors?","Compare types by application, thickness, wear, cleaning, texture and manufacturer specification."],
["Which laminate is best for a kitchen?","Choose finishes for frequent cleaning and moisture exposure; explain edge sealing and substrate."],
["Which laminate is best for a wardrobe?","Compare matte, suede, textured and gloss finishes for fingerprints and maintenance."],
["What is the difference between 0.8mm and 1mm laminate?","Explain nominal thickness, application and the role of substrate and workmanship."],
["Is 1mm laminate better than 0.8mm laminate?","Compare durability and cost without assuming thickness alone determines quality."],
["Which is better: matte or glossy laminate?","Compare fingerprints, reflections, cleaning and scratch visibility."],
["Which is better: acrylic or laminate for kitchen shutters?","Compare appearance, maintenance, durability, cost and edge finishing."],
["Which is better: veneer or laminate for wardrobes?","Compare natural variation, polish, maintenance, durability and budget."],
["What is the difference between BWR and BWP plywood?","Explain intended moisture exposure, grade markings, standards and product certificates."],
["Which plywood thickness is suitable for kitchen cabinets?","Explain carcass, shelves and shutters; final thickness must suit span, load and hardware."],
["Is HDHMR board good for kitchen cabinets?","Discuss edge treatment, sink-zone exposure, fasteners and product datasheets."]
],
"Vastu questions for home planning":[
["How many doors should a house have according to Vastu?","Explain that traditions do not set one universal count; prioritise safe exits, circulation, privacy and approved plans."],
["Which direction should the main door face according to Vastu?","Summarise common beliefs separately from building rules, access, daylight and ventilation."],
["Where should the kitchen be according to Vastu?","Describe common directional preferences as beliefs, alongside safe workflow, exhaust and service clearances."],
["Where should the master bedroom be according to Vastu?","Explain traditional preferences alongside privacy, ventilation, furniture access and noise."],
["Where should the pooja room be placed according to Vastu?","Discuss common preferences and practical needs such as a clean, quiet location and safe lighting."],
["Where should toilets be placed according to Vastu?","Separate traditional recommendations from plumbing, waterproofing, ventilation and sanitation requirements."],
["Which direction should I sleep facing according to Vastu?","Summarise traditional viewpoints as cultural beliefs, not scientifically established health rules."],
["What Vastu precautions should I take before building a house?","Offer a balanced planning checklist while protecting structural design, setbacks and safety."],
["Can a house plan be changed to follow Vastu?","Explain what may be accommodated early and what could compromise structure, ventilation or approvals."],
["What should I check in a Vastu-compliant 2BHK floor plan?","Review entrance, kitchen, bedrooms, toilets and circulation as preferences, keeping code compliance first."],
["Is a staircase in the north-east acceptable according to Vastu?","Describe differing beliefs and advise checking structure, access and headroom before moving stairs."],
["Can doors face each other in a house according to Vastu?","Explain common beliefs alongside privacy, door swing, circulation and usable wall space."]
],
"Bedroom, wardrobe & storage":[
["Which wardrobe design is best for a small bedroom?","Compare hinged, sliding and loft combinations using clearance, access and storage."],
["Which is better: sliding or hinged wardrobe shutters?","Compare access, track maintenance, room clearance, hardware and cost."],
["How much does a 6 feet wardrobe cost?","Show how height, depth, drawers, lofts, board grade and finish change pricing."],
["Should I add loft storage above the wardrobe?","Discuss ceiling height, access, dust control, proportion and fixing."],
["Which laminate colour makes a small bedroom look bigger?","Explain light reflectance, contrast and sample testing under actual room lighting."],
["What is the ideal wardrobe depth for a bedroom?","Explain hanger clearance, sliding mechanisms, drawers and site measurements."],
["How do I plan a wardrobe with a dressing unit?","Coordinate mirror, lighting, drawers, sockets and circulation."]
],
"Kitchen, ceiling & lighting":[
["Which kitchen layout is best for a 2BHK flat?","Compare L-shaped, parallel and U-shaped layouts using work triangle and clearances."],
["Which countertop is best for a modular kitchen?","Compare granite, quartz and other surfaces by heat, staining, maintenance and budget."],
["Which is better for kitchen cabinets: laminate or acrylic?","Compare cost, fingerprints, cleaning, colour options and edge finishing."],
["How do I choose kitchen cabinet colours?","Balance floor, countertop, backsplash, daylight and room dimensions using physical samples."],
["What is the best material for a kitchen sink cabinet?","Explain moisture exposure, plumbing access, leak protection, board and edge sealing."],
["How much does a gypsum false ceiling cost?","Break down area, framing, board, design, cut-outs, lights and access panels."],
["Which false ceiling is best for a bedroom?","Compare simple gypsum and layered designs based on ceiling height and maintenance."],
["How many lights are needed in a living room?","Plan ambient, task and accent lighting based on room size and activities."],
["Which colour temperature is best for home interiors?","Explain warm, neutral and cool white light by room and task."]
],
"Interior execution & hiring":[
["How long does a complete 2BHK interior take?","Explain design approval, procurement, factory work, site readiness, installation and snag closure."],
["How do I compare two interior design quotations?","Compare drawings, quantities, board grades, laminate codes, hardware, exclusions, taxes and warranty."],
["What questions should I ask an interior designer before hiring?","Check portfolio, supervision, BOQ, revisions, milestones and handover."],
["What is included in a turnkey interior project?","Clarify design, supply, installation, electrical or civil scope, appliances and after-sales support."],
["How do I check modular furniture quality before handover?","Inspect alignment, edge banding, hardware, operation, ventilation, anchoring and finish."],
["What is the difference between carpenter-made and factory-made modular interiors?","Compare customisation, tolerances, site dust, timelines, installation and quality control."],
["What warranty should I get for modular kitchen and wardrobes?","Separate board, finish, hardware, workmanship and service warranties."]
]
};

groups["More interior cost, layout & material questions"] = [
["How much does a complete 1BHK interior cost in Hyderabad?","Compares essential and full-scope interiors with room-wise inclusions and clearly stated exclusions."],
["How much does a 4BHK interior cost in Hyderabad?","Explains room count, built-up area, storage, finishes and custom furniture as cost drivers."],
["How much does a shoe rack cost for a home?","Compares open, closed, seating and foyer-integrated designs by size, ventilation and finish."],
["How much does a crockery unit cost?","Breaks down dimensions, glass shutters, lighting, drawers, laminate and hardware."],
["How much does a pooja unit cost in Hyderabad?","Compares compact wall-mounted and full-height units, materials, lighting and carving details."],
["How much does a study table with storage cost?","Explains desk size, ergonomics, drawers, cable access, shelves and material choices."],
["How much does a bedroom false ceiling cost?","Shows how room area, design complexity, framing, lighting and access panels affect price."],
["How much does a 7 feet sliding wardrobe cost?","Explains width, height, track system, internal layout, board, finish and loft additions."],
["How much does a kitchen tall unit cost?","Compares pantry, appliance and pull-out units by dimensions, accessories and load rating."],
["What is the cost of a quartz kitchen countertop in Hyderabad?","Explains slab selection, thickness, edge profile, cut-outs, supports, installation and current supplier quotes."],
["How much does a home interior designer charge in Hyderabad?","Compares design-only, percentage, per-square-foot and turnkey fee models; clarifies deliverables."],
["What is the difference between interior design fees and execution cost?","Separates design, drawings, project management, materials, fabrication, installation and taxes."],
["Which board is best for wardrobe carcass?","Compares plywood, particle board and engineered boards by load, moisture exposure, hardware and product certification."],
["Can MDF be used in a kitchen?","Explains suitable dry zones, moisture limits, edge sealing and why sink-area exposure needs special care."],
["What is edge banding and why does it matter?","Explains thickness, adhesive, corner finishing and protection of exposed board edges."],
["Which kitchen shutter finish is easiest to maintain?","Compares laminate, acrylic, membrane and other finishes by fingerprints, scratches, cleaning and repairability."],
["How do I choose handles for kitchen cabinets?","Covers grip, projection, finish, cleaning, child safety and alignment with shutter style."],
["What is the best lighting for a wardrobe?","Explains sensor lights, colour rendering, glare, wiring access and safe installation."],
["How much space is needed between a bed and wardrobe?","Explains door swing, drawer pull-out, walking clearance and site-measured furniture layouts."],
["What should I finalise before starting interior work?","A checklist for approved drawings, material codes, electrical points, appliance sizes, finishes, BOQ and payment milestones."]
];


groups["Plywood tests, hinges & finish comparisons"] = [
["How can I identify good-quality plywood for home interiors?","Explain grade markings, manufacturer traceability, sheet thickness, core gaps, bonding evidence and why visual checks cannot certify performance."],
["What should I check on a plywood sheet before buying?","Provide a practical inspection list for labels, batch details, edges, flatness, thickness and storage condition."],
["Is a water test enough to prove plywood is waterproof?","Clarify the limits of soaking or boiling demonstrations and explain why declared grade and test documentation matter."],
["What is the difference between MR, BWR and BWP plywood?","Explain intended moisture exposure and the need to verify the exact manufacturer specification and applicable standard."],
["What does IS 303 mean on a plywood sheet?","Explain how to read a standards claim and verify product documentation without treating a printed mark alone as proof."],
["How do I check whether plywood thickness is correct?","Describe measuring at multiple points with a suitable gauge and comparing the result with the declared specification and tolerance."],
["Which plywood is suitable for a kitchen sink cabinet?","Cover water exposure, leak access, edge sealing, substrate choice, ventilation and maintenance."],
["What are the different types of concealed cabinet hinges?","Compare straight-arm, cranked, overlay, inset and application-specific hinge arrangements."],
["What is the difference between full overlay and half overlay hinges?","Explain shutter coverage, shared cabinet partitions, mounting plates and consistent door gaps."],
["Are soft-close hinges worth the extra cost?","Compare closing comfort, adjustment, mechanism quality, shutter weight and serviceability."],
["How many hinges are required for a wardrobe shutter?","Explain why hinge count depends on shutter dimensions, weight, material and manufacturer load guidance."],
["What is the difference between 90 degree, 110 degree and 165 degree hinges?","Explain opening clearance and access while advising users to check actual hardware geometry and nearby obstructions."],
["Which is better for kitchen shutters: laminate or acrylic?","Compare cleaning, fingerprints, gloss, scratch visibility, edge finishing, substrate and replacement options."],
["What is the difference between veneer and laminate?","Compare natural wood variation, maintenance, protective coating, repair, durability and budget."],
["Is PU paint better than laminate for wardrobe shutters?","Compare seamless colour options, routed profiles, surface preparation, repair and maintenance."],
["What is membrane finish and where can it be used?","Explain wrapped shutter profiles, film adhesion, substrate compatibility, heat and moisture exposure."],
["Is 0.8mm or 1mm laminate better for wardrobes?","Compare product grade, application, substrate, adhesive, edge treatment and why thickness alone is not a durability guarantee."],
["What is the difference between PVC and ABS edge banding?","Compare material properties, thickness options, appearance, adhesive process and suitability by application."],
["What should I check in a modular kitchen hardware quotation?","List hinge model, drawer channel, lift-up mechanism, baskets, load ratings, finish, quantity and warranty."],
["Which drawer channel is best for kitchen cabinets?","Compare roller, telescopic and concealed undermount systems by extension, load, adjustment, soft-close and service access."]
];

export const INTERIOR_HOMEOWNER_TOPIC_GROUPS=Object.entries(groups).map(([category,entries])=>({category,topics:entries.map(([title,description],index)=>({id:category.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+index,title,description,intent:'Homeowner question / cost / comparison / planning intent',evidence:'Search-language research; exact monthly volume not available from public results'}))}));
export const INTERIOR_HOMEOWNER_TOPICS=INTERIOR_HOMEOWNER_TOPIC_GROUPS.flatMap(group=>group.topics.map(topic=>({...topic,category:group.category})));
