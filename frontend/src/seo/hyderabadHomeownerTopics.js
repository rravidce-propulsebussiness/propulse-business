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
