const pool=require('../config/database');

function toPositiveInt(value,fallback,max=100){
  const parsed=Number.parseInt(value,10);
  if(!Number.isInteger(parsed)||parsed<1)return fallback;
  return Math.min(parsed,max);
}

function normalizeGroups(value){
  const items=Array.isArray(value)?value:[];
  return [...new Set(items.map(item=>String(item||'').trim().toLowerCase()).filter(Boolean))];
}

async function getSettings(client=pool){
  const result=await client.query(
    "SELECT id,directory_enabled,require_active_membership,require_verified,allowed_plan_groups,show_projects,show_videos,show_plans,updated_by,updated_at FROM expert_directory_settings WHERE id=1"
  );
  if(!result.rows.length){
    await client.query("INSERT INTO expert_directory_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING");
    return getSettings(client);
  }
  const row=result.rows[0];
  return {
    id:row.id,
    directoryEnabled:Boolean(row.directory_enabled),
    requireActiveMembership:Boolean(row.require_active_membership),
    requireVerified:Boolean(row.require_verified),
    allowedPlanGroups:normalizeGroups(row.allowed_plan_groups),
    showProjects:Boolean(row.show_projects),
    showVideos:Boolean(row.show_videos),
    showPlans:Boolean(row.show_plans),
    updatedBy:row.updated_by||null,
    updatedAt:row.updated_at||null,
  };
}

async function updateSettings(actorId,payload={}){
  const allowedPlanGroups=normalizeGroups(payload.allowedPlanGroups);
  if(payload.requireActiveMembership!==false&&!allowedPlanGroups.length){
    const error=new Error('Select at least one membership plan group');
    error.code='EXPERT_DIRECTORY_PLAN_REQUIRED';
    throw error;
  }
  const result=await pool.query(
    `UPDATE expert_directory_settings
     SET directory_enabled=$1,
         require_active_membership=$2,
         require_verified=$3,
         allowed_plan_groups=$4::jsonb,
         show_projects=$5,
         show_videos=$6,
         show_plans=$7,
         updated_by=$8,
         updated_at=CURRENT_TIMESTAMP
     WHERE id=1
     RETURNING id`,
    [
      payload.directoryEnabled!==false,
      payload.requireActiveMembership!==false,
      payload.requireVerified===true,
      JSON.stringify(allowedPlanGroups),
      payload.showProjects!==false,
      payload.showVideos!==false,
      payload.showPlans!==false,
      actorId||null,
    ]
  );
  if(!result.rows.length){
    await pool.query("INSERT INTO expert_directory_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING");
    return updateSettings(actorId,payload);
  }
  return getSettings();
}

