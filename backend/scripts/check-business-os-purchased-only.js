const assert = require('node:assert/strict');
const { isPaidPurchase, businessOsPaidPurchases } = require('../src/services/businessOsPurchasedLeads');

const testRecords = [
  { lead_id: 10, access_id: 100, payment_id: 200, purchase_status: 'paid' },
  { lead_id: 11, access_id: 101, payment_id: null, purchase_status: 'claimed', claim_id: 8 },
  { lead_id: 12, access_id: 102, payment_id: null, purchase_status: 'claimed', grant_id: 6 },
  { lead_id: 13, access_id: 103, payment_id: 203, purchase_status: 'pending_payment' },
  { lead_id: 14, access_id: 104, payment_id: 204, purchase_status: 'failed' },
  { lead_id: 15, access_id: null, payment_id: null, purchase_status: 'paid' },
  { lead_id: 16, access_id: 106, payment_id: 206, purchase_status: 'paid', claim_id: 2 },
];
assert.deepEqual(businessOsPaidPurchases(testRecords).map((row) => row.lead_id), [10, 16]);
assert.equal(isPaidPurchase({purchase_status:'claimed',access_id:100,payment_id:1}), false);
assert.equal(isPaidPurchase({purchase_status:'paid',access_id:100,payment_id:1}), true);
const { readFileSync } = require('node:fs');
const route = readFileSync(require.resolve('../src/routes/businessOsLeadIntegrationRoutes'), 'utf8');
assert.match(route, /businessOsPaidPurchases\(await getPurchases\(userId\)\)/);
assert.match(route, /purchase_id:Number\(row.access_id\)/);
assert.match(route, /purchase_status:'paid'/);
console.log('Business OS paid-purchase-only feed: PASSED');
