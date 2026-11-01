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
  ]
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
["What should I inspect before taking handover of a new house?","Provides a snag checklist for structure, waterproofing, plumbing, electrical, doors, windows, finishes and documents."],
  "Construction cost, BOQ & contractor quotation questions": [
    ["What is the house construction cost per square foot in Hyderabad?","Explain built-up area basis, stage of completion, material specification, labour, taxes, site conditions and exclusions; avoid unsupported universal rates."],
    ["How much does a 2BHK house construction cost in Hyderabad?","Break down built-up area, floor count, structural design, finish level, services, approvals and excluded external works."],
    ["How much does a 3BHK house construction cost in Hyderabad?","Explain why room count alone is insufficient and compare area, structure, finishes, services and site conditions."],
    ["What is included in a complete house construction package?","List excavation, structure, masonry, plaster, waterproofing, flooring, doors, windows, electrical, plumbing, paint and fixtures that must be confirmed in writing."],
    ["What is the difference between grey structure and turnkey construction?","Clarify stage boundaries, finishing scope, services, fixtures, taxes and owner-supplied items."],
    ["Is labour-only construction cheaper than material-included construction?","Compare procurement control, material wastage, storage, supervision, rate transparency and responsibility for quality."],
    ["How do I calculate built-up area for a construction estimate?","Explain area statements and ask how balconies, staircases, parking, walls and covered spaces are measured in the contractor's rate."],
    ["What is a BOQ in house construction?","Describe item descriptions, units, quantities, rates, specifications and how a BOQ supports scope and variation control."],
    ["How do I compare two house construction quotations?","Compare the same drawings, BOQ, materials, exclusions, taxes, payment stages, timelines and variation rules."],
    ["What questions should I ask a construction contractor before signing?","Cover references, supervision, drawings, scope, material approvals, safety, milestones, defect handling and written contract terms."],
    ["What is normally excluded from a house construction quotation?","Check approvals, professional fees, utility charges, compound wall, gate, borewell, sump, landscaping, appliances and external works."],
    ["How much contingency should I keep for house construction?","Explain project-specific contingency planning and the need to separate known exclusions, provisional sums and owner changes."],
    ["How do construction costs change for G+1 and G+2 houses?","Discuss foundation and structural design, staircase, services, access, floor area and engineering rather than assuming a fixed multiplier."],
    ["Does soil testing increase the initial construction budget?","Explain investigation scope and how geotechnical information can reduce uncertainty in foundation decisions."],
    ["What makes construction cost higher on a narrow plot?","Cover access, material unloading, scaffolding, excavation, neighbour protection, equipment constraints and site logistics."],
    ["How much does a compound wall cost in Hyderabad?","Break down length, height, foundation, soil, columns, finish, gate and site level; request measured quantities."],
    ["How much does a sump and overhead water tank cost?","Explain capacity, structure, waterproofing, pumps, plumbing, access and testing requirements."],
    ["What is the cost of house painting per square foot?","Clarify whether the rate includes putty, primer, number of coats, surface preparation, paint grade, labour and taxes."],
    ["How do I estimate flooring cost for a new house?","Separate tile or stone supply, laying labour, adhesive or mortar, skirting, wastage, levelling, grout and taxes."],
    ["What is the cost difference between AAC blocks and red bricks?","Compare unit and installed cost, mortar, plaster, labour, transport, structural implications and approved design."],
    ["How do I check whether a construction estimate is too low?","Look for missing quantities, vague material allowances, exclusions, unrealistic timelines and unpriced provisional work."],
    ["Should I pay a large advance to a house contractor?","Discuss milestone-linked payments, procurement evidence, contract terms, receipts, retention and independent legal review."],
    ["How are extra works and variations priced during construction?","Explain written change orders, measurement, rates, approval before execution and impact on timeline."],
    ["What documents should I collect at house handover?","List approved drawings, revisions, warranties, test records, invoices, equipment manuals, keys and snag closure."],
    ["How do I compare construction quality when visiting a completed project?","Suggest checking workmanship, visible finishes, service operation and speaking to owners while noting that concealed work needs records and inspections."]
  ]
