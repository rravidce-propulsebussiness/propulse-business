const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const service=read('backend/src/services/leadEntitlementGrantService.js');
const profile=read('backend/src/services/profileService.js');
const adminService=read('backend/src/services/adminCompletedProjectService.js');
const adminPage=read('frontend/src/admin/pages/AdminCompletedProjects.jsx');
const publicVideoService=read('backend/src/services/publicExpertService.js');
const publicProjectDetail=read('frontend/src/pages/ProjectDetail.jsx');
const publicProjectsPage=read('frontend/src/pages/Projects.jsx');
const reviewService=read('backend/src/services/projectVideoRewardReviewService.js');
const reviewController=read('backend/src/controllers/adminCompletedProjectController.js');
const profileUi=read('frontend/src/pages/Profile.jsx');
const privacyMigration=read('backend/src/database/migrations/20261030_project_video_contact_privacy.sql');
const serverSource=read('backend/src/server.js');
const videoRedactionWorker=read('video-redactor/worker.py');
const videoRedactionMigration=read('backend/src/database/migrations/20261030_zz_project_video_automatic_redaction.sql');
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
assert.match(publicVideoService,/function publicRedactedVideoReadySql\(alias\)/);
const publicGate=publicVideoService.split('function publicRedactedVideoReadySql(alias){')[1].split('function publicProjectVideoColumn')[0];
assert.doesNotMatch(publicGate,/video_reward_status|video_reward_fingerprint|video_privacy_cleared_url|video_reward_reviewed_/,
  'Public playback must never depend on independent lead-credit admin approval');
assert.match(publicGate,/video_redaction_status='ready'/);
assert.match(publicGate,/video_redaction_source_url=\$\{alias\}\.video_url/);
assert.match(publicGate,/video_redacted_url LIKE 'private-object-s3:business-project-redacted\/\%'/,
  'Only successfully processed, private R2 redacted copies may be exposed');
assert.match(publicVideoService,/publicRedactedVideoReadySql\('bpp'\)/,
  'Video-only public listings require a matching successfully processed R2 derivative');
