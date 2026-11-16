const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

const adminWallet=read('../frontend/src/admin/pages/AdminInvestmentsWallet.jsx');
const proof=read('src/services/privateProofStorageService.js');
const investmentController=read('src/controllers/investmentController.js');
const leadPurchase=read('src/services/leadPurchaseService.js');
const pricing=read('src/services/leadPartnerPricingService.js');
const investment=read('src/services/investmentService.js');
const payment=read('src/services/paymentService.js');
const coupon=read('src/services/couponService.js');
const report=read('src/services/leadReportService.js');
const reportController=read('src/controllers/leadReportController.js');
const server=read('src/server.js');
const nginx=read('../frontend/deploy/nginx.conf');
const docker=read('../frontend/Dockerfile');
const hostinger=read('../hostinger-server.js');
const react=read('../frontend/src/App.jsx');
const release=read('src/services/releaseIdentityService.js');
const compose=read('../video-redactor/compose.yaml');
const workerImage=read('../video-redactor/Dockerfile');
const audioAudit=read('../video-redactor/audit_project_audio.py');
const limiter=read('src/middleware/rateLimitMiddleware.js');
const optionalAuth=read('src/middleware/optionalAuthMiddleware.js');
const priorRegression=read('scripts/check-seven-bug-regressions.js');

assert.match(adminWallet,/transfer proof URL \(required\)/i);
assert.match(proof,/INVALID_PRIVATE_PROOF/);
for(const code of ['INVALID_PRIVATE_PROOF:400','PRIVATE_PROOF_TOO_LARGE:400'])assert.ok(investmentController.includes(code));
assert.match(leadPurchase,/!useWallet&&Number\(amount\)>0&&coupon/);
assert.match(pricing,/COALESCE\(\(\s*SELECT jsonb_build_object/);
assert.match(pricing,/r\.industry_id IS NOT NULL AND r\.city_id IS NOT NULL THEN 3/);
assert.match(pricing,/l\.partner_base_pricing, l\.pricing/);
assert.match(pricing,/await applyRuleToExistingLeads\(userId,rule,client\)/);
assert.match(pricing,/await applyRuleToExistingLeads\(userId,\{leadType:row\.lead_type\},client\)/);
assert.match(investment,/module\.exports=\{assertIndustryLocationCapacity,/);
assert.match(investment,/maturityDays===0|'matured' ELSE 'active'/);
assert.match(payment,/row\.maturity_days\?\?rule\.maturity_days\?\?30/);
assert.match(payment,/assertIndustryLocationCapacity\(client,\{industryId:row\.industry_id/);
assert.match(payment,/maturityDays===0\?'matured':'active'/);
const couponControllers=['couponController','paymentController','leadController','leadPurchaseController','walletController'];
for(const name of couponControllers)assert.match(read('src/controllers/'+name+'.js'),/INVALID_REWARD_SCOPE/,name+' must validate reward scope');
assert.match(server,/if\(req\.body==null\)req\.body=\{\}/);
assert.match(read('src/routes/adminRoutes.js'),/'conversationId','projectId','eventId'/);
for(const name of ['membershipPlanRoutes','subcityRoutes','notificationRoutes','paymentReceivingDetailsRoutes','leadPartnerRoutes','leadReportRoutes','adminFaqRoutes','profileRoutes','metaLeadAdsRoutes'])
  assert.match(read('src/routes/'+name+'.js'),/numericRouteParams\(/,name+' missing ID guards');
assert.match(read('src/routes/metaLeadAdsRoutes.js'),/router\.param\('pageId'/);
assert.match(report,/code:'INVALID_INPUT'/);
assert.match(report,/lp\.status='pending_payment'/);
assert.match(report,/lead_id=\$1 AND id<>\$3 AND status='pending'/);
assert.match(coupon,/UPDATE lead_entitlement_grants SET shared_quantity=0/);
assert.match(coupon,/COUPON_REWARD_RECOVERY_REQUIRED/);
assert.match(reportController,/COUPON_REWARD_RECOVERY_REQUIRED/);
assert.match(nginx,/client_max_body_size 55m/);
assert.match(nginx,/location = \/release\.json/);
assert.match(nginx,/proxy_pass http:\/\/propulse_backend\/release\.json/);
assert.doesNotMatch(docker,/COPY --from=build \/app\/dist\/release\.json/);
for(const route of ['professional-faq','professional-upcoming-features','professional-requests']){
  assert.ok(hostinger.includes('|'+route+'|'),route+' missing from Hostinger');
  assert.ok(react.includes('|'+route+'|'),route+' missing from session gate');
}
assert.match(release,/process\.env\.DEPLOY_ENVIRONMENT\|\|bakedRelease\(\)\?\.environment/);
assert.match(compose,/project_video_tmp:\/tmp/);
assert.doesNotMatch(compose,/\/tmp:size=2g/);
assert.match(workerImage,/COPY worker\.py audit_project_audio\.py/);
assert.doesNotMatch(workerImage,/tesseract-ocr/);
assert.match(audioAudit,/if rms\.size == 0/);
assert.match(limiter,/sharedLeases\.delete\(key\)/);
assert.match(optionalAuth,/bearer=header\.startsWith\('Bearer '\)\?header\.slice\(7\)\.trim\(\)/);
assert.match(optionalAuth,/supabaseAuthService\.verifyAccessToken\(bearer\)/);
assert.match(optionalAuth,/if\(cookieToken\)/);
assert.match(priorRegression,/request === '\.\.\/config\/database'/);

async function exercisePartnerPricing(){
  const original=Module._load;
  const queries=[];
  const fakeDb={query:async()=>({rows:[{normal_price_uplift:100,two_share_percent:60,three_share_percent:45}]})};
  Module._load=function(request,parent,isMain){
    if(request==='../config/database'&&parent?.filename?.endsWith('leadPartnerPricingService.js'))return fakeDb;
    return original.apply(this,arguments);
  };
  try{
    const source=require('../src/services/leadPartnerPricingService');
    await source.applyRuleToExistingLeads(19,{leadType:'basic'},{query:async(sql,params)=>{
      queries.push({sql,params});
      return{rowCount:1,rows:[]};
    }});
    assert.equal(queries.length,1);
    assert.deepEqual(queries[0].params,[19,100,60,45,'basic']);
    assert.match(queries[0].sql,/partner_pricing_overridden,FALSE\)=FALSE/);
    assert.match(queries[0].sql,/ORDER BY CASE WHEN r\.industry_id/);
    assert.match(queries[0].sql,/COALESCE\(/);
  }finally{Module._load=original;}
}

async function exerciseProofValidation(){
  const original=Module._load;
  Module._load=function(request,parent,isMain){
    if(parent?.filename?.endsWith('privateProofStorageService.js')&&request==='../config/uploadStorage')return{privateProofRoot:'/tmp/propulse-audit'};
    if(parent?.filename?.endsWith('privateProofStorageService.js')&&request==='./s3PrivateObjectStorageService')return{isReference:()=>false};
    return original.apply(this,arguments);
  };
  try{
    const service=require('../src/services/privateProofStorageService');
    await assert.rejects(()=>service.storeDataUrl('file.jpg'),e=>e.code==='INVALID_PRIVATE_PROOF');
    assert.equal(await service.storeDataUrl('https://example.org/proof.png'),'https://example.org/proof.png');
  }finally{Module._load=original;}
}
(async()=>{await exercisePartnerPricing();await exerciseProofValidation();console.log('Eleven-audit regression checks passed.');})()
.catch(error=>{console.error(error);process.exitCode=1;});
