const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const audit=require('../src/services/criticalActionAuditService');

const migration=read('src/database/migrations/20260928_critical_action_audit.sql');
const service=read('src/services/criticalActionAuditService.js');
const adminService=read('src/services/adminService.js');
const adminUser360=read('src/services/adminUser360Service.js');
const payment=read('src/services/paymentService.js');
const quality=read('src/services/leadQualityGateService.js');
const pricing=read('src/services/leadService.js');
const access=read('src/services/leadAccessStrategyService.js');
const partnerSettings=read('src/controllers/adminLeadPartnerPricingController.js');
const partnerService=read('src/services/leadPartnerService.js');
const partnerPayout=read('src/services/leadPartnerPayoutService.js');
const investorPayout=read('src/services/investorPayoutRequestService.js');
const risk=read('src/services/securityRiskService.js');
const adminController=read('src/controllers/adminController.js');
const adminRoutes=read('src/routes/adminRoutes.js');
const app=read('../frontend/src/App.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const ui=read('../frontend/src/admin/pages/AdminAuditTimeline.jsx');

assert(migration.includes('CREATE TABLE IF NOT EXISTS critical_action_audit'),'Critical action audit table is missing');
assert(migration.includes('legacy_admin_user_audit')&&migration.includes('legacy_membership_admin_history'),'Existing user and membership audit history must be backfilled');
assert(service.includes('SECRET_KEY')&&service.includes("'[redacted]'"),'Audit snapshots must redact sensitive credential/payment fields');
const sanitized=audit.sanitize({password:'secret',manual_reference:'UTR-RAW-123',account_number:'1234567890',phone:'9876543210',email:'person@example.com',status:'paid'});
assert(sanitized.password==='[redacted]'&&sanitized.manual_reference==='[redacted]'&&sanitized.account_number==='[redacted]','Sensitive audit fields must be redacted');
assert(sanitized.phone==='••••3210'&&sanitized.email==='p***@example.com','Contact identifiers must be masked in audit snapshots');
const changes=audit.summarizeChanges({status:'pending',amount:100},{status:'paid',amount:100});
assert(changes.length===1&&changes[0].field==='status','Audit change summary must include only changed top-level fields');

assert(adminService.includes("action:'user.create_admin'")&&adminService.includes("action:'company_proof.review'"),'Admin account/proof mutations must use the critical audit ledger');
assert(adminService.includes('criticalActionAudit.record(client'),'Existing user status/role/profile audit must also feed the cross-module ledger');
assert(adminUser360.includes("membership.assign_plan")&&adminUser360.includes("membership.change_plan"),'Admin membership assignment/change must be audited');
assert(payment.includes("action:'payment.review'")&&payment.includes("action:'membership.update'"),'Payment reviews and membership updates must be audited');
assert(quality.includes("action:'lead.quality_gate_settings'")&&quality.includes("action:'lead.quality_recheck'")&&quality.includes("action:'lead.quarantine_override'"),'Lead quality governance must be audited');
assert(pricing.includes("pricing.rule_create")&&pricing.includes("pricing.rule_update")&&pricing.includes("pricing.rule_delete"),'Lead pricing rules must be audited');
assert(access.includes("pricing.access_settings"),'Buyer access defaults must be audited');
assert(partnerSettings.includes("pricing.partner_settings"),'Lead Partner pricing settings must be audited');
assert(partnerService.includes("partner.status_change"),'Lead Partner status changes must be audited');
assert(partnerPayout.includes("payout.lead_partner_process")&&partnerPayout.includes("payout.lead_partner_direct"),'Lead Partner payout actions must be audited');
assert(investorPayout.includes("payout.investor_process"),'Investor payout reviews must be audited');
assert(risk.includes("security.risk_review"),'Risk Center review actions must be audited');

for(const source of [payment,quality,access,partnerSettings,partnerPayout,investorPayout,risk]){
  const auditIndex=source.indexOf('criticalActionAudit.record');
  assert(auditIndex>=0,'Expected audit integration is missing');
}
assert(adminRoutes.includes("'/audit-timeline'")&&adminController.includes('getAuditTimeline'),'Admin audit timeline API route is missing');
assert(app.includes('AdminAuditTimeline')&&app.includes('path="/admin/audit-timeline"'),'Audit Timeline frontend route is missing');
assert(layout.includes("to:'/admin/audit-timeline',label:'Audit Timeline'"),'Audit Timeline must appear under Admin System navigation');
assert(ui.includes('Sensitive credentials, proof files, raw UTRs and full bank details are automatically redacted'),'Audit Timeline must communicate snapshot redaction');
assert(ui.includes('<ChangeList changes={item.metadata?.changes||[]}'),'Audit Timeline must display structured before/after changes');
assert(ui.includes('const load=useCallback')&&ui.includes('searchRef=useRef(search)')&&ui.includes('[load]'),'Audit Timeline filter effect must use a stable loader without auto-running manual search/date inputs');

console.log('Critical action audit regression test passed.');
