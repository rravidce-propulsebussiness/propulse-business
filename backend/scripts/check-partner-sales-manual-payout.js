const assert=require('assert');
const fs=require('fs');
const path=require('path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

// Lead Partner lead sales are ProPulse revenue; partners are paid manually by Admin.
const purchase=read('src/services/leadPurchaseService.js');
assert(!purchase.includes('createForPurchase'),'Lead purchases must not auto-credit Lead Partner earnings');
assert(purchase.includes('if(source?.lead_partner_id!=null)return;'),'Lead Partner lead revenue must not be allocated to investors');

const payout=read('src/services/leadPartnerPayoutService.js');
assert(payout.includes("const manual=source==='admin';"),'Admin direct payouts must be recognised as manual payments');
assert(payout.includes("if(!manual&&requested>b.available+0.001)"),'Only partner-requested withdrawals are capped by the earnings balance');
assert(payout.includes("r.request_source==='admin'?allocated>money(r.amount):allocated!==money(r.amount)"),'Admin direct payouts may exceed reserved legacy earnings; partner withdrawals must match exactly');

const integrity=read('src/services/adminFinancialIntegrityService.js');
assert(integrity.includes("r.request_source='admin' AND COALESCE(SUM(i.amount) FILTER(WHERE i.status='paid'),0)>r.amount+0.009"),'Integrity check must accept manual admin payouts not backed by earnings');

console.log('Partner sales manual payout regression checks passed.');
