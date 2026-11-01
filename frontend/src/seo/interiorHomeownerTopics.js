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


groups["Bathroom renovation budgets & design decisions"] = [
["How much does a complete bathroom renovation cost in Hyderabad?","Break down demolition, waterproofing, tiles, plumbing, sanitaryware, vanity, electrical work and installation."],
["How much does a small bathroom renovation cost?","Compare essential repairs and a cosmetic refresh with a full strip-out, using measured dimensions and defined fixtures."],
["What is the cost of bathroom tile replacement?","Separate tile area, tile selection, removal, debris disposal, substrate repair, adhesive, grout, trims and labour."],
["How much does bathroom waterproofing cost?","Explain area, substrate preparation, system specification, junction treatment, curing, testing and warranty scope."],
["How much does a shower partition cost in Hyderabad?","Compare fixed and hinged glass panels, dimensions, hardware, supports, sealing and installation."],
["How much does a wall-hung WC installation cost?","List concealed cistern or frame, WC model, plumbing changes, wall access, flush plate and installation."],
["What is the cost of a bathroom false ceiling?","Explain moisture-suitable ceiling system, access panels, exhaust, lighting and maintenance access."],
["How much does a bathroom mirror cabinet cost?","Compare mirror size, cabinet depth, shutter, lighting, moisture protection and electrical work."],
["What is the cost of changing bathroom plumbing?","Break down pipe rerouting, fixture relocation, wall and floor opening, replacement, testing, waterproofing and reinstatement."],
["Can I renovate a bathroom without changing the plumbing layout?","Explain when a surface upgrade may retain existing points and why concealed leaks, drainage and fixture compatibility still need inspection."],
["Which bathroom tiles are best for a wet floor?","Compare slip resistance, surface texture, size, cleaning, grout and suitability for wet use; check product ratings."],
["What is the difference between anti-skid and glossy bathroom tiles?","Discuss surface grip, cleaning, water exposure and why actual slip performance should be checked from product data."],
["How much does a bathroom vanity with countertop cost?","Separate cabinet size, board and finish, countertop, basin, tap, plumbing cut-outs and installation."],
["What should be included in a bathroom renovation quotation?","List quantities, product models, demolition, waterproofing, tiles, plumbing, sanitaryware, electrical, debris, taxes and exclusions."],
["How long does a bathroom renovation take?","Explain dependencies such as demolition, concealed repairs, waterproofing curing and testing, tile work, fixture installation and inspection."]
];
groups["False ceiling, lighting & electrical planning costs"] = [
["How much does false ceiling cost for a 2BHK in Hyderabad?","Estimate only after room-wise ceiling measurement and definition of board, framing, design, cut-outs, paint and lighting scope."],
["What is the difference between gypsum and POP false ceiling?","Compare system construction, joints, finish, design flexibility, maintenance, repair and suitability by room."],
["How much does a simple flat gypsum ceiling cost?","Cover measured area, board and framing specification, jointing, finishing, height and access."],
["How much does a layered false ceiling cost?","Explain extra framing, drops, shapes, board area, finishing and coordination with services."],
["How much does cove lighting cost per room?","Separate cove construction, LED strip, profile, diffuser, driver, wiring, dimming and access."],
["How much does LED profile lighting cost for a wardrobe?","List profile length, diffuser, LED specification, driver, wiring, switch and replacement access."],
["How many electrical points are required in a 2BHK?","Explain room-wise planning based on furniture and appliance schedules instead of a universal point count."],
["How many plug points are needed in a modular kitchen?","Plan appliances and countertop use, then have a qualified electrician assess circuiting, loads and safe locations."],
["Where should TV and internet points be placed?","Coordinate TV size, console, router, soundbar, power, data, conduit and service access with the furniture elevation."],
["Where should AC electrical and drain points be planned?","Coordinate indoor and outdoor unit positions, dedicated electrical requirements, drain routing, access and manufacturer instructions."],
["How should geyser points be planned in bathrooms?","Coordinate equipment location, water connections, electrical protection and safe access with qualified trades."],
["What is a reflected ceiling plan?","Explain how lighting, fans, AC diffusers, access panels and ceiling levels are coordinated on a drawing."],
["How much does a bedroom lighting design cost?","Separate fixture supply, wiring, switching, profiles, drivers, dimmers, ceiling work and installation."],
["What is the difference between warm white and cool white lights?","Compare colour temperature and use cases, recommending samples with actual finishes and daylight conditions."],
["What should be checked before closing a false ceiling?","Check framing, supports, wiring, ducts, access, fixture positions, concealed service photographs and inspection sign-off."]
];


groups["Kitchen countertops, stone & surface comparisons"] = [
["Which is better for a kitchen platform, granite or quartz?","Compare exact product data, heat and stain care, porosity, sealing, slab variation, cut-outs and installed scope."],
["Is quartz better than granite for an Indian kitchen?","Discuss cooking habits, hot cookware precautions, maintenance, slab selection and manufacturer-specific limitations."],
["What is the difference between marble and granite kitchen countertops?","Compare natural variation, porosity, maintenance, staining, surface finish and application suitability."],
["How much does a granite kitchen countertop cost in Hyderabad?","Break down slab selection, thickness, measurement, cut-outs, edge profile, backsplash, transport and installation."],
["How much does a quartz kitchen countertop cost?","Explain product range, colour, slab size, thickness, wastage, cut-outs, edge finishing and installation."],
["Can I place a hot pan directly on a quartz countertop?","Explain thermal damage risks and advise following manufacturer guidance and using trivets."],
["Does granite need sealing in a kitchen?","Explain that sealing depends on the stone and product; follow fabricator guidance and perform only the recommended maintenance."],
["Which countertop is easiest to maintain?","Compare cleaning, stain response, sealing and heat limitations by exact surface product rather than broad category."],
["What is the best countertop thickness for a modular kitchen?","Explain slab product, support, edge build-up and cabinet design; final thickness should be confirmed by the fabricator."],
["Which kitchen countertop colour is easiest to maintain?","Discuss visibility of crumbs, water marks, stains and pattern variation using physical samples in the actual lighting."],
["What is the difference between quartz and solid surface?","Compare composition, seams, repairability, heat tolerance, finish and manufacturer-specific care."],
["Can a kitchen sink be under-mounted on granite or quartz?","Check sink compatibility, cut-out details, support, sealing, edge finish and service access with the fabricator."],
["How much does a kitchen backsplash cost?","Separate material, measured area, cut-outs, edge trims, adhesive, grout and installation."],
["What should be included in a kitchen countertop quotation?","List slab brand or source, thickness, area, cut-outs, edge profile, backsplash, sink support, installation and taxes."],
["How do I choose a kitchen platform for heavy Indian cooking?","Match surface care and heat limitations to cooking routines, appliance use, cleaning products and supplier instructions."]
];
groups["Wardrobe accessories, organisers & storage planning"] = [
["What accessories should be included in a master bedroom wardrobe?","Select drawers, shelves, long-hang, shoe storage, laundry and accessory trays based on actual storage needs."],
["What is the cost of a trouser pull-out in a wardrobe?","Compare dimensions, mechanism, finish, load guidance, brand series and quantity."],
["Are wardrobe pull-out baskets useful?","Discuss visibility, ventilation, cleaning, usable depth, load rating and whether open baskets suit stored items."],
["What is a wardrobe lift-up hanger and how does it work?","Explain high-level hanging access, cabinet clearance, user reach and manufacturer load limits."],
["How much does a jewellery organiser tray cost?","Break down tray size, compartments, lining, finish, runner or mounting system and quantity."],
["What is the best wardrobe layout for a couple?","Plan separate hanging, folded clothing, drawers, accessories and shared storage around each user's habits."],
["How many drawers should a wardrobe have?","Recommend deciding by folded items, access frequency, cabinet dimensions and drawer hardware rather than a universal count."],
["How do I plan a wardrobe for sarees and long dresses?","Allow suitable hanging or folded storage, shelf dimensions, garment protection and practical reach."],
["What is the difference between a wardrobe drawer and pull-out basket?","Compare enclosed storage, visibility, cleaning, privacy, hardware and suitable contents."],
["Can wardrobe accessories fit inside sliding wardrobes?","Check opening access, track overlap, internal clearances and whether pull-outs collide with shutters."],
["Which wardrobe accessories are worth the extra cost?","Prioritise daily-use storage and compare benefit, reliability, serviceability and hardware price."],
["How much does a wardrobe with internal organisers cost?","Separate cabinet dimensions, board, finish, drawers, pull-outs, accessories, hardware and installation."],
["What is the best shoe storage inside a wardrobe?","Compare shelves, pull-outs and ventilated compartments by shoe type, cleaning and available depth."],
["How do I plan luggage storage in a wardrobe loft?","Check opening height, load support, access, shutter type and safe retrieval."],
["What should be shown in a wardrobe internal elevation?","Include shelf heights, drawer dimensions, hanging zones, accessories, clearances and hardware schedule."]
];
groups["Room-wise renovation budgets & execution scope"] = [
["How much does a complete 2BHK flat renovation cost in Hyderabad?","Separate room-wise demolition, civil repairs, kitchen, bathrooms, electrical, plumbing, finishes, cabinetry and loose furniture."],
["How much does a living room renovation cost?","Break down TV unit, wall finish, ceiling, lighting, painting, flooring, curtains and furniture."],
["How much does a master bedroom renovation cost?","Include wardrobe, bed, bed-back, side tables, lighting, ceiling, painting, flooring and curtains."],
["How much does a kitchen renovation cost without changing layout?","Compare cabinet replacement and surface upgrades with plumbing or electrical relocation and appliance changes."],
["How much does a bathroom renovation cost without changing tiles?","Explain fixture replacement, vanity, accessories, plumbing repairs and limits if waterproofing or concealed leaks are present."],
["What is the cost of renovating an old apartment?","Include condition survey, society permissions, debris access, concealed services, structural restrictions and room-wise finishes."],
["How much does interior painting cost during renovation?","Clarify surface preparation, putty, primer, number of coats, paint range, furniture protection and labour."],
["What is the cost of replacing home flooring?","Separate tile or floor material, demolition, levelling, adhesive, skirting, wastage, debris and installation."],
["How much does a home renovation designer charge?","Compare design-only, consultation, project management and execution fees with deliverables and site visits."],
["What is included in a turnkey home renovation?","List design, procurement, civil work, plumbing, electrical, cabinetry, painting, fixtures, taxes, installation and exclusions."]
];