,
  "Building permission, approval & documentation questions": [
    ["How do I check whether my plot comes under GHMC or HMDA?","Confirm the exact survey number, municipal limits and planning jurisdiction with the competent authority."],
    ["What documents are needed for house building permission in Hyderabad?","Review commonly requested ownership, survey, layout, identity, authorisation and drawing documents against the current official checklist."],
    ["Can I start house construction before building permission?","Explain why applicable sanction and commencement requirements must be confirmed before work begins."],
    ["How do I check whether a layout is approved?","Verify the approval reference and layout records with the issuing authority and review title and land-use status with professionals."],
    ["What are building setbacks and why are they required?","Explain front, rear and side open spaces and note that dimensions depend on current rules and site conditions."],
    ["How is building height measured for permission?","Explain that authority definitions and measurement rules matter; verify stilt, basement, parapet and service levels with a licensed professional."],
    ["What is a building occupancy certificate?","Describe its general purpose and why the applicable completion and occupancy process must be confirmed."],
    ["What is the difference between a sanctioned plan and an as-built plan?","Explain approved drawings versus actual completed work and why unauthorised deviations may create compliance issues."],
    ["Can I change the floor plan after building permission?","Explain that material changes may need professional review and revised approval before execution."],
    ["Can I construct an extra floor on my existing house?","Discuss structural capacity, permissions, setbacks, parking, services and professional assessment."],
    ["How do I check road width for building permission?","Use verified site and authority records rather than relying on informal measurements."],
    ["Does a corner plot have different building plan requirements?","Explain that road-abutting sides, setbacks, visibility and local rules may affect design."],
    ["What is a building plan scrutiny fee?","Explain that charges depend on authority, proposal and current fee schedules; use official receipts."],
    ["Who can prepare and submit house building drawings?","Explain the role of appropriately licensed or registered professionals under the applicable authority process."],
    ["How do I verify a building permission application status?","Use the official portal or authority reference and retain application acknowledgements and written communications."]
  ],
  "Foundation, soil & construction material inspection questions": [
    ["Which foundation is best for a single-floor house?","Explain that loads, soil profile, groundwater and structural design determine the solution; avoid selecting by floor count alone."],
    ["What is the difference between isolated footing and raft foundation?","Compare load-transfer concepts and why an engineer selects the system for the site."],
    ["Is pile foundation required for black cotton soil?","Explain expansive soil behaviour and the need for geotechnical investigation and project-specific design."],
    ["How deep should a house foundation be?","Explain why depth depends on soil strata, loads, groundwater and engineering recommendations; avoid a universal depth."],
    ["What tests are done in a soil test for house construction?","Describe investigation methods and report outputs at a high level; actual scope should match the site."],
    ["Can I build a house without soil testing?","Explain when investigation is required or prudent and why assumptions from nearby plots may be unreliable."],
    ["How do I check TMT steel grade at site?","Check bundle identification, invoices, certificates, approved specifications and applicable laboratory testing."],
    ["What is the difference between Fe500 and Fe500D steel?","Explain grade designation and ductility conceptually, with selection governed by structural design and applicable standards."],
    ["How do I check cement manufacturing date and batch?","Explain reading bag and batch information, checking packaging and keeping supplier invoices and traceability."],
    ["Can cement with hard lumps be used for house construction?","Explain that moisture exposure and lumping require segregation and professional assessment; hand tests do not certify strength."],
    ["How do I identify clay or silt in construction sand?","Describe preliminary visual concerns and explain that specified laboratory tests determine acceptance."],
    ["What is the silt content test for sand?","Explain its purpose and that method and acceptance follow the applicable project specification and standard."],
    ["What documents should come with TMT steel delivery?","List invoice, manufacturer and grade identification, batch or bundle details and required test certificates."],
    ["How should cement bags be stored at a construction site?","Cover dry raised storage, moisture protection, stock rotation and manufacturer handling instructions."],
    ["How do I check aggregate quality for concrete?","Explain grading, cleanliness, size and required tests; mix design and specifications govern acceptance."],
    ["Can I use river sand or M-sand for plastering?","Compare grading, fines, cleanliness and suitability while requiring product compliance and mix approval."],
    ["What is a concrete cube test and when is it done?","Explain sampling, specimen preparation, curing and testing at specified ages under the project quality plan."],
    ["What is a slump test in concrete?","Explain workability checking at delivery and why water must not be added casually."],
    ["How do I check concrete quality before pouring a slab?","Cover approved mix, formwork, reinforcement inspection, cover, embedded services, sampling and pour records."],
    ["What should I do if a material test fails?","Explain segregation, written notification, engineer review, traceability and documented corrective action before use."]
  ]
