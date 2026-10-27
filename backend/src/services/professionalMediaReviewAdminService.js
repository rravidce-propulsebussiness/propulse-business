const pool=require('../config/database');
const image=require('./projectImageService');
const video=require('./projectVideoService');
const plan=require('./projectPlanService');
const referenceItems=`
  SELECT bp.id AS business_profile_id,bp.business_name,p.title AS item_title,
    'photo' AS media_kind,p.cover_image_url AS asset_url
  FROM business_profile_projects p JOIN business_profiles bp ON bp.id=p.business_profile_id
  WHERE p.is_published=TRUE AND COALESCE(p.cover_image_url,'')<>''
  UNION ALL
  SELECT bp.id,bp.business_name,p.title,'photo',photo.value
  FROM business_profile_projects p JOIN business_profiles bp ON bp.id=p.business_profile_id,
    LATERAL jsonb_array_elements_text(COALESCE(p.image_urls,'[]'::jsonb)) photo
  WHERE p.is_published=TRUE
  UNION ALL
  SELECT bp.id,bp.business_name,p.title,'video',p.video_url
  FROM business_profile_projects p JOIN business_profiles bp ON bp.id=p.business_profile_id
  WHERE p.is_published=TRUE AND COALESCE(p.video_url,'')<>''
  UNION ALL
  SELECT bp.id,bp.business_name,p.title,'document',p.plan_url
  FROM business_profile_projects p JOIN business_profiles bp ON bp.id=p.business_profile_id
  WHERE p.is_published=TRUE AND COALESCE(p.plan_url,'')<>''
  UNION ALL
  SELECT bp.id,bp.business_name,p.title,'document',p.brochure_url
  FROM business_profile_projects p JOIN business_profiles bp ON bp.id=p.business_profile_id
  WHERE p.is_published=TRUE AND COALESCE(p.brochure_url,'')<>''
  UNION ALL
  SELECT bp.id,bp.business_name,p.title,'document',p.brochure_url
  FROM business_profile_service_plans p JOIN business_profiles bp ON bp.id=p.business_profile_id
  WHERE p.is_published=TRUE AND COALESCE(p.brochure_url,'')<>''
  UNION ALL
  SELECT bp.id,bp.business_name,p.title,'document',p.file_url
  FROM business_profile_brochures p JOIN business_profiles bp ON bp.id=p.business_profile_id
  WHERE p.is_published=TRUE AND COALESCE(p.file_url,'')<>''
`;
async function list(){
  const {rows}=await pool.query(`
    WITH assets AS (${referenceItems})
    SELECT a.business_profile_id,a.business_name,
      MIN(a.item_title) AS item_title,a.media_kind,a.asset_url,
      (rev.approved_at IS NOT NULL) AS approved,rev.approved_at
    FROM assets a
    LEFT JOIN public_professional_media_approvals rev
      ON rev.business_profile_id=a.business_profile_id AND rev.asset_url=a.asset_url
    WHERE COALESCE(a.asset_url,'')<>''
    GROUP BY a.business_profile_id,a.business_name,a.media_kind,a.asset_url,rev.approved_at
    ORDER BY (rev.approved_at IS NOT NULL) ASC,a.business_name,a.media_kind
    LIMIT 250`);
  return Promise.all(rows.map(async row=>{
    const fn=row.media_kind==='video'?video.displayUrl:
      row.media_kind==='photo'?image.displayUrl:plan.displayUrl;
    const previewUrl=await fn(row.asset_url).catch(()=>null);
    return {...row,preview_url:previewUrl};
  }));
}
async function update(adminId,{businessProfileId,assetUrl,approved,privacyReviewed}={}){
  const company=Number(businessProfileId),url=String(assetUrl||'');
  if(!Number.isSafeInteger(company)||company<1||!url||url.length>2048||typeof approved!=='boolean')
    throw Object.assign(new Error('Invalid media review'),{code:'INVALID_MEDIA_REVIEW'});
  if(approved&&privacyReviewed!==true)
    throw Object.assign(new Error('Confirm manual inspection of visible, spoken and embedded contact details'),{code:'MEDIA_REVIEW_REQUIRED'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const found=await client.query(`WITH assets AS (${referenceItems})
      SELECT 1 FROM assets WHERE business_profile_id=$1 AND asset_url=$2 LIMIT 1`,[company,url]);
    if(!found.rowCount)throw Object.assign(new Error('This asset is no longer published by that business'),{code:'MEDIA_REVIEW_NOT_FOUND'});
    if(approved){
      await client.query(`INSERT INTO public_professional_media_approvals(business_profile_id,asset_url,approved_by)
        VALUES($1,$2,$3) ON CONFLICT(business_profile_id,asset_url)
        DO UPDATE SET approved_at=NOW(),approved_by=EXCLUDED.approved_by`,[company,url,Number(adminId)]);
    }else{
      await client.query('DELETE FROM public_professional_media_approvals WHERE business_profile_id=$1 AND asset_url=$2',[company,url]);
    }
    await client.query('COMMIT');
    return {approved};
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
}
module.exports={list,update};
