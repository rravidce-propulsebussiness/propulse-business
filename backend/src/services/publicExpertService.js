const pool=require('../config/database');
const expertDirectoryService=require('./expertDirectoryService');
const projectVideoService=require('./projectVideoService');
const projectPlanService=require('./projectPlanService');
const projectImageService=require('./projectImageService');
const videoSeo=require('./projectVideoSeoService');
const brochureService=require('./brochureService');

// Public video playback depends on a completed, source-matched redacted copy,
// NOT the independent admin decision about project-based lead-credit rewards.
// Never return original uploads or failed/unprocessed derivatives.
function publicRedactedVideoReadySql(alias){
  return `${alias}.video_redaction_status='ready'
    AND NULLIF(${alias}.video_url,'') IS NOT NULL
    AND ${alias}.video_redaction_source_url=${alias}.video_url
    AND ${alias}.video_redacted_url LIKE 'private-object-s3:business-project-redacted/%'`;
}
function publicProjectVideoColumn(alias,officialOnly=false){
  return `CASE WHEN ${officialOnly?"COALESCE(beds.is_official,FALSE) AND ":''}${publicRedactedVideoReadySql(alias)} THEN ${alias}.video_redacted_url ELSE NULL::text END AS video_url`;
}

// Public status only; never return the original R2 reference, raw video,
 // processing error detail, or private admin review metadata.
function publicProjectVideoStatusColumn(alias,officialOnly=false){
  const expression=`CASE
    WHEN ${publicRedactedVideoReadySql(alias)} THEN 'published'
    WHEN NULLIF(${alias}.video_url,'') IS NULL THEN 'none'
    WHEN ${alias}.video_redaction_status='failed' THEN 'processing_failed'
    WHEN ${alias}.video_redaction_status='ready' THEN 'processing_failed'
    WHEN ${alias}.video_redaction_status='pending' THEN 'queued'
    WHEN ${alias}.video_redaction_status='processing' THEN 'processing'
    ELSE 'queued'
  END`;
  return officialOnly
    ? `CASE WHEN COALESCE(beds.is_official,FALSE) THEN (${expression}) ELSE 'disabled' END::text AS video_publication_status`
    : `${expression}::text AS video_publication_status`;
}

function publicProjectThumbnailColumn(alias){
  return `CASE WHEN ${publicRedactedVideoReadySql(alias)}
     AND ${alias}.video_thumbnail_source_url=${alias}.video_url
     AND ${alias}.video_thumbnail_url LIKE 'private-object-s3:business-project-thumbnails/%'
    THEN ${alias}.video_thumbnail_url ELSE NULL::text END AS video_thumbnail_url`;
}

async function materializeProjectMedia(rows){
  return Promise.all((rows||[]).map(async row=>({
    ...row,
    cover_image_url:row.cover_image_url?await projectImageService.displayUrl(row.cover_image_url):row.cover_image_url,
    video_thumbnail_url:videoSeo.thumbnailPath(row),
    video_url:row.video_url?await projectVideoService.displayUrl(row.video_url):row.video_url,
    plan_url:row.plan_url?await projectPlanService.displayUrl(row.plan_url):row.plan_url,
    brochure_url:row.brochure_url?await projectPlanService.displayUrl(row.brochure_url):row.brochure_url,
    image_urls:await Promise.all((row.image_urls||[]).map(url=>projectImageService.displayUrl(url))),
  })));
}

function toPositiveInt(value,fallback,max=100){
  const parsed=Number.parseInt(value,10);
  if(!Number.isInteger(parsed)||parsed<1)return fallback;
  return Math.min(parsed,max);
}