async function getUserDirectoryStatus(userId,client=pool){
  const settings=await getSettings(client);
  const result=await client.query(
    `SELECT
       u.id,
       u.is_active,
       bp.id AS business_profile_id,
       COALESCE(bp.public_profile_enabled,TRUE) AS public_profile_enabled,
       EXISTS(
         SELECT 1 FROM company_proof_documents cpd
         WHERE cpd.user_id=u.id AND cpd.status='verified'
       ) AS is_verified,
       mem.plan_group,
       mem.plan_name,
       mem.expires_at,
       COALESCE(beds.is_hidden,FALSE) AS is_hidden,
       COALESCE(beds.is_featured,FALSE) AS is_featured,
       COALESCE(beds.sort_order,0) AS sort_order
     FROM users u
     LEFT JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     LEFT JOIN LATERAL (
       SELECT
         CASE WHEN LOWER(COALESCE(mp.plan_group,''))='scale' THEN 'scale' ELSE 'grow' END AS plan_group,
         mp.name AS plan_name,
         m.expires_at
       FROM memberships m
       JOIN membership_plans mp ON mp.id=m.membership_plan_id
       WHERE m.user_id=u.id
         AND m.status='active'
         AND m.starts_at<=CURRENT_TIMESTAMP
         AND m.expires_at>CURRENT_TIMESTAMP
         AND mp.is_active=TRUE
         AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
       ORDER BY m.expires_at DESC,m.id DESC
       LIMIT 1
     ) mem ON TRUE
     WHERE u.id=$1 AND u.role='business'`,
    [userId]
  );
  const row=result.rows[0];
  if(!row)return {eligible:false,reason:'not_business',settings};
  let eligible=settings.directoryEnabled
    &&Boolean(row.is_active)
    &&Boolean(row.business_profile_id)
    &&Boolean(row.public_profile_enabled)
    &&!Boolean(row.is_hidden);
  let reason=eligible?'eligible':'profile_hidden';
  if(eligible&&settings.requireVerified&&!row.is_verified){eligible=false;reason='verification_required';}
  if(eligible&&settings.requireActiveMembership){
    const allowed=new Set(settings.allowedPlanGroups);
    if(!row.plan_group||!allowed.has(String(row.plan_group).toLowerCase())){eligible=false;reason='membership_required';}
  }
  if(!settings.directoryEnabled){eligible=false;reason='directory_disabled';}
  return {
    eligible,
    reason,
    isVerified:Boolean(row.is_verified),
    membership:row.plan_group?{planGroup:row.plan_group,planName:row.plan_name,expiresAt:row.expires_at}:null,
    isHidden:Boolean(row.is_hidden),
    isFeatured:Boolean(row.is_featured),
    sortOrder:Number(row.sort_order||0),
    publicProfileEnabled:Boolean(row.public_profile_enabled),
    settings,
  };
}

async function getOverview(){
  const settings=await getSettings();
  const stats=(await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE u.role='business' AND u.is_active=TRUE)::int AS active_businesses,
       COUNT(*) FILTER (
         WHERE u.role='business' AND u.is_active=TRUE AND EXISTS(
           SELECT 1 FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id
           WHERE m.user_id=u.id AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>CURRENT_TIMESTAMP
             AND mp.is_active=TRUE AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
         )
       )::int AS subscribed_businesses,
       COUNT(*) FILTER (
         WHERE u.role='business' AND EXISTS(
           SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified'
         )
       )::int AS verified_businesses,
       COUNT(*) FILTER (
         WHERE u.role='business' AND COALESCE(beds.is_featured,FALSE)=TRUE
       )::int AS featured_businesses,
       COUNT(*) FILTER (
         WHERE u.role='business' AND COALESCE(beds.is_hidden,FALSE)=TRUE
       )::int AS hidden_businesses
     FROM users u
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id`
  )).rows[0]||{};
  const groups=(await pool.query(
    `SELECT DISTINCT CASE WHEN LOWER(COALESCE(plan_group,''))='scale' THEN 'scale' ELSE 'grow' END AS plan_group
     FROM membership_plans
     WHERE is_active=TRUE AND LOWER(REPLACE(COALESCE(plan_type,''),'-','_'))='pro'
     ORDER BY 1`
  )).rows.map(row=>row.plan_group);
  return {settings,stats,availablePlanGroups:groups.length?groups:['grow','scale']};
}

async function listBusinesses({search='',page=1,pageSize=50}={}){
  const currentPage=toPositiveInt(page,1,100000);
  const currentPageSize=toPositiveInt(pageSize,50,100);
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=["u.role='business'"];
  const cleanSearch=String(search||'').trim();
  if(cleanSearch){
    params.push('%'+cleanSearch+'%');
    const n=params.length;
    conditions.push(`(u.name ILIKE $${n} OR u.email ILIKE $${n} OR COALESCE(bp.business_name,'') ILIKE $${n})`);
  }
  const where='WHERE '+conditions.join(' AND ');
  const count=Number((await pool.query(`SELECT COUNT(*)::int AS total FROM users u LEFT JOIN business_profiles bp ON bp.user_id=u.id ${where}`,params)).rows[0]?.total||0);
  const result=await pool.query(
    `SELECT
       u.id,u.name,u.email,u.is_active,u.created_at,
       bp.business_name,bp.public_headline,bp.public_profile_enabled,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       mem.plan_group,mem.plan_name,mem.expires_at,
       COALESCE(beds.is_hidden,FALSE) AS is_hidden,
       COALESCE(beds.is_featured,FALSE) AS is_featured,
       COALESCE(beds.sort_order,0) AS sort_order,
       (SELECT COUNT(*)::int FROM business_profile_projects bpp WHERE bpp.business_profile_id=bp.id AND bpp.is_published=TRUE) AS project_count,
       (SELECT COUNT(*)::int FROM business_profile_service_plans bspp WHERE bspp.business_profile_id=bp.id AND bspp.is_published=TRUE) AS plan_count
     FROM users u
     LEFT JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     LEFT JOIN LATERAL (
       SELECT CASE WHEN LOWER(COALESCE(mp.plan_group,''))='scale' THEN 'scale' ELSE 'grow' END AS plan_group,
              mp.name AS plan_name,m.expires_at
       FROM memberships m
       JOIN membership_plans mp ON mp.id=m.membership_plan_id
       WHERE m.user_id=u.id AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>CURRENT_TIMESTAMP
         AND mp.is_active=TRUE AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
       ORDER BY m.expires_at DESC,m.id DESC
       LIMIT 1
     ) mem ON TRUE
     ${where}
     ORDER BY COALESCE(beds.is_featured,FALSE) DESC,COALESCE(beds.sort_order,0) DESC,u.created_at DESC,u.id DESC
     LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params,currentPageSize,offset]
  );
  const settings=await getSettings();
  const allowed=new Set(settings.allowedPlanGroups);
  const data=result.rows.map(row=>{
    let eligible=settings.directoryEnabled&&row.is_active&&row.business_name&&row.public_profile_enabled&&!row.is_hidden;
    if(eligible&&settings.requireVerified&&!row.is_verified)eligible=false;
    if(eligible&&settings.requireActiveMembership&&!allowed.has(String(row.plan_group||'').toLowerCase()))eligible=false;
    return {...row,eligible_by_rule:Boolean(eligible)};
  });
  return {
    data,
    pagination:{
      page:currentPage,pageSize:currentPageSize,total:count,
      totalPages:count?Math.ceil(count/currentPageSize):0,
      hasNextPage:currentPage*currentPageSize<count,
      hasPreviousPage:currentPage>1&&count>0,
    }
  };
}

