// Search-led homeowner questions researched from Google Trends guidance, public search-result patterns,
// and real homeowner decision language. These are not monthly-volume rankings.
// Refresh priorities with Google Trends Top/Rising queries and Search Console performance data.
const groups = {
  "Concrete defects & structural safety": [
    ["Is honeycombing in concrete dangerous?","Understand when voids in concrete are cosmetic or may expose reinforcement and reduce durability; learn what a structural engineer should inspect before repairs."],
    ["What causes honeycombing in concrete columns?","Common causes include poor compaction, congested reinforcement, unsuitable workability and leakage from formwork."],
    ["How do you repair honeycomb in an RCC column?","Explains why loose concrete must be assessed, how repair methods are selected and why plaster must not conceal a structural defect."],
    ["Can a honeycombed column be repaired?","Covers defect depth, reinforcement exposure, structural assessment and repair approval."],
    ["Are cracks in a newly constructed house normal?","Distinguishes common shrinkage cracks from warning signs that need prompt professional assessment."],
    ["Which wall cracks are dangerous in a house?","Explains crack width, direction, movement, location and when to contact a structural engineer."],
    ["Why are diagonal cracks appearing near doors and windows?","Looks at stress concentrations, lintels, movement and workmanship around openings."],
    ["What is the minimum concrete cover for RCC columns and slabs?","Explains that cover depends on exposure, member type, fire and the approved structural drawings."],
    ["How long should a newly cast roof slab be cured?","Explains curing purpose, hot-weather precautions and the need to follow the project specification and applicable code."],
    ["How can I check concrete quality before slab casting?","A practical pre-pour checklist covering reinforcement, cover blocks, formwork, services, mix, access and inspection sign-off."]
  ],
  "Cement, steel & construction materials": [
    ["Which cement is best for house construction in India?","Compares cement types by application and explains why freshness, conformity, storage and engineer specification matter more than brand claims."],
    ["Which is better for house construction: OPC or PPC cement?","Explains strength development, heat, durability and suitable uses without treating one type as universally best."],
    ["Which TMT steel is best for house construction?","Explains grade, ductility, traceability, test certificates and why reinforcement must match structural drawings."],
    ["What is the difference between Fe 500 and Fe 500D steel?","Explains the meaning of grade and ductility suffixes and why the structural designer selects the required grade."],
    ["Is Fe 550 steel better than Fe 500D for a house?","Compares strength and ductility considerations and cautions against substituting grades without design approval."],
    ["How do I identify original TMT steel?","Covers bar markings, manufacturer traceability, invoices, test certificates and checks by qualified personnel."],
    ["Which is better: red bricks or AAC blocks?","Compares weight, thermal performance, workability, wall thickness, fixing details and project suitability."],
    ["Is M-sand better than river sand for house construction?","Explains grading, cleanliness, source quality, testing and suitability for concrete or masonry."],
    ["Which aggregate size is used for roof slab concrete?","Explains how aggregate size is specified based on member dimensions, reinforcement spacing and mix design."],
    ["How can I check cement quality before buying?","A homeowner checklist for bags, batch/date information, storage, supplier traceability and appropriate tests."]
  ],
  "House construction cost & budgets": [
    ["What is the house construction cost per square foot in Hyderabad?","Explains how scope, specification, built-up area, site conditions and exclusions change a realistic estimate."],
    ["How much does it cost to build a 2BHK house in Hyderabad?","Shows how area, floors, finish level and site conditions shape a project budget."],
    ["How much does it cost to build a 3BHK house in Hyderabad?","Explains the main cost drivers and how to compare like-for-like quotations."],
    ["How much does it cost to build a 100 square yard house?","Clarifies plot area versus built-up area, setbacks, floor count and scope."],
    ["What is the construction cost for a 30x40 house in Hyderabad?","Explains area calculations, floor configuration and cost items that are often excluded."],
    ["How much does a G+1 house construction cost?","Breaks down the effect of total built-up area, structural design, finishes and services."],
    ["What is included in a house construction package?","Explains inclusions, exclusions, material specifications, approvals, utilities and handover."],
    ["How do I calculate the built-up area of a house?","Clarifies plot area, carpet area, built-up area and the measurement basis used in quotations."],
    ["How much does a house construction contractor charge?","Explains labour-contract versus turnkey pricing and what the quoted rate should include."],
    ["How much extra budget should I keep for unexpected construction costs?","Explains contingency planning, provisional sums, site unknowns and written variation controls."]
  ],
  "Contractors & construction companies": [
    ["What are the top 10 construction companies in Hyderabad?","A transparent shortlist guide based on verifiable project experience, service scope, credentials and customer evidence—not paid placement."],
    ["Which is the best house construction company in Hyderabad?","Explains how to shortlist based on project fit, completed homes, written specifications, supervision and contract clarity."],
    ["How do I choose a reliable house construction contractor?","A practical due-diligence checklist covering references, site visits, scope, payment milestones and warranties."],
    ["What questions should I ask a construction company before signing?","Covers drawings, materials, exclusions, timeline, escalation, quality checks, insurance and dispute handling."],
    ["How can I verify a construction company in Hyderabad?","Explains business identity checks, address, registrations where applicable, references and completed project verification."],
    ["Is turnkey house construction better than hiring separate contractors?","Compares single-point responsibility, coordination, cost transparency and owner involvement."],
    ["What should a house construction agreement include?","Covers scope, drawings, specifications, milestones, variations, delays, defect liability and dispute clauses."],
    ["How do I compare two house construction quotations?","A line-by-line method for comparing quantities, brands, grades, exclusions and payment terms."],
    ["How do I check the quality of a builder's completed projects?","Explains site visits, owner references, workmanship checks and asking about defects after handover."],
    ["What is the difference between a builder, contractor and construction company?","Clarifies typical roles and responsibility boundaries in residential projects."]
  ],
  "House plans, plots & permissions": [
    ["What documents should I check before buying a plot in Hyderabad?","A due-diligence overview covering title, encumbrance, layout approval, land use, access and professional legal review."],
    ["How do I get building permission in Hyderabad?","Explains the current official approval route and why requirements depend on plot and project category."],
    ["What is the difference between GHMC and HMDA approval?","Clarifies local-body and metropolitan planning roles and why the property's jurisdiction matters."],
    ["How much setback is required for a house in Telangana?","Explains that setbacks depend on applicable rules, road width, plot and building parameters; directs readers to current approval rules."],
    ["Can I build a house without building permission in Hyderabad?","Explains risks of unauthorised construction and the need to verify the applicable approval process."],
    ["What is an occupancy certificate and is it required for a house?","Explains the purpose of an occupancy certificate and the approval conditions that apply."],
    ["Which direction is best for a house entrance?","Discusses practical planning, daylight, ventilation and personal preferences without presenting belief-based claims as building rules."],
    ["How do I plan a 30x40 house floor plan?","Covers setbacks, circulation, room sizes, parking, ventilation and future expansion."],
    ["How many floors can I build on a 100 square yard plot?","Explains why road width, plot dimensions, setbacks, zoning and structural design determine permissible floors."],
    ["Should I get a soil test before building a house?","Explains what a geotechnical investigation reveals and why foundation decisions should not be guessed."]
  ],
  "Waterproofing, dampness & roof leakage": [
    ["Why is my newly built house wall getting damp?","Explains rising damp, plumbing leaks, rain penetration and condensation as different possible causes."],
    ["How do I stop terrace leakage permanently?","Covers diagnosis, slope, drainage, cracks, waterproofing system selection and pond testing."],
    ["What is the best waterproofing for a bathroom?","Compares system types and explains substrate preparation, detailing and water testing."],
    ["Why is water leaking from the bathroom ceiling?","A step-by-step approach to locating plumbing, waterproofing or drainage failures."],
    ["How do I fix seepage on an external wall?","Explains diagnosis of cracks, joints, parapets and facade exposure before choosing a repair."],
    ["Is waterproofing required before laying bathroom tiles?","Explains wet-area membrane continuity, corners, pipe penetrations and testing before tiling."],
    ["How do I prevent water leakage from a balcony?","Covers slope, drain detailing, thresholds, joints and waterproofing upturns."],
    ["What causes white salt deposits on house walls?","Explains efflorescence, moisture movement and why cleaning alone may not solve the source."],
    ["How often should terrace waterproofing be renewed?","Explains that service life depends on system, exposure, maintenance and installation quality."],
    ["How can I reduce roof heat in Hyderabad?","Compares roof coatings, insulation, shading and ventilation with practical trade-offs."]
  ],
  "Interior design & renovation searches": [
    ["How much does 2BHK interior design cost in Hyderabad?","Explains modular scope, wardrobes, kitchen, finishes, hardware, civil work and quotation exclusions."],
    ["How much does 3BHK interior design cost in Hyderabad?","Shows the main cost drivers and how to compare detailed room-wise proposals."],
    ["Which plywood is best for kitchen cabinets?","Explains BWP/BWR grades, board alternatives, edge sealing, exposure and hardware."],
    ["Which is better: acrylic or laminate for a modular kitchen?","Compares appearance, maintenance, durability, cost and suitability for different cabinet zones."],
    ["What is the difference between modular and carpenter-made interiors?","Compares factory production, customisation, site conditions, timelines and quality control."],
    ["How much does a modular kitchen cost in Hyderabad?","Explains layout, running length, storage accessories, finishes and appliance integration."],
    ["Which is better: sliding wardrobe or hinged wardrobe?","Compares access, clearance, hardware, storage and room dimensions."],
    ["How do I choose the right wardrobe material?","Covers plywood, MDF, particle board, moisture exposure, finish and hardware."],
    ["How much does false ceiling cost per square foot?","Explains ceiling type, framing, lighting, access panels and finish scope."],
    ["What should I check before hiring an interior designer?","Covers portfolio, drawings, material schedules, detailed quote, project supervision and handover."]
  ],
  "Electrical, plumbing & home systems": [
    ["Which wire is best for house wiring in India?","Explains conductor sizing, insulation, load calculations, safety standards and licensed electrician review."],
    ["How many electrical points are needed in a 2BHK house?","A room-by-room planning approach based on appliances, furniture and future needs."],
    ["What is the best location for a water tank in a house?","Explains structural load, access, plumbing, hygiene and design coordination."],
    ["How do I calculate overhead water tank capacity for a house?","Shows the factors used to estimate household demand and storage requirements."],
    ["What is the difference between CPVC and UPVC pipes?","Compares typical plumbing applications, temperature, pressure and manufacturer specifications."],
    ["Why is water pressure low on the top floor?","Explains tank height, pipe sizing, blockages, valves and pump-system diagnosis."],
    ["How do I plan electrical wiring before plastering?","A checklist for switch locations, circuits, conduits, earthing and future provisions."],
    ["Is solar power worth installing for an independent house?","Explains roof suitability, consumption, system sizing, approvals and payback assumptions."],
    ["What is rainwater harvesting and is it compulsory in Hyderabad?","Explains the concept and directs homeowners to current local requirements for their property."],
    ["How do I prevent plumbing leakage inside walls?","Covers material selection, pressure testing, joint quality and inspection before concealment."]
  ],
  "Home buying, maintenance & contractor decisions": [
    ["What should I inspect before taking handover of a new house?","A snagging checklist for finishes, doors, windows, plumbing, electrical, drainage and documents."],
    ["How do I check whether a house is structurally safe?","Explains the limits of a visual walkthrough and when a qualified structural inspection is needed."],
    ["What is a snag list in house construction?","Explains how to record defects, assign responsibility and close items before final handover."],
    ["How long does it take to construct a 2BHK house?","Explains design, approvals, procurement, weather, execution and inspection dependencies."],
    ["What is the correct order of house construction work?","Outlines the typical sequence from site preparation through structure, services, finishes and handover."],
    ["How often should a house be painted?","Explains how surface preparation, exposure, paint system and maintenance affect repainting cycles."],
    ["How do I identify poor workmanship in a new house?","A practical visual checklist while noting which defects require specialist assessment."],
    ["What maintenance should I do before monsoon?","Covers terrace drains, external cracks, plumbing, electrical safety and rainwater outlets."],
    ["How do I reduce construction delays?","Explains design freeze, procurement planning, approvals, decision turnaround and milestone tracking."],
    ["What warranty should a construction company provide?","Explains why warranty scope, exclusions, duration and defect reporting should be written into the contract."]
  ],
  "Construction estimates & execution": [
    ["How much does foundation work cost for a house in Hyderabad?","Explains how soil, foundation type, excavation, concrete, reinforcement and site access affect a project estimate."],
    ["What is the cost of RCC slab construction?","Separates concrete, steel, shuttering, labour, pumping and structural design; a single rate can mislead."],
    ["How much does plastering cost per square foot in Hyderabad?","Covers internal and external plaster, surface preparation, thickness, scaffolding, materials and finish."],
    ["How much does brickwork cost for a house?","Explains wall thickness, brick or block type, mortar, openings, lintels, labour and measurement basis."],
    ["How do I estimate steel quantity for house construction?","Explains why reinforcement quantities must come from structural drawings and a bar bending schedule, not generic thumb rules."],
    ["How do I calculate concrete quantity for a house?","Shows the measurement approach for footings, columns and slabs using approved dimensions and mix specifications."],
    ["What is included in a semi-finished house construction package?","Defines typical stage boundaries and asks homeowners to verify services, doors, windows, flooring, painting and handover exclusions."],
    ["How do I check a construction BOQ before signing?","Explains quantities, units, brands, grades, specifications, provisional items, taxes and variation procedures."],
    ["Should I pay a construction contractor by stage or monthly?","Compares milestone payments with measured progress, inspection sign-off, retention and written terms."],
    ["What is a quality checklist before roof slab concrete?","A pre-pour review of drawings, reinforcement, cover, formwork, embedded services, concrete supply, access and engineer approval."],
    ["How do I check waterproofing before bathroom tiling?","Covers substrate preparation, corners, pipe penetrations, membrane continuity and a documented water test."],
    ["What should I check in a house construction quotation in Hyderabad?","A local checklist covering specifications, quantities, taxes, approvals, supervision, timelines, exclusions and defect liability."]
  ],
  "Hyderabad locality project planning": [
    ["What should I consider before building a house in Kokapet?","A site-specific brief covering plot documents, road access, soil investigation, approvals, drainage and service availability."],
    ["What should I check before constructing a house in Tellapur?","Covers plot boundaries, layout approvals, access, utilities, ground levels and local professional verification."],
    ["What affects house construction cost in Miyapur?","Explains built-up area, specification, site logistics, soil, labour availability and quotation scope without claiming a fixed locality rate."],
    ["How do I plan a house construction project in Kondapur?","A practical sequence for plot checks, design, approvals, contractor selection, procurement and site supervision."]
  ],
};