function addEligibilityConditions(settings,params,conditions){
  conditions.push("u.role='business'","u.is_active=TRUE","bp.id IS NOT NULL","COALESCE(TRIM(bp.business_name),'')<>''","COALESCE(bp.public_profile_enabled,TRUE)=TRUE","COALESCE(beds.is_hidden,FALSE)=FALSE");
  if(settings.requireVerified){
    conditions.push("EXISTS(SELECT 1 FROM company_proof_documents cpdv WHERE cpdv.user_id=u.id AND cpdv.status='verified')");
  }
  if(settings.requireActiveMembership){
    params.push(settings.allowedPlanGroups);
    const n=params.length;
    conditions.push(`EXISTS(
      SELECT 1 FROM memberships em
      JOIN membership_plans emp ON emp.id=em.membership_plan_id
      WHERE em.user_id=u.id
        AND em.status='active'
        AND em.starts_at<=CURRENT_TIMESTAMP
        AND em.expires_at>CURRENT_TIMESTAMP
        AND emp.is_active=TRUE
        AND LOWER(REPLACE(COALESCE(emp.plan_type,''),'-','_'))='pro'
        AND CASE WHEN LOWER(COALESCE(emp.plan_group,''))='scale' THEN 'scale' ELSE 'grow' END = ANY($${n}::text[])
    )`);
  }
}

// Official ProPulse work is independent of marketplace membership and directory toggles.
function addProjectEligibilityConditions(settings,params,conditions,{videosOnly=false}={}){
  conditions.push("u.role='business'","u.is_active=TRUE","COALESCE(TRIM(bp.business_name),'')<>''","COALESCE(beds.is_hidden,FALSE)=FALSE");
  const marketplace=[];
  if(!settings.directoryEnabled||!settings.showProjects||(videosOnly&&!settings.showVideos)){
    marketplace.push('FALSE');
  }else{
    marketplace.push("COALESCE(bp.public_profile_enabled,TRUE)=TRUE");
    if(settings.requireVerified){
      marketplace.push("EXISTS(SELECT 1 FROM company_proof_documents cpdv WHERE cpdv.user_id=u.id AND cpdv.status='verified')");
    }
    if(settings.requireActiveMembership){
      params.push(settings.allowedPlanGroups);
      const n=params.length;
      marketplace.push(`EXISTS(
        SELECT 1 FROM memberships em JOIN membership_plans emp ON emp.id=em.membership_plan_id
        WHERE em.user_id=u.id AND em.status='active'
          AND em.starts_at<=CURRENT_TIMESTAMP AND em.expires_at>CURRENT_TIMESTAMP
          AND emp.is_active=TRUE
          AND LOWER(REPLACE(COALESCE(emp.plan_type,''),'-','_'))='pro'
          AND CASE WHEN LOWER(COALESCE(emp.plan_group,''))='scale' THEN 'scale' ELSE 'grow' END = ANY($${n}::text[])
      )`);
    }
  }
  conditions.push(`(COALESCE(beds.is_official,FALSE)=TRUE OR (${marketplace.join(' AND ')}))`);
}

function membershipLateral(){
  return `LEFT JOIN LATERAL (
    SELECT CASE WHEN LOWER(COALESCE(mp.plan_group,''))='scale' THEN 'scale' ELSE 'grow' END AS plan_group,
           mp.name AS plan_name,m.expires_at
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
  ) mem ON TRUE`;
}