groups["Bedroom interior budgets & design planning"] = [
["How much does master bedroom interior design cost in Hyderabad?","Separate wardrobe, bed, headboard, side tables, ceiling, lighting, curtains, finishes and installation."],
["What is included in a master bedroom interior package?","Check drawings, wardrobe, bed-back, side tables, lighting coordination, finishes, installation and exclusions."],
["How much does a bedroom wardrobe and bed-back cost?","Price the wardrobe by dimensions and materials, then list bed-back substrate, finish, lighting and installation separately."],
["What is the best wardrobe layout for a small bedroom?","Plan hanging, shelves, drawers and loft storage while preserving door swing, circulation and access."],
["How much does a bedroom false ceiling cost?","Include framing, board, levels, cove details, wiring, fixtures, access and paint."],
["Which laminate is best for bedroom wardrobes?","Compare finish, texture, cleaning, scratch visibility, colour samples and manufacturer care guidance."],
["Should a bedroom wardrobe have loft storage?","Evaluate ceiling height, access, luggage needs, shutter operation and safe retrieval."],
["How do I plan bedside switches and charging points?","Coordinate bed width, side-table position, reading lights and electrical safety with a qualified electrician."],
["What is the cost of a hydraulic storage bed?","Compare frame construction, mechanism specification, mattress size, storage access, warranty and installation."],
["How can I make a small bedroom look spacious?","Use proportionate furniture, clear circulation, storage planning, lighting and restrained finishes."]
];
groups["Living room interior budgets & TV wall design"] = [
["How much does hall interior design cost in Hyderabad?","Separate TV unit, wall finish, ceiling, lighting, foyer, curtains, flooring, loose furniture and installation."],
["How much does a TV wall unit cost?","Define dimensions, storage, board, finish, hardware, cable management, ventilation and electrical scope."],
["What is the cost of a fluted TV wall panel?","Include panel material, substrate, profile, measured area, edge finishing, lighting and installation."],
["Which is better for a TV unit, laminate or veneer?","Compare appearance, maintenance, substrate, edge detailing, repair and product-specific care."],
["How much does a living room false ceiling cost?","Specify area, ceiling levels, framing, board, cove, access panels, wiring and light fixtures."],
["What lighting is best for a living room?","Layer general, task and accent lighting while considering glare, colour temperature and maintenance."],
["How much does a foyer shoe cabinet cost?","List width, depth, ventilation, shelves, shutter type, hardware, finish and installation."],
["What is the difference between wall panelling and wallpaper?","Compare substrate preparation, joints, durability, cleaning, repair and removal."],
["How do I plan a TV unit for a large television?","Check screen dimensions, viewing distance, mounting height, bracket support, ventilation and cable access."],
["What should a living room interior quotation include?","Request elevations, material codes, quantities, electrical scope, hardware, loose items, taxes and exclusions."]
];
groups["Modular kitchen baskets & hardware mechanisms"] = [
["What are the different types of modular kitchen baskets?","Compare cutlery trays, tandem drawers, bottle pull-outs, corner units, pantry pull-outs and under-sink organisers."],
["What is the difference between a tandem drawer and a wire basket?","Compare sides, extension, load rating, cleaning, organiser compatibility and usable storage."],
["How much does a magic corner kitchen unit cost?","Check cabinet geometry, mechanism model, usable capacity, load rating, installation and warranty."],
["Which is better, a bottle pull-out or a regular kitchen drawer?","Match stored items, cabinet width, access, cleaning and load requirements."],
["What is a tall pantry pull-out in a modular kitchen?","Explain vertical storage, cabinet dimensions, load guidance, aisle clearance and service support."],
["Are soft-close kitchen drawers worth the cost?","Compare mechanism quality, adjustment, full-extension behaviour, load rating and replacement availability."],
["How do I choose a kitchen cutlery organiser?","Measure drawer internal dimensions and select compatible compartments and cleaning-friendly material."],
["What should be checked before buying a kitchen corner unit?","Verify opening size, hinge clearance, door movement, plumbing conflicts and full mechanism dimensions."],
["How much does a modular kitchen basket set cost?","Ask for model-wise quantity, cabinet compatibility, finish, installation and warranty rather than a vague package price."],
["Which kitchen accessories should be avoided under the sink?","Avoid blocking valves, traps, filters and leak inspection; select moisture-suitable organisers with service clearance."]
];
groups["Bathroom fittings, sanitaryware & fixture costs"] = [
["How much does a complete bathroom fittings package cost?","Separate WC, basin, faucet, shower, diverter, flush system, accessories, installation and plumbing changes."],
["Which is better, wall-hung WC or floor-mounted WC?","Compare installation, cleaning, service access, dimensions, cistern compatibility and maintenance."],
["What is the cost of a concealed flush tank?","Include cistern model, frame where required, flush plate, installation, access and compatible WC."],
["How do I choose a bathroom basin and faucet?","Match basin type, faucet reach, spout height, waste fitting, countertop and splash control."],
["What is the difference between an overhead shower and a hand shower?","Compare use, water pressure, spray pattern, cleaning, mounting and diverter compatibility."],
["Which bathroom faucet finish is easiest to maintain?","Review water-mark visibility, cleaning instructions, coating warranty and spare-part availability."],
["What should I check before buying a concealed diverter?","Verify valve compatibility, pressure range, outlet configuration, installation depth and service access."],
["How much does a bathroom vanity unit cost?","Specify width, basin, countertop, board or substrate, moisture exposure, finish, hardware and mirror."],
["How do I select sanitaryware for a small bathroom?","Measure clearances, door swing, fixture projection, circulation, cleaning access and plumbing positions."],
["What bathroom accessories should be installed before tiling?","Plan fixing points for shelves, towel bars, hooks, mirrors, grab bars and shower partitions before tile completion."]
];


