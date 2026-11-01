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


groups["Vastu door, room & floor-plan questions"] = [
["How many doors should a house have according to Vastu?","Explain that there is no universal required count and prioritise safe exits, circulation, privacy and approved plans."],
["Does the main door direction matter in Vastu?","Summarise common traditional preferences and explain how to verify plot orientation and preserve a practical entrance."],
["Which direction should the kitchen face according to Vastu?","Describe common beliefs while checking ventilation, exhaust, work triangle, gas or electrical safety and service routing."],
["Where should the staircase be placed according to Vastu?","Explain differing traditional views and require structural, headroom, landing, handrail and escape-route checks."],
["Can the pooja room be next to a staircase or toilet?","Discuss common household preferences alongside privacy, cleanliness, ventilation and safe electrical planning."],
["Which direction is preferred for the master bedroom in Vastu?","Explain traditional preferences without overriding daylight, privacy, noise control and furniture clearances."],
["Is a north-east toilet allowed in a Vastu house plan?","Describe differing beliefs and prioritise sanitation, plumbing, ventilation, waterproofing and code requirements."],
["What Vastu points should I check in a west-facing house?","Offer a preference-based review of entrance and room arrangement while treating surveyed orientation and site constraints accurately."],
["What should I do if the Vastu plan conflicts with structural design?","Set a clear priority order: engineering, regulations, safety and building performance first; accommodate beliefs only where feasible."],
["Can I change an existing house plan to make it Vastu compliant?","Explain which non-structural layout choices may be reviewed and why structural changes need professional assessment and approval."]
];