async function listPublicExperts({search='',industryId='',cityId='',verified='',page=1,pageSize=12}={}){
  const settings=await expertDirectoryService.getSettings();
  const currentPage=toPositiveInt(page,1,100000);
  const currentPageSize=toPositiveInt(pageSize,12,48);
  if(!settings.directoryEnabled){
    return {data:[],pagination:{page:currentPage,pageSize:currentPageSize,total:0,totalPages:0,hasNextPage:false,hasPreviousPage:false},settings};
  }
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=[];
  addEligibilityConditions(settings,params,conditions);

  const cleanSearch=String(search||'').trim();
  if(cleanSearch){
    params.push('%'+cleanSearch+'%');
    const n=params.length;
    conditions.push(`(
      bp.business_name ILIKE $${n}
      OR COALESCE(bp.public_headline,'') ILIKE $${n}
      OR COALESCE(bp.public_summary,'') ILIKE $${n}
      OR EXISTS(
        SELECT 1
        FROM business_profile_services bpss
        JOIN industries ii ON ii.id=bpss.industry_id
        JOIN services ss ON ss.id=bpss.service_id
        LEFT JOIN subservices sss ON sss.id=bpss.subservice_id
        WHERE bpss.business_profile_id=bp.id AND bpss.is_active=TRUE
          AND (ii.name ILIKE $${n} OR ss.name ILIKE $${n} OR COALESCE(sss.name,'') ILIKE $${n})
      )
      OR EXISTS(
        SELECT 1
        FROM business_profile_locations bpll
        JOIN states stt ON stt.id=bpll.state_id
        JOIN cities cc ON cc.id=bpll.city_id
        LEFT JOIN subcities scc ON scc.id=bpll.subcity_id
        WHERE bpll.business_profile_id=bp.id AND bpll.is_active=TRUE
          AND (stt.name ILIKE $${n} OR cc.name ILIKE $${n} OR COALESCE(scc.name,'') ILIKE $${n})
      )
    )`);
  }

  if(industryId){
    const id=Number(industryId);
    if(Number.isInteger(id)&&id>0){
      params.push(id);
      conditions.push(`EXISTS(SELECT 1 FROM business_profile_services bpsi WHERE bpsi.business_profile_id=bp.id AND bpsi.industry_id=$${params.length} AND bpsi.is_active=TRUE)`);
    }
  }

  if(cityId){
    const id=Number(cityId);
    if(Number.isInteger(id)&&id>0){
      params.push(id);
      conditions.push(`EXISTS(SELECT 1 FROM business_profile_locations bplc WHERE bplc.business_profile_id=bp.id AND bplc.city_id=$${params.length} AND bplc.is_active=TRUE)`);
    }
  }

  const verifiedOnly=String(verified||'').toLowerCase()==='true'||String(verified)==='1';
  if(verifiedOnly){
    conditions.push("EXISTS(SELECT 1 FROM company_proof_documents cpdv2 WHERE cpdv2.user_id=u.id AND cpdv2.status='verified')");
  }

  const whereClause='WHERE '+conditions.join(' AND ');

  const queryParams=[...params,currentPageSize,offset];
  // Count and page rows are independent: run both queries at once.
  const [countResult,result]=await Promise.all([
    pool.query(
    `SELECT COUNT(*)::int AS total
     FROM users u
     JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${whereClause}`,
    params
    ),
    pool.query(
    `SELECT
       u.id AS user_id,
       bp.id AS business_profile_id,
       bp.business_name,
       bp.public_headline,
       COALESCE(NULLIF(bp.public_summary,''),'') AS public_summary,
       bp.years_experience,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       COALESCE(beds.is_featured,FALSE) AS is_featured,
        COALESCE(beds.is_official,FALSE) AS is_official,
       COALESCE(beds.sort_order,0) AS sort_order,
       mem.plan_group,
       (SELECT COUNT(*)::int FROM business_profile_projects bpp WHERE bpp.business_profile_id=bp.id AND bpp.is_published=TRUE AND bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)) AS project_count,
       (SELECT COUNT(*)::int FROM business_profile_service_plans bspp WHERE bspp.business_profile_id=bp.id AND bspp.is_published=TRUE) AS plan_count,
       (SELECT bpp.cover_image_url FROM business_profile_projects bpp WHERE bpp.business_profile_id=bp.id AND bpp.is_published=TRUE AND bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE) AND COALESCE(bpp.cover_image_url,'')<>'' ORDER BY bpp.sort_order,bpp.id LIMIT 1) AS cover_image_url,
       COALESCE((
         SELECT json_agg(json_build_object(
           'industryId',bps.industry_id,'industryName',i.name,
           'serviceId',bps.service_id,'serviceName',s.name,
           'subserviceId',bps.subservice_id,'subserviceName',ss.name
         ) ORDER BY i.name,s.name,ss.name)
         FROM business_profile_services bps
         JOIN industries i ON i.id=bps.industry_id
         JOIN services s ON s.id=bps.service_id
         LEFT JOIN subservices ss ON ss.id=bps.subservice_id
         WHERE bps.business_profile_id=bp.id AND bps.is_active=TRUE
       ),'[]'::json) AS services,
       COALESCE((
         SELECT json_agg(json_build_object(
           'stateId',bpl.state_id,'stateName',st.name,
           'cityId',bpl.city_id,'cityName',c.name,
           'subcityId',bpl.subcity_id,'subcityName',sc.name
         ) ORDER BY st.name,c.name,sc.name)
         FROM business_profile_locations bpl
         JOIN states st ON st.id=bpl.state_id
         JOIN cities c ON c.id=bpl.city_id
         LEFT JOIN subcities sc ON sc.id=bpl.subcity_id
         WHERE bpl.business_profile_id=bp.id AND bpl.is_active=TRUE
       ),'[]'::json) AS locations
     FROM users u
     JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     ${whereClause}
     ORDER BY COALESCE(beds.is_featured,FALSE) DESC,COALESCE(beds.sort_order,0) DESC,
              EXISTS(SELECT 1 FROM company_proof_documents cpdo WHERE cpdo.user_id=u.id AND cpdo.status='verified') DESC,
              u.created_at DESC,u.id DESC
     LIMIT $${queryParams.length-1} OFFSET $${queryParams.length}`,
    queryParams
    ),
  ]);
  const count=countResult.rows[0]?.total||0;

  const publicRows=result.rows.map(row=>({
    ...row,
    project_count:settings.showProjects?Number(row.project_count||0):0,
    plan_count:settings.showPlans?Number(row.plan_count||0):0,
    cover_image_url:settings.showProjects?row.cover_image_url:null,
  }));

  return {
    data:publicRows,
    settings:{
      directoryEnabled:settings.directoryEnabled,
      requireActiveMembership:settings.requireActiveMembership,
      requireVerified:settings.requireVerified,
      allowedPlanGroups:settings.allowedPlanGroups,
      showProjects:settings.showProjects,
      showVideos:settings.showVideos,
      showPlans:settings.showPlans,
    },
    pagination:{
      page:currentPage,pageSize:currentPageSize,total:Number(count||0),
      totalPages:count?Math.ceil(Number(count)/currentPageSize):0,
      hasNextPage:currentPage*currentPageSize<Number(count||0),
      hasPreviousPage:currentPage>1&&Number(count||0)>0,
    },
  };
}