groups["Kitchen chimney, hob & appliance planning"] = [
["Which is better, ducted or ductless kitchen chimney?","Compare ventilation route, filters, maintenance, outlet location and exact appliance installation requirements."],
["How do I choose the right chimney size for my kitchen hob?","Match chimney width and performance to hob dimensions, cooking pattern and manufacturer guidance."],
["What is the ideal chimney and hob installation distance?","Use the selected appliance manuals and qualified installer’s requirements rather than a generic online measurement."],
["How much does a kitchen chimney installation cost?","Include appliance, ducting, bends, core cutting where permitted, external outlet, electrical point and labour."],
["What is the difference between filterless and baffle filter chimneys?","Compare operating principle, cleaning, maintenance, suitability and manufacturer instructions."],
["Which kitchen hob is better, built-in gas or induction?","Compare fuel or electrical provision, cookware, ventilation, controls, installation and safety requirements."],
["How do I plan a built-in oven cabinet?","Use exact appliance dimensions, ventilation clearances, heat management, door swing and service access."],
["What are the dimensions required for a built-in microwave?","Check the model-specific niche, ventilation, power supply and access instructions before cabinet fabrication."],
["Where should refrigerator electrical points be placed?","Coordinate plug access, ventilation, door swing, water connection if applicable and appliance removal."],
["How do I plan a dishwasher in a modular kitchen?","Check model dimensions, water inlet, drain, power, door opening, cabinet support and service access."],
["What electrical points are required for a modular kitchen?","Create an appliance load schedule and have a qualified electrician design circuits, protection, earthing and socket positions."],
["Can a kitchen chimney duct pass through a false ceiling?","Review duct route, bends, access, fire and building restrictions with the appliance installer and relevant professionals."],
["What should be included in a kitchen appliance quotation?","List exact brand and model, installation accessories, ducting, cut-outs, electrical or plumbing work, warranty and exclusions."],
["How do I plan a kitchen water purifier location?","Check feed and drain, socket, filter replacement access, cabinet clearance and leak protection."],
["When should kitchen appliances be finalised during interior work?","Freeze model numbers and installation manuals before final cabinet drawings and countertop fabrication."]
];
groups["Plywood, HDHMR, MDF & furniture board comparisons"] = [
["What is the difference between plywood and HDHMR?","Compare construction, declared grade, moisture exposure, fixing performance, finish compatibility and product data."],
["Is MDF good for wardrobe shutters?","Consider thickness, profile design, edge sealing, finish, hardware loads, moisture exposure and manufacturer limitations."],
["Can particle board be used for modular kitchen cabinets?","Check exact grade, exposure, edge protection, hardware fixing and whether the product is approved for that application."],
["Which board is suitable for a kitchen sink cabinet?","Assess leak risk, moisture exposure, edge sealing, ventilation and manufacturer-approved board and finish systems."],
["What is the difference between commercial and BWR plywood?","Ask for exact product grade, standard, intended exposure, certification and technical documentation rather than relying on trade shorthand."],
["How do I identify genuine plywood grade?","Verify manufacturer markings, product code, invoice, applicable standard and documentation; appearance alone cannot certify grade."],
["What is the best thickness for wardrobe plywood?","Thickness depends on span, load, cabinet design, fixing and product specifications; follow the designer and manufacturer."],
["Does HDHMR absorb water?","Moisture resistance is product-specific and does not mean waterproof; check test data, edges and application limitations."],
["Which board is best for CNC-cut wardrobe shutters?","Check machining suitability, density, thickness, profile limits, finish system and hardware compatibility."],
["How much does plywood interior work cost?","Separate board grade, thickness, finish, edge banding, hardware, wastage, labour, transport and installation."]
];
groups["Bathroom tile layouts, grout & shower screens"] = [
["Which grout is best for bathroom tiles, epoxy or cement grout?","Compare chemical resistance, joint size, cleaning, application skill, compatibility and manufacturer guidance."],
["How much does epoxy grouting cost for a bathroom?","Specify measured joint area, tile format, joint width, product, colour, preparation and labour."],
["What is the difference between tile grout and silicone sealant?","Explain grout for suitable tile joints and flexible sealant for specified movement junctions and wet-area details."],
["How do I plan a shower glass partition in a small bathroom?","Check door swing, circulation, panel fixing, drain position, glass safety specification and cleaning access."],
["What thickness glass is used for a shower partition?","Use a competent supplier’s design based on panel size, support, hardware and applicable safety requirements."],
["Should bathroom wall tiles go up to the ceiling?","Consider wet-zone exposure, ventilation, cleaning, budget and the complete waterproofing and finish specification."],
["How do I choose bathroom tile colour and size?","Review actual samples, room dimensions, lighting, grout lines, slip information and cleaning needs."],
["What is tile lippage and how can it be reduced?","Explain substrate flatness, tile calibration, layout, adhesive coverage, levelling and installer workmanship."],
["When should bathroom waterproofing be tested?","Complete the specified inspection and water test after membrane application and before covering it with screed or tiles."],
["How do I plan a bathroom niche in a shower wall?","Coordinate dimensions, slope, waterproofing continuity, tile module, edges and plumbing routes before construction."]
];
groups["Interior paint, textures & wall finish budgets"] = [
["What is the difference between matte and satin wall paint?","Compare sheen, cleanability, glare and how each finish reveals surface imperfections."],
["Which paint is best for a living room?","Choose by substrate, traffic, cleaning needs, light and the exact manufacturer performance data."],
["How much does washable paint cost for a 2BHK?","Measure wall and ceiling area and specify preparation, primer, product range, coats, protection and labour."],
["What is the correct putty, primer and paint sequence?","Follow a compatible system for the substrate and manufacturer’s application and drying instructions."],
["How much does wall texture painting cost?","Define sample pattern, measured area, substrate preparation, product, colour, protection and application labour."],
["Is texture paint suitable for a bedroom feature wall?","Consider cleaning, dust collection, lighting, repairability and a sample panel before approving."],
["Which exterior paint is suitable for heavy rain exposure?","Match the coating system to substrate and exposure and fix cracks or water entry before repainting."],
["Can waterproof paint stop wall dampness?","Explain why the moisture source must be diagnosed; paint alone cannot repair active leakage or rising damp."],
["How do I choose paint colour for a small room?","Review large samples under daylight and artificial lighting and coordinate with flooring, furniture and window exposure."],
["What should a painting contractor quote include?","List surface preparation, putty, primer, product code, coats, coverage, masking, furniture protection and warranty."]
];


