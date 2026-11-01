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

  ,
  "Foundation, soil & site preparation": [
    ["Do I need a soil test before constructing an independent house?","Explains soil investigation, bearing capacity and why foundation type should follow a geotechnical report and structural design."],
    ["What is the difference between isolated footing and raft foundation?","Compares typical use cases, soil conditions, load distribution and design responsibility."],
    ["How deep should house foundations be in Hyderabad?","Explains why no single depth fits every site; soil report, loads, groundwater and adjacent structures govern design."],
    ["Can I build a house on black cotton soil?","Discusses expansive soil behaviour, site investigation and engineered foundation options."],
    ["What is plinth beam and why is it provided?","Explains its role in tying supports and managing wall loads according to the structural design."],
    ["How do I prepare a plot before starting house construction?","A checklist for survey, soil study, utilities, access, levels, drainage and approved drawings."],
    ["What is anti-termite treatment in house construction?","Explains where treatment is used, product labels, applicator records and safety precautions."],
    ["How do I prevent water stagnation around house foundations?","Covers site grading, stormwater drainage, plinth levels and coordination with the civil engineer."]
  ],
  "Roof slab, staircase & masonry": [
    ["How thick should an RCC roof slab be for a house?","Explains that slab thickness is designed from span, loads, deflection, reinforcement and structural drawings."],
    ["When can I remove slab shuttering after concrete casting?","Explains formwork striking times depend on span, concrete strength, support sequence, temperature and engineer approval."],
    ["How many days after slab casting can I build the next floor?","Explains strength gain, testing, curing, load staging and structural engineer clearance."],
    ["What is the ideal staircase width for a residential house?","Covers comfort, headroom, landing, handrails and applicable local building requirements."],
    ["How do I calculate the number of steps for a staircase?","Explains floor-to-floor height, riser, tread, landing and comfortable geometry."],
    ["Which is better for house walls: 4 inch or 6 inch bricks?","Compares wall purpose, structural role, acoustic/thermal needs and approved drawings."],
    ["Why are cracks appearing between brick wall and RCC column?","Explains differential movement, junction detailing, mesh and when professional inspection is needed."],
    ["What is the purpose of lintel and sunshade above windows?","Explains load transfer, rain protection, projections and detailing."]
  ],
  "Flooring, plaster & paint quality": [
    ["Which flooring is best for a new house in India?","Compares vitrified tile, ceramic, granite and other finishes by use, slip resistance and maintenance."],
    ["What is the difference between double charge and full body vitrified tiles?","Explains manufacturing terminology, wear layer, through-body pattern and product specifications."],
    ["How do I calculate tiles required for a house?","Shows area measurement, tile size, layout, wastage allowance and matching batch considerations."],
    ["Why are floor tiles making a hollow sound?","Explains possible bedding voids, bond failure, movement and how to assess extent before repair."],
    ["What is the ideal plaster thickness for internal walls?","Explains substrate condition, specification, alignment and why excessive thickness needs correction."],
    ["How long should wall plaster cure before painting?","Covers curing, drying, moisture checks and paint-system manufacturer guidance."],
    ["Why is paint peeling off newly plastered walls?","Explains moisture, alkalinity, surface preparation, primer and premature painting."],
    ["Which paint is best for exterior walls in Hyderabad weather?","Compares weather-resistant systems, surface preparation, exposure and maintenance."]
  ],
  "Construction contracts, BOQ & payments": [
    ["What is a BOQ in house construction?","Explains bill of quantities, measurement, specification and how it supports transparent comparisons."],
    ["Should I choose labour contract or material contract for house construction?","Compares owner control, procurement responsibility, supervision, cash flow and risk."],
    ["What is the usual payment schedule for house construction?","Explains milestone-linked payments and why terms should match measurable completed work."],
    ["How do I avoid hidden charges in a construction contract?","Lists scope gaps, provisional items, escalation clauses, taxes and variation approval steps."],
    ["How do I track daily progress at a house construction site?","A simple reporting approach for labour, materials, completed work, inspections and blockers."],
    ["Who is responsible for construction material wastage?","Explains how responsibility and acceptable wastage should be defined in the agreement."],
    ["What is a defect liability period in house construction?","Explains written defect reporting, exclusions, response timelines and applicable contract terms."],
    ["How do I verify material brands and grades used at my site?","Covers approved material schedules, delivery challans, batch details, test certificates and site records."]
  ]
};

const intentLabels = ["Google Trends / public search-informed question","Homeowner problem-solving query","Comparison or purchase-intent query","Local service-intent query"];
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
