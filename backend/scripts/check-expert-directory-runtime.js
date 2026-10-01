const assert=require('assert');
const pool=require('../src/config/database');
const publicExpertService=require('../src/services/publicExpertService');
const expertDirectoryService=require('../src/services/expertDirectoryService');

async function main(){
  const original=(await pool.query(
    'SELECT directory_enabled,require_active_membership,require_verified,allowed_plan_groups,show_projects,show_videos,show_plans,updated_by,updated_at FROM expert_directory_settings WHERE id=1'
  )).rows[0];
  const userIds=[];
  let createdPlanId=null;
  try{
    let plan=(await pool.query(
      "SELECT id FROM membership_plans WHERE is_active=TRUE AND LOWER(REPLACE(COALESCE(plan_type,''),'-','_'))='pro' ORDER BY id LIMIT 1"
    )).rows[0];
    const stamp=String(Date.now());
    if(!plan){
      plan=(await pool.query(
        "INSERT INTO membership_plans(name,description,price,duration_days,is_active,plan_group,plan_type,billing_period,billing_months,monthly_base_price,discount_percent) VALUES($1,$2,100,30,TRUE,'grow','pro','monthly',1,100,0) RETURNING id",
        ['CI Expert Directory GROW '+stamp,'Temporary CI-only Pro plan']
      )).rows[0];
      createdPlanId=plan.id;
    }

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

    const olderVideo=(await pool.query(
      "INSERT INTO business_profile_projects(business_profile_id,title,video_url,video_published_at,is_published,sort_order) VALUES($1,$2,$3,CURRENT_TIMESTAMP-INTERVAL '2 days',TRUE,0) RETURNING id",
      [subscribed.profileId,'Older runtime video','https://cdn.example.test/older.mp4']
    )).rows[0];
    const newerVideo=(await pool.query(
      "INSERT INTO business_profile_projects(business_profile_id,title,video_url,video_published_at,is_published,sort_order) VALUES($1,$2,$3,CURRENT_TIMESTAMP-INTERVAL '1 hour',TRUE,1) RETURNING id",
      [subscribed.profileId,'Newer runtime video','https://cdn.example.test/newer.mp4']
    )).rows[0];
    let videos=await publicExpertService.listRecentProjectVideos({page:1,pageSize:12});
    const fixtureVideos=videos.data.filter(item=>[olderVideo.id,newerVideo.id].includes(Number(item.project_id)));
    assert.strictEqual(fixtureVideos.length,2,'Eligible published project videos must appear on Projects feed');
    assert.strictEqual(Number(fixtureVideos[0].project_id),newerVideo.id,'Newest project video must appear first');
    assert.strictEqual(Number(fixtureVideos[1].project_id),olderVideo.id,'Older project video must follow newer video');

    await expertDirectoryService.updateBusinessVisibility(null,subscribed.userId,{isHidden:true,isFeatured:false,sortOrder:0});
    list=await publicExpertService.listPublicExperts({search:'Expert Runtime '+stamp,page:1,pageSize:48});
    assert.ok(!list.data.some(item=>Number(item.user_id)===subscribed.userId),'Admin-hidden business must disappear from public Experts');
    detail=await publicExpertService.getPublicExpert(subscribed.profileId);
    assert.strictEqual(detail,null,'Admin-hidden business detail must not be fetchable directly');

    videos=await publicExpertService.listRecentProjectVideos({page:1,pageSize:12});
    assert.ok(!videos.data.some(item=>Number(item.business_profile_id)===subscribed.profileId),'Admin-hidden business videos must disappear from Projects feed');

    console.log('Expert directory subscription runtime checks passed.');
  }finally{
    if(userIds.length)await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[userIds]);
    if(createdPlanId)await pool.query('DELETE FROM membership_plans WHERE id=$1',[createdPlanId]);
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
