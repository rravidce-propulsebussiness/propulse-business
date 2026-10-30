const crypto=require('node:crypto');
const pool=require('../config/database');
const s3=require('./s3PrivateObjectStorageService');
const videos=require('./projectVideoService');
const {ensureProjectQualifiedCampaignGrants}=require('./leadEntitlementGrantService');

function invalid(message,code='INVALID_PROJECT_VIDEO_REVIEW'){
  return Object.assign(new Error(message),{code});
}

// Hash bytes rather than object keys, filenames, or a URL. Large R2 objects
// are sampled at beginning/middle/end to avoid moving multi-GB files to Node.
// A sampled match is a duplicate flag, not proof that re-encoded videos match.
async function videoContentFingerprint(userId,reference){
  const managed=videos.managedVideoInfo(userId,reference);
  if(!managed||managed.provider!=='s3')
    throw invalid('A directly uploaded ProPulse project video is required for reward approval. External video links are not eligible.');
  const meta=await s3.headObject(managed.key);
  if(!meta||meta.size<12)throw invalid('Video file could not be verified in private storage.');
  const digest=crypto.createHash('sha256');
  const full=meta.size<=128*1024*1024;
  digest.update(full?'FULL-SHA256:v1:':'RANGE-SHA256:v1:'+meta.size+':');
  const link=await s3.getMediaGetUrl(reference,{expiresSeconds:3600});
  const ranges=full?[[0,meta.size-1]]:[
    [0,Math.min(meta.size-1,1024*1024-1)],
    [Math.max(0,Math.floor(meta.size/2)-512*1024),Math.min(meta.size-1,Math.floor(meta.size/2)+512*1024-1)],
    [Math.max(0,meta.size-1024*1024),meta.size-1]
  ];
  for(const [start,end] of ranges){
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),120000);timeout.unref?.();
    try{
      const response=await fetch(link,{headers:full?{}:{Range:`bytes=${start}-${end}`},signal:abort.signal});
      if(response.status!==(full?200:206))throw invalid('R2 refused the video content verification request.');
      if(!response.body)throw invalid('R2 returned an empty video stream.');
      let length=0;
      for await(const chunk of response.body){
        length+=chunk.length;
        if(length> (full?meta.size:1024*1024+4096))throw invalid('Video content exceeded verification bounds.');
        digest.update(chunk);
      }
      if(length!==(end-start+1))throw invalid('Video content changed during verification; upload it again.');
    }finally{clearTimeout(timeout)}
  }
  return{fingerprint:digest.digest('hex'),fingerprintMode:full?'full':'sampled',size:meta.size};
}

async function review(projectId,adminId,{decision,note,contactDetailsChecked=false}={}){
  const id=Number(projectId);
  if(!Number.isSafeInteger(id)||id<1)throw invalid('Invalid project identifier');
  if(!['approve','reject'].includes(decision))throw invalid('Choose Approve or Reject.');
  const safeNote=String(note||'').trim().slice(0,1000);
  if(decision==='reject'&&!safeNote)throw invalid('Give the business a reason for rejection.');
  if(decision==='approve'&&contactDetailsChecked!==true)
    throw invalid('Before approving lead-credit rewards, watch the processed video, confirm genuine completed work and no unmasked direct contact details. Reject the lead-credit claim if verification fails.','PROJECT_VIDEO_CONTACT_PRIVACY_REQUIRED');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const result=await client.query(`
      SELECT p.*,bp.user_id FROM business_profile_projects p
      JOIN business_profiles bp ON bp.id=p.business_profile_id
      WHERE p.id=$1 FOR UPDATE OF p
    `,[id]);
    const project=result.rows[0];
    if(!project)throw invalid('Project not found','COMPLETED_PROJECT_NOT_FOUND');
    if(decision==='approve'&&(!project.is_published||!project.completion_year||!project.video_url))
      throw invalid('Publish a completed project with an uploaded video before approval.');
    if(decision==='approve'&&(
      project.video_redaction_status!=='ready'
      ||project.video_redaction_source_url!==project.video_url
      ||!project.video_redacted_url
      ||!String(project.video_redacted_url).startsWith('private-object-s3:business-project-redacted/')
    ))throw invalid('Automatic video redaction must complete before lead-credit review. Check processing status or upload a corrected video.','PROJECT_VIDEO_REDACTION_NOT_READY');
    if(decision==='approve'){
      const redactedKey=s3.parseReference(project.video_redacted_url);
      if(!await s3.headObject(redactedKey))
        throw invalid('The processed video is missing from private storage. Reprocess before lead-credit approval.','PROJECT_VIDEO_REDACTION_NOT_READY');
    }
    const digest=decision==='approve'?await videoContentFingerprint(project.user_id,project.video_url):null;
    const saved=await client.query(`
      UPDATE business_profile_projects SET
        video_reward_status=$2,video_reward_fingerprint=$3,
        video_reward_approved_url=$4,video_reward_reviewed_by=$5,
        video_reward_reviewed_at=CURRENT_TIMESTAMP,video_reward_review_note=$6,
        video_privacy_cleared_url=$7
      WHERE id=$1 RETURNING id,video_reward_status,video_reward_fingerprint,video_reward_review_note
    `,[id,decision==='approve'?'approved':'rejected',digest?.fingerprint||null,
      decision==='approve'?project.video_url:null,adminId,safeNote||null,
      decision==='approve'&&contactDetailsChecked===true?project.video_url:null]);
    await client.query('COMMIT');
    if(decision==='approve')await ensureProjectQualifiedCampaignGrants(project.user_id).catch(error=>{
      console.error('Video approved, but automatic reward grant retry failed:',error.message);
    });
    return{...saved.rows[0],fingerprintMode:digest?.fingerprintMode||null};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    if(error.code==='23505'&&error.constraint==='uq_approved_project_video_fingerprint')
      throw invalid('Duplicate video detected: these video bytes were already approved for another project. Check the original project before issuing any reward.','DUPLICATE_REWARD_VIDEO');
    throw error;
  }finally{client.release()}
}

module.exports={videoContentFingerprint,review};