,
  "Electrical planning, plumbing & waterproofing questions": [
    ["How many electrical points are needed in a new house?","Explain room-wise planning based on furniture, appliances, usage and a qualified electrical design rather than a fixed count."],
    ["What electrical points are required in a 2BHK house?","Build a room schedule for lights, fans, general sockets, kitchen appliances, AC, geyser, TV and data."],
    ["Where should switches be placed in a bedroom?","Coordinate door swing, bed, bedside tables, wardrobe and accessibility with the electrical layout."],
    ["How many plug points are required in a modular kitchen?","List appliance and countertop requirements and ask a qualified electrician to assess loads, circuits and safe locations."],
    ["What is a dedicated electrical circuit for an appliance?","Explain why higher-load equipment may need a separately designed circuit and protection selected by a qualified electrician."],
    ["Where should the distribution board be placed in a house?","Discuss access, safety, service clearance and coordination with the electrical professional and applicable rules."],
    ["What should be checked before electrical wiring is concealed?","Review conduit routes, box positions, cable schedule, earthing, circuit plan, photographs and inspection records."],
    ["How do I plan TV, router and internet points?","Coordinate TV wall elevation, console, router location, power, data, conduits and future access."],
    ["Where should AC drain and electrical points be planned?","Coordinate indoor and outdoor units, drain route, access, electrical requirements and manufacturer guidance."],
    ["What electrical safety checks are needed in a bathroom?","Explain appropriate protection, earthing, equipment placement and inspection by a qualified electrician."],
    ["How many water points are required in a new house?","Prepare a fixture schedule for kitchen, bathrooms, utility, washing machine, RO, garden and outdoor taps."],
    ["What is a plumbing pressure test in a new house?","Explain the purpose of specified pressure or leak tests, documented results and rectification before pipes are concealed."],
    ["When should plumbing pressure testing be done?","Explain that concealed supply lines should be tested at the stage and by the method specified before covering."],
    ["How do I check bathroom drainage slope?","Explain finished levels, floor trap position, water flow and professional inspection before tiling."],
    ["What is the difference between soil pipe and waste pipe?","Describe their general roles in a drainage system and why venting and sizing follow plumbing design."],
    ["Why does a bathroom smell after renovation?","Discuss traps, seals, venting, drainage defects and dry floor traps; recommend plumbing inspection rather than masking odour."],
    ["How do I prevent water leakage from a bathroom?","Cover substrate preparation, compatible waterproofing, pipe junctions, curing, testing and correct drainage detailing."],
    ["What is a bathroom pond test?","Explain its role in checking a waterproofed area and why duration, water level, observation and approval follow the specified system."],
    ["How do I waterproof a terrace before monsoon?","Recommend inspection of cracks, outlets, slopes, joints and existing system, followed by a compatible repair specification and testing."],
    ["What should I check before closing a plumbing shaft?","Verify pipe joints, supports, access panels, cleanouts, vents, leak tests, photographs and as-built records."]
  ]
};

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
