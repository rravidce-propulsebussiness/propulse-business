const assert = require('assert');
const { normalizeLeadRow, maskLead, businessCustomFields } = require('../src/services/leadReadService');

const normalized = normalizeLeadRow({
  id: 1,
  source: 'public_requirement',
  customer_name: 'Example Customer',
  customer_phone: '+919876543210',
  customer_email: 'customer@example.com',
  requirement: '',
  budget: null,
  custom_fields: { Budget: '₹10–15L', Timeline: 'Within 30 days', _protected_answers: { 'Additional requirement': 'Need a pooja room' }, _intake: { flowKey: 'design' } },
  buyer_capacity: 3,
  purchased_buyer_count: 0,
  pricing: { shares: [] },
});
assert.strictEqual(normalized.budget, '₹10–15L');
assert.strictEqual(normalized.requirement, '');
assert.ok(normalized.custom_fields._intake);
const masked = maskLead(normalized);
assert.strictEqual(masked.customer_name, 'Customer');
assert.ok(!Object.prototype.hasOwnProperty.call(masked.custom_fields, '_intake'));
assert.ok(!Object.prototype.hasOwnProperty.call(masked.custom_fields, 'Additional requirement'));
const unlocked = businessCustomFields(normalized.custom_fields);
assert.strictEqual(unlocked['Additional requirement'], 'Need a pooja room');
assert.ok(!Object.keys(unlocked).some(key => key.startsWith('_')));
assert.match(masked.customer_phone, /x/);
console.log('Lead read normalization checks passed.');
