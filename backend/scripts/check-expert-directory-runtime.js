const assert=require('assert');
const pool=require('../src/config/database');
const publicExpertService=require('../src/services/publicExpertService');
const expertDirectoryService=require('../src/services/expertDirectoryService');

async function main(){
  const original=(await pool.query(
    'SELECT directory_enabled,require_active_membership,require_verified,allowed_plan_groups,show_projects,show_videos,show_plans,updated_by,updated_at FROM expert_directory_settings WHERE id=1'
  )).rows[0];
  const userIds=[];
  try{
    const plan=(await pool.query(
      "SELECT id FROM membership_plans WHERE is_active=TRUE AND LOWER(REPLACE(COALESCE(plan_type,''),'-','_'))='pro' ORDER BY id LIMIT 1"
    )).rows[0];
    assert.ok(plan,'Expected at least one active Pro membership plan in bootstrap data');

    const stamp=String(Date.now());
    async function createBusiness(suffix){
      const user=(await pool.query(
        "INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,$3,'business',TRUE) RETURNING id",
        ['Expert Runtime '+suffix,'expert-runtime-'+stamp+'-'+suffix+'@example.test','not-a-real-password-hash']
      )).rows[0];
      userIds.push(user.id);
      const profile=(await pool.query(
        "INSERT INTO business_profiles(user_id,phone,business_name,business_details,public_headline,public_summary,public_profile_enabled) VALUES($1,$2,$3,$4,$5,$6,TRUE) RETURNING id",
        [user.id,'9000000000','Expert Runtime '+stamp+' '+suffix,'Internal fixture details','Public '+suffix,'Public showcase '+suffix]
      )).rows[0];
      return {userId:user.id,profileId:profile.id};
    }

    const subscribed=await createBusiness('Subscribed');
    const unsubscribed=await createBusiness('Unsubscribed');
    await pool.query(
      "INSERT INTO memberships(user_id,membership_plan_id,starts_at,expires_at,status) VALUES($1,$2,CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '30 days','active')",
      [subscribed.userId,plan.id]
    );

    await expertDirectoryService.updateSettings(null,{
      directoryEnabled:true,
      requireActiveMembership:true,
      requireVerified:false,
      allowedPlanGroups:['grow','scale'],
      showProjects:true,
      showVideos:true,
      showPlans:true,
    });

    let list=await publicExpertService.listPublicExperts({search:'Expert Runtime '+stamp,page:1,pageSize:48});
    assert.ok(list.data.some(item=>Number(item.user_id)===subscribed.userId),'Subscribed business must appear in public Experts');
    assert.ok(!list.data.some(item=>Number(item.user_id)===unsubscribed.userId),'Unsubscribed business must not appear in public Experts');

    let detail=await publicExpertService.getPublicExpert(subscribed.profileId);
    assert.ok(detail,'Eligible subscribed business detail must be public');
    assert.strictEqual(detail.business_details,undefined,'Internal business_details must never be returned publicly');
    assert.strictEqual(detail.membership_expires_at,undefined,'Membership expiry must remain private');

    await expertDirectoryService.updateBusinessVisibility(null,subscribed.userId,{isHidden:true,isFeatured:false,sortOrder:0});
    list=await publicExpertService.listPublicExperts({search:'Expert Runtime '+stamp,page:1,pageSize:48});
    assert.ok(!list.data.some(item=>Number(item.user_id)===subscribed.userId),'Admin-hidden business must disappear from public Experts');
    detail=await publicExpertService.getPublicExpert(subscribed.profileId);
    assert.strictEqual(detail,null,'Admin-hidden business detail must not be fetchable directly');

    console.log('Expert directory subscription runtime checks passed.');
  }finally{
    if(userIds.length)await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[userIds]);
    if(original){
      await pool.query(
        'UPDATE expert_directory_settings SET directory_enabled=$1,require_active_membership=$2,require_verified=$3,allowed_plan_groups=$4::jsonb,show_projects=$5,show_videos=$6,show_plans=$7,updated_by=$8,updated_at=$9 WHERE id=1',
        [original.directory_enabled,original.require_active_membership,original.require_verified,JSON.stringify(original.allowed_plan_groups),original.show_projects,original.show_videos,original.show_plans,original.updated_by,original.updated_at]
      );
    }
    await pool.end();
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
