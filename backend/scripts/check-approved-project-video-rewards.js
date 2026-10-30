const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const service=read('backend/src/services/leadEntitlementGrantService.js');
const profile=read('backend/src/services/profileService.js');
const adminService=read('backend/src/services/adminCompletedProjectService.js');
const adminPage=read('frontend/src/admin/pages/AdminCompletedProjects.jsx');
const publicVideoService=read('backend/src/services/publicExpertService.js');
const reviewService=read('backend/src/services/projectVideoRewardReviewService.js');
const reviewController=read('backend/src/controllers/adminCompletedProjectController.js');
const profileUi=read('frontend/src/pages/Profile.jsx');
const privacyMigration=read('backend/src/database/migrations/20261030_project_video_contact_privacy.sql');
const rewardEditor=read('frontend/src/admin/pages/AdminLeadEntitlements.jsx');
const routes=read('backend/src/routes/adminRoutes.js');
const auth=read('backend/src/controllers/authController.js');
const signup=read('backend/src/services/authService.js');
const antiAbuse=read('backend/src/services/signupRewardAntiAbuseService.js');
const migrations=read('backend/src/database/migrations/20261028_zz_project_video_reward_approval.sql')+
 read('backend/src/database/migrations/20261028_zzz_signup_reward_device_ip.sql');

assert.match(service,/p.video_reward_status='approved'/);
assert.match(service,/p.video_reward_approved_url=p.video_url/);
assert.equal((service.match(/p\.video_privacy_cleared_url=p\.video_url/g)||[]).length,2,
  'Both lazy and bulk lead-reward paths must require contact privacy clearance');
assert.match(publicVideoService,/function contactSafeVideoSql\(alias\)/);
assert.match(publicVideoService,/video_privacy_cleared_url=\$\{alias\}\.video_url/);
assert.match(publicVideoService,/contactSafeVideoSql\('bpp'\)/,
  'Video-only public listings must filter out uncleared uploads');
assert.equal((publicVideoService.match(/publicProjectVideoColumn\(/g)||[]).length,5,
  'All four public project/video endpoints must gate video URL disclosure');
assert.match(reviewService,/contactDetailsChecked!==true/,
  'Admin video approval requires explicit contact privacy confirmation');
assert.match(reviewService,/video_privacy_cleared_url=\$7/,
  'Review must bind privacy clearance to the exact uploaded video URL');
assert.match(reviewController,/PROJECT_VIDEO_CONTACT_PRIVACY_REQUIRED/,
  'Missing privacy approval must be a user-correctable 400, not 503');
assert.match(adminPage,/I watched this complete video/);
assert.match(adminPage,/privacyChecked\[item.id\]===true/);
assert.match(profileUi,/Before uploading, remove all visible or spoken phone numbers/);
assert.match(privacyMigration,/ADD COLUMN IF NOT EXISTS video_privacy_cleared_url TEXT/,
  'No older video should be assumed privacy-safe after migration');
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
assert.match(profile,/videoPrivacyClearedUrl:sameVideo\?previous.video_privacy_cleared_url:null/,
  'Project edits must preserve privacy clearance only for the unchanged video');
assert.match(profile,/video_privacy_cleared_url:item.videoPrivacyClearedUrl/,
  'Profile full-row reinsertion must persist privacy clearance');

assert.match(profile,/video_reward_fingerprint:item.videoRewardFingerprint/);
assert.match(adminService,/video_reward_status=CASE WHEN COALESCE\(video_url/);
assert.match(adminPage,/Approve & release video/);
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
async function checkPrivacyConfirmation(){
  const reviewer=require('../src/services/projectVideoRewardReviewService');
  await assert.rejects(
    ()=>reviewer.review(1,1,{decision:'approve',contactDetailsChecked:false}),
    error=>error.code==='PROJECT_VIDEO_CONTACT_PRIVACY_REQUIRED',
    'An unconfirmed review must be blocked before any database or R2 access'
  );
}
Promise.all([checkContentHash(),checkPrivacyConfirmation()])
  .then(()=>console.log('Approved-video reward, contact privacy and repeat-signup defenses passed'))
 .catch(error=>{console.error(error);process.exitCode=1});