async function listRecentProjectVideos({page=1,pageSize=12}={}){
  const settings=await expertDirectoryService.getSettings();
  const currentPage=toPositiveInt(page,1,100000);
  const currentPageSize=toPositiveInt(pageSize,12,36);
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=["bpp.is_published=TRUE","bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)","COALESCE(bpp.video_url,'')<>''",publicRedactedVideoReadySql('bpp')];
  addProjectEligibilityConditions(settings,params,conditions,{videosOnly:true});
  const where='WHERE '+conditions.join(' AND ');
  const queryParams=[...params];
  // Count and page rows are independent: run both queries at once.
  const [countResult,result]=await Promise.all([
    pool.query(
    `SELECT COUNT(*)::int AS total
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${where}`,
    params
    ),
    pool.query(
    `SELECT
       bpp.id AS project_id,
       bpp.title,
       bpp.seo_slug,bpp.seo_title,bpp.seo_description,bpp.seo_keyword,
       bpp.project_type,
       bpp.description,
       bpp.location_text,
       bpp.completion_year,
       bpp.area_text,
       bpp.budget_text,
       bpp.cover_image_url,
       ${publicProjectVideoColumn('bpp')},
       ${publicProjectThumbnailColumn('bpp')},
       bpp.video_duration_seconds,
       COALESCE(bpp.video_published_at,bpp.created_at) AS video_published_at,
       bp.id AS business_profile_id,
       bp.business_name,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       COALESCE(beds.is_official,FALSE) AS is_official,
       mem.plan_group
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     ${where}
     ORDER BY COALESCE(beds.is_official,FALSE) DESC,COALESCE(bpp.video_published_at,bpp.created_at) DESC,bpp.id DESC
     LIMIT ${currentPageSize} OFFSET ${offset}`,
    queryParams
    ),
  ]);
  const total=Number(countResult.rows[0]?.total||0);
  const data=await materializeProjectMedia(result.rows);
  return {
    data,
    pagination:{
      page:currentPage,
      pageSize:currentPageSize,
      total,
      totalPages:total?Math.ceil(total/currentPageSize):0,
      hasNextPage:currentPage*currentPageSize<total,
      hasPreviousPage:currentPage>1&&total>0,
    },
  };
}

