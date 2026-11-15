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
  let meta;
  try{meta=await s3.headObject(managed.key)}
  catch(error){
    console.error('Project video credit review could not inspect the source object:',error.message);
    throw invalid('Private video storage could not verify the original upload. The review remains pending; retry after storage is available.','PROJECT_VIDEO_STORAGE_UNAVAILABLE');
  }
  if(!meta||meta.size<12)throw invalid('Video file could not be verified in private storage.');
  const digest=crypto.createHash('sha256');
  const full=meta.size<=128*1024*1024;
  digest.update(full?'FULL-SHA256:v1:':'RANGE-SHA256:v1:'+meta.size+':');
  let link;
  try{link=await s3.getMediaGetUrl(reference,{expiresSeconds:3600})}
  catch(error){
    console.error('Project video credit review could not sign the source object:',error.message);
    throw invalid('Private video storage could not open the original upload. The review remains pending; retry after storage is available.','PROJECT_VIDEO_STORAGE_UNAVAILABLE');
  }
  const ranges=full?[[0,meta.size-1]]:[
    [0,Math.min(meta.size-1,1024*1024-1)],
    [Math.max(0,Math.floor(meta.size/2)-512*1024),Math.min(meta.size-1,Math.floor(meta.size/2)+512*1024-1)],
    [Math.max(0,meta.size-1024*1024),meta.size-1]
  ];
  for(const [start,end] of ranges){
    const abort=new AbortController();
    const timeout=setTimeout(()=>abort.abort(),120000);timeout.unref?.();
    try{
      let response;
      try{response=await fetch(link,{headers:full?{}:{Range:`bytes=${start}-${end}`},signal:abort.signal})}
      catch(error){
        console.error('Project video source fingerprint read failed:',error.message);
        throw invalid('Private video storage could not read the original upload. The review remains pending; retry after storage is available.','PROJECT_VIDEO_STORAGE_UNAVAILABLE');
      }
      if(response.status!==(full?200:206))
        throw invalid('Private video storage refused the source verification request. The review remains pending; retry after storage is available.','PROJECT_VIDEO_STORAGE_UNAVAILABLE');
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
    let newGrants=[],grantRetryPending=false;
    if(decision==='approve'){
      try{newGrants=await ensureProjectQualifiedCampaignGrants(project.user_id)}
      catch(error){grantRetryPending=true;console.error('Video approved, but automatic reward grant retry failed:',error.message)}
    }
    const grantTotals=decision==='approve'?(await pool.query(`
      SELECT COUNT(*)::int AS active_grant_count,
        COALESCE(SUM(g.shared_quantity),0)::int AS active_shared_quantity,
        COALESCE(SUM(g.premium_quantity),0)::int AS active_premium_quantity
      FROM lead_entitlement_grants g
      JOIN lead_entitlement_business_campaigns c ON c.id=g.campaign_id
      WHERE g.user_id=$1 AND g.source='campaign' AND c.min_completed_projects>0
        AND c.registration_scope='new_registration' AND g.revoked_at IS NULL
        AND g.starts_at<=CURRENT_TIMESTAMP AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP)
    `,[project.user_id])).rows[0]:null;
    return{
      ...saved.rows[0],
      fingerprintMode:digest?.fingerprintMode||null,
      grantSummary:decision==='approve'?{
        status:grantRetryPending?'retry_pending':Number(grantTotals?.active_grant_count)>0?'active':'no_new_grant',
        newGrantCount:newGrants.length,
        activeGrantCount:Number(grantTotals?.active_grant_count)||0,
        activeSharedQuantity:Number(grantTotals?.active_shared_quantity)||0,
        activePremiumQuantity:Number(grantTotals?.active_premium_quantity)||0,
      }:null,
    };
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    if(error.code==='23505'&&error.constraint==='uq_approved_project_video_fingerprint')
      throw invalid('Duplicate video detected: these video bytes were already approved for another project. Check the original project before issuing any reward.','DUPLICATE_REWARD_VIDEO');
    throw error;
  }finally{client.release()}
}

module.exports={videoContentFingerprint,review};
