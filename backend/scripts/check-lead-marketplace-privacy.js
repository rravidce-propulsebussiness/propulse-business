const { maskLead } = require('../src/services/leadReadService');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const masked = maskLead({
  id: 101,
  customer_name: 'Alice Smith',
  customer_phone: '+91 98765 43210',
  customer_email: 'alice@example.com',
  requirement: 'Call 9876543210 or email alice@example.com',
  notes: 'Internal note',
  pincode: '500001',
  created_by: 9,
  investor_user_id: 42,
  investor_name: 'Investor User',
  investor_email: 'investor@example.com',
  cycle_id: 77,
  lead_partner_id: 12,
  lead_partner_user_id: 13,
  lead_partner_name: 'Partner Name',
  lead_partner_email: 'partner@example.com',
  lead_partner_status: 'active',
  partner_base_pricing: { shares: [{ shares: 1, price: 100 }] },
  partner_pricing_overridden: true,
  partner_pricing_updated_at: new Date().toISOString(),
  custom_fields: {
    Address: 'Flat 101, Jubilee Hills',
    Instagram: '@alice',
    Phone: '9876543210',
    Budget: '5 lakh',
    Notes: 'Email me at alice@example.com',
  },
});

assert(masked.customer_name !== 'Alice Smith' && masked.customer_name.includes('A***'), 'Marketplace must mask customer names');
assert(masked.customer_phone !== '+91 98765 43210', 'Marketplace must mask customer phones');
assert(masked.customer_email !== 'alice@example.com', 'Marketplace must mask customer emails');
assert(!('pincode' in masked), 'Marketplace must not expose exact pincodes');
assert(!('notes' in masked), 'Marketplace must not expose internal notes');
assert(!('created_by' in masked), 'Marketplace must not expose internal creator IDs');
assert(!('investor_user_id' in masked) && !('investor_email' in masked) && !('investor_name' in masked), 'Marketplace must not expose investor identity');
assert(!('lead_partner_id' in masked) && !('lead_partner_user_id' in masked) && !('lead_partner_email' in masked) && !('lead_partner_name' in masked), 'Marketplace must not expose lead-partner identity');
assert(!('cycle_id' in masked), 'Marketplace must not expose investment cycle IDs');
assert(!('partner_base_pricing' in masked) && !('partner_pricing_overridden' in masked), 'Marketplace must not expose partner pricing internals');
assert(!('Address' in masked.custom_fields) && !('Instagram' in masked.custom_fields) && !('Phone' in masked.custom_fields), 'Marketplace must drop contact-classified custom fields');
assert(masked.custom_fields.Budget === '5 lakh', 'Marketplace should preserve non-sensitive custom fields');
assert(masked.custom_fields.Notes.includes('xxxx@xxxx.com'), 'Marketplace must mask embedded contact details in non-contact fields');

console.log('Lead marketplace privacy regression test passed.');