async function listRecentProjects({page=1,pageSize=18,materializeMedia=true}={}){
  const settings=await expertDirectoryService.getSettings();
  const currentPage=toPositiveInt(page,1,100000);
  const currentPageSize=toPositiveInt(pageSize,18,48);
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=["bpp.is_published=TRUE","bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)"];
  addProjectEligibilityConditions(settings,params,conditions);
  const where='WHERE '+conditions.join(' AND ');
  // Count and page rows are independent: run both queries at once.
  const [countResult,result]=await Promise.all([
    pool.query(
    `SELECT COUNT(*)::int AS total
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${where}`,
    params
    ),
    pool.query(
    `SELECT
       bpp.id AS project_id,
       bpp.title,
       bpp.seo_slug,bpp.seo_title,bpp.seo_description,bpp.seo_keyword,
       bpp.project_type,
       bpp.description,
       bpp.location_text,
       bpp.completion_year,
       bpp.area_text,
       bpp.budget_text,
       bpp.cover_image_url,
       bpp.image_urls,
       bpp.package_name,
       bpp.brochure_url,
       ${publicProjectVideoColumn('bpp',!settings.showVideos)},
       ${publicProjectVideoStatusColumn('bpp',!settings.showVideos)},
       ${publicProjectThumbnailColumn('bpp')},
       bpp.video_duration_seconds,
       COALESCE(bpp.video_published_at,bpp.created_at) AS video_published_at,
       ${settings.showPlans?'bpp.plan_url':'NULL::text AS plan_url'},
       COALESCE(bpp.published_at,bpp.video_published_at,bpp.created_at) AS published_at,
       bp.id AS business_profile_id,
       COALESCE(bp.public_profile_enabled,TRUE) AS public_profile_enabled,
       bp.business_name,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       COALESCE(beds.is_official,FALSE) AS is_official,
       mem.plan_group
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     ${where}
     ORDER BY COALESCE(beds.is_official,FALSE) DESC,COALESCE(bpp.published_at,bpp.video_published_at,bpp.created_at) DESC,bpp.id DESC
     LIMIT ${currentPageSize} OFFSET ${offset}`,
    params
    ),
  ]);
  const total=Number(countResult.rows[0]?.total||0);
  const data=materializeMedia?await materializeProjectMedia(result.rows):result.rows;
  return {
    data,
    pagination:{
      page:currentPage,pageSize:currentPageSize,total,
      totalPages:total?Math.ceil(total/currentPageSize):0,
      hasNextPage:currentPage*currentPageSize<total,
      hasPreviousPage:currentPage>1&&total>0,
    },
  };
}

async function getPublicProject(projectId,{materializeMedia=true}={}){
  const value=String(projectId||'').trim();
  const id=/^[1-9]\d*$/.test(value)?Number(value):null;
  const slug=!id&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=100?value:null;
  if(!slug&&(!Number.isSafeInteger(id)||id<=0))return null;
  const settings=await expertDirectoryService.getSettings();
  const params=[slug||id];
  const conditions=[slug?'bpp.seo_slug=$1':'bpp.id=$1','bpp.is_published=TRUE','bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)'];
  addProjectEligibilityConditions(settings,params,conditions);
  const result=await pool.query(
    `SELECT bpp.id AS project_id,bpp.title,bpp.seo_slug,bpp.seo_title,bpp.seo_description,bpp.seo_keyword,bpp.project_type,bpp.description,
      bpp.location_text,bpp.completion_year,bpp.area_text,bpp.budget_text,
      bpp.cover_image_url,bpp.image_urls,bpp.package_name,bpp.brochure_url,
      ${publicProjectVideoColumn('bpp',!settings.showVideos)},
       ${publicProjectVideoStatusColumn('bpp',!settings.showVideos)},
       ${publicProjectThumbnailColumn('bpp')},
       bpp.video_duration_seconds,
       COALESCE(bpp.video_published_at,bpp.created_at) AS video_published_at,
      ${settings.showPlans?'bpp.plan_url':'NULL::text AS plan_url'},
      COALESCE(bpp.published_at,bpp.video_published_at,bpp.created_at) AS published_at,
      bp.id AS business_profile_id,bp.business_name,
      EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
      COALESCE(beds.is_official,FALSE) AS is_official,
      mem.plan_group
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     WHERE ${conditions.join(' AND ')}
     LIMIT 1`,
    params
  );
  const projects=materializeMedia?await materializeProjectMedia(result.rows):result.rows;
  return projects[0]||null;
}