groups["Modular kitchen layouts & workflow"] = [
["Which modular kitchen layout is best for a small apartment?","Compare straight, parallel and L-shaped layouts by dimensions, appliance sequence, circulation and storage."],
["What is the difference between L-shaped and U-shaped kitchens?","Compare counter length, corner storage, work zones, entry clearance and room enclosure."],
["How much space is required for a kitchen island?","Check circulation on all sides, appliance door swings, seating, service routes and applicable clearances."],
["Is a parallel kitchen suitable for a narrow room?","Measure the aisle and check opposing cabinet depth, appliance openings, ventilation and safe movement."],
["What is a peninsula kitchen layout?","Explain how a connected counter can add prep or seating space and what it means for circulation."],
["Which kitchen layout gives maximum storage?","Compare usable cabinet runs, corner solutions, tall units, overhead storage and access rather than cabinet count alone."],
["Where should the refrigerator be placed in an L-shaped kitchen?","Coordinate door swing, landing counter, ventilation, electrical point and workflow."],
["How do I plan the sink and hob in a modular kitchen?","Coordinate plumbing, drainage, chimney, heat separation, preparation space and appliance instructions."],
["What is the best kitchen work triangle layout?","Explain the traditional workflow concept and adapt it to room dimensions, multiple cooks and current appliance needs."],
["How much does an L-shaped modular kitchen cost in Hyderabad?","Break down measured cabinets, finish, countertop, hardware, accessories, appliances and installation."],
["What are the advantages of a U-shaped kitchen?","Discuss worktop continuity, storage, corner access and the need for a suitable room width."],
["Can I add an island to an existing kitchen?","Review space, floor services, structure, ventilation, circulation and building restrictions before changing layout."],
["How should a kitchen be designed for two people cooking?","Plan separate prep zones, appliance access, clear paths and storage for shared use."],
["What is the difference between a modular kitchen and a carpenter-made kitchen?","Compare factory fabrication, site-built work, modularity, measurement, hardware, finish and repair."],
["What should a modular kitchen layout drawing include?","Include dimensions, elevations, appliances, services, clearances, countertop cut-outs, storage and hardware schedule."]
];
groups["Wardrobe shutter designs & opening systems"] = [
["Which is better, sliding or hinged wardrobe shutters?","Compare access, floor clearance, tracks, overlap, hardware, maintenance and cabinet dimensions."],
["How much does a sliding wardrobe cost in Hyderabad?","Include track system, shutter material, frame, finish, mirrors or glass, hardware and installation."],
["What are profile shutters in wardrobes?","Explain frame and infill construction, finish options, joint details and compatible hardware."],
["Are glass wardrobe shutters durable?","Check glass safety specification, frame support, edge finish, cleaning, hardware and intended use."],
["What is the difference between acrylic and laminate wardrobe shutters?","Compare appearance, surface characteristics, cleaning, edge treatment, repair and exact product specifications."],
["Which wardrobe shutter is best for a small bedroom?","Select by door swing, aisle width, storage access, room layout and user preference."],
["How many hinges are needed for a wardrobe shutter?","Hinge quantity depends on shutter dimensions, weight, material and manufacturer guidance; avoid fixed generic counts."],
["What causes sliding wardrobe doors to get stuck?","Check track alignment, rollers, debris, installation, shutter plumb and hardware condition."],
["How do I maintain wardrobe sliding tracks?","Follow manufacturer cleaning and adjustment instructions and avoid incompatible lubricants or forced movement."],
["What should be included in a wardrobe shutter quotation?","List shutter size, core, finish code, frame or track, hardware model, mirror or glass details and installation."]
];
groups["Flooring materials, wood, SPC & vinyl"] = [
["Which is better, SPC or vinyl flooring for a home?","Compare core construction, wear layer, underlay, acoustic performance, moisture limits and installation requirements."],
["How much does SPC flooring cost in Hyderabad?","Separate product thickness and wear layer, underlay, floor preparation, trims, skirting and installation."],
["Is wooden flooring suitable for Indian homes?","Consider humidity, spills, room exposure, product construction, expansion and maintenance guidance."],
["What is the difference between laminate and wooden flooring?","Compare surface layer, core, moisture response, repairability, sound and installation."],
["Can SPC flooring be installed over existing tiles?","Check flatness, loose tiles, grout lines, moisture, door clearances and product overlay instructions."],
["Which flooring is best for bedrooms?","Compare comfort, sound, cleaning, wear, climate and maintenance by exact product."],
["What is the difference between marble and granite flooring?","Compare natural variation, hardness, staining, sealing, finish and maintenance."],
["How much does marble flooring installation cost?","Include slab grade, selection, wastage, cutting, laying, polishing, skirting, substrate and labour."],
["Is vinyl flooring waterproof?","Check the exact product’s water resistance and limits at seams, edges, subfloor and standing-water exposure."],
["What is the cost of wooden flooring for a 2BHK?","Measure room areas and specify product, underlay, transitions, skirting, preparation and installation."],
["Which flooring is easiest to clean?","Compare grout lines, surface texture, stain resistance, cleaning instructions and room exposure."],
["How do I choose flooring for stairs?","Review slip suitability, nosing, edge visibility, fixing, maintenance and consistent step dimensions."],
["What is the difference between SPC and WPC flooring?","Compare core construction, density, comfort, dimensional stability, acoustic properties and manufacturer specifications."],
["Can vinyl flooring be used in a kitchen?","Check product approval, water exposure, heat, appliance loads, subfloor and cleaning requirements."],
["What should be included in a flooring BOQ?","List product code, area, wastage, underlay or adhesive, skirting, trims, preparation, labour and taxes."]
];
groups["Interior project timeline & quality inspection"] = [
["How long does a complete 2BHK interior project take?","Explain that duration depends on scope, design freeze, procurement, site readiness, trade coordination and approvals."],
["What is the correct sequence of interior work?","Plan demolition, services, waterproofing, ceiling, flooring, painting, cabinetry, fixtures, testing and handover."],
["When should modular kitchen measurements be taken?","Confirm final wall and service conditions and use verified site dimensions before production drawings."],
["What should I check before wardrobe installation?","Inspect dimensions, wall condition, floor level, board and finish codes, hardware, anchoring and clearances."],
["How do I check modular kitchen installation quality?","Inspect cabinet level, alignment, edge finish, shutter gaps, hardware, countertop joints and service access."],
["What is an interior snag list?","Record room, defect, photograph, responsible party, due date and closure evidence for each item."],
["When should electrical points be finalised for interiors?","Coordinate furniture and appliance drawings before concealed wiring and wall or ceiling closure."],
["How do I avoid extra charges during interior work?","Freeze scope, BOQ, materials and drawings; require written approval for every variation."],
["What documents should an interior designer hand over?","Collect approved drawings, material schedule, warranties, appliance manuals, invoices and as-built service details."],
["How do I compare two interior contractor quotations?","Use identical dimensions, specifications, hardware, quantities, exclusions, taxes, timelines and payment milestones."]
];