const intentLabels = ["Google Trends / public search-informed question","Homeowner problem-solving query","Comparison or purchase-intent query","Local service-intent query"];

groups["Planning, room sizes & building services"] = [
["What is the ideal column spacing for a residential house?","Explains why column grids are designed by the structural engineer around spans, loads, soil and architecture—not a universal thumb rule."],
["What is the ideal ceiling height for a house in Hyderabad?","Compares clear height, slab depth, services, ventilation and local approval requirements."],
["How much parking space is needed for a 30x40 house?","Explains vehicle dimensions, turning, gate width and how parking affects the ground-floor plan."],
["How do I plan natural ventilation in a house?","Covers window placement, cross-ventilation, room orientation, privacy and site constraints."],
["How many bathrooms should a 2BHK house have?","Compares one common bath, attached bath and combined layouts using household needs and plumbing efficiency."],
["What is the difference between carpet area and built-up area?","Defines common area measurements and shows why quotations must state the measurement basis."],
["How much does house painting cost in Hyderabad?","Explains area measurement, putty, primer, paint quality, coats, surface preparation and exclusions."],
["How much does electrical wiring cost for a 2BHK house?","Breaks down points, wire specification, DB, conduits, switches, earthing and testing."],
["How much does plumbing work cost for a new house?","Explains fixture count, pipe system, hot-water lines, drainage, pressure testing and scope."],
["What is the cost of compound wall construction in Hyderabad?","Shows how length, height, foundation, finish, gates and site levels change estimates."],
["How much does staircase construction cost for a house?","Compares RCC stair geometry, finishes, railing and structural scope."],
["What is the best flooring for a new house?","Compares vitrified tile, granite, stone and other finishes by use, slip resistance and maintenance."],
["How do I choose tiles for a small house?","Explains size, shade, slip rating, grout, wastage and room-specific selection."],
["What is the difference between M20 and M25 concrete?","Explains grade designation, specified strength, mix design and why grade selection belongs to the structural design."],
["Can I use ready-mix concrete for an individual house?","Covers access, minimum order, grade, delivery, slump checks, sampling and pour planning."],
["How do I calculate cement bags for house construction?","Explains why quantities depend on measured work and mix design; avoids one-size-fits-all bag formulas."],
["What is a bar bending schedule and why is it important?","Explains reinforcement quantities, cutting lengths, laps, bends and checking against structural drawings."],
["When should anti-termite treatment be done during construction?","Describes treatment stages, approved products, applicator instructions and safety precautions."],
["How do I prevent cracks between brick walls and RCC columns?","Covers junction detailing, mesh where specified, curing, workmanship and movement assessment."],
["What should be included in a construction site inspection checklist?","Lists the records and inspection points to review at foundation, reinforcement, concrete, masonry, waterproofing and handover stages."]
];