// Video sitemap shares the exact publication/membership rules of public videos.
// Include only source-matched playback derivatives with real generated thumbnails.
async function listIndexableVideoEntries(){
  const settings=await expertDirectoryService.getSettings();
  const params=[];
  const conditions=[
    "bpp.is_published=TRUE",
    "bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)",
    publicRedactedVideoReadySql('bpp'),
    "bpp.video_thumbnail_source_url=bpp.video_url",
    "bpp.video_thumbnail_url LIKE 'private-object-s3:business-project-thumbnails/%'",
    "COALESCE(bpp.video_published_at,bpp.published_at) IS NOT NULL"
  ];
  addProjectEligibilityConditions(settings,params,conditions,{videosOnly:true});
  const result=await pool.query(
    `SELECT bpp.id AS project_id,bpp.seo_slug,bpp.title,bpp.seo_title,
       bpp.description,bpp.seo_description,bpp.video_redacted_url AS video_url,
       bpp.video_thumbnail_url,bpp.video_duration_seconds,
       COALESCE(bpp.video_published_at,bpp.published_at) AS video_published_at,
       bpp.updated_at,bp.business_name
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY COALESCE(beds.is_official,FALSE) DESC,
       COALESCE(bpp.video_published_at,bpp.published_at) DESC,bpp.id DESC
     LIMIT 5000`,
    params
  );
  return result.rows.map(row=>{
    const video=videoSeo.videoObject(row);
    if(!video)return null;
    const page='/projects/'+videoSeo.projectKey(row);
    const updated=row.updated_at?new Date(row.updated_at):null;
    return {path:page,lastmod:updated&&!Number.isNaN(updated.getTime())?updated.toISOString().slice(0,10):null,video};
  }).filter(Boolean);
}

// Sitemap should list only projects that meet the same public visibility rules
// as their detail pages. No media references or customer information are returned.
async function listIndexableProjectPaths(){
  const settings=await expertDirectoryService.getSettings();
  const params=[];
  const conditions=[
    "bpp.is_published=TRUE",
    "bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)"
  ];
  addProjectEligibilityConditions(settings,params,conditions);
  const result=await pool.query(
    `SELECT bpp.id,bpp.seo_slug,bpp.updated_at
       FROM business_profile_projects bpp
       JOIN business_profiles bp ON bp.id=bpp.business_profile_id
       JOIN users u ON u.id=bp.user_id
       LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(beds.is_official,FALSE) DESC,bpp.updated_at DESC,bpp.id DESC
       LIMIT 5000`,
    params
  );
  return result.rows.map(row=>{
    const slug=String(row.seo_slug||'').trim();
    const path=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=100
      ?'/projects/'+slug
      :'/projects/project-'+row.id;
    const date=row.updated_at?new Date(row.updated_at):null;
    return {path,lastmod:date&&!Number.isNaN(date.getTime())?date.toISOString().slice(0,10):null};
  });
}

