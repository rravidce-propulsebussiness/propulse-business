const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/services/walletHistoryService.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(source.includes("lp.status='paid' AND p.status='paid'"), 'Lead purchase history must be sourced from paid lead purchases only');
assert(source.includes('lp.id AS lead_purchase_id'), 'Lead purchase history must join lead_purchases instead of treating every payment as a purchase');
assert(source.includes('AS balance_after'), 'Wallet history must return historical balance for logical payment rows');
assert(source.includes('wt2.payment_id=p.id'), 'Historical balance should prefer wallet transactions linked to the payment');
assert(source.includes("CASE WHEN wt2.type='refund' THEN 0 ELSE 1 END"), 'Rejected/refunded payments should prefer the refund balance when available');

console.log('Wallet history backend contract regression test passed.');