async function updateBusinessVisibility(actorId,userId,payload={}){
  const normalizedUserId=Number(userId);
  if(!Number.isInteger(normalizedUserId)||normalizedUserId<=0){
    const error=new Error('Invalid business user');
    error.code='INVALID_EXPERT_BUSINESS';
    throw error;
  }
  const exists=await pool.query("SELECT id FROM users WHERE id=$1 AND role='business'",[normalizedUserId]);
  if(!exists.rows.length){
    const error=new Error('Business user not found');
    error.code='EXPERT_BUSINESS_NOT_FOUND';
    throw error;
  }
  const sortOrder=Number.parseInt(payload.sortOrder??0,10);
  if(!Number.isInteger(sortOrder)||sortOrder<-10000||sortOrder>10000){
    const error=new Error('Sort order must be between -10000 and 10000');
    error.code='INVALID_EXPERT_SORT_ORDER';
    throw error;
  }
  const result=await pool.query(
    `INSERT INTO business_expert_directory_settings(user_id,is_featured,is_hidden,sort_order,updated_by)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(user_id) DO UPDATE
     SET is_featured=EXCLUDED.is_featured,
         is_hidden=EXCLUDED.is_hidden,
         sort_order=EXCLUDED.sort_order,
         updated_by=EXCLUDED.updated_by,
         updated_at=CURRENT_TIMESTAMP
     RETURNING user_id,is_featured,is_hidden,sort_order,updated_by,updated_at`,
    [normalizedUserId,payload.isFeatured===true,payload.isHidden===true,sortOrder,actorId||null]
  );
  return result.rows[0];
}

module.exports={
  getSettings,
  updateSettings,
  getUserDirectoryStatus,
  getOverview,
  listBusinesses,
  updateBusinessVisibility,
};