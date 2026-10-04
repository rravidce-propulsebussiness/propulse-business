const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const risk=require('../src/services/securityRiskService');

const migration=read('src/database/migrations/20260928_security_risk_center.sql');
const service=read('src/services/securityRiskService.js');
const authService=read('src/services/authService.js');
const authController=read('src/controllers/authController.js');
const paymentService=read('src/services/paymentService.js');
const purchaseService=read('src/services/leadPurchaseService.js');
const investorAccount=read('src/services/investorPayoutAccountService.js');
const partnerAccount=read('src/services/leadPartnerPayoutAccountService.js');
const adminController=read('src/controllers/adminController.js');
const adminRoutes=read('src/routes/adminRoutes.js');
const app=read('../frontend/src/App.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const ui=read('../frontend/src/admin/pages/AdminRiskCenter.jsx');

assert(migration.includes('security_auth_attempts'),'Failed-login aggregation table is missing');
assert(migration.includes('security_risk_events'),'Security risk event table is missing');
assert(migration.includes("WHERE status='open'"),'Open risk events need a partial unique deduplication index');
assert(service.includes("ON CONFLICT(event_type,event_key) WHERE status='open'"),'Risk event upsert must be concurrency-safe');
assert(service.includes("createHmac('sha256'"),'Sensitive risk fingerprints must use keyed hashing');
assert(risk.hmac('Sensitive-Value').length===64,'Risk fingerprint must be a SHA-256 HMAC');
assert(risk.accountHint({method:'bank',account_number:'123456789012'})==='••••9012','Bank account UI hint must expose only the last four digits');
assert(!risk.accountFingerprint({method:'bank',account_number:'123456789012',ifsc_code:'TEST0000001'}).includes('123456789012'),'Account fingerprint must not contain the raw account number');
assert(authService.includes('securityRiskService.recordFailedLogin'),'Invalid password attempts must feed the Risk Center');
assert(authController.includes('source:req.ip||req.socket?.remoteAddress||null'),'Login detector must receive a source that is hashed before storage');
assert(paymentService.includes('recordDuplicatePaymentReference')&&paymentService.includes("code:'DUPLICATE_REFERENCE'"),'Blocked duplicate UTR submissions must feed the Risk Center without removing the block');
assert(paymentService.includes("Risk logging failed for duplicate payment reference"),'Risk telemetry failure must not replace the payment-reference security control');
const purchaseRisk=purchaseService.indexOf('recordLeadPurchaseBurst');
const purchaseCommit=purchaseService.lastIndexOf("await client.query('COMMIT');",purchaseRisk);
assert(purchaseRisk>purchaseCommit&&purchaseCommit>=0,'Lead-purchase burst detection must run after the purchase transaction commits');
assert(purchaseService.includes("Risk logging failed for lead purchase burst"),'Risk telemetry failure must not roll back a valid lead purchase');
for(const source of [investorAccount,partnerAccount]){
  assert(source.includes('evaluatePayoutAccountChange'),'Payout account changes must feed the Risk Center');
  const riskIndex=source.indexOf('evaluatePayoutAccountChange');
  const commitIndex=source.lastIndexOf("await client.query('COMMIT')",riskIndex);
  assert(commitIndex>=0&&riskIndex>commitIndex,'Payout risk evaluation must run after the account transaction commits');
}
assert(service.includes('shared_payout_destination')&&service.includes('rapid_payout_account_change'),'Payout-account sharing and rapid changes must be separate risk signals');
assert(service.includes('RISK_REVIEW_NOTE_REQUIRED'),'Admin review notes must be mandatory');
assert(adminRoutes.includes("'/risk-center'")&&adminRoutes.includes("'/risk-center/:eventId'"),'Admin Risk Center API routes are missing');
assert(adminController.includes('getRiskCenter')&&adminController.includes('reviewRiskEvent'),'Admin Risk Center controllers are missing');
assert(app.includes("AdminRiskCenter")&&app.includes('path="/admin/risk-center"'),'Admin Risk Center frontend route is missing');
assert(layout.includes("to:'/admin/risk-center',label:'Risk Center'"),'Risk Center must be visible under Admin System navigation');
assert(ui.includes('Signals are indicators for review, not automatic accusations or account freezes.'),'Risk Center UI must avoid treating signals as automatic guilt');
assert(ui.includes("review(event,'resolved')")&&ui.includes("review(event,'dismissed')"),'Risk Center UI must support explicit resolve and dismiss review actions');

console.log('Security Risk Center regression test passed.');