groups["TV unit, living room & media wall costs"] = [
["How much does a TV unit cost in Hyderabad?","Explain cost drivers by measured width, console type, storage, board, finish, lighting, wiring and installation; request current itemised quotes."],
["How much does a 6 feet TV unit cost?","Compare a simple console with storage and wall-panelling options, clarifying dimensions and material assumptions."],
["How much does a 8 feet TV unit cost?","Explain how wider spans, drawers, shelves, panels and fixing requirements change the scope."],
["What is the cost of a full TV wall panel design?","Separate panel area, substrate, veneer or laminate finish, fluted details, lighting, electrical work and wall preparation."],
["How much does a floating TV cabinet cost?","Cover cabinet length, depth, drawer hardware, wall structure, concealed supports and cable access."],
["What is the cost of a TV unit with fluted panels?","Explain panel material, profile spacing, finish, backing, dust cleaning and installation labour."],
["How much does a TV unit with storage cost?","Compare open shelves, closed shutters, drawers, display units and equipment ventilation."],
["What should be included in a TV unit quotation?","List measured drawings, board grade, finish codes, hardware, lighting, wiring, installation, taxes and warranty."],
["Which material is best for a TV unit?","Compare suitable plywood and engineered-board substrates with laminate, veneer, acrylic and painted finishes based on location and maintenance."],
["How do I hide wires behind a TV unit?","Plan conduit routes, power and data points, ventilation, removable access and service loops before the panel is closed."]
];
groups["BHK-wise interior budgets & room costs"] = [
["How much does a 1BHK interior cost in Hyderabad?","Separate essential kitchen, wardrobe, TV storage and optional furniture, ceiling, lighting, appliances and decor."],
["How much does a 2BHK interior cost in Hyderabad?","Build a room-wise scope for kitchen, two bedrooms, wardrobes, TV unit, foyer and optional civil or electrical work."],
["How much does a 3BHK interior cost in Hyderabad?","Explain the third bedroom's use, storage scope, room count, finishes and common-area work as budget variables."],
["How much does a 4BHK interior cost in Hyderabad?","Compare room-by-room requirements, premium zones, wardrobes, kitchen, utility, foyer and family lounge storage."],
["Is interior cost calculated per square foot or by modules?","Explain the limits of carpet-area pricing and why cabinet dimensions, finish and accessories should be measured."],
["How much does a master bedroom interior cost?","Separate wardrobe, bed back panel, side tables, dresser, ceiling, lighting, curtains and loose furniture."],
["How much does a kids bedroom interior cost?","Cover safe storage, study desk, bed, wardrobe, durable finishes, rounded edges and future flexibility."],
["How much does a guest bedroom interior cost?","Compare essential wardrobe and bed storage with optional study, dresser, wall panelling and decor."],
["How much does a foyer shoe cabinet cost?","Compare open, closed, ventilated, seating and mirror-integrated designs by width, height and finish."],
["How much does a crockery unit cost in Hyderabad?","Explain cabinet size, glass shutters, lighting, drawers, display shelves, finish and hardware."],
["How much does a pooja unit cost in Hyderabad?","Compare wall-mounted and floor-standing units by size, material, lighting, carving and storage."],
["How much does a study table with storage cost?","Break down desk dimensions, drawers, shelves, ergonomics, cable management and finish."],
["How much does a sliding wardrobe cost compared with hinged wardrobe?","Compare track hardware, shutter construction, usable access, room clearance, dimensions and maintenance."],
["How much does a wardrobe loft cost?","Explain top cabinet dimensions, access height, shutter type, ceiling closure and internal divisions."],
["What is usually excluded from a turnkey interior package?","Clarify appliances, loose furniture, curtains, decor, civil work, electrical relocation, plumbing, taxes and approvals."]
];
groups["Kitchen, wardrobe & interior hardware price questions"] = [
["How much does an L-shaped modular kitchen cost?","Compare base and wall cabinet lengths, corner mechanisms, countertop, accessories and service changes."],
["How much does a parallel modular kitchen cost?","Explain two cabinet runs, aisle clearance, countertop lengths, appliance layout and storage accessories."],
["How much does a U-shaped modular kitchen cost?","Cover three cabinet runs, corner storage, work triangle, countertop and installation complexity."],
["How much does a kitchen tall unit cost?","Compare pantry, oven and appliance towers by height, pull-outs, hardware and load requirements."],
["How much do tandem drawers cost for a modular kitchen?","Explain drawer dimensions, load rating, runner series, soft-close, internal organisers and quantity."],
["What is the cost of a magic corner kitchen unit?","Compare mechanism type, cabinet dimensions, usable access, load rating, brand and installation."],
["How much do soft-close hinges cost for a kitchen?","Ask users to compare brand, model, opening angle, damping, quantity and compatibility rather than generic rates."],
["What is the cost difference between laminate and acrylic kitchen shutters?","Compare exact product ranges, substrate, edge finish, colour, cleaning, scratch visibility and fabrication."],
["How much does a 7 feet wardrobe with loft cost?","Explain full measured height, loft dimensions, shutter type, internal layout, board and hardware."],
["What is the cost of a wardrobe with sliding shutters?","Break down track system, shutter count, panel size, mirror or glass options, soft-close and installation."]
];


