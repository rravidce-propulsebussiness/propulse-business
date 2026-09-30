const pool=require('../config/database');

function toPositiveInt(value,fallback,max=100){
  const parsed=Number.parseInt(value,10);
  if(!Number.isInteger(parsed)||parsed<1)return fallback;
  return Math.min(parsed,max);
}

async function listPublicExperts({search='',industryId='',cityId='',verified='',page=1,pageSize=12}={}){
  const currentPage=toPositiveInt(page,1,100000);
  const currentPageSize=toPositiveInt(pageSize,12,48);
  const offset=(currentPage-1)*currentPageSize;
  const params=[];
  const conditions=[
    "u.role='business'",
    'u.is_active=TRUE',
    'bp.id IS NOT NULL',
    "COALESCE(TRIM(bp.business_name),'')<>''"
  ];

  const cleanSearch=String(search||'').trim();
  if(cleanSearch){
    params.push('%'+cleanSearch+'%');
    const n=params.length;
    conditions.push(`(
      bp.business_name ILIKE $${n}
      OR COALESCE(bp.business_details,'') ILIKE $${n}
      OR EXISTS(
        SELECT 1
        FROM business_profile_services bpss
        JOIN industries ii ON ii.id=bpss.industry_id
        JOIN services ss ON ss.id=bpss.service_id
        LEFT JOIN subservices sss ON sss.id=bpss.subservice_id
        WHERE bpss.business_profile_id=bp.id
          AND bpss.is_active=TRUE
          AND (ii.name ILIKE $${n} OR ss.name ILIKE $${n} OR COALESCE(sss.name,'') ILIKE $${n})
      )
      OR EXISTS(
        SELECT 1
        FROM business_profile_locations bpll
        JOIN states stt ON stt.id=bpll.state_id
        JOIN cities cc ON cc.id=bpll.city_id
        LEFT JOIN subcities scc ON scc.id=bpll.subcity_id
        WHERE bpll.business_profile_id=bp.id
          AND bpll.is_active=TRUE
          AND (stt.name ILIKE $${n} OR cc.name ILIKE $${n} OR COALESCE(scc.name,'') ILIKE $${n})
      )
    )`);
  }

  if(industryId){
    const id=Number(industryId);
    if(Number.isInteger(id)&&id>0){
      params.push(id);
      conditions.push(`EXISTS(
        SELECT 1 FROM business_profile_services bpsi
        WHERE bpsi.business_profile_id=bp.id
          AND bpsi.industry_id=$${params.length}
          AND bpsi.is_active=TRUE
      )`);
    }
  }

  if(cityId){
    const id=Number(cityId);
    if(Number.isInteger(id)&&id>0){
      params.push(id);
      conditions.push(`EXISTS(
        SELECT 1 FROM business_profile_locations bplc
        WHERE bplc.business_profile_id=bp.id
          AND bplc.city_id=$${params.length}
          AND bplc.is_active=TRUE
      )`);
    }
  }

  const verifiedOnly=String(verified||'').toLowerCase()==='true'||String(verified)==='1';
  if(verifiedOnly){
    conditions.push(`EXISTS(
      SELECT 1 FROM company_proof_documents cpdv
      WHERE cpdv.user_id=u.id AND cpdv.status='verified'
    )`);
  }

  const whereClause='WHERE '+conditions.join(' AND ');
  const count=(await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM users u
       JOIN business_profiles bp ON bp.user_id=u.id
       ${whereClause}`,
    params
  )).rows[0]?.total||0;

  const queryParams=[...params,currentPageSize,offset];
  const result=await pool.query(
    `SELECT
       u.id AS user_id,
       bp.id AS business_profile_id,
       bp.business_name,
       bp.business_details,
       u.created_at AS registered_at,
       EXISTS(
         SELECT 1 FROM company_proof_documents cpd
         WHERE cpd.user_id=u.id AND cpd.status='verified'
       ) AS is_verified,
       COALESCE((
         SELECT json_agg(json_build_object(
           'industryId',bps.industry_id,
           'industryName',i.name,
           'serviceId',bps.service_id,
           'serviceName',s.name,
           'subserviceId',bps.subservice_id,
           'subserviceName',ss.name
         ) ORDER BY i.name,s.name,ss.name)
         FROM business_profile_services bps
         JOIN industries i ON i.id=bps.industry_id
         JOIN services s ON s.id=bps.service_id
         LEFT JOIN subservices ss ON ss.id=bps.subservice_id
         WHERE bps.business_profile_id=bp.id AND bps.is_active=TRUE
       ),'[]'::json) AS services,
       COALESCE((
         SELECT json_agg(json_build_object(
           'stateId',bpl.state_id,
           'stateName',st.name,
           'cityId',bpl.city_id,
           'cityName',c.name,
           'subcityId',bpl.subcity_id,
           'subcityName',sc.name
         ) ORDER BY st.name,c.name,sc.name)
         FROM business_profile_locations bpl
         JOIN states st ON st.id=bpl.state_id
         JOIN cities c ON c.id=bpl.city_id
         LEFT JOIN subcities sc ON sc.id=bpl.subcity_id
         WHERE bpl.business_profile_id=bp.id AND bpl.is_active=TRUE
       ),'[]'::json) AS locations
     FROM users u
     JOIN business_profiles bp ON bp.user_id=u.id
     ${whereClause}
     ORDER BY
       EXISTS(SELECT 1 FROM company_proof_documents cpdo WHERE cpdo.user_id=u.id AND cpdo.status='verified') DESC,
       u.created_at DESC,
       u.id DESC
     LIMIT $${queryParams.length-1} OFFSET $${queryParams.length}`,
    queryParams
  );

  return {
    data:result.rows,
    pagination:{
      page:currentPage,
      pageSize:currentPageSize,
      total:Number(count||0),
      totalPages:count?Math.ceil(Number(count)/currentPageSize):0,
      hasNextPage:currentPage*currentPageSize<Number(count||0),
      hasPreviousPage:currentPage>1&&Number(count||0)>0,
    },
  };
}

module.exports={listPublicExperts};
