const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const qualityService=require('../src/services/leadQualityService');

const service=read('src/services/leadQualityService.js');
const partner=read('src/services/leadPartnerService.js');
const earnings=read('src/services/leadPartnerEarningsService.js');
const partnerUi=read('../frontend/src/pages/LeadPartnerHome.jsx');
const adminUi=read('../frontend/src/admin/pages/AdminLeadPartners.jsx');

assert(service.includes("MAX={completeness:45,validity:25,uniqueness:15,outcome:15,total:100}"),'Lead quality weights must total 100');
assert(service.includes('pincode_city_mapped'),'Quality engine must validate PIN to City mapping');
assert(service.includes('unique_phone')&&service.includes('unique_email')&&service.includes('unique_identity'),'Quality engine must detect duplicate/suspicion signals');
assert(service.includes("verified_fake THEN 0")&&service.includes("verified_genuine THEN 15"),'Verified buyer outcomes must affect quality score');
assert(service.includes('getPartnerQualityBatch'),'Admin partner list must use a set-based quality query');
assert(service.includes('getLeadQualityMap'),'Admin partner details must expose per-lead quality');
assert(partner.includes('leadQualityService.getPartnerQualityBatch'),'Lead Partner Admin listing must use the quality engine');
assert(partner.includes('leadQualityService.getPartnerQuality(partnerId, client)'),'Dashboard quality metrics must use the quality engine');
assert(earnings.includes('quality_score:quality.score'),'Admin partner financial detail must override the legacy stored quality score');
assert(earnings.includes('quality_flags:leadQualityMap'),'Admin partner detail leads must expose quality risk flags');
assert(partnerUi.includes('QUALITY SCORE')&&partnerUi.includes('Completeness')&&partnerUi.includes('Top checks:'),'Lead Partner dashboard must show score, components and actionable checks');
assert(adminUi.includes("Number(row.quality_score).toFixed(1)+'/100'"),'Admin partner table must show computed quality score');
assert(adminUi.includes('alp-quality-panel')&&adminUi.includes('quality_flags'),'Admin partner drawer must show quality breakdown and per-lead flags');

const perfect=qualityService.buildQualityFromAggregate({
  total_leads:10,purchased_leads:5,verified_fake_leads:0,verified_genuine_reports:5,reviewed_leads:5,
  completeness_points:450,validity_points:250,uniqueness_points:150,outcome_points:150
});
assert(perfect.score===100,'Perfect aggregate must score 100');
assert(perfect.band==='excellent','Perfect score must use excellent band');

const mixed=qualityService.buildQualityFromAggregate({
  total_leads:10,purchased_leads:5,verified_fake_leads:2,verified_genuine_reports:1,reviewed_leads:3,
  completeness_points:360,validity_points:190,uniqueness_points:120,outcome_points:95,
  missing_contact:2,invalid_contact:1,missing_requirement:3,invalid_pincode:2,pincode_city_mismatch:1,
  duplicate_phone:4,duplicate_email:1,duplicate_identity:2,classification_mismatch:1,invalid_status:2
});
assert(mixed.score===76.5,'Mixed aggregate score must remain deterministic');
assert(mixed.topIssues[0]?.key==='duplicatePhone'&&mixed.topIssues[0]?.count===4,'Largest risk counter must surface first');
assert(mixed.verifiedFakeRatePct===40,'Verified fake rate must retain purchased-lead denominator');

const empty=qualityService.buildQualityFromAggregate({total_leads:0});
assert(empty.score===null&&empty.band==='no_data'&&empty.confidence==='none','Partners with no leads must not receive an artificial 100 score');

console.log('Lead quality engine regression test passed.');
