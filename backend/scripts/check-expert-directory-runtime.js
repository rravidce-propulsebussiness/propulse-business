const assert=require('assert');
const pool=require('../src/config/database');
const publicExpertService=require('../src/services/publicExpertService');
const professionalQuoteService=require('../src/services/professionalProjectQuoteService');
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

    const olderProject=(await pool.query(
      "INSERT INTO business_profile_projects(business_profile_id,title,cover_image_url,completion_year,published_at,is_published,sort_order) VALUES($1,$2,$3,EXTRACT(YEAR FROM CURRENT_DATE)::int,CURRENT_TIMESTAMP-INTERVAL '2 days',TRUE,0) RETURNING id",
      [subscribed.profileId,'Older runtime project','https://cdn.example.test/older.jpg']
    )).rows[0];
    const newerProject=(await pool.query(
      "INSERT INTO business_profile_projects(business_profile_id,title,plan_url,completion_year,published_at,is_published,sort_order) VALUES($1,$2,$3,EXTRACT(YEAR FROM CURRENT_DATE)::int,CURRENT_TIMESTAMP-INTERVAL '1 hour',TRUE,1) RETURNING id",
      [subscribed.profileId,'Newer runtime project','https://cdn.example.test/newer.pdf']
    )).rows[0];
    const incomplete=(await pool.query(
      "INSERT INTO business_profile_projects(business_profile_id,title,published_at,is_published,sort_order) VALUES($1,$2,CURRENT_TIMESTAMP,TRUE,2) RETURNING id",
      [subscribed.profileId,'In-progress fixture (no completion year)']
    )).rows[0];
    let projects=await publicExpertService.listRecentProjects({page:1,pageSize:12});
    const fixtureProjects=projects.data.filter(item=>[olderProject.id,newerProject.id].includes(Number(item.project_id)));
    assert.strictEqual(fixtureProjects.length,2,'Eligible published projects must appear on Projects feed even without video');
    assert.ok(!projects.data.some(item=>Number(item.project_id)===incomplete.id),'Projects without a completion year must not be represented as completed');
    assert.strictEqual(await publicExpertService.getPublicProject(incomplete.id),null,'Unfinished direct project details must not be public');
    assert.strictEqual(Number(fixtureProjects[0].project_id),newerProject.id,'Newest completed project must appear first');
    assert.strictEqual(Number(fixtureProjects[1].project_id),olderProject.id,'Older completed project must follow newer project');
    assert.strictEqual(fixtureProjects[0].plan_url,'https://cdn.example.test/newer.pdf','Project plan must be available on the Projects feed when enabled');

    // Exercise the actual SQL INSERT with a business-owned published package:
    // browser mocks cannot catch database schema or INSERT statement failures.
    await pool.query(
      "INSERT INTO business_profile_service_plans(business_profile_id,title,industry,price_from,price_unit,is_published,sort_order) VALUES($1,$2,'construction',1600,'sqft',TRUE,0)",
      [subscribed.profileId,'Standard']
    );
    const posted=await professionalQuoteService.submit(newerProject.id,{
      name:'Directory Runtime Tester',phone:'9876501234',email:'example@example.test',
      requirement:'Interior finishes and kitchen planning for a 3 BHK.',
      siteLocation:'Hyderabad',area:'1650 sq ft',budget:'15 lakh',
      preferredPackage:'Standard',consent:true,marketplaceConsent:true,pincode:'500072',website:'',
    });
    assert.ok(posted.accepted&&posted.requestId,'Published professional quote must persist');
    const quotes=await professionalQuoteService.listForProfessional(subscribed.userId);
    const stored=quotes.find(item=>Number(item.id)===Number(posted.requestId));
    assert.ok(stored,'Professional must receive the quote in their inbox');
    assert.strictEqual(stored.preferred_package,'Standard');
    assert.strictEqual(Number(stored.package_price_from_snapshot),1600);
    assert.strictEqual(stored.package_price_unit_snapshot,'sqft');
    assert.ok(!stored.customer_phone.includes('9876501234'),'Direct customer contact must be masked');
    const duplicate=await professionalQuoteService.submit(newerProject.id,{
      name:'Directory Runtime Tester',phone:'9876501234',
      requirement:'Another finish selection',preferredPackage:'Standard',consent:true,marketplaceConsent:true,pincode:'500072',
    });
    assert.strictEqual(duplicate.duplicate,true,'Duplicate requests in one hour must be deduplicated');

    await expertDirectoryService.updateBusinessVisibility(null,subscribed.userId,{isHidden:true,isFeatured:false,sortOrder:0});
    list=await publicExpertService.listPublicExperts({search:'Expert Runtime '+stamp,page:1,pageSize:48});
    assert.ok(!list.data.some(item=>Number(item.user_id)===subscribed.userId),'Admin-hidden business must disappear from public Experts');
    detail=await publicExpertService.getPublicExpert(subscribed.profileId);
    assert.strictEqual(detail,null,'Admin-hidden business detail must not be fetchable directly');

    projects=await publicExpertService.listRecentProjects({page:1,pageSize:12});
    assert.ok(!projects.data.some(item=>Number(item.business_profile_id)===subscribed.profileId),'Admin-hidden business projects must disappear from Projects feed');

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