groups["Kitchen countertop edges, sinks & accessories"] = [
["Which countertop edge profile is best for a modular kitchen?","Compare eased, pencil, bullnose and bevel profiles by material, cleaning, impact exposure and appearance."],
["What is the difference between an under-mount and top-mount kitchen sink?","Compare cut-out, support, sealing, cleaning and compatibility with countertop material."],
["Which is better, a single-bowl or double-bowl kitchen sink?","Match bowl size and configuration to cookware, washing routine, counter space and drainboard needs."],
["What is the best sink size for an Indian kitchen?","Measure cabinet width, bowl depth, cookware, faucet reach and available countertop before choosing."],
["How much does a modular kitchen sink cost?","Separate sink material, bowl configuration, gauge or thickness, accessories, cut-out and installation."],
["Which kitchen sink material is best, stainless steel or quartz composite?","Compare care, impact, heat, stain response, finish and manufacturer-specific guidance."],
["What is the difference between a kitchen sink strainer and waste coupling?","Explain drain components and confirm compatibility with the selected sink and plumbing."],
["Should I install a sink grid or bottom rack?","Consider sink dimensions, finish protection, cleaning, drainage and replacement availability."],
["What is the best kitchen faucet for an under-mount sink?","Check spout reach, height, swivel, spray function, water pressure and countertop hole positions."],
["What should be included in a kitchen sink quotation?","List exact model, cut-out, mounting method, faucet, waste fittings, accessories, support, plumbing and warranty."]
];
groups["Wardrobe dimensions & storage layouts"] = [
["What is the standard depth of a bedroom wardrobe?","Determine usable internal depth from garment type, shutter system, hardware and room constraints rather than relying on one fixed number."],
["How much height should be provided for hanging clothes?","Separate short-hang and long-hang zones using actual garments and hanger dimensions."],
["How much space is needed for a wardrobe loft?","Check ceiling height, loft shutter operation, safe access, structural support and stored-item size."],
["What is the ideal shelf spacing inside a wardrobe?","Plan around folded clothing, bags and accessories and check reach and visibility."],
["How many drawers should a 3-door wardrobe have?","Base drawer quantity and width on storage inventory, cabinet dimensions and hardware capacity."],
["What is the difference between internal wardrobe depth and external depth?","Account for back panels, shutters, tracks, hinges and accessories when calculating usable storage."],
["How do I plan a wardrobe for sarees and long dresses?","Allocate suitable hanging or folded zones, garment length, shelf access and storage protection."],
["What is the best wardrobe layout for a small master bedroom?","Balance hanging, shelves, drawers and loft storage with door swing, bed clearance and circulation."],
["How much clearance is required in front of a wardrobe?","Check shutter opening, drawer extension, bed and walking path using the actual room plan."],
["What dimensions should be shown in a wardrobe drawing?","Include overall size, internal partitions, shelf heights, drawers, hanging rods, hardware and finished clearances."]
];
groups["Bedroom false ceilings & lighting design"] = [
["Which false ceiling design is best for a small bedroom?","Compare simple perimeter details and partial drops by ceiling height, maintenance and visual proportion."],
["How much does a bedroom cove ceiling cost?","Specify area, framing, board, cove profile, LED strip, driver access, wiring, paint and labour."],
["How many lights are needed in a bedroom?","Create a layered lighting plan based on room size, tasks, luminaire output and user comfort."],
["Which colour temperature is suitable for bedroom lighting?","Compare warm and neutral appearance with actual samples and the intended activity."],
["Where should bedside reading lights be placed?","Coordinate bed size, headboard, seated reading position, glare, switches and wiring."],
["How do I plan wardrobe profile lighting?","Specify LED profile, diffuser, sensor or switch, driver location, cable route and service access."],
["Can a ceiling fan be installed with a false ceiling?","Coordinate structural support, fan downrod, blade clearance, ceiling level and electrical installation."],
["What is the difference between cove lighting and recessed downlights?","Compare indirect ambience and focused or general illumination, glare, energy use and maintenance."],
["How do I avoid glare from bedroom ceiling lights?","Choose appropriate beam angles, diffusers, positions and dimming after reviewing the room layout."],
["What should be included in a bedroom lighting quotation?","List fixture model, wattage, colour temperature, quantity, driver, wiring, controls, installation and warranty."]
];


groups["Kitchen cabinet carcass materials & edge banding"] = [
["Which board is best for a modular kitchen carcass?","Compare plywood, HDHMR and other boards by grade, moisture exposure, screw holding and documented suitability."],
["Is BWP plywood completely waterproof?","Understand product grading and exposure limits; no wood-based panel should be treated as immune to prolonged water damage."],
["What is the difference between HDHMR and plywood for kitchen cabinets?","Compare density, edge machining, fixing, moisture behaviour, weight and manufacturer specifications."],
["What thickness is used for modular kitchen cabinets?","Confirm panel thickness by component, span, hardware and approved design rather than assuming one thickness fits all."],
["What is edge banding and why is it important?","Learn how edge material, adhesive and application protect exposed board edges and improve finish."],
["Which edge band thickness is suitable for kitchen shutters?","Choose by board, shutter design, impact exposure and the edge-band manufacturer's recommendations."],
["How can I check the quality of kitchen cabinet edge banding?","Inspect adhesion, trimming, corners, joints, bubbles and exposed substrate on samples and completed units."],
["Should kitchen cabinet backs use the same board as carcass panels?","Specify backs separately according to cabinet span, fixing, service access and expected loading."],
["How do I protect the cabinet below the kitchen sink?","Use suitable materials, sealed cut edges, accessible plumbing and prompt leak repair; avoid claiming any panel is leak-proof."],
["What details should be mentioned in a modular kitchen material quotation?","Record substrate, grade, thickness, finish, edge band, hardware, back panel, accessories and warranty."]
];
groups["Wardrobe hinges, channels & hardware selection"] = [
["Which hinge is best for a wardrobe shutter?","Select overlay or inset geometry, opening angle, door size, weight and compatible mounting plate."],
["What is the difference between soft-close and normal hinges?","Compare closing mechanism, adjustment, compatibility, durability claims and serviceability."],
["How many hinges are needed for a wardrobe door?","Follow the exact hardware manufacturer's guidance based on shutter dimensions, weight and installation conditions."],
["Which is better, telescopic or tandem drawer channels?","Compare extension, movement, adjustment, load rating, installation and replacement support."],
["What does a drawer channel load rating mean?","Check the test conditions, drawer dimensions, mounting and dynamic or static rating defined by the manufacturer."],
["Are concealed drawer channels worth the extra cost?","Compare appearance, adjustment, usable drawer width, installation precision and service availability."],
["Which hardware is required for a sliding wardrobe?","Check tracks, rollers, anti-jump devices, guides, soft-close compatibility and door weight limits."],
["What is a wardrobe lift and where is it useful?","Assess reach, garment load, cabinet width, mechanism clearance and safe operation."],
["How do I inspect wardrobe hardware before handover?","Test alignment, smooth travel, fixing, soft-close action, clearances and adjustment access."],
["What hardware details should be included in an interior BOQ?","List manufacturer, model, quantity, finish, rated application, accessories, warranty and replacement terms."]
];
groups["Interior material comparison & room-wise budgets"] = [
["How should I divide a 2BHK interior budget room by room?","Create a measured scope for kitchen, wardrobes, bedrooms, living, ceiling, lighting, paint and loose furniture."],
["What is the difference between material cost and installed interior cost?","Include substrate, finish, hardware, labour, wastage, transport, installation and finishing."],
["Which is more affordable, laminate or acrylic for wardrobes?","Compare exact product ranges, substrate, edge treatment, finish, cleaning and replacement cost."],
["Is veneer more expensive than laminate?","Compare product grade, grain selection, polishing, substrate, labour and maintenance requirements."],
["What should a modular kitchen quotation include?","Check cabinet modules, substrate, finishes, hardware, countertop, sink, accessories, appliances and installation exclusions."],
["How much should I allocate for wardrobe accessories?","Prioritize pull-outs and organizers based on actual use, cabinet dimensions, hardware models and load limits."],
["How do I compare two interior design quotations?","Normalize drawings, quantities, material specifications, hardware, brands, exclusions, taxes and payment milestones."],
["What are common hidden costs in home interiors?","Check electrical relocation, plumbing changes, civil work, ceiling, appliance connections, transport and post-installation repairs."],
["Should I choose premium materials for every room?","Prioritize high-use and moisture-exposed areas, then balance appearance, maintenance and available budget."],
["How do I control interior project variations?","Approve drawings, samples, BOQ and written change orders before production or site execution."]
];


