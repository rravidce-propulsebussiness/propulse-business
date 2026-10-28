const assert=require('node:assert/strict');
const pool=require('../src/config/database');
const grants=require('../src/services/leadEntitlementGrantService');

// Run only against the temporary Postgres service in CI, never production.
if(!['ci_smoke','ci_test'].includes(process.env.DB_NAME)){
  console.error('Refusing to create test campaigns outside an ephemeral CI database.');
  process.exit(1);
}

async function exercise(values){
  let created=null;
  try{
    created=await grants.createBusinessCampaign({
      name:'CI lead campaign save validation',audienceScope:'all',
      registrationScope:'new_registration',registrationEligibilityDays:7,
      verificationScope:'any',minCompletedProjects:0,
      industryId:'',stateId:'',cityId:'',
      sharedQuantity:1,premiumQuantity:0,validDays:30,claimExpiryDays:0,
      allowSingle:true,allowShared:true,allowAutoRelease:true,allowExclusive:false,
      ...values
    },null);
    assert.ok(created.id>0,'Create should save a campaign');
    for(const column of ['industry_id','state_id','city_id'])
      assert.equal(created[column],null,'Unselected '+column+' must remain NULL, not catalog ID 1');
    assert.ok(Number.isInteger(created.recipientCount)&&created.recipientCount>=0,
      'Campaign creation is allowed even when nobody currently qualifies');
    assert.equal(Number(created.registration_eligibility_days),values.registrationEligibilityDays||7);
    assert.equal(Number(created.project_registration_window_days),
      Number(created.min_completed_projects)>0?Number(created.registration_eligibility_days):0,
      'Project upload limit always mirrors registration window');
    const changed=await grants.updateBusinessCampaign(created.id,{
      registrationEligibilityDays:8,validDays:14
    },null);
    for(const column of ['industry_id','state_id','city_id'])
      assert.equal(changed[column],null,'Editing must preserve unrestricted '+column);
    assert.equal(Number(changed.registration_eligibility_days),8,
      'Admin can edit registration window');
    assert.equal(Number(changed.project_registration_window_days),
      Number(changed.min_completed_projects)>0?8:0,
      'Legacy upload window remains synchronized');
  }finally{
    if(created?.id)await grants.deleteBusinessCampaign(created.id,null);
  }
}

(async()=>{
  await exercise({registrationEligibilityDays:7});
  await exercise({registrationEligibilityDays:15,verificationScope:'verified',minCompletedProjects:1,sharedQuantity:2,validDays:7});
  await exercise({registrationEligibilityDays:30,registrationScope:'any',minCompletedProjects:0,premiumQuantity:1});
  let registrationRule=null;
  try{
    registrationRule=await grants.createRegistrationRule({
      name:'CI unrestricted signup reward',isActive:false,windowDays:7,
      verificationScope:'any',industryId:'',stateId:'',cityId:'',
      sharedQuantity:1,premiumQuantity:0,
      allowSingle:true,allowShared:true,allowAutoRelease:true,allowExclusive:false
    },null);
    for(const column of ['industry_id','state_id','city_id'])
      assert.equal(registrationRule[column],null,'Unrestricted signup rule must not target row #1 of '+column);
  }finally{
    if(registrationRule?.id)await grants.deleteRegistrationRule(registrationRule.id);
  }
  console.log('Campaign and registration reward creation preserves ALL industries/states/cities as NULL.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