groups["Permissions, legal checks & homeowner handover"] = [
  ["How can I verify a building permission in Telangana?","Explains how to retrieve the digitally issued permission, sanctioned plan and proceedings from the official portal and compare them with the site."],
  ["What is the difference between layout approval and building permission?","Clarifies approval of a plotted layout versus sanction or registration for an individual building proposal."],
  ["Is an Encumbrance Certificate enough to verify a property title?","Explains what an EC can reveal, what it may not show and why independent title review is still required."],
  ["What happens if my house is built differently from the sanctioned plan?","Explains deviation risks, enforcement and why the approved drawings must be checked before making changes."],
  ["Can I change my house plan after building permission is approved?","Explains when revised approval is needed and why owners should not build first and seek permission later."],
  ["What is a road-widening line and how can it affect my plot?","Explains how master-plan or road proposals can affect buildable area, access and setbacks."],
  ["When should I hire a structural engineer for house construction?","Covers design, foundation, structural drawings, site inspections, alterations and defect assessment."],
  ["What documents should I collect when my house construction is complete?","Lists sanctioned drawings, completion/occupancy records where applicable, warranties, test reports, manuals and handover records."],
  ["What is a defect-liability period in house construction?","Explains written defect reporting, contractor obligations, exclusions and the importance of defining the period in the agreement."],
  ["How should I approve extra work and cost variations during construction?","Explains written variation orders, scope, rates, time impact and approval before work proceeds."],
 ];
