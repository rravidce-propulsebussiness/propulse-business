const pool=require('../config/database');
const expertDirectoryService=require('./expertDirectoryService');
const projectVideoService=require('./projectVideoService');
const projectPlanService=require('./projectPlanService');
const projectImageService=require('./projectImageService');

async function materializeProjectMedia(rows){
  return Promise.all((rows||[]).map(async row=>({
    ...row,
    video_url:row.video_url?await projectVideoService.displayUrl(row.video_url):row.video_url,
    plan_url:row.plan_url?await projectPlanService.displayUrl(row.plan_url):row.plan_url,
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
  const count=(await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM users u
     JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${whereClause}`,
    params
  )).rows[0]?.total||0;

  const queryParams=[...params,currentPageSize,offset];
  const result=await pool.query(
    `SELECT
       u.id AS user_id,
       bp.id AS business_profile_id,
       bp.business_name,
       bp.public_headline,
       COALESCE(NULLIF(bp.public_summary,''),'') AS public_summary,
       bp.years_experience,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       COALESCE(beds.is_featured,FALSE) AS is_featured,
       COALESCE(beds.sort_order,0) AS sort_order,
       mem.plan_group,
       (SELECT COUNT(*)::int FROM business_profile_projects bpp WHERE bpp.business_profile_id=bp.id AND bpp.is_published=TRUE) AS project_count,
       (SELECT COUNT(*)::int FROM business_profile_service_plans bspp WHERE bspp.business_profile_id=bp.id AND bspp.is_published=TRUE) AS plan_count,
       (SELECT bpp.cover_image_url FROM business_profile_projects bpp WHERE bpp.business_profile_id=bp.id AND bpp.is_published=TRUE AND COALESCE(bpp.cover_image_url,'')<>'' ORDER BY bpp.sort_order,bpp.id LIMIT 1) AS cover_image_url,
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
  );

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
  if(!settings.directoryEnabled||!settings.showProjects||!settings.showVideos){
    return {data:[],pagination:{page:currentPage,pageSize:currentPageSize,total:0,totalPages:0,hasNextPage:false,hasPreviousPage:false}};
  }
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=["bpp.is_published=TRUE","COALESCE(bpp.video_url,'')<>''"];
  addEligibilityConditions(settings,params,conditions);
  const where='WHERE '+conditions.join(' AND ');
  const total=Number((await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${where}`,
    params
  )).rows[0]?.total||0);
  const queryParams=[...params];
  const result=await pool.query(
    `SELECT
       bpp.id AS project_id,
       bpp.title,
       bpp.project_type,
       bpp.description,
       bpp.location_text,
       bpp.completion_year,
       bpp.area_text,
       bpp.budget_text,
       bpp.cover_image_url,
       bpp.video_url,
       COALESCE(bpp.video_published_at,bpp.created_at) AS video_published_at,
       bp.id AS business_profile_id,
       bp.business_name,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       mem.plan_group
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     ${where}
     ORDER BY COALESCE(bpp.video_published_at,bpp.created_at) DESC,bpp.id DESC
     LIMIT ${currentPageSize} OFFSET ${offset}`,
    queryParams
  );
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

async function listRecentProjects({page=1,pageSize=18}={}){
  const settings=await expertDirectoryService.getSettings();
  const currentPage=toPositiveInt(page,1,100000);
  const currentPageSize=toPositiveInt(pageSize,18,48);
  if(!settings.directoryEnabled||!settings.showProjects){
    return {data:[],pagination:{page:currentPage,pageSize:currentPageSize,total:0,totalPages:0,hasNextPage:false,hasPreviousPage:false}};
  }
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=["bpp.is_published=TRUE"];
  addEligibilityConditions(settings,params,conditions);
  const where='WHERE '+conditions.join(' AND ');
  const total=Number((await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${where}`,
    params
  )).rows[0]?.total||0);
  const result=await pool.query(
    `SELECT
       bpp.id AS project_id,
       bpp.title,
       bpp.project_type,
       bpp.description,
       bpp.location_text,
       bpp.completion_year,
       bpp.area_text,
       bpp.budget_text,
       bpp.cover_image_url,
       bpp.image_urls,
       bpp.package_name,
       ${settings.showVideos?'bpp.video_url':'NULL::text AS video_url'},
       ${settings.showPlans?'bpp.plan_url':'NULL::text AS plan_url'},
       COALESCE(bpp.published_at,bpp.video_published_at,bpp.created_at) AS published_at,
       bp.id AS business_profile_id,
       bp.business_name,
       EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
       mem.plan_group
     FROM business_profile_projects bpp
     JOIN business_profiles bp ON bp.id=bpp.business_profile_id
     JOIN users u ON u.id=bp.user_id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     ${where}
     ORDER BY COALESCE(bpp.published_at,bpp.video_published_at,bpp.created_at) DESC,bpp.id DESC
     LIMIT ${currentPageSize} OFFSET ${offset}`,
    params
  );
  const data=await materializeProjectMedia(result.rows);
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

async function getPublicExpert(expertId){
  const id=Number(expertId);
  if(!Number.isInteger(id)||id<=0)return null;
  const settings=await expertDirectoryService.getSettings();
  if(!settings.directoryEnabled)return null;
  const params=[id];
  const conditions=['bp.id=$1'];
  addEligibilityConditions(settings,params,conditions);
  const base=(await pool.query(
    `SELECT u.id AS user_id,bp.id AS business_profile_id,bp.business_name,
            bp.public_headline,COALESCE(NULLIF(bp.public_summary,''),'') AS public_summary,bp.years_experience,
            EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified') AS is_verified,
            COALESCE(beds.is_featured,FALSE) AS is_featured,
            mem.plan_group
     FROM users u
     JOIN business_profiles bp ON bp.user_id=u.id
     LEFT JOIN business_expert_directory_settings beds ON beds.user_id=u.id
     ${membershipLateral()}
     WHERE ${conditions.join(' AND ')}`,
    params
  )).rows[0];
  if(!base)return null;

  const [services,locations,projects,plans]=await Promise.all([
    pool.query(`SELECT bps.industry_id AS "industryId",i.name AS "industryName",bps.service_id AS "serviceId",s.name AS "serviceName",bps.subservice_id AS "subserviceId",ss.name AS "subserviceName" FROM business_profile_services bps JOIN industries i ON i.id=bps.industry_id JOIN services s ON s.id=bps.service_id LEFT JOIN subservices ss ON ss.id=bps.subservice_id WHERE bps.business_profile_id=$1 AND bps.is_active=TRUE ORDER BY i.name,s.name,ss.name`,[id]),
    pool.query(`SELECT bpl.state_id AS "stateId",st.name AS "stateName",bpl.city_id AS "cityId",c.name AS "cityName",bpl.subcity_id AS "subcityId",sc.name AS "subcityName" FROM business_profile_locations bpl JOIN states st ON st.id=bpl.state_id JOIN cities c ON c.id=bpl.city_id LEFT JOIN subcities sc ON sc.id=bpl.subcity_id WHERE bpl.business_profile_id=$1 AND bpl.is_active=TRUE ORDER BY st.name,c.name`,[id]),
    settings.showProjects?pool.query(`SELECT id,title,project_type,description,location_text,completion_year,area_text,budget_text,cover_image_url,image_urls,package_name,${settings.showVideos?'video_url':'NULL::text AS video_url'},video_published_at,${settings.showPlans?'plan_url':'NULL::text AS plan_url'},sort_order FROM business_profile_projects WHERE business_profile_id=$1 AND is_published=TRUE ORDER BY sort_order,id`,[id]):Promise.resolve({rows:[]}),
    settings.showPlans?pool.query(`SELECT id,title,description,price_from,duration_label,inclusions,sort_order FROM business_profile_service_plans WHERE business_profile_id=$1 AND is_published=TRUE ORDER BY sort_order,id`,[id]):Promise.resolve({rows:[]}),
  ]);
  const renderedProjects=await materializeProjectMedia(projects.rows);
  return {...base,services:services.rows,locations:locations.rows,projects:renderedProjects,service_plans:plans.rows,directory_settings:{showProjects:settings.showProjects,showVideos:settings.showVideos,showPlans:settings.showPlans}};
}

module.exports={listPublicExperts,listRecentProjects,listRecentProjectVideos,getPublicExpert};