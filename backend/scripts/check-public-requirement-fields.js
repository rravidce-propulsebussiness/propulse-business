const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { publicWrittenRequirement, legacyStructuredSummary, writtenLeadRequirement } = require('../src/utils/publicRequirementText');

const structured = {
  'What are you planning?': 'Commercial',
  'What is the plot area?': '355 sq yards',
  'When do you want to start?': 'Immediately',
  _intake: { flowKey: 'build' },
  _qualification: { marketplaceAnswers: { project_type: 'Commercial', plot_area: '355 sq yards' } },
};
const generated = 'What are you planning?: Commercial · What is the plot area?: 355 sq yards · When do you want to start?: Immediately';
assert.equal(legacyStructuredSummary(generated, structured), true);
assert.equal(publicWrittenRequirement({ source: 'public_requirement', requirement: generated }, structured), '',
  'Legacy summary must not masquerade as customer-written requirement');
assert.equal(publicWrittenRequirement({ requirement: 'Please build parking on ground floor' }, structured),
  'Please build parking on ground floor', 'Genuine old written requirement must remain visible');
assert.equal(publicWrittenRequirement({ requirement: generated }, {
  ...structured,
  _qualification: { marketplaceAnswers: { additional_requirement: 'Keep a lift shaft' } },
}), 'Keep a lift shaft', 'Recover marketplace-visible free-text from older submissions');
assert.equal(publicWrittenRequirement({ requirement: generated }, {
  ...structured, _intake: { flowKey: 'build', writtenRequirement: null },
}), '', 'No typed requirement is an explicitly empty field');
assert.equal(publicWrittenRequirement({ requirement: generated }, {
  ...structured, _intake: { flowKey: 'build', writtenRequirement: 'Separate meter room' },
}), 'Separate meter room', 'New submissions must use only the actual text');
assert.equal(publicWrittenRequirement({ requirement: generated }, {
  ...structured, _protected_answers: { 'Additional requirement': 'Private note' }
}), '', 'Protected answers must not be copied into marketplace requirements');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const intake = read('src/services/publicLeadIntakeService.js');
const reader = read('src/services/leadReadService.js');
const purchased = read('src/services/leadPurchaseService.js');
const gate = read('src/services/leadQualityGateService.js');
const migration = read('src/database/migrations/20261008_zzzzzz_public_requirement_text_only.sql');
assert(!intake.includes('buildSummary(flow, safeAnswers)'), 'Public submissions must not synthesize Requirement from all answers');
assert(intake.includes('customFields._intake.writtenRequirement = leadFields.requirement'));
assert(intake.includes('detailedFields._intake.writtenRequirement = leadFields.requirement'));
assert(intake.includes("question.questionType === 'text'"));
assert(reader.includes('writtenLeadRequirement(row,custom)'), 'All API read paths should normalize form-origin leads');
assert(purchased.includes('writtenLeadRequirement(row,raw_custom_fields)'), 'Purchased lead list must also show real written requirements');
assert(gate.includes("t.source='public_requirement'"), 'Structured forms should count for quality even without free text');
assert(migration.includes("NEW.source='public_requirement' AND normalized_requirement=''"),
  'Blank public free text must not collapse separate projects by matching contact');
const quote = {
  source: 'professional_project_quote',
  requirement: 'Interior Design enquiry from a completed project. Quotation industry: Interior Design\n' +
    'Site PIN code: 500072\nNumber of Bedrooms: 3 BHK\nInterior Style Preference: Minimalist',
  custom_fields: {_project_origin:{projectId:22,requestId:12}},
};
assert.equal(writtenLeadRequirement(quote), '',
  'Quoted form answers must not repeat under Requirement');
assert.equal(writtenLeadRequirement({...quote,requirement:quote.requirement+'\nAdditional requirement: Include a puja room'}),
  'Include a puja room', 'Typed quote requirements remain visible');
assert.equal(writtenLeadRequirement({source:'homepage_consultation',requirement:'Commercial · G+3'}),
  '', 'Homepage selections are not handwritten requirement text');
assert.equal(writtenLeadRequirement({source:'professional_project_callback',requirement:'Interior Design enquiry from a completed project.'}),
  '', 'A callback request without a typed message has no written requirement');
assert.equal(writtenLeadRequirement({source:'manual',requirement:'Need a terrace extension'}),
  'Need a terrace extension', 'Manual leads keep their explicitly entered requirements');
const bridge = read('src/services/projectMarketplaceLeadService.js');
const homepage = read('src/services/publicLeadIntakeService.js');
const formMigration = read('src/database/migrations/20261008_zzzzzzz_form_intake_requirement_integrity.sql');
assert(bridge.includes("const requirement=kind==='callback'?details:writtenBrief"),
  'Project marketplace must not insert a generated description');
assert(homepage.includes('requirement: null,'), 'Home consultation selection summaries must not become requirement');
assert(formMigration.includes("'professional_project_callback'"),
  'All form-origin leads must rely on intake idempotency');
console.log('Public requirement separation and historical display regression tests passed.');