groups["Kitchen appliances & cabinet clearances"] = [
["What size space is needed for a built-in oven?","Use the exact appliance installation drawing for niche size, ventilation, electrical connection and service access."],
["How much clearance does a refrigerator need inside a kitchen?","Check the model manual for side, rear and top ventilation gaps and confirm door swing."],
["Can a chimney be installed above any kitchen hob?","Coordinate hob type, chimney width, duct route, outlet and the manufacturer's mounting instructions."],
["What is the difference between a built-in and countertop microwave?","Compare installation niche, ventilation, electrical access, service removal and counter space."],
["How do I plan a dishwasher in a modular kitchen?","Reserve the correct niche and coordinate inlet, drain, power, door swing and service access."],
["Where should the refrigerator be placed in an L-shaped kitchen?","Balance workflow, door opening, ventilation, counter landing space and movement through the kitchen."],
["What is the best height for a kitchen chimney?","Follow the exact chimney and hob manufacturers' installation instructions and local safety requirements."],
["How do I plan electrical sockets for kitchen appliances?","Prepare an appliance schedule and let a qualified electrician design appropriate circuits, protection and socket positions."],
["Can a washing machine be placed beside a modular kitchen?","Check water, drainage, electrical safety, vibration, ventilation and access for servicing."],
["What should an appliance schedule include for kitchen design?","Record brand, model, dimensions, door swing, utility requirements, clearances and installation manual."],
["How much does an L-shaped modular kitchen cost?","Compare measured base, wall and tall units, finishes, hardware, countertop, sink, accessories and installation."],
["How is modular kitchen price calculated per running foot?","Ask whether the rate includes base and wall cabinets, lofts, corner units, hardware and installation."],
["Why do two modular kitchen quotations have different prices?","Compare carcass grade, shutter finish, hardware model, accessories, countertop, sink, taxes and exclusions."],
["Does modular kitchen price include granite countertop?","Check the BOQ for stone type, thickness, edge profile, cut-outs, sink, transport and installation."],
["How much does a tall pantry unit add to kitchen cost?","Specify dimensions, internal pull-outs, hardware model, load rating and number of shelves."],
["What is included in a modular kitchen installation charge?","Clarify delivery, assembly, levelling, fixing, cut-outs, plumbing and electrical coordination, cleanup and adjustments."],
["How can I reduce modular kitchen cost without compromising quality?","Prioritize functional layouts and reliable high-use hardware, then simplify finishes and optional accessories."],
["Are corner carousel units worth the extra kitchen cost?","Compare usable storage, mechanism, access, cabinet geometry, load rating and maintenance."],
["What is the difference between base unit and wall unit pricing?","Compare construction, depth, shutter area, hardware, supports, finish and measurement basis."],
["How do I prepare a kitchen BOQ before requesting quotations?","List each cabinet module, dimensions, substrate, finish, hardware, accessories, countertop, sink and installation scope."],
["Which is better for a bathroom, wall-hung or floor-mounted WC?","Compare plumbing outlet, concealed cistern access, wall support, cleaning and service requirements."],
["What is the difference between a countertop and wall-hung wash basin?","Compare counter space, storage, tap arrangement, wall support and cleaning access."],
["Are concealed shower mixers difficult to maintain?","Check service access, compatible concealed body, spare parts, water quality and installation instructions."],
["What glass is used for a bathroom shower partition?","Specify safety-rated glass and compatible hardware through a qualified supplier; confirm thickness and system approval."],
["What bathroom fittings should be selected before plumbing work?","Freeze WC, basin, mixer, shower, drain, geyser and accessory models with their rough-in drawings."],
["What is the difference between matte and satin wall paint?","Compare light reflection, cleaning, touch-up visibility and the paint manufacturer's recommended use."],
["Is PU polish better than laminate for a TV unit?","Compare appearance, substrate, application quality, repairability, cost and maintenance."],
["What is the difference between veneer polish and laminate?","Understand natural veneer grain and finishing needs versus manufactured decorative laminate surfaces."],
["How do I choose paint colours for a small bedroom?","Test large samples under daylight and artificial lighting with flooring, furniture and room orientation."],
["What should be included in an interior paint and polish quotation?","List surface preparation, primer, product range, coats, sheen, colour codes, polishing system and protection."]
];


groups["False ceiling cost, design & execution"] = [
["How much does a gypsum false ceiling cost per square foot?","Compare board and framing specifications, design complexity, finishing, access panels, lighting cut-outs and installation."],
["What is included in a false ceiling quotation?","Check area measurement, board, framing, joint treatment, paint, cut-outs, access panels, labour and exclusions."],
["Which is better, POP or gypsum false ceiling?","Compare system type, finish, installation, weight, repairability, moisture exposure and manufacturer recommendations."],
["Does a false ceiling reduce room height significantly?","Measure existing ceiling, beams, service routes and proposed drops before selecting the design."],
["How do I calculate false ceiling area?","Measure each ceiling zone and clarify how coves, bulkheads, drops and cut-outs are treated in the quote."],
["Can I install a ceiling fan on a gypsum false ceiling?","The fan needs suitable structural support independent of the board; coordinate fixing and clearance with qualified installers."],
["How do I plan cove lighting in a false ceiling?","Specify LED strip, profile, diffuser, driver access, wiring route, switching and maintenance."],
["What is the difference between a simple and multi-layer false ceiling?","Compare visual effect, ceiling height, framing complexity, labour, lighting integration and future access."],
["How much does a bedroom false ceiling cost for a 2BHK?","Measure each room and specify ceiling system, design, lights, fans, paint and access separately."],
["What should be checked before closing a false ceiling?","Inspect framing, supports, wiring, service routes, access panels and required tests before board installation."]
];
groups["Complete home interior package planning"] = [
["What is included in a complete 2BHK interior package?","List kitchen, wardrobes, TV unit, beds, ceiling, lighting, paint, curtains and any civil or service work separately."],
["What is included in a 3BHK full home interior package?","Define room-wise furniture, storage, kitchen, ceilings, lighting, soft furnishings, appliances and exclusions."],
["How do I estimate complete home interior cost?","Use room measurements, cabinet quantities, material specifications, hardware models, finishes and installation scope."],
["Does a full home interior package include modular kitchen appliances?","Confirm whether chimney, hob, oven, refrigerator and other appliances are included or owner-supplied."],
["Does home interior cost include electrical and plumbing changes?","Check whether point shifting, new circuits, plumbing relocation, geyser and appliance connections are included."],
["How much does a TV unit cost for a 2BHK?","Compare width, storage, substrate, finish, back panel, lighting, wiring access and hardware."],
["How do I budget wardrobes for all bedrooms?","Measure each wardrobe and list lofts, shutters, drawers, internal accessories, substrate and finish."],
["Should curtains and blinds be part of the interior package?","Specify fabric or system, measurements, tracks, lining, installation and motorization if needed."],
["How do I compare a turnkey interior quote with a carpentry-only quote?","Normalize design, civil, electrical, ceiling, materials, hardware, installation, appliances and warranty scope."],
["What documents should I receive before approving an interior package?","Request floor plans, elevations, BOQ, material schedule, samples, hardware codes, payment stages and exclusions."]
];
groups["Kitchen storage accessories & organizers"] = [
["Which kitchen baskets are most useful for Indian cooking?","Choose organizers around cookware, containers, spices and cleaning habits rather than buying every accessory."],
["What is a tandem drawer in a modular kitchen?","Understand drawer box, runner, extension, adjustment and manufacturer-specific load rating."],
["Is a magic corner unit better than a carousel?","Compare cabinet geometry, usable access, movement, load capacity, cost and maintenance."],
["What is the use of a bottle pull-out in a kitchen?","Check cabinet width, bottle sizes, door clearance, mounting and rated load."],
["Which pantry unit is best for a small modular kitchen?","Compare internal width, height, shelf adjustment, full extension and accessibility."],
["How do I choose a cutlery tray size?","Measure drawer internal width, depth and height after accounting for runner and cabinet construction."],
["Are tall pantry pull-outs worth the cost?","Evaluate frequency of use, storage capacity, load rating, accessibility and replacement support."],
["What is the difference between wire baskets and tandem drawers?","Compare construction, cleanability, visibility, movement, extension and the intended stored items."],
["How do I plan corner storage in an L-shaped kitchen?","Use exact corner cabinet dimensions and compare mechanisms before finalizing adjacent drawer widths."],
["What should I check before ordering kitchen accessories?","Confirm model, dimensions, cabinet opening, fixing, load rating, finish, warranty and spare parts."]
];
groups["Interior material schedules & sample approvals"] = [
["How do I prepare an interior material selection sheet?","Record room, location, substrate, product manufacturer, range, code, finish, quantity and approval status."],
["How do I select laminate shades for a complete house?","Review labelled samples beside flooring, wall colours and lighting in the actual room."],
["Should I approve laminate samples before carpentry starts?","Approve exact product codes and retain a signed or photographed sample reference before production."],
["How do I avoid colour mismatch between laminate batches?","Confirm batch consistency, order sufficient quantity together and inspect delivery before installation."],
["What is included in an interior BOQ material schedule?","List boards, finishes, edge bands, hardware, glass, stone, tiles, lighting and installation requirements."],
["How do I compare two interior material brands?","Check exact product ranges, technical data, warranty, finish, availability and intended application."],
["Can a contractor substitute a material after approval?","Require written approval and compare technical suitability, appearance, cost and schedule impact."],
["How do I approve countertop and tile samples?","Review actual batch, thickness, shade, edge, grout, joints, cleaning and installed appearance."],
["Why should hardware model numbers be in an interior quotation?","Exact codes identify dimensions, finish, rated application, compatibility, warranty and replacement parts."],
["What records should I keep after interior handover?","Retain approved drawings, BOQ, product codes, spare samples, invoices, warranties and care instructions."]
];


