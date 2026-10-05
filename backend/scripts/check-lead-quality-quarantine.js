const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const gate=require('../src/services/leadQualityGateService');

const migration=read('src/database/migrations/20260928_lead_quality_quarantine.sql');
const leadService=read('src/services/leadService.js');
const marketplace=read('src/services/leadMarketplaceService.js');
const controller=read('src/controllers/leadController.js');
const routes=read('src/routes/leadRoutes.js');
const partnerInventory=read('src/services/leadPartnerInventoryService.js');
const partnerDashboard=read('src/services/leadPartnerService.js');
const adminUi=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const partnerUi=read('../frontend/src/pages/LeadPartnerInventory.jsx');
const leadRead=read('src/services/leadReadService.js');
const purchaseService=read('src/services/leadPurchaseService.js');
const entitlementService=read('src/services/leadEntitlementService.js');

assert(migration.includes("'quarantined'"),'Lead status constraint must explicitly support quarantine');
assert(migration.includes('quality_gate_score')&&migration.includes('quality_gate_reasons'),'Lead quarantine audit metadata is missing');
assert(migration.includes('lead_quality_gate_settings'),'Quality gate settings table is missing');
assert(leadService.includes('leadQualityGateService.evaluateAndApply'),'Every lead creation must pass the common quality gate');
assert(leadService.includes('windowHours=24*30')&&leadService.includes("COALESCE(pincode,'')=$5"),'Duplicate lead protection must cover repeat sheet imports for up to 30 days while scoping valid PINs so distinct projects at different locations are not collapsed');
assert(leadService.includes('pincode:pincode||zipcode'),'Lead creation must pass the normalized project PIN into duplicate detection');
assert(leadService.includes("'quarantined') RETURNING *"),'New leads must be inserted quarantined before quality evaluation to avoid a sellable race window');
assert(leadService.includes('lead_partner_id,investor_user_id,status')&&leadService.includes('leadPartnerId?Number(leadPartnerId):null'),'Lead ownership and investor attribution must be inserted before quality release');
assert(partnerInventory.includes('leadPartnerId:partner.id'),'Lead Partner bulk imports must insert ownership atomically');
assert(partnerInventory.includes('deferQualityGate:true')&&partnerInventory.includes('leadQualityGateService.evaluateAndApply'),'Lead Partner imports must remain quarantined until partner pricing finishes');
assert(partnerInventory.includes("DELETE FROM leads WHERE id=$1 AND created_by=$2 AND status='quarantined'"),'Failed post-create partner imports must clean their quarantined partial row');
assert(partnerDashboard.includes('leadPartnerId: partner.id'),'Lead Partner manual creation must insert ownership atomically');
assert(controller.includes('leadInvestorService.assertInvestorLink')&&controller.includes('investorUserId:req.body.investorUserId||null'),'Admin investor-linked leads must validate and insert investor attribution before quality release');
assert(leadService.includes("status='quarantined'")&&leadService.includes('gate_evaluation_error'),'Quality-gate failures must fail closed');
assert(leadService.includes("QUALITY_OVERRIDE_REQUIRED"),'Generic status updates must not bypass quarantine review');
assert(marketplace.includes("status='available'"),'Marketplace must default to available leads so quarantined inventory stays hidden');
assert(controller.includes("'quarantined'")&&controller.includes('overrideLeadQuarantine'),'Admin controller must support quarantine status and audited override');
assert(routes.includes("'/quality-gate/settings'")&&routes.includes("'/:id/quality-gate/recheck'")&&routes.includes("'/:id/quality-gate/override'"),'Quality gate settings/review routes are missing');
assert(partnerInventory.includes("quality_gate_score")&&partnerInventory.includes("AS quarantined"),'Lead Partner inventory must expose quarantine state and count');
assert(partnerDashboard.includes("l.status='quarantined' THEN 'quarantined'"),'Lead Partner dashboard must not count quarantined leads as available');
assert(adminUi.includes('QUALITY GATE')&&adminUi.includes('Release anyway')&&adminUi.includes('Recheck'),'Admin UI must expose gate settings and explicit review actions');
assert(adminUi.includes("leadStatus==='all'||l.status===leadStatus"),'Admin inventory must provide status filtering including quarantined leads');
assert(partnerUi.includes('<option value="quarantined">Quarantined</option>')&&partnerUi.includes('QUALITY HOLD'),'Lead Partner UI must explain quarantined inventory');
assert(leadRead.includes("'quality_gate_reasons'")&&leadRead.includes('stripQualityGate'),'Buyer-facing lead responses must hide internal quality-review metadata');
assert(purchaseService.includes("if(lead.status!=='available')")&&purchaseService.includes("purchase.lead_status!=='available'"),'Direct and pending-payment lead purchases must reject quarantined leads');
assert(entitlementService.includes("lead.status!=='available'")&&entitlementService.includes("LEAD_UNAVAILABLE"),'Membership/entitlement access must reject quarantined leads');

const goodFeature={
  status:'available',has_name:true,has_contact:true,has_requirement:true,has_industry:true,has_service_detail:true,
  has_state:true,has_city:true,has_pincode:true,has_project_detail:true,valid_contact:true,valid_pincode:true,
  pincode_city_mapped:true,classification_valid:true,unique_phone:true,unique_email:true,unique_identity:true,
  verified_fake:false,verified_genuine:false,purchased:false,phone_key:'9876543210',email_key:'x@example.com',identity_key:'abc'
};
const settings={enabled:true,minimumScore:70,requireContact:true,requireValidContact:true,requireValidPincode:true,requirePincodeCityMatch:true,requireClassificationValid:true};
const good=gate.decide(goodFeature,settings);
assert(good.score===95&&!good.shouldQuarantine&&good.gateFlags.length===0,'A complete valid new lead must pass with the expected pre-outcome score');

const missingContact=gate.decide({...goodFeature,has_contact:false,valid_contact:false,phone_key:'',email_key:''},settings);
assert(missingContact.shouldQuarantine&&missingContact.gateFlags.includes('missing_contact'),'Missing customer contact must quarantine a lead');

const badPin=gate.decide({...goodFeature,valid_pincode:false,pincode_city_mapped:false},settings);
assert(badPin.shouldQuarantine&&badPin.gateFlags.includes('invalid_pincode'),'Invalid PIN must quarantine a lead');

const missingCity=gate.decide({...goodFeature,has_city:false,pincode_city_mapped:false},settings);
assert(missingCity.shouldQuarantine&&missingCity.gateFlags.includes('pincode_city_mismatch'),'A valid PIN without a resolved City mapping must stay quarantined instead of becoming broadly sellable at State level');

const strict=gate.decide(goodFeature,{...settings,minimumScore:96});
assert(strict.shouldQuarantine&&strict.gateFlags.includes('score_below_threshold'),'Configured minimum score must be enforced');

const disabled=gate.decide({...goodFeature,has_contact:false,valid_contact:false,valid_pincode:false,classification_valid:false},{...settings,enabled:false});
assert(!disabled.shouldQuarantine&&disabled.gateFlags.length===0,'Disabled gate must not quarantine inventory');

console.log('Lead quality quarantine regression test passed.');