// Discoverable public marketplace profiles obey the directory's eligibility
// rules. Hidden/inactive, verification/plan-ineligible and empty profiles are
// excluded from sitemap discovery.
async function listIndexableIndependentProfiles(){
  const settings=await expertDirectoryService.getSettings();
  if(!settings.directoryEnabled)return [];
  const params=[];
  const conditions=["COALESCE(beds.is_official,FALSE)=FALSE"];
  addEligibilityConditions(settings,params,conditions);
  conditions.push("("+[
    "COALESCE(TRIM(bp.public_summary),'')<>''",
    "EXISTS(SELECT 1 FROM business_profile_services bps WHERE bps.business_profile_id=bp.id AND bps.is_active=TRUE)",
    "EXISTS(SELECT 1 FROM business_profile_projects bpp WHERE bpp.business_profile_id=bp.id AND bpp.is_published=TRUE AND bpp.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE))",
  ].join(' OR ')+")");
  const result=await pool.query(
    'SELECT bp.id,bp.updated_at FROM business_profiles bp '+
    'JOIN users u ON u.id=bp.user_id '+
    'LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id '+
    'WHERE '+conditions.join(' AND ')+
    ' ORDER BY bp.updated_at DESC,bp.id DESC LIMIT 4500',params);
  return result.rows.map(row=>{
    const date=row.updated_at?new Date(row.updated_at):null;
    return {path:'/experts/'+row.id,lastmod:date&&!Number.isNaN(date.getTime())?date.toISOString().slice(0,10):null};
  });
}

async function getPublicExpert(expertId){
  const id=Number(expertId);
  if(!Number.isInteger(id)||id<=0)return null;
  const settings=await expertDirectoryService.getSettings();
  const params=[id];
  const conditions=['bp.id=$1','COALESCE(bp.public_profile_enabled,TRUE)=TRUE'];
  // Official ProPulse services are independent of marketplace memberships and
  // directory filters; other profiles still obey every directory requirement.
  addProjectEligibilityConditions(settings,params,conditions);
  // Every detail query is keyed by the profile id, so start them together with
  // the profile lookup instead of waiting for it (each round trip is ~250ms).
  // Projects/videos/plans visibility normally comes from directory settings;
  // only official profiles can widen it, handled in a second pass below.
  const projectsQuery=flags=>pool.query(`SELECT id,seo_slug,title,project_type,description,location_text,completion_year,area_text,budget_text,cover_image_url,image_urls,package_name,${flags.showVideos?publicProjectVideoColumn('business_profile_projects'):'NULL::text AS video_url'},${flags.showVideos?publicProjectVideoStatusColumn('business_profile_projects'):"'disabled'::text AS video_publication_status"},video_published_at,${flags.showPlans?'plan_url':'NULL::text AS plan_url'},brochure_url,sort_order FROM business_profile_projects WHERE business_profile_id=$1 AND is_published=TRUE AND completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE) ORDER BY sort_order,id`,[id]);
  const plansQuery=()=>pool.query(`SELECT id,title,industry,description,price_from,price_unit,duration_label,inclusions,spec_sections,brochure_url,sort_order FROM business_profile_service_plans WHERE business_profile_id=$1 AND is_published=TRUE ORDER BY sort_order,id`,[id]);
  const emptyRows=Promise.resolve({rows:[]});
  const settingsFlags={showProjects:settings.showProjects,showVideos:settings.showVideos,showPlans:settings.showPlans};
  const servicesPromise=pool.query(`SELECT bps.industry_id AS "industryId",i.name AS "industryName",bps.service_id AS "serviceId",s.name AS "serviceName",bps.subservice_id AS "subserviceId",ss.name AS "subserviceName" FROM business_profile_services bps JOIN industries i ON i.id=bps.industry_id JOIN services s ON s.id=bps.service_id LEFT JOIN subservices ss ON ss.id=bps.subservice_id WHERE bps.business_profile_id=$1 AND bps.is_active=TRUE ORDER BY i.name,s.name,ss.name`,[id]);
  const locationsPromise=pool.query(`SELECT bpl.state_id AS "stateId",st.name AS "stateName",bpl.city_id AS "cityId",c.name AS "cityName",bpl.subcity_id AS "subcityId",sc.name AS "subcityName" FROM business_profile_locations bpl JOIN states st ON st.id=bpl.state_id JOIN cities c ON c.id=bpl.city_id LEFT JOIN subcities sc ON sc.id=bpl.subcity_id WHERE bpl.business_profile_id=$1 AND bpl.is_active=TRUE ORDER BY st.name,c.name`,[id]);
  const earlyProjects=settingsFlags.showProjects?projectsQuery(settingsFlags):emptyRows;
  const earlyPlans=settingsFlags.showPlans?plansQuery():emptyRows;
  const brochuresPromise=brochureService.listPublic(id);
  // Attach handlers now so an early failure is never an unhandled rejection
  // while the profile lookup is still running.
  const pending=[servicesPromise,locationsPromise,earlyProjects,earlyPlans,brochuresPromise];
  pending.forEach(promise=>promise.catch(()=>{}));
  const base=(await pool.query(
    `SELECT u.id AS user_id,bp.id AS business_profile_id,bp.business_name,
            bp.public_headline,COALESCE(NULLIF(bp.public_summary,''),'') AS public_summary,bp.years_experience,
            EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
            COALESCE(beds.is_featured,FALSE) AS is_featured,
        COALESCE(beds.is_official,FALSE) AS is_official,
            mem.plan_group
     FROM users u
     JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     WHERE ${conditions.join(' AND ')}`,
    params
  )).rows[0];
  if(!base)return null;

  const showProjects=settings.showProjects||base.is_official;
  const showVideos=settings.showVideos||base.is_official;
  const showPlans=settings.showPlans||base.is_official;
  // Official profiles may show more than the directory settings allow; if the
  // effective flags differ from what was fetched early, re-query those parts.
  const flags={showProjects,showVideos,showPlans};
  const projectsMatch=flags.showProjects===settingsFlags.showProjects&&flags.showVideos===settingsFlags.showVideos&&flags.showPlans===settingsFlags.showPlans;
  const [services,locations,projects,plans,brochures]=await Promise.all([
    servicesPromise,
    locationsPromise,
    projectsMatch?earlyProjects:(flags.showProjects?projectsQuery(flags):emptyRows),
    flags.showPlans===settingsFlags.showPlans?earlyPlans:(flags.showPlans?plansQuery():emptyRows),
    brochuresPromise,
  ]);
  const [renderedProjects,renderedPlans]=await Promise.all([
    materializeProjectMedia(projects.rows),
    Promise.all(plans.rows.map(async plan=>({...plan,brochure_url:await projectPlanService.displayUrl(plan.brochure_url)}))),
  ]);
  return {...base,services:services.rows,locations:locations.rows,projects:renderedProjects,brochures,service_plans:renderedPlans,directory_settings:{showProjects,showVideos,showPlans}};
}