groups["Room-wise interior cost estimation"] = [
["How much does a living room interior cost?","Estimate TV unit, storage, wall panelling, ceiling, lighting, paint and loose furniture separately."],
["What is the cost of a master bedroom interior?","Measure wardrobe, bed, side tables, dressing, study, ceiling, lighting and finish specifications."],
["How much does a kids bedroom interior cost?","List wardrobe, study desk, storage, bed, safety considerations, lighting and age-flexible furniture."],
["How much does a modular kitchen cost in a 2BHK?","Measure base, wall and tall units and specify carcass, shutters, hardware, countertop, sink and appliances."],
["What is included in a living room interior package?","Clarify TV unit, foyer, crockery, wall finishes, ceiling, lighting, curtains and loose furniture."],
["How do I calculate wardrobe cost by square feet?","Check the vendor's measurement basis and compare cabinet dimensions, internals, shutters, hardware and finishes."],
["How much does a TV unit cost per running foot?","Compare width, height, storage, substrate, finish, back panel, lighting and installation."],
["How do I estimate interior cost for a 3BHK?","Build a room-wise quantity schedule instead of multiplying a generic rate by apartment area."],
["What is the difference between turnkey and design-only interior cost?","Separate design fees from procurement, manufacture, civil work, services, installation and project management."],
["Which interior items should be prioritized on a limited budget?","Prioritize daily-use storage, kitchen functionality, durable hardware, lighting and essential repairs before decorative upgrades."]
];
groups["Kitchen site measurements & ergonomic planning"] = [
["What measurements are required before modular kitchen design?","Record wall lengths, ceiling, openings, beams, sill heights, plumbing, electrical points and appliance locations."],
["How do I measure an L-shaped modular kitchen?","Measure both wall runs, corner condition, openings and usable lengths after accounting for fillers and appliances."],
["What is the kitchen work triangle?","Understand the relationship between sink, cooking and refrigeration zones and adapt it to the actual layout."],
["How much space should be left between kitchen counters?","Plan aisle clearance around user movement and open appliance doors using the actual cabinet and appliance drawings."],
["What is the ideal kitchen counter height for my family?","Choose a comfortable finished height based on user ergonomics, appliance needs and countertop thickness."],
["How deep should a kitchen countertop be?","Coordinate cabinet depth, appliance fit, wall conditions and usable work surface with the designer."],
["How do I plan a parallel kitchen in a narrow room?","Check aisle width, opposing shutter and drawer movement, appliance doors and safe circulation."],
["Where should the sink be placed in an L-shaped kitchen?","Coordinate plumbing, window position, preparation area, dishwasher and countertop joints."],
["How do I measure kitchen loft height?","Check ceiling variation, cabinet height, access, shutter movement and safe retrieval of stored items."],
["What drawings should I approve before kitchen fabrication?","Review plan, elevations, sections, appliance schedule, countertop cut-outs, service points and cabinet BOQ."]
];
groups["Wardrobe measurement & bedroom clearances"] = [
["How do I measure a wall for a custom wardrobe?","Measure width at multiple points, ceiling height, skirting, beams, windows and wall irregularities."],
["How much space is needed to open hinged wardrobe shutters?","Test the actual shutter width and swing against the bed, side tables, doors and walking route."],
["What clearance is needed for sliding wardrobe doors?","Use the selected track and panel drawings to allow for overlap, handles and installation tolerances."],
["How do I calculate internal wardrobe storage space?","Subtract board, back, shutter and mechanism allowances before allocating hanging, shelves and drawers."],
["How should I divide a wardrobe for two people?","Allocate zones by clothing inventory, hanging lengths, folded storage, drawers and user reach."],
["How do I plan a wardrobe around a bedroom window?","Coordinate window opening, curtain stack, sill, daylight, ventilation and cabinet depth."],
["Can a wardrobe cover an electrical switchboard?","Keep switches and service points accessible and coordinate any relocation with a qualified electrician."],
["How do I design a wardrobe loft for a low ceiling?","Check usable ceiling height, shutter operation, access and practical reach before adding loft storage."],
["What should be shown in a wardrobe measurement drawing?","Include overall and internal dimensions, shutter type, gaps, hardware, lofts and installation tolerances."],
["How do I avoid wardrobe drawers hitting the bed?","Check full drawer extension in the room plan with the bed, side tables and circulation clearances."]
];
groups["Bathroom renovation budgets & scope"] = [
["How much does a small bathroom renovation cost?","Measure the room and define demolition, waterproofing, tiles, fixtures, plumbing, electrical and labour scope."],
["What is included in a bathroom renovation quotation?","Check removal, disposal, repairs, pipes, waterproofing, tiles, grout, sanitaryware, fittings and testing."],
["How much does it cost to replace bathroom tiles only?","Clarify whether old tile removal, substrate repair, waterproofing, tile supply, adhesive, grout and disposal are included."],
["Can I renovate a bathroom without changing plumbing?","Inspect pipe condition, fixture positions, leakage and compatibility before deciding to retain concealed plumbing."],
["How do I budget for a bathroom shower partition?","Compare glass specification, hardware, dimensions, opening, installation and water containment details."],
["What is the cost difference between wall-hung and floor-mounted toilets?","Include the WC model, cistern or frame, wall work, plumbing, flush plate and future service access."],
["How much does bathroom waterproofing add to renovation cost?","Compare substrate repairs, system, detailing, application, testing and protection before tiling."],
["Should bathroom renovation include a new ceiling and exhaust?","Check moisture, ventilation, electrical scope, access and the condition of existing ceiling materials."],
["How long does a full bathroom renovation take?","Build a programme for demolition, repairs, waterproofing and testing, tiling, curing, fixtures and snagging."],
["How do I compare bathroom renovation contractors?","Use the same measured BOQ, fixture schedule, waterproofing system, tile specification, exclusions and payment milestones."]
];