groups["Foundation, services & homeowner project controls"] = [
    ["How do I know whether my plot needs a soil test before construction?", "Explains when geotechnical investigation is important and what a soil report tells the structural designer."],
    ["What does safe bearing capacity mean in a soil test report?", "Explains the meaning of bearing capacity and why foundation design must use the site-specific geotechnical report."],
    ["Can I decide the footing size based on my neighbour's house?", "Explains why nearby foundations are not a substitute for site-specific soil investigation and structural design."],
    ["Why is a plinth beam provided in a house?", "Explains the role of plinth beams in the structural system and why their size and reinforcement come from engineering design."],
    ["How do I check terrace waterproofing before laying tiles?", "A practical checklist covering slope, outlets, detailing, ponding tests and protection of the waterproofing layer."],
    ["How should concrete be cured during hot weather in Telangana?", "Explains temperature, evaporation, curing methods and the need to follow the approved concrete specification."],
    ["Should I use AAC blocks or red clay bricks for my house?", "Compares weight, thermal performance, dimensions, workmanship, anchoring and system-level design considerations."],
    ["What is the correct plaster thickness for internal and external walls?", "Explains why plaster thickness depends on substrate and specification, and why excessive thickness needs correction rather than concealment."],
    ["How do I choose exterior paint for a house in Hyderabad?", "Compares exposure, substrate preparation, primer, weather resistance, product data and maintenance."],
    ["What should I check before connecting my house to a sewer line?", "Covers local connection permission, invert levels, inspection chambers, slope, venting and testing by a qualified plumber."],
    ["Is rainwater harvesting required for an individual house in Telangana?", "Explains that requirements depend on current local rules, plot and building details, and how to verify the applicable authority conditions."],
    ["What provisions should I make for rooftop solar during construction?", "Covers structural loading review, conduit routes, inverter location, earthing, waterproofing and utility approvals."],
    ["What is a comfortable staircase riser and tread for a house?", "Explains that dimensions must comply with applicable building rules and be coordinated for consistent, safe steps."],
    ["What clauses should a house construction agreement include?", "Lists scope, drawings, specifications, exclusions, milestones, payment terms, variations, quality checks, safety, delay and defect obligations."],
    ["How can I verify a contractor's stage-wise construction bill?", "Explains measurement records, completed milestones, BOQ rates, approved variations, tax treatment and retention before payment."]
];

