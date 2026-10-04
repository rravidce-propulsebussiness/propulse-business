const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/services/walletHistoryService.js'), 'utf8');
const walletService = fs.readFileSync(path.join(__dirname, '../src/services/walletService.js'), 'utf8');
const walletController = fs.readFileSync(path.join(__dirname, '../src/controllers/walletController.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(source.includes("lp.status='paid' AND p.status='paid'"), 'Lead purchase history must be sourced from paid lead purchases only');
assert(source.includes('lp.id AS lead_purchase_id'), 'Lead purchase history must join lead_purchases instead of treating every payment as a purchase');
assert(source.includes('AS balance_after'), 'Wallet history must return historical balance for logical payment rows');
assert(source.includes('wt2.payment_id=p.id'), 'Historical balance should prefer wallet transactions linked to the payment');
assert(source.includes("CASE WHEN wt2.type='refund' THEN 0 ELSE 1 END"), 'Rejected/refunded payments should prefer the refund balance when available');
assert(walletService.includes('if(!includeTransactions){'), 'Wallet summary mode must skip the transaction-history query');
assert(walletService.includes("COUNT(*) FILTER(WHERE status='pending')::int AS pending_count"), 'Wallet top-up summary must count pending requests without loading rows');
assert(walletController.includes("includeTransactions:req.query?.summary!=='1'"), 'Wallet controller must expose the lightweight balance summary mode');
assert(walletController.includes("summary:req.query?.summary==='1'"), 'Wallet controller must expose the lightweight top-up summary mode');
assert(walletService.includes('rechargeLimit=50,transactionPage=1,transactionLimit=100'), 'Admin wallet details must use bounded first pages');
assert(walletService.includes('safeRechargeLimit=Math.min') && walletService.includes('safeTransactionLimit=Math.min'), 'Admin wallet detail page sizes must be capped');
assert(walletService.includes("COUNT(*) FILTER(WHERE status='pending')::int pending_count"), 'Admin wallet detail pagination must preserve the true pending top-up count');
assert(walletController.includes('rechargePage:req.query?.rechargePage') && walletController.includes('transactionPage:req.query?.transactionPage'), 'Admin wallet detail pagination must be exposed by the controller');

console.log('Wallet history backend contract regression test passed.');