assert.equal((publicVideoService.match(/publicProjectVideoColumn\(/g)||[]).length,5,
  'All four public project/video endpoints must gate video URLs on successfully redacted output');
assert.match(reviewService,/contactDetailsChecked!==true/,
  'Admin video approval requires explicit contact privacy confirmation');
assert.match(reviewService,/video_privacy_cleared_url=\$7/,
  'Review must bind privacy clearance to the exact uploaded video URL');
assert.match(reviewController,/PROJECT_VIDEO_CONTACT_PRIVACY_REQUIRED/,
  'Missing privacy approval must be a user-correctable 400, not 503');
assert.match(adminPage,/I watched the complete processed video/);
assert.match(adminPage,/privacyChecked\[item.id\]===true/);
assert.match(profileUi,/ProPulse automatically detects and masks visible contact details/);
assert.match(serverSource,/app.use\('\/uploads\/business-projects',\(req,res,next\)=>/);
assert.doesNotMatch(serverSource,/if\(access.rows\[0\]\?\.public_access\)return next\(\)/,
  'Raw original videos must never receive unauthenticated public access');
assert.match(serverSource,/requireAuth\(req,res/,
  'Only authenticated owner or admin can preview an uncleared local video');
assert.match(privacyMigration,/ADD COLUMN IF NOT EXISTS video_privacy_cleared_url TEXT/,
  'No older video should be assumed privacy-safe after migration');
assert.match(videoRedactionMigration,/ADD COLUMN IF NOT EXISTS video_redacted_url TEXT/);
assert.match(videoRedactionMigration,/video_reward_status='pending'/,
  'Existing approvals must require re-processing and manual re-review');
assert.match(publicVideoService,/THEN \${alias}\.video_redacted_url ELSE NULL::text END AS video_url/,
  'Public URLs must always refer to the redacted derivative, never original');
assert.match(publicVideoService,/video_redaction_status='ready'/);
assert.doesNotMatch(publicVideoService,/WHEN \$\{contactSafeVideoSql/,
  'Public project status must not rely on admin-reviewed reward eligibility');
assert.match(publicVideoService,/publicProjectVideoStatusColumn\(alias\)/,
  'Public project responses should explain video privacy status without exposing original URLs');
assert.match(publicVideoService,/NULLIF\(\$\{alias\}\.video_url,''\) IS NULL/);
assert.match(publicVideoService,/video_publication_status/,
  'The gallery must be told that an uploaded video is awaiting safe processing');
assert.match(publicVideoService,/video_redaction_status='pending' THEN 'queued'/,
  'Pending videos must not be reported as actively processing');
assert.match(publicVideoService,/video_redaction_status='processing' THEN 'processing'/,
  'A worker-claimed video has a distinct processing state');
assert.match(publicProjectDetail,/Video awaiting privacy processing/,
  'Do not claim an idle queue is masking the video yet');
assert.match(publicProjectsPage,/Video awaiting privacy processing/,
  'Public project cards should distinguish queued and actively masked videos');
assert.match(publicProjectDetail,/project\.videoPublicationStatus==='processing_failed'/,
  'The public project gallery should not say photos are missing when a video is waiting');
assert.match(publicProjectsPage,/videoPublicationStatus:clean\(project\.video_publication_status\)/);
assert.match(publicVideoService,/THEN \$\{alias\}\.video_redacted_url ELSE NULL::text END AS video_url/,
  'The public video URL must remain strictly the approved redacted derivative');

assert.match(publicVideoService,/video_redaction_source_url=\${alias}\.video_url/);
assert.match(reviewService,/PROJECT_VIDEO_REDACTION_NOT_READY/);
assert.match(reviewService,/project.video_redaction_source_url!==project.video_url/);
assert.match(adminService,/video_redaction_status/);
assert.match(profile,/videoRedactionStatus:sameVideo/);
assert.match(profile,/video_redacted_url:item.videoRedactedUrl/);
assert.match(service,/p.video_redaction_status='ready'/);
assert.match(videoRedactionWorker,/detect_contact_boxes/);
assert.match(videoRedactionWorker,/pytesseract.image_to_data/);
assert.match(videoRedactionWorker,/QRCodeDetector/);
assert.match(videoRedactionWorker,/"-an"/, 'All audio must be stripped in v1');
assert.match(videoRedactionWorker,/FOR UPDATE OF p SKIP LOCKED/,
  'The redactor needs a safe single-job claim');
assert.match(videoRedactionWorker,/video_redaction_token=%s/,
  'The redactor must protect against stale job result races');
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
assert.match(adminPage,/Approve lead credit/);
assert.match(adminPage,/Reject lead credit/);
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

// Parse the Python processor and exercise its contact-pattern helper without
// needing OpenCV/R2 installed in the Node test environment.
const pythonCheck=spawnSync('python3',['-c',String.raw`
import ast, re, pathlib
source=pathlib.Path('video-redactor/worker.py').read_text()
tree=ast.parse(source)
ns={'re':re}
for node in tree.body:
    if isinstance(node, ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CONTACT' for t in node.targets):
        exec(compile(ast.Module(body=[node],type_ignores=[]),'worker.py','exec'),ns)
    if isinstance(node, ast.FunctionDef) and node.name=='contains_contact':
        exec(compile(ast.Module(body=[node],type_ignores=[]),'worker.py','exec'),ns)
check=ns['contains_contact']
assert check('+91 98765 43210')
assert check('WhatsApp number available')
assert check('Visit www.example.com')
assert check('mail info@example.com')
assert check('@contractor.handle')
assert not check('Completed 3BHK interior in Uppal, 1250 sq ft')
`],{cwd:root,encoding:'utf8',timeout:5000});
if(!pythonCheck.error){
  assert.equal(pythonCheck.status,0,'Python worker syntax/contact detection regression: '+pythonCheck.stderr);
}else if(pythonCheck.error.code!=='ENOENT'){
  throw pythonCheck.error;
}

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