/**
 * Official first-party service profiles merit their own stable sitemap URL.
 * Never add hidden, inactive, or profile-disabled businesses. Independent
 * marketplace entries must not be labelled as official or silently promoted.
 */
async function listIndexableOfficialProfiles(){
  const result=await pool.query(`
    SELECT bp.id, GREATEST(COALESCE(bp.updated_at,beds.updated_at),COALESCE(beds.updated_at,bp.updated_at)) AS updated_at
    FROM business_profiles bp
    JOIN users u ON u.id=bp.user_id
    JOIN business_expert_directory_settings beds ON beds.user_id=u.id
    WHERE beds.is_official=TRUE AND COALESCE(beds.is_hidden,FALSE)=FALSE
      AND u.role='business' AND u.is_active=TRUE
      AND COALESCE(bp.public_profile_enabled,TRUE)=TRUE
      AND COALESCE(TRIM(bp.business_name),'')<>''
    ORDER BY bp.id
    LIMIT 100
  `);
  return result.rows.map(row=>{
    const date=row.updated_at?new Date(row.updated_at):null;
    return {path:'/experts/'+row.id,lastmod:date&&!Number.isNaN(date.getTime())?date.toISOString().slice(0,10):null};
  });
}

module.exports={listIndexableIndependentProfiles,listIndexableOfficialProfiles,listPublicExperts,listRecentProjects,listRecentProjectVideos,getPublicExpert,getPublicProject,listIndexableProjectPaths,listIndexableVideoEntries};