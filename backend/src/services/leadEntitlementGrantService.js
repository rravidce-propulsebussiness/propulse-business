const pool=require('../config/database');

function fail(message,code){throw Object.assign(new Error(message),{code});}
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const int=(value,min,max,fallback)=>Math.min(max,Math.max(min,Math.trunc(number(value,fallback))));

async function getSettings(client=pool){
  const result=await client.query(`SELECT id,new_business_enabled,new_business_window_days,new_business_shared_quantity,new_business_premium_quantity,claim_expiry_days,updated_by,created_at,updated_at FROM lead_entitlement_settings WHERE id=1`);
  return result.rows[0]||{
    id:1,new_business_enabled:false,new_business_window_days:7,
    new_business_shared_quantity:1,new_business_premium_quantity:0,
    claim_expiry_days:0,updated_by:null,created_at:null,updated_at:null
  };
}

async function getVerifiedBusiness(userId,client=pool){
  const result=await client.query(`
    SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,
           bp.business_name,
           EXISTS(
             SELECT 1 FROM company_proof_documents cpd
             WHERE cpd.user_id=u.id AND cpd.status='verified'
           ) AS is_verified
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE u.id=$1
  `,[userId]);
  const row=result.rows[0]||null;
  if(!row)return null;
  return {...row,is_verified:Boolean(row.is_verified)};
}

async function ensureNewBusinessGrant(userId,client=pool){
  const settings=await getSettings(client);
  if(!settings.new_business_enabled)return null;
  const shared=int(settings.new_business_shared_quantity,0,1000,0);
  const premium=int(settings.new_business_premium_quantity,0,1000,0);
  if(shared<=0&&premium<=0)return null;

  const business=await getVerifiedBusiness(userId,client);
  if(!business||business.role!=='business'||business.is_active!==true||!business.is_verified)return null;

  const registeredAt=new Date(business.created_at);
  const expiresAt=new Date(registeredAt.getTime()+int(settings.new_business_window_days,1,365,7)*86400000);
  if(!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date())return null;

  const result=await client.query(`
    INSERT INTO lead_entitlement_grants(
      user_id,source,shared_quantity,premium_quantity,starts_at,expires_at,
      claim_expiry_days,created_by,notes
    )
    VALUES($1,'new_business',$2,$3,CURRENT_TIMESTAMP,$4,$5,NULL,$6)
    ON CONFLICT (user_id) WHERE source='new_business' DO NOTHING
    RETURNING *
  `,[
    business.id,shared,premium,expiresAt,
    int(settings.claim_expiry_days,0,3650,0),
    `Verified new-business entitlement for first ${int(settings.new_business_window_days,1,365,7)} registration days`
  ]);
  if(result.rows[0])return result.rows[0];
  return (await client.query(`SELECT * FROM lead_entitlement_grants WHERE user_id=$1 AND source='new_business' LIMIT 1`,[business.id])).rows[0]||null;
}

function allowanceFor(grant,type){
  return type==='premium'?number(grant.premium_quantity):number(grant.shared_quantity);
}

async function getActiveGrants(userId,client=pool,{ensureWelcome=true,forUpdate=false}={}){
  if(ensureWelcome)await ensureNewBusinessGrant(userId,client);
  const lock=forUpdate?' FOR UPDATE OF g':'';
  const result=await client.query(`
    SELECT g.*,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='shared')::int AS used_shared,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='premium')::int AS used_premium
    FROM lead_entitlement_grants g
    LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
    WHERE g.user_id=$1
      AND g.revoked_at IS NULL
      AND g.starts_at<=CURRENT_TIMESTAMP
      AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP)
    GROUP BY g.id
    ORDER BY g.expires_at ASC NULLS LAST,g.id ASC
    ${lock}
  `,[userId]);
  return result.rows;
}

function remainingFor(grant,type){
  const allowance=allowanceFor(grant,type);
  const used=type==='premium'?number(grant.used_premium):number(grant.used_shared);
  return Math.max(0,allowance-used);
}

async function findAvailableGrant(userId,type,client=pool,options={}){
  const normalized=type==='premium'?'premium':'shared';
  const grants=await getActiveGrants(userId,client,options);
  for(const grant of grants){
    const remaining=remainingFor(grant,normalized);
    if(remaining>0)return{
      grant,
      entitlementType:normalized,
      remaining,
      allowance:allowanceFor(grant,normalized),
      expiryDays:int(grant.claim_expiry_days,0,3650,0),
      source:grant.source
    };
  }
  return null;
}

function summarizeGrants(grants){
  const summary={shared:{allowance:0,used:0,remaining:0},premium:{allowance:0,used:0,remaining:0}};
  for(const grant of grants){
    for(const type of ['shared','premium']){
      const allowance=allowanceFor(grant,type);
      const used=Math.min(allowance,type==='premium'?number(grant.used_premium):number(grant.used_shared));
      summary[type].allowance+=allowance;
      summary[type].used+=used;
      summary[type].remaining+=Math.max(0,allowance-used);
    }
  }
  return summary;
}

async function getUserGrantSummary(userId,client=pool){
  const grants=await getActiveGrants(userId,client,{ensureWelcome:true});
  return{grants,summary:summarizeGrants(grants)};
}

async function updateSettings(input,adminId,client=pool){
  const enabled=Boolean(input?.newBusinessEnabled);
  const windowDays=int(input?.windowDays,1,365,7);
  const shared=int(input?.sharedQuantity,0,1000,0);
  const premium=int(input?.premiumQuantity,0,1000,0);
  const claimExpiryDays=int(input?.claimExpiryDays,0,3650,0);
  if(enabled&&shared<=0&&premium<=0)fail('Configure at least one Basic or Premium entitlement','INVALID_ENTITLEMENT_SETTINGS');

  const result=await client.query(`
    INSERT INTO lead_entitlement_settings(
      id,new_business_enabled,new_business_window_days,new_business_shared_quantity,
      new_business_premium_quantity,claim_expiry_days,updated_by,updated_at
    )
    VALUES(1,$1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      new_business_enabled=EXCLUDED.new_business_enabled,
      new_business_window_days=EXCLUDED.new_business_window_days,
      new_business_shared_quantity=EXCLUDED.new_business_shared_quantity,
      new_business_premium_quantity=EXCLUDED.new_business_premium_quantity,
      claim_expiry_days=EXCLUDED.claim_expiry_days,
      updated_by=EXCLUDED.updated_by,
      updated_at=CURRENT_TIMESTAMP
    RETURNING *
  `,[enabled,windowDays,shared,premium,claimExpiryDays,adminId||null]);
  return result.rows[0];
}

async function listVerifiedBusinesses({search='',limit=30}={},client=pool){
  const clean=String(search||'').trim();
  const safeLimit=int(limit,1,100,30);
  const values=[];
  let searchSql='';
  if(clean){
    values.push(`%${clean.toLowerCase()}%`);
    searchSql=` AND (LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR LOWER(COALESCE(bp.business_name,'')) LIKE $1)`;
  }
  values.push(safeLimit);
  const limitBind=String.fromCharCode(36)+values.length;
  const result=await client.query(`
    SELECT u.id,u.name,u.email,u.created_at,bp.business_name,
           EXISTS(
             SELECT 1 FROM lead_entitlement_grants g
             WHERE g.user_id=u.id AND g.source='new_business'
           ) AS welcome_issued
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE u.role='business' AND u.is_active=TRUE
      AND EXISTS(
        SELECT 1 FROM company_proof_documents cpd
        WHERE cpd.user_id=u.id AND cpd.status='verified'
      )
      ${searchSql}
    ORDER BY u.created_at DESC,u.id DESC
    LIMIT ${limitBind}
  `,values);
  return result.rows.map(row=>({...row,welcome_issued:Boolean(row.welcome_issued)}));
}

