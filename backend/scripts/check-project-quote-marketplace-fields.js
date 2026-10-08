const assert = require('node:assert/strict');
const { parseProjectQuoteRequirement } = require('../src/services/projectQuoteRequirementDetails');
const { maskLead, normalizeLeadRow } = require('../src/services/leadReadService');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const card = fs.readFileSync(path.join(root, 'frontend/src/pages/LeadsV2.jsx'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'backend/src/services/projectMarketplaceLeadService.js'), 'utf8');
assert.match(card, /const isProjectEnquiry = source === 'professional_project_quote'/);
assert.match(card, /isProjectEnquiry \|\| hasValue\(requirementSummary\)/,
  'Requirement box must render for project leads even when requirement text is empty');
assert.match(card, /Customer's additional requirements/);
assert.doesNotMatch(card, /\['Source',\s*lead\.source\]/,
  'Internal lead source should not be displayed on the public marketplace card');
assert.match(bridge, /writtenBrief=kind==='quote'\?sanitize\(answeredFields\['Additional Requirements'\]/,
  'Submitted free-text brief must be preserved for newly created marketplace leads');

const requirement = [
  'Reference project: 3 BHK Interior',
  'Published professional: Selected business',
  'Quotation industry: Interior Design',
  'Site PIN code: 500072',
  'What type of property is it: Villa',
  'Number of Bedrooms: 3 BHK',
  'What interior scope do you need: End-to-End Interiors',
  'Interior Style Preference: Minimalist',
  'What is your approximate budget: 10_15_lakh',
  'When do you want to start: 1–3 months',
  'Additional requirement: A pooja room and a small study',
].join('\n');

const parsed = parseProjectQuoteRequirement(requirement);
assert.equal(parsed['Property Type'], 'Villa');
assert.equal(parsed.Bedrooms, '3 BHK');
assert.equal(parsed['Interior Scope'], 'End-to-End Interiors');
assert.equal(parsed['Interior Style'], 'Minimalist');
assert.equal(parsed.Budget, '10_15_lakh');
assert.equal(parsed.Timeline, '1–3 months');
assert.equal(parsed['Additional Requirements'], 'A pooja room and a small study');
assert.ok(!Object.keys(parsed).some(x => /pin|professional|reference/i.test(x)));

const oldLead = {
  id: 501,
  source: 'professional_project_quote',
  customer_name: 'Asha Reddy',
  customer_phone: '9123450509',
  customer_email: 'asha@example.com',
  requirement: 'Interior Design enquiry from a completed project. ' +
    requirement.split('\n').filter(x => !/^Reference project:|^Published professional:/.test(x)).join('\n'),
  custom_fields: {
    _project_origin: { projectId: 22, requestId: 5 },
    _qualification: { detailedRequirementCompleted: true },
  },
  buyer_capacity: 3,
  pricing: { shares: [] },
};
const normalized = normalizeLeadRow(oldLead);
assert.equal(normalized.property_type, 'Villa');
assert.equal(normalized.custom_fields.Bedrooms, '3 BHK');
assert.equal(normalized.custom_fields.Timeline, '1–3 months');
const publicLead = maskLead(oldLead);
assert.equal(publicLead.customer_name, 'Asha Reddy', 'Entered name should not be replaced with Customer');
assert.equal(publicLead.custom_fields.Bedrooms, '3 BHK', 'Legacy lead answers should be visible as fields');
assert.equal(publicLead.custom_fields['Interior Scope'], 'End-to-End Interiors');
assert.equal(publicLead.custom_fields.Timeline, '1–3 months');
assert.equal(publicLead.property_type, 'Villa');
assert.ok(publicLead.customer_phone !== oldLead.customer_phone);
assert.ok(publicLead.customer_email !== oldLead.customer_email);
assert.ok(!('_project_origin' in publicLead.custom_fields));
assert.ok(!('Site PIN code' in publicLead.custom_fields));
assert.equal(maskLead({ source: 'homepage_consultation', customer_name: 'Test Homeowner' }).customer_name, 'Customer',
  'Homepage customer privacy must remain unchanged');
assert.equal(maskLead({ source: 'professional_project_callback', customer_name: 'Asha Reddy' }).customer_name, 'Asha Reddy');
console.log('Professional project quote marketplace details and privacy checks passed.');