groups["Construction planning, BOQ & project delivery"] = [
    ["How do I plan a house construction project step by step?", "A stage-by-stage overview from plot checks and design through approvals, tendering, construction, inspections, testing and handover."],
    ["What should be included in a house construction BOQ?", "Explains item descriptions, units, quantities, material grades, workmanship, inclusions, exclusions and how a BOQ supports transparent billing."],
    ["How do I prepare a construction schedule for a new house?", "Covers dependencies, approvals, procurement lead times, realistic activity durations, weather allowances and weekly progress tracking."],
    ["What is the difference between carpet area, built-up area and super built-up area?", "Clarifies common area measurement terms and why the measurement basis must be stated in contracts and quotations."],
];
groups["Foundation, RCC & concrete quality"] = [
    ["How do I select the right foundation for my house?", "Explains how soil conditions, loads, groundwater, nearby structures and engineering design determine foundation type."],
    ["What is the difference between isolated footing, combined footing and raft foundation?", "Describes typical applications and why the structural and geotechnical design—not a generic rule—selects the foundation."],
    ["What checks should be completed before a roof slab concrete pour?", "A pre-pour inspection covering drawings, reinforcement, cover, formwork, supports, embedded services, access, concrete supply and sign-off."],
    ["How can I check reinforcement steel before slab casting?", "Explains checking bar diameter and spacing against approved drawings, laps, anchorage, cover blocks, cleanliness and engineer inspection."],
    ["What is a concrete slump test and why is it done?", "Explains workability checks at delivery, representative sampling, recording results and why water must not be casually added at site."],
    ["Should water be added to a ready-m mix concrete truck at the construction site?", "Explains why only authorised adjustments under the mix supplier's and engineer's procedure are acceptable and why uncontrolled water weakens quality."],
];
groups["Flooring, waterproofing & finishes"] = [
    ["How do I choose tiles for a house floor?", "Compares intended use, slip resistance, abrasion, water absorption, finish, size, shade variation, grout and maintenance."],
    ["What is the difference between vitrified, ceramic and porcelain tiles?", "Explains broad material distinctions and why technical data, intended application and manufacturer classification should guide selection."],
    ["How do I prevent bathroom leakage during house construction?", "Covers substrate preparation, waterproofing system continuity, pipe penetrations, floor slope, drain detailing, curing and documented water testing."],
    ["What is the correct slope for a bathroom floor and balcony?", "Explains positive drainage, avoiding ponding and confirming slope against the project design, drain positions and applicable requirements."],
];
groups["Electrical, plumbing & building services"] = [
    ["How do I plan electrical points before plastering?", "A room-by-room coordination checklist for furniture, appliance loads, switch heights, circuits, conduits, data, AC and future access."],
    ["What should I check before concealed plumbing pipes are covered?", "Covers approved pipe type, joint quality, supports, pressure testing, photographs, isolation valves and access to serviceable components."],
    ["How do I choose UPVC, CPVC and PPR pipes for a house?", "Compares common applications, temperature and pressure ratings, joining methods, compatibility and the importance of approved system specifications."],
];
groups["Ventilation, quality checks & handover"] = [
    ["How do I plan ventilation and natural light in a new house?", "Explains orientation, window placement, cross-ventilation, shading, privacy, room use and coordination with structure and local rules."],
    ["What should I inspect during house construction before making stage payments?", "A milestone-based checklist linking measured completed work, inspection records, approved variations and contractual payment conditions."],
    ["What should be checked during final house handover?", "A practical handover list covering defects, water and electrical tests, drainage, doors/windows, finishes, keys, warranties, drawings and manuals."]
];



groups["Weekly site supervision & pre-construction"] = [
  ["What should I check at a house construction site every week?", "A repeatable weekly walkthrough for progress, safety, materials, workmanship, records and decisions."],
  ["What should be checked before foundation excavation starts?", "A pre-excavation checklist for setting out, benchmarks, utilities, access, soil conditions, safety and approved drawings."]
];

groups["RCC inspection & workmanship"] = [
  ["What should I inspect before footing reinforcement is covered with concrete?", "A footing reinforcement hold-point checklist covering dimensions, bars, cover, starter bars, cleanliness and engineer sign-off."],
  ["What should I check in formwork before an RCC beam or slab pour?", "A practical shuttering checklist for dimensions, levels, props, bracing, joints, cleanliness and safe access."],
  ["What should I check after removing slab and beam formwork?", "A post-stripping review of concrete surface, cracks, deflection, honeycombing, edges, curing and escalation of defects."]
];

groups["Materials, finishes & homeowner selection"] = [
  ["How do I compare AAC blocks and red clay bricks for a house?", "A decision guide comparing weight, thermal performance, sound, fixing, mortar, workmanship, availability and total wall-system cost."],
  ["How do I compare cement brands and grades for house construction?", "Explains how to verify product type, applicable standard, batch, freshness, storage and engineer-approved specifications rather than relying on brand claims."],
  ["How do I choose a kitchen countertop material for daily use?", "Compares granite, quartz and other surfaces by heat, stain, scratch, seam, maintenance, support and cost considerations."],
  ["How do I choose bathroom tiles that are safe and easy to maintain?", "A room-specific selection checklist for wet-floor grip, wall finish, cleaning, grout, drainage and sample approval."]
];

groups["MEP, waterproofing & handover"] = [
  ["What should a homeowner check before approving electrical wiring?", "A sign-off checklist for circuit schedule, cable sizing, conduits, earthing, protective devices, point locations and test records."],
  ["What should I check before approving a waterproofing contractor's work?", "A checklist for substrate preparation, system compatibility, coverage, detailing, curing, water testing and written warranty scope."],
  ["What should a house construction handover snag list include?", "A room-by-room defect list for finishes, doors, windows, plumbing, electrical, drainage, safety, documents and closure evidence."]
];