async function createManualGrant(input,adminId,client=pool){
  const userId=int(input?.userId,1,2147483647,0);
  const shared=int(input?.sharedQuantity,0,1000,0);
  const premium=int(input?.premiumQuantity,0,1000,0);
  const validDays=int(input?.validDays,0,3650,30);
  const claimExpiryDays=int(input?.claimExpiryDays,0,3650,0);
  const notes=String(input?.notes||'').trim().slice(0,1000);
  if(!userId)fail('Choose a verified business','INVALID_GRANT_USER');
  if(shared<=0&&premium<=0)fail('Grant at least one Basic or Premium lead','INVALID_GRANT_QUANTITY');

  const business=await getVerifiedBusiness(userId,client);
  if(!business||business.role!=='business'||business.is_active!==true)fail('Lead entitlements can only be granted to active business accounts','INVALID_GRANT_USER');
  if(!business.is_verified)fail('Lead entitlements are available only to verified businesses','BUSINESS_NOT_VERIFIED');

  const expiresAt=validDays>0?new Date(Date.now()+validDays*86400000):null;
  const result=await client.query(`
    INSERT INTO lead_entitlement_grants(
      user_id,source,shared_quantity,premium_quantity,starts_at,expires_at,
      claim_expiry_days,created_by,notes
    )
    VALUES($1,'admin',$2,$3,CURRENT_TIMESTAMP,$4,$5,$6,$7)
    RETURNING *
  `,[userId,shared,premium,expiresAt,claimExpiryDays,adminId||null,notes||null]);
  return result.rows[0];
}

async function revokeGrant(grantId,adminId,client=pool){
  const id=int(grantId,1,2147483647,0);
  if(!id)fail('Invalid entitlement grant','INVALID_GRANT');
  const result=await client.query(`
    UPDATE lead_entitlement_grants
    SET revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,
        notes=CASE WHEN notes IS NULL OR notes='' THEN $2 ELSE notes || E'\\n' || $2 END
    WHERE id=$1 AND revoked_at IS NULL
    RETURNING *
  `,[id,`Revoked by admin #${adminId}`]);
  if(!result.rows[0])fail('Entitlement grant not found or already revoked','GRANT_NOT_FOUND');
  return result.rows[0];
}

async function getAdminOverview(client=pool){
  const [settings,summaryResult,grantsResult]=await Promise.all([
    getSettings(client),
    client.query(`
      SELECT
        COUNT(*) FILTER(WHERE g.revoked_at IS NULL AND g.starts_at<=CURRENT_TIMESTAMP AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP))::int AS active_grants,
        COUNT(*) FILTER(WHERE g.source='new_business')::int AS welcome_grants,
        COUNT(*) FILTER(WHERE g.source='admin')::int AS manual_grants,
        COALESCE(SUM(g.shared_quantity),0)::int AS shared_granted,
        COALESCE(SUM(g.premium_quantity),0)::int AS premium_granted,
        (SELECT COUNT(*)::int FROM lead_entitlement_claims c WHERE c.grant_id IS NOT NULL) AS grant_claims
      FROM lead_entitlement_grants g
    `),
    client.query(`
      SELECT g.id,g.user_id,g.source,g.shared_quantity,g.premium_quantity,g.starts_at,g.expires_at,
             g.claim_expiry_days,g.notes,g.revoked_at,g.created_at,
             u.name,u.email,bp.business_name,
             COUNT(c.id) FILTER(WHERE c.entitlement_type='shared')::int AS used_shared,
             COUNT(c.id) FILTER(WHERE c.entitlement_type='premium')::int AS used_premium
      FROM lead_entitlement_grants g
      JOIN users u ON u.id=g.user_id
      LEFT JOIN business_profiles bp ON bp.user_id=u.id
      LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
      GROUP BY g.id,u.name,u.email,bp.business_name
      ORDER BY g.created_at DESC,g.id DESC
      LIMIT 100
    `)
  ]);
  return{settings,summary:summaryResult.rows[0]||{},grants:grantsResult.rows};
}

module.exports={
  getSettings,getVerifiedBusiness,ensureNewBusinessGrant,getActiveGrants,
  findAvailableGrant,getUserGrantSummary,updateSettings,listVerifiedBusinesses,
  createManualGrant,revokeGrant,getAdminOverview,remainingFor
};