groups["Interior design styles & concept selection"] = [
["What is the difference between modern and contemporary interior design?","Compare design principles, current trends, furniture forms, materials and how each style adapts to a home."],
["What is warm minimal interior design?","Explore restrained layouts, natural textures, warm neutrals, concealed storage and layered lighting."],
["How do I design a minimalist living room?","Prioritize circulation, practical storage, proportionate furniture and a limited finish palette."],
["Which interior style is suitable for a small apartment?","Choose a coherent palette and space-efficient furniture based on daylight, storage needs and room dimensions."],
["What is the difference between Scandinavian and minimalist interiors?","Compare material warmth, colour, furniture, texture and decorative detail rather than treating the styles as identical."],
["How do I create a modern luxury bedroom?","Coordinate headboard, wardrobe, lighting, textiles, finishes and storage without overcrowding the room."],
["What colours are used in warm minimal interiors?","Test warm neutrals and muted accents with flooring, daylight and actual room lighting."],
["How do I choose one interior theme for the entire house?","Create a consistent base palette and repeat selected materials while allowing room-specific functions."],
["Can I mix modern and traditional interior designs?","Use a consistent proportion, material palette and focal details to make mixed styles feel intentional."],
["How do I prepare an interior design brief from reference images?","Identify the features you like, then translate them into layout, material, storage, lighting and budget requirements."]
];
groups["Interior designer and contractor selection"] = [
["What questions should I ask an interior designer before hiring?","Ask about relevant projects, drawings, scope, BOQ, site visits, team, timeline, procurement and handover."],
["How do I verify an interior designer's previous work?","Review completed projects, references, actual site photos and the firm's precise role in delivery."],
["What drawings should an interior designer provide?","Clarify plans, elevations, sections, electrical, ceiling, furniture details, material schedules and BOQ."],
["What is the difference between an interior designer and an interior contractor?","Understand design responsibility, procurement, execution, coordination and who is accountable for each deliverable."],
["How do I compare two interior designers' quotations?","Normalize design fees, material specifications, quantities, revisions, site supervision, taxes and exclusions."],
["Should I sign an agreement before starting interior work?","Document scope, deliverables, payment milestones, schedule, variations, warranty and dispute handling."],
["How do I check an interior contractor's material quality?","Request product codes, datasheets, samples, invoices and inspection access before installation."],
["How often should an interior designer visit the site?","Agree a visit and reporting cadence linked to milestones, concealed work, sample approvals and installation checks."],
["What should I check before paying an interior contractor advance?","Verify identity and payment beneficiary, agreement, advance purpose, procurement plan and adjustment terms."],
["What documents should I receive after interior work is completed?","Collect as-built drawings, BOQ, product codes, warranties, manuals, spare samples and snag closure."]
];
groups["Interior cost and electrical-plumbing coordination"] = [
["How do I estimate electrical cost for home interiors?","Count points and fixtures, identify wiring changes, profiles, drivers, switches and qualified installation scope."],
["Does interior design cost include new electrical wiring?","Check whether point shifting, circuits, concealed conduits, protective devices and testing are included."],
["How much does false ceiling lighting add to interior cost?","Specify fixture quantity, profile lengths, drivers, controls, wiring, cut-outs and installation."],
["How do I budget plumbing changes during kitchen renovation?","List sink relocation, water and waste routes, valves, purifier, dishwasher and reinstatement work."],
["Can I move a kitchen sink to another wall?","Check drainage route, gradients, water supply, slab or wall constraints and professional feasibility before finalizing."],
["What is included in a turnkey interior project?","Confirm design, materials, manufacturing, civil work, electrical, plumbing, installation, appliances and handover."],
["How do I estimate living room lighting cost?","Prepare a fixture schedule for ambient, task and accent lighting with drivers, wiring and controls."],
["Should I include curtains and blinds in the interior budget?","Measure openings and specify fabric or system, tracks, lining, installation and motorization separately."],
["How do I avoid extra charges during interior execution?","Approve drawings, BOQ, samples and exclusions, then require written variation approval before changes."],
["How do I compare interior project timelines?","Review design approvals, procurement lead times, site readiness, trade sequence, installation and snagging."]
];


groups["Flooring installation and wall finishes"] = [
["Which flooring is best for a living room?","Compare vitrified tile, natural stone, engineered wood and resilient flooring by use, finish, maintenance and budget."],
["What is the difference between full-body and glazed vitrified tiles?","Understand tile construction, surface design, wear characteristics, edge appearance and suitable applications."],
["How do I choose the right tile size for a small room?","Consider room proportions, layout, cutting, grout lines, door thresholds and available tile dimensions."],
["What is tile lippage and how can it be checked?","Learn how adjacent tile edges differ in height and why substrate, tile calibration and installation technique matter."],
["Which tile adhesive should be used for large-format tiles?","Select a compatible adhesive system based on tile type, substrate, location and manufacturer guidance."],
["How wide should floor tile grout joints be?","Follow tile manufacturer recommendations and project specifications for tile size, variation and installation conditions."],
["What is the difference between epoxy and cement grout?","Compare stain resistance, chemical resistance, application, cleaning, repair and cost considerations."],
["How do I plan skirting with floor tiles?","Coordinate skirting height, tile cuts, wall finish, door frames, furniture and cleaning needs."],
["How do I choose flooring for a kitchen?","Prioritize slip resistance, cleaning, stain performance, joints and compatibility with wet-area detailing."],
["Which flooring is suitable for bedrooms?","Compare comfort, acoustics, temperature, durability, cleaning and moisture conditions."],
["What should I check before tile installation starts?","Inspect substrate soundness, levels, moisture, setting-out, tile batch, adhesive and movement-joint details."],
["Why do floor tiles sound hollow after installation?","Understand possible causes and why inspection and appropriate repair assessment are needed before assuming every hollow sound means failure."],
["Can the same floor tile be used in bathrooms and living rooms?","Check wet-area slip performance, surface finish, drainage falls and intended-use suitability before selecting one tile throughout."],
["What is the difference between wallpaper and texture paint?","Compare pattern options, substrate preparation, moisture suitability, cleaning, repair and installation."],
["Which wall finish is easy to maintain in a living room?","Evaluate washable paint, wallpaper, panels and cladding for dust, fingerprints, repair and cleaning."],
["Are decorative wall panels suitable behind a TV unit?","Consider heat sources, cable access, fixing substrate, panel joints, service access and finish durability."],
["What is the difference between laminate wall panels and veneer panels?","Compare appearance, substrate, natural variation, maintenance, edge detailing and repair."],
["Can wallpaper be installed on a damp wall?","No decorative covering should hide active dampness; identify and resolve the moisture source before finishing."],
["How do I select a feature wall finish for a bedroom?","Coordinate headboard, bedside lighting, wardrobe, textiles, cleaning and visual scale."],
["How do I match flooring with interior laminate colours?","Compare physical samples in daylight and artificial light with wall paint, doors, countertops and furniture."]
];
groups["Vastu-aware interior and floor plan coordination"] = [
["How do I coordinate Vastu with modern interior design?","Treat Vastu preferences as a design input while retaining safe circulation, ventilation, structure and practical room use."],
["Where should I place the bed according to common Vastu preferences?","Discuss traditional preferences alongside door positions, window drafts, bedside access and comfortable circulation."],
["How do I plan a pooja unit in a small apartment?","Consider available wall space, ventilation, electrical safety, storage, clearances and household routines."],
["What should I consider before placing a pooja unit in the living room?","Coordinate privacy, visual focus, lighting, storage, ventilation and safe placement away from cooking or wet areas."],
["How can I plan a kitchen around Vastu preferences?","Balance preferred orientation with hob-sink workflow, exhaust, plumbing, appliance clearances and storage."],
["Can wardrobe placement follow Vastu and still be practical?","Check wall strength, door swings, window access, circulation and storage dimensions before fixing the location."],
["How do I plan a study room with Vastu preferences?","Prioritize daylight, glare control, desk ergonomics, power and data points, quiet and storage."],
["What should I check before changing a room layout for Vastu?","Recheck structure, approvals, ventilation, plumbing, electrical routes and the actual usable area."]
];

export const INTERIOR_HOMEOWNER_TOPIC_GROUPS=Object.entries(groups).map(([category,entries])=>({category,topics:entries.map(([title,description],index)=>({id:category.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+index,title,description,intent:'Homeowner question / cost / comparison / planning intent',evidence:'Search-language research; exact monthly volume not available from public results'}))}));
export const INTERIOR_HOMEOWNER_TOPICS=INTERIOR_HOMEOWNER_TOPIC_GROUPS.flatMap(group=>group.topics.map(topic=>({...topic,category:group.category})));