groups["Cost planning, estimates & budgeting"] = [
  ["How much does house construction cost per square foot in Hyderabad?", "Practical homeowner guidance covering how much does house construction cost per square foot in Hyderabad? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I estimate the construction cost of a 200-square-yard plot?", "Practical homeowner guidance covering how do I estimate the construction cost of a 200-square-yard plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Is ground-floor construction cheaper than a G+1 house?", "Practical homeowner guidance covering is ground-floor construction cheaper than a G+1 house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How many cement bags are required to build a house?", "Practical homeowner guidance covering how many cement bags are required to build a house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I calculate brickwork quantity for a house?", "Practical homeowner guidance covering how do I calculate brickwork quantity for a house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Who is responsible for material wastage during house construction?", "Practical homeowner guidance covering who is responsible for material wastage during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is a construction contingency and how should I budget for it?", "Practical homeowner guidance covering what is a construction contingency and how should I budget for it? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is the difference between plot area, built-up area and carpet area?", "Practical homeowner guidance covering what is the difference between plot area, built-up area and carpet area? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is the difference between a construction estimate and a BOQ?", "Practical homeowner guidance covering what is the difference between a construction estimate and a BOQ? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I estimate house construction cost for a 100-square-yard plot?", "Practical homeowner guidance covering how do I estimate house construction cost for a 100-square-yard plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I estimate house construction cost for a 150-square-yard plot?", "Practical homeowner guidance covering how do I estimate house construction cost for a 150-square-yard plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I estimate house construction cost for a 200-square-yard plot?", "Practical homeowner guidance covering how do I estimate house construction cost for a 200-square-yard plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is included in a per-square-foot house construction rate?", "Practical homeowner guidance covering what is included in a per-square-foot house construction rate? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I calculate built-up area for a multi-floor house?", "Practical homeowner guidance covering how do I calculate built-up area for a multi-floor house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Is the foundation cost the same for every house on the same plot size?", "Practical homeowner guidance covering is the foundation cost the same for every house on the same plot size? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What costs are commonly excluded from a basic house construction package?", "Practical homeowner guidance covering what costs are commonly excluded from a basic house construction package? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How much contingency should I keep in a house construction budget?", "Practical homeowner guidance covering how much contingency should I keep in a house construction budget? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I compare construction quotations with different per-square-foot rates?", "Practical homeowner guidance covering how do I compare construction quotations with different per-square-foot rates? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should I budget for price changes during a long construction project?", "Practical homeowner guidance covering how should I budget for price changes during a long construction project? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I estimate construction cost for a G+1 house?", "Practical homeowner guidance covering how do I estimate construction cost for a G+1 house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How much does a compound wall cost for a residential plot?", "Practical homeowner guidance covering how much does a compound wall cost for a residential plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I estimate staircase construction cost?", "Practical homeowner guidance covering how do I estimate staircase construction cost? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What factors affect borewell drilling cost on a residential plot?", "Practical homeowner guidance covering what factors affect borewell drilling cost on a residential plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What affects the cost of an underground water sump?", "Practical homeowner guidance covering what affects the cost of an underground water sump? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I budget for a house construction project in stages?", "Practical homeowner guidance covering how do I budget for a house construction project in stages? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check whether a builder's construction package has hidden costs?", "Practical homeowner guidance covering how do I check whether a builder's construction package has hidden costs? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check current cement prices before buying for house construction?", "Practical homeowner guidance covering how do I check current cement prices before buying for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I compare labour charges for house construction in Hyderabad?", "Practical homeowner guidance covering how do I compare labour charges for house construction in Hyderabad? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I verify the quantity of cement and steel used at my construction site?", "Practical homeowner guidance covering how do I verify the quantity of cement and steel used at my construction site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I do if the contractor asks for extra payment during construction?", "Practical homeowner guidance covering what should I do if the contractor asks for extra payment during construction? Review the approved project documents and obtain qualified site-specific advice where required."]
];

groups["Contractors, agreements & project management"] = [
  ["How should construction-stage payments be linked to work progress?", "Practical homeowner guidance covering how should construction-stage payments be linked to work progress? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I choose a trustworthy construction company in Hyderabad?", "Practical homeowner guidance covering how do I choose a trustworthy construction company in Hyderabad? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What questions should I ask a builder before signing a construction agreement?", "Practical homeowner guidance covering what questions should I ask a builder before signing a construction agreement? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What can I do if a construction contractor delays my house project?", "Practical homeowner guidance covering what can I do if a construction contractor delays my house project? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is included in turnkey house construction?", "Practical homeowner guidance covering what is included in turnkey house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What warranty should a house construction company provide?", "Practical homeowner guidance covering what warranty should a house construction company provide? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What documents should I receive at house construction handover?", "Practical homeowner guidance covering what documents should I receive at house construction handover? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is the difference between a labour contract and a material contract?", "Practical homeowner guidance covering what is the difference between a labour contract and a material contract? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should a construction BOQ include?", "Practical homeowner guidance covering what should a construction BOQ include? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How much advance should I pay a house construction contractor?", "Practical homeowner guidance covering how much advance should I pay a house construction contractor? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Who should supervise house construction at the site?", "Practical homeowner guidance covering who should supervise house construction at the site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What are the common reasons house construction gets delayed?", "Practical homeowner guidance covering what are the common reasons house construction gets delayed? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should be included in a house construction schedule?", "Practical homeowner guidance covering what should be included in a house construction schedule? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before allowing construction materials to be substituted?", "Practical homeowner guidance covering what should I check before allowing construction materials to be substituted? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check construction progress before releasing a stage payment?", "Practical homeowner guidance covering how do I check construction progress before releasing a stage payment? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What documents should a contractor provide during house construction?", "Practical homeowner guidance covering what documents should a contractor provide during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is the difference between shell construction and turnkey construction?", "Practical homeowner guidance covering what is the difference between shell construction and turnkey construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Should I buy construction materials myself or let the contractor supply them?", "Practical homeowner guidance covering should I buy construction materials myself or let the contractor supply them? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What payment schedule should I agree with a house construction contractor?", "Practical homeowner guidance covering what payment schedule should I agree with a house construction contractor? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check whether construction work is progressing according to schedule?", "Practical homeowner guidance covering how do I check whether construction work is progressing according to schedule? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should be included in a house construction handover checklist?", "Practical homeowner guidance covering what should be included in a house construction handover checklist? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check in a house electrical distribution board before handover?", "Practical homeowner guidance covering what should I check in a house electrical distribution board before handover? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Should I appoint an independent engineer to supervise my house construction?", "Practical homeowner guidance covering should I appoint an independent engineer to supervise my house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should a house construction agreement say about material brands?", "Practical homeowner guidance covering what should a house construction agreement say about material brands? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I prepare a pre-handover snagging checklist for a new house?", "Practical homeowner guidance covering how do I prepare a pre-handover snagging checklist for a new house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What documents should a contractor provide before starting house construction?", "Practical homeowner guidance covering what documents should a contractor provide before starting house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How can I check whether a construction contractor has completed all agreed work?", "Practical homeowner guidance covering how can I check whether a construction contractor has completed all agreed work? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is a construction method statement and should a homeowner ask for one?", "Practical homeowner guidance covering what is a construction method statement and should a homeowner ask for one? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What are inspection hold points in house construction?", "Practical homeowner guidance covering what are inspection hold points in house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I maintain a construction quality register for my house?", "Practical homeowner guidance covering how do I maintain a construction quality register for my house? Review the approved project documents and obtain qualified site-specific advice where required."]
];