groups["Bathroom, vanity & utility interior costs"] = [
["How much does a bathroom vanity cost in Hyderabad?","Compare wall-hung and floor-standing vanity cabinets by width, board, finish, countertop, basin, plumbing access and installation."],
["What is the cost of a bathroom mirror cabinet?","Break down mirror size, storage depth, shutter type, moisture-suitable materials, lighting and electrical provision."],
["Which material is suitable for a bathroom vanity cabinet?","Discuss moisture exposure, ventilation, board and finish suitability, edge sealing, plumbing leaks and maintenance; no board is waterproof simply because it is labelled moisture resistant."],
["How much does a wash basin cabinet cost?","Explain cabinet dimensions, basin type, countertop, plumbing cut-outs, storage, finish and fitting scope."],
["Can plywood be used below a bathroom wash basin?","Explain moisture-risk management, product specification, sealing, ventilation, leak prevention and why the exact application needs professional selection."],
["What is the difference between a PVC and plywood vanity cabinet?","Compare water exposure, rigidity, hardware compatibility, finish options, repairability, installation and product quality."],
["How much does a utility cabinet cost for an apartment?","Cover cabinet length, washing machine clearance, sink, tall storage, ventilation, plumbing and electrical access."],
["How should I plan a washing machine cabinet?","Check appliance dimensions, vibration clearance, water inlet, drain, socket safety, ventilation and service access."],
["What is the cost of a bathroom mirror with LED lighting?","Separate mirror, LED profile, driver, wiring, switch, demister if selected and installation."],
["What should be included in a bathroom interior quotation?","List vanity, mirror, accessories, shower partition, storage, countertop, plumbing changes, electrical, waterproofing and exclusions."],
["How much does a shower glass partition cost?","Compare fixed and hinged panels, glass specification, hardware, dimensions, supports, sealing and installation."],
["Which finish is easiest to maintain in a bathroom cabinet?","Compare laminate and other suitable finishes by edge protection, cleaning, water splash exposure and repair."],
["How much does a tall bathroom storage cabinet cost?","Explain height, depth, wall fixing, moisture exposure, shutter finish, shelves and safe clearances."],
["Can I install a mirror cabinet above a wash basin?","Check user height, basin splash, electrical points, door clearance, wall fixing and safe access."],
["How do I prevent swelling in a bathroom vanity cabinet?","Cover leak prevention, edge sealing, ventilation, suitable materials, raised plinths and prompt repair of plumbing leaks."]
];
groups["Interior design scope, false ceiling & lighting costs"] = [
["How much does a false ceiling cost for a 2BHK flat?","Explain room-wise ceiling area, gypsum or other system, levels, access panels, framing, cut-outs, lighting and painting."],
["What is the cost of a gypsum false ceiling per square foot?","Explain why rates depend on board, framing, design complexity, height, access, finish and electrical exclusions; request dated local quotations."],
["How much does cove lighting cost in a bedroom?","Separate profile or cove construction, LED strip, driver, wiring, switch, dimmer and installation."],
["How many lights are required for a 2BHK house?","Explain lighting layers, room dimensions, task needs, fixture lumen output, colour temperature and electrical planning."],
["What is the difference between warm white and neutral white lighting?","Compare colour temperature and visual effect, while recommending sample testing with actual wall and finish materials."],
["How much does a bedroom bed-back panel cost?","Break down panel width and height, substrate, finish, upholstery, grooves, lighting and electrical scope."],
["How much does a complete bedroom interior cost?","List wardrobe, bed, side tables, bed-back, dresser, ceiling, lighting, curtains and loose furniture separately."],
["What is included in a turnkey interior package?","Ask for room-by-room inclusions and exclusions covering cabinetry, electrical, ceiling, painting, appliances, curtains, furniture, taxes and installation."],
["How much does a home interior designer charge in Hyderabad?","Compare design-only, consultation, project-management and execution fee models, deliverables, revision limits and site visits."],
["What is the difference between design fees and execution costs?","Explain drawings and specification services versus material, fabrication, labour, installation, taxes and project coordination."],
["How do I compare two interior design quotations?","Use the same drawings, dimensions, board and finish specifications, hardware models, quantities, exclusions and warranty terms."],
["How much does a complete 2BHK interior package exclude?","Highlight common exclusions such as appliances, loose furniture, curtains, decor, civil changes, electrical relocation and taxes."],
["What is the cost of a shoe rack with seating?","Compare width, height, ventilation, drawers, upholstery, mirror and wall fixing."],
["How much does a crockery unit with glass shutters cost?","Break down cabinet size, glass type, profiles, lighting, shelves, hardware and finish."],
["How much does a pooja unit with backlit panels cost?","Compare wall-mounted and floor-standing formats, material, lighting, storage, carving and electrical access."]
];

export const INTERIOR_HOMEOWNER_TOPIC_GROUPS=Object.entries(groups).map(([category,entries])=>({category,topics:entries.map(([title,description],index)=>({id:category.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+index,title,description,intent:'Homeowner question / cost / comparison / planning intent',evidence:'Search-language research; exact monthly volume not available from public results'}))}));
export const INTERIOR_HOMEOWNER_TOPICS=INTERIOR_HOMEOWNER_TOPIC_GROUPS.flatMap(group=>group.topics.map(topic=>({...topic,category:group.category})));
