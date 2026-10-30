const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const service=read('backend/src/services/leadEntitlementGrantService.js');
const profile=read('backend/src/services/profileService.js');
const adminService=read('backend/src/services/adminCompletedProjectService.js');
const adminPage=read('frontend/src/admin/pages/AdminCompletedProjects.jsx');
const rewardEditor=read('frontend/src/admin/pages/AdminLeadEntitlements.jsx');
const routes=read('backend/src/routes/adminRoutes.js');
const auth=read('backend/src/controllers/authController.js');
const signup=read('backend/src/services/authService.js');
const antiAbuse=read('backend/src/services/signupRewardAntiAbuseService.js');
const migrations=read('backend/src/database/migrations/20261028_zz_project_video_reward_approval.sql')+
 read('backend/src/database/migrations/20261028_zzz_signup_reward_device_ip.sql');

assert.match(service,/p.video_reward_status='approved'/);
assert.match(service,/p.video_reward_approved_url=p.video_url/);
assert.equal((service.match(/p\.video_reward_reviewed_by IS NOT NULL/g)||[]).length,2,
  'Both lazy and bulk project-reward paths require a recorded admin reviewer');
assert.equal((service.match(/p\.video_reward_reviewed_at IS NOT NULL/g)||[]).length,2,
  'Both project-reward paths require a recorded video approval timestamp');
assert.match(rewardEditor,/minCompletedProjects:1,/,
  'New conditional rewards default to one completed project with an approved video');
assert.match(rewardEditor,/Completed projects with approved videos/);
assert.match(rewardEditor,/Pending, rejected, missing or photo-only videos never count/);
assert.match(rewardEditor,/Company verification is separate/,
  'Company verification must not be confused with admin video approval');
assert.match(service,/p.video_reward_fingerprint IS NOT NULL/);
assert.match(service,/project.video_published_at/);
assert.match(service,/p.video_published_at<=u.created_at/);
assert.match(service,/if\(maxRegistrationAge>0&&Number\(campaign.min_completed_projects\|\|0\)===0\)/,
  'Admin approval can occur after the timely video upload deadline');
assert.match(service,/Existing project-award grants must retain their validity/);
assert.match(profile,/sameVideo\?previous.video_reward_status:'pending'/);
assert.match(profile,/video_reward_fingerprint:item.videoRewardFingerprint/);
assert.match(adminService,/video_reward_status=CASE WHEN COALESCE\(video_url/);
assert.match(adminPage,/Approve video/);
assert.match(adminPage,/Reject video/);
assert.match(routes,/projects\/:projectId\/review-video/);
assert.match(migrations,/uq_approved_project_video_fingerprint/);
assert.match(migrations,/signup_reward_device_claims/);
assert.match(migrations,/signup_reward_ip_claims/);
assert.match(migrations,/signup_reward_review_flags/);
assert.match(auth,/rewardDeviceToken\(req,res\)/);
assert.match(auth,/HttpOnly/);
assert.match(signup,/recordSignupIdentity\(client,user.id/);
assert.match(service,/allowAutomaticSignupReward\(client,userId/);
assert.match(antiAbuse,/createHmac\('sha256'/);
assert.doesNotMatch(antiAbuse,/userAgent|localStorage|X-Forwarded-For/);

async function checkContentHash(){
  const s3=require('../src/services/s3PrivateObjectStorageService');
  const reviewer=require('../src/services/projectVideoRewardReviewService');
  const originals={headObject:s3.headObject,getMediaGetUrl:s3.getMediaGetUrl,fetch:global.fetch};
  const video=Buffer.from('0000ftypabcdefgVIDEO-CONTENT-IDENTICAL');
  const now=Date.now();
  const url1=s3.makeReference('business-projects/31-'+now+'-'+('a'.repeat(24))+'.mp4');
  const url2=s3.makeReference('business-projects/31-'+now+'-'+('b'.repeat(24))+'.mp4');
  try{
    s3.headObject=async()=>({size:video.length,contentType:'video/mp4'});
    s3.getMediaGetUrl=async()=> 'https://storage.example.test/video';
    global.fetch=async()=>new Response(video,{status:200,headers:{'content-type':'video/mp4'}});
    const first=await reviewer.videoContentFingerprint(31,url1);
    const second=await reviewer.videoContentFingerprint(31,url2);
    assert.equal(first.fingerprint,second.fingerprint,'Changing video filename cannot bypass exact-content dedupe');
    assert.equal(first.fingerprintMode,'full');
    await assert.rejects(()=>reviewer.videoContentFingerprint(31,'https://youtube.com/watch?v=123'),/directly uploaded/);
  }finally{
    s3.headObject=originals.headObject;
    s3.getMediaGetUrl=originals.getMediaGetUrl;
    global.fetch=originals.fetch;
  }
}
checkContentHash().then(()=>console.log('Approved-video reward and repeat-signup defenses passed'))
 .catch(error=>{console.error(error);process.exitCode=1});