groups["Foundation, RCC & structural quality"] = [
  ["What are the different types of foundations used for house construction?", "Practical homeowner guidance covering what are the different types of foundations used for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How much steel is required for house construction?", "Practical homeowner guidance covering how much steel is required for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Which concrete grade is used for house construction?", "Practical homeowner guidance covering which concrete grade is used for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is the standard thickness of an RCC roof slab?", "Practical homeowner guidance covering what is the standard thickness of an RCC roof slab? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I inspect before an RCC footing concrete pour?", "Practical homeowner guidance covering what should I inspect before an RCC footing concrete pour? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check in TMT steel delivered to a construction site?", "Practical homeowner guidance covering what should I check in TMT steel delivered to a construction site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before an RCC roof slab is cast?", "Practical homeowner guidance covering what should I check before an RCC roof slab is cast? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I verify cement and steel bills at a construction site?", "Practical homeowner guidance covering how do I verify cement and steel bills at a construction site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I verify soil testing before house construction?", "Practical homeowner guidance covering how do I verify soil testing before house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Are hairline cracks in new house plaster normal?", "Practical homeowner guidance covering are hairline cracks in new house plaster normal? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How long should concrete be cured after casting?", "Practical homeowner guidance covering how long should concrete be cured after casting? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is a plinth beam and why is it provided?", "Practical homeowner guidance covering what is a plinth beam and why is it provided? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is a concrete cube test and what does it tell a homeowner?", "Practical homeowner guidance covering what is a concrete cube test and what does it tell a homeowner? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check when ready-mix concrete arrives at my site?", "Practical homeowner guidance covering what should I check when ready-mix concrete arrives at my site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should I purchase and store TMT steel for house construction?", "Practical homeowner guidance covering how should I purchase and store TMT steel for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before excavation starts on my plot?", "Practical homeowner guidance covering what should I check before excavation starts on my plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Why is scaffolding inspection important during house construction?", "Practical homeowner guidance covering why is scaffolding inspection important during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["When should a wall crack be checked by a structural engineer?", "Practical homeowner guidance covering when should a wall crack be checked by a structural engineer? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Why should plumbing and electrical drawings be coordinated before slab casting?", "Practical homeowner guidance covering why should plumbing and electrical drawings be coordinated before slab casting? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before approving a house foundation layout on site?", "Practical homeowner guidance covering what should I check before approving a house foundation layout on site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check concrete cover blocks before an RCC pour?", "Practical homeowner guidance covering how do I check concrete cover blocks before an RCC pour? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Why should reinforcement be checked before concrete is poured?", "Practical homeowner guidance covering why should reinforcement be checked before concrete is poured? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check in formwork before an RCC concrete pour?", "Practical homeowner guidance covering what should I check in formwork before an RCC concrete pour? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should concrete be compacted during house construction?", "Practical homeowner guidance covering how should concrete be compacted during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What causes honeycombing in concrete and how should it be repaired?", "Practical homeowner guidance covering what causes honeycombing in concrete and how should it be repaired? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check after removing RCC formwork?", "Practical homeowner guidance covering what should I check after removing RCC formwork? Review the approved project documents and obtain qualified site-specific advice where required."]
];

groups["Materials, finishes & waterproofing"] = [
  ["How do I check waterproofing before laying tiles?", "Practical homeowner guidance covering how do I check waterproofing before laying tiles? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Are AAC blocks better than red bricks for house construction?", "Practical homeowner guidance covering are AAC blocks better than red bricks for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check whether waterproofing work is done properly?", "Practical homeowner guidance covering how do I check whether waterproofing work is done properly? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I choose cement for house construction?", "Practical homeowner guidance covering how do I choose cement for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Is manufactured sand suitable for house construction?", "Practical homeowner guidance covering is manufactured sand suitable for house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How can I check brick quality at a construction site?", "Practical homeowner guidance covering how can I check brick quality at a construction site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I prevent dampness in house walls?", "Practical homeowner guidance covering how do I prevent dampness in house walls? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before building a compound wall?", "Practical homeowner guidance covering what should I check before building a compound wall? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I consider when planning a staircase for a house?", "Practical homeowner guidance covering what should I consider when planning a staircase for a house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I plan an underground sump for a house?", "Practical homeowner guidance covering how do I plan an underground sump for a house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I choose the capacity and location of an overhead water tank?", "Practical homeowner guidance covering how do I choose the capacity and location of an overhead water tank? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before drilling a borewell on my plot?", "Practical homeowner guidance covering what should I check before drilling a borewell on my plot? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Why does a newly built house roof leak during rain?", "Practical homeowner guidance covering why does a newly built house roof leak during rain? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should electrical and plumbing work be coordinated before plastering?", "Practical homeowner guidance covering how should electrical and plumbing work be coordinated before plastering? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check the quality of a construction site's sand?", "Practical homeowner guidance covering how do I check the quality of a construction site's sand? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I prevent water leakage in bathrooms during house construction?", "Practical homeowner guidance covering how do I prevent water leakage in bathrooms during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should plumbing pipes be pressure-tested before walls and floors are closed?", "Practical homeowner guidance covering how should plumbing pipes be pressure-tested before walls and floors are closed? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check in roof and balcony rainwater drainage?", "Practical homeowner guidance covering what should I check in roof and balcony rainwater drainage? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check before waterproofing a bathroom?", "Practical homeowner guidance covering what should I check before waterproofing a bathroom? Review the approved project documents and obtain qualified site-specific advice where required."]
];

groups["Electrical, plumbing, safety & approvals"] = [
  ["What approvals should I check before starting house construction in Hyderabad?", "Practical homeowner guidance covering what approvals should I check before starting house construction in Hyderabad? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What is the difference between a building permit and an occupancy certificate?", "Practical homeowner guidance covering what is the difference between a building permit and an occupancy certificate? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What safety precautions should be followed during house construction?", "Practical homeowner guidance covering what safety precautions should be followed during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check electrical earthing in a newly constructed house?", "Practical homeowner guidance covering how do I check electrical earthing in a newly constructed house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I check drainage slope in bathroom and balcony floors?", "Practical homeowner guidance covering how do I check drainage slope in bathroom and balcony floors? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What ventilation should I plan for bathrooms and kitchens?", "Practical homeowner guidance covering what ventilation should I plan for bathrooms and kitchens? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How do I protect neighbouring properties during house construction?", "Practical homeowner guidance covering how do I protect neighbouring properties during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I do if I notice water seepage after moving into a new house?", "Practical homeowner guidance covering what should I do if I notice water seepage after moving into a new house? Review the approved project documents and obtain qualified site-specific advice where required."]
];

groups["Construction planning & site quality"] = [
  ["How can I identify poor-quality construction work at my site?", "Practical homeowner guidance covering how can I identify poor-quality construction work at my site? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How can I avoid hidden charges in house construction?", "Practical homeowner guidance covering how can I avoid hidden charges in house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Is a labour-only construction contract cheaper?", "Practical homeowner guidance covering is a labour-only construction contract cheaper? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How long does it take to construct an independent house in Hyderabad?", "Practical homeowner guidance covering how long does it take to construct an independent house in Hyderabad? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should I record changes made during house construction?", "Practical homeowner guidance covering how should I record changes made during house construction? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I inspect before accepting a newly constructed house?", "Practical homeowner guidance covering what should I inspect before accepting a newly constructed house? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["Is constructing the first floor cheaper than constructing the ground floor?", "Practical homeowner guidance covering is constructing the first floor cheaper than constructing the ground floor? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How long does each stage of independent house construction take?", "Practical homeowner guidance covering how long does each stage of independent house construction take? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["What should I check during a weekly house construction site inspection?", "Practical homeowner guidance covering what should I check during a weekly house construction site inspection? Review the approved project documents and obtain qualified site-specific advice where required."],
  ["How should defects found during house construction be recorded?", "Practical homeowner guidance covering how should defects found during house construction be recorded? Review the approved project documents and obtain qualified site-specific advice where required."]
];


groups["Foundation design, steel estimation & construction payments"] = [
  ["What is a safe foundation depth for a house?", "Explains why founding depth depends on soil investigation, loads, groundwater and the structural engineer's design rather than a universal measurement."],
  ["How does soil bearing capacity affect foundation design?", "Shows how geotechnical findings influence footing size, settlement checks and the choice of shallow or deep foundation systems."],
  ["What is the difference between isolated, combined and raft foundations?", "Compares the purpose and use of three common foundation systems and explains who selects the appropriate design."],
  ["How is steel quantity calculated from a bar bending schedule?", "Explains bar marks, cutting lengths, quantities and theoretical unit weight, and how to reconcile a BBS with site records."],
  ["How do I check concrete grade at a construction site?", "Covers approved mix details, delivery challans, fresh-concrete checks, specimen identification and laboratory test reports."],
  ["How long should concrete be cured in hot weather?", "Explains early moisture protection, curing methods, project-specific duration and the importance of a curing log."],
  ["How should I create a stage-wise house construction payment schedule?", "Links payments to measurable milestones, BOQ quantities, inspection records, approved variations and handover obligations."],
  ["What should I check before approving a foundation concrete pour?", "Provides a pre-pour checklist for founding level, dimensions, reinforcement, cover, formwork, concrete supply and inspection sign-off."]
];

export const HYDERABAD_HOMEOWNER_TOPIC_GROUPS = Object.entries(groups).map(([category, entries]) => ({
  category,
  topics: entries.map(([title, description], index) => ({
    id: category.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + index,
    title,
    subject: title,
    description,
    intent: intentLabels[index % intentLabels.length],
    evidence: "Search-language research; exact monthly volume not available from public results"
  }))
}));
export const HYDERABAD_HOMEOWNER_TOPICS = HYDERABAD_HOMEOWNER_TOPIC_GROUPS.flatMap(group =>
  group.topics.map(topic => ({ ...topic, category: group.category }))
);
