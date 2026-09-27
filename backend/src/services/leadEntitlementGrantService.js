const pool=require('../config/database');

function fail(message,code){throw Object.assign(new Error(message),{code});}
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const int=(value,min,max,fallback)=>Math.min(max,Math.max(min,Math.trunc(number(value,fallback))));
const bool=(value,fallback=false)=>{
  if(value===undefined||value===null)return fallback;
  if(typeof value==='string')return ['true','1','yes','on'].includes(value.trim().toLowerCase());
  return Boolean(value);
};

function normalizeLeadStrategy(lead){
  const raw=String(lead?.access_strategy??lead?.accessStrategy??'shared').trim().toLowerCase().replace(/[\s-]+/g,'_');
  if(raw.includes('permanent')||raw==='single'||raw==='single_only'||raw==='singlebuyer')return'permanent_single';
  if(raw.includes('auto'))return'auto_release';
  return'shared';
}

function grantAllowsLead(grant,lead,{exclusiveActive=false,pro=false}={}){
  if(lead){
    const strategy=normalizeLeadStrategy(lead);
    if(strategy==='permanent_single'&&!bool(grant.allow_single,true))return false;
    if(strategy==='shared'&&!bool(grant.allow_shared,true))return false;
    if(strategy==='auto_release'&&!bool(grant.allow_auto_release,true))return false;
  }
  if(exclusiveActive&&!pro&&!bool(grant.allow_exclusive,false))return false;
  return true;
}

async function listRegistrationRules(client=pool,{activeOnly=false}={}){
  const result=await client.query(`
    SELECT r.*,
           i.name AS industry_name,
           st.name AS state_name,
           c.name AS city_name
    FROM lead_entitlement_registration_rules r
    LEFT JOIN industries i ON i.id=r.industry_id
    LEFT JOIN states st ON st.id=r.state_id
    LEFT JOIN cities c ON c.id=r.city_id
    ${activeOnly?'WHERE r.is_active=TRUE':''}
    ORDER BY r.updated_at DESC,r.id DESC
  `);
  return result.rows;
}

async function getBusinessContext(userId,client=pool){
  const result=await client.query(`
    SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,
           bp.id AS business_profile_id,bp.business_name,
           EXISTS(
             SELECT 1 FROM company_proof_documents cpd
             WHERE cpd.user_id=u.id AND cpd.status='verified'
           ) AS is_verified,
           ARRAY(
             SELECT DISTINCT bps.industry_id
             FROM business_profile_services bps
             WHERE bps.business_profile_id=bp.id AND bps.is_active=TRUE
           ) AS industry_ids,
           ARRAY(
             SELECT DISTINCT bpl.state_id
             FROM business_profile_locations bpl
             WHERE bpl.business_profile_id=bp.id AND bpl.is_active=TRUE
           ) AS state_ids,
           ARRAY(
             SELECT DISTINCT bpl.city_id
             FROM business_profile_locations bpl
             WHERE bpl.business_profile_id=bp.id AND bpl.is_active=TRUE
           ) AS city_ids
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE u.id=$1
  `,[userId]);
  const row=result.rows[0]||null;
  if(!row)return null;
  return{
    ...row,
    is_verified:Boolean(row.is_verified),
    industry_ids:(row.industry_ids||[]).map(Number),
    state_ids:(row.state_ids||[]).map(Number),
    city_ids:(row.city_ids||[]).map(Number)
  };
}

async function getVerifiedBusiness(userId,client=pool){
  return getBusinessContext(userId,client);
}

function ruleSpecificity(rule){
  return (rule.city_id?8:0)+(rule.state_id?4:0)+(rule.industry_id?2:0)+(rule.verification_scope!=='any'?1:0);
}

function ruleMatchesBusiness(rule,business){
  if(!rule?.is_active||!business)return false;
  if(rule.verification_scope==='verified'&&!business.is_verified)return false;
  if(rule.verification_scope==='unverified'&&business.is_verified)return false;
  if(rule.industry_id&&!business.industry_ids.includes(Number(rule.industry_id)))return false;
  if(rule.state_id&&!business.state_ids.includes(Number(rule.state_id)))return false;
  if(rule.city_id&&!business.city_ids.includes(Number(rule.city_id)))return false;
  return true;
}

async function findRegistrationRuleForBusiness(business,client=pool){
  const rules=await listRegistrationRules(client,{activeOnly:true});
  return rules
    .filter(rule=>ruleMatchesBusiness(rule,business))
    .sort((a,b)=>{
      const specificity=ruleSpecificity(b)-ruleSpecificity(a);
      if(specificity)return specificity;
      const updated=new Date(b.updated_at||0)-new Date(a.updated_at||0);
      return updated||Number(b.id)-Number(a.id);
    })[0]||null;
}

async function ensureNewBusinessGrant(userId,client=pool){
  const existing=(await client.query(`
    SELECT * FROM lead_entitlement_grants
    WHERE user_id=$1 AND source='new_business'
    LIMIT 1
  `,[userId])).rows[0]||null;
  if(existing)return existing;

  const business=await getBusinessContext(userId,client);
  if(!business||business.role!=='business'||business.is_active!==true)return null;

  const rule=await findRegistrationRuleForBusiness(business,client);
  if(!rule)return null;

  const shared=int(rule.shared_quantity,0,1000,0);
  const premium=int(rule.premium_quantity,0,1000,0);
  if(shared<=0&&premium<=0)return null;

  const allowSingle=bool(rule.allow_single,true);
  const allowShared=bool(rule.allow_shared,true);
  const allowAutoRelease=bool(rule.allow_auto_release,true);
  const allowExclusive=bool(rule.allow_exclusive,false);
  if(!allowSingle&&!allowShared&&!allowAutoRelease)return null;

  const registeredAt=new Date(business.created_at);
  const windowDays=int(rule.window_days,1,365,7);
  const expiresAt=new Date(registeredAt.getTime()+windowDays*86400000);
  if(!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date())return null;

  const result=await client.query(`
    INSERT INTO lead_entitlement_grants(
      user_id,source,registration_rule_id,shared_quantity,premium_quantity,starts_at,expires_at,
      claim_expiry_days,allow_single,allow_shared,allow_auto_release,allow_exclusive,
      created_by,notes
    )
    VALUES($1,'new_business',$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,$7,$8,$9,$10,NULL,$11)
    ON CONFLICT (user_id) WHERE source='new_business' DO NOTHING
    RETURNING *
  `,[
    business.id,rule.id,shared,premium,expiresAt,
    int(rule.claim_expiry_days,0,3650,0),
    allowSingle,allowShared,allowAutoRelease,allowExclusive,
    `Registration rule #${rule.id}: ${rule.name}`
  ]);

  if(result.rows[0])return result.rows[0];
  return (await client.query(`
    SELECT * FROM lead_entitlement_grants
    WHERE user_id=$1 AND source='new_business'
    LIMIT 1
  `,[business.id])).rows[0]||null;
}

function allowanceFor(grant,type){
  return type==='premium'?number(grant.premium_quantity):number(grant.shared_quantity);
}

async function getActiveGrants(userId,client=pool,{ensureWelcome=true,forUpdate=false}={}){
  if(ensureWelcome)await ensureNewBusinessGrant(userId,client);

  if(forUpdate){
    await client.query(`
      SELECT id FROM lead_entitlement_grants
      WHERE user_id=$1
        AND revoked_at IS NULL
        AND starts_at<=CURRENT_TIMESTAMP
        AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)
      ORDER BY expires_at ASC NULLS LAST,id ASC
      FOR UPDATE
    `,[userId]);
  }

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
  const {
    lead=null,
    exclusiveActive=false,
    pro=false,
    ensureWelcome=true,
    forUpdate=false
  }=options||{};

  const grants=await getActiveGrants(userId,client,{ensureWelcome,forUpdate});
  for(const grant of grants){
    if(!grantAllowsLead(grant,lead,{exclusiveActive,pro}))continue;
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
  const summary={
    shared:{allowance:0,used:0,remaining:0},
    premium:{allowance:0,used:0,remaining:0}
  };
  for(const grant of grants){
    for(const type of ['shared','premium']){
      const allowance=allowanceFor(grant,type);
      const used=Math.min(
        allowance,
        type==='premium'?number(grant.used_premium):number(grant.used_shared)
      );
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

function normalizeRegistrationRule(input){
  const verificationScope=['any','verified','unverified'].includes(String(input?.verificationScope||'').toLowerCase())
    ?String(input.verificationScope).toLowerCase()
    :'any';
  const normalized={
    name:String(input?.name||'').trim().slice(0,120),
    isActive:bool(input?.isActive,true),
    verificationScope,
    industryId:int(input?.industryId,1,2147483647,0)||null,
    stateId:int(input?.stateId,1,2147483647,0)||null,
    cityId:int(input?.cityId,1,2147483647,0)||null,
    windowDays:int(input?.windowDays,1,365,7),
    sharedQuantity:int(input?.sharedQuantity,0,1000,0),
    premiumQuantity:int(input?.premiumQuantity,0,1000,0),
    claimExpiryDays:int(input?.claimExpiryDays,0,3650,0),
    allowSingle:bool(input?.allowSingle,true),
    allowShared:bool(input?.allowShared,true),
    allowAutoRelease:bool(input?.allowAutoRelease,true),
    allowExclusive:bool(input?.allowExclusive,false)
  };
  if(!normalized.name)fail('Give this registration rule a name','INVALID_ENTITLEMENT_RULE');
  if(normalized.isActive&&normalized.sharedQuantity<=0&&normalized.premiumQuantity<=0)fail('Configure at least one Basic or Premium entitlement','INVALID_ENTITLEMENT_SETTINGS');
  if(normalized.isActive&&!normalized.allowSingle&&!normalized.allowShared&&!normalized.allowAutoRelease)fail('Enable at least one buyer-access type','INVALID_ENTITLEMENT_ACCESS');
  return normalized;
}

async function validateRegistrationRuleTargets(rule,client=pool){
  if(rule.industryId){
    const found=(await client.query('SELECT id FROM industries WHERE id=$1 AND is_active=TRUE',[rule.industryId])).rows[0];
    if(!found)fail('Choose a valid industry','INVALID_ENTITLEMENT_RULE');
  }
  if(rule.cityId){
    const city=(await client.query('SELECT id,state_id FROM cities WHERE id=$1 AND is_active=TRUE',[rule.cityId])).rows[0];
    if(!city)fail('Choose a valid city','INVALID_ENTITLEMENT_RULE');
    if(rule.stateId&&Number(city.state_id)!==Number(rule.stateId))fail('Selected city does not belong to the selected state','INVALID_ENTITLEMENT_RULE');
    if(!rule.stateId)rule.stateId=Number(city.state_id);
  }
  if(rule.stateId){
    const found=(await client.query('SELECT id FROM states WHERE id=$1 AND is_active=TRUE',[rule.stateId])).rows[0];
    if(!found)fail('Choose a valid state','INVALID_ENTITLEMENT_RULE');
  }
  return rule;
}

async function createRegistrationRule(input,adminId,client=pool){
  const rule=await validateRegistrationRuleTargets(normalizeRegistrationRule(input),client);
  const result=await client.query(`
    INSERT INTO lead_entitlement_registration_rules(
      name,is_active,verification_scope,industry_id,state_id,city_id,
      window_days,shared_quantity,premium_quantity,claim_expiry_days,
      allow_single,allow_shared,allow_auto_release,allow_exclusive,
      created_by,updated_by
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
    RETURNING *
  `,[
    rule.name,rule.isActive,rule.verificationScope,rule.industryId,rule.stateId,rule.cityId,
    rule.windowDays,rule.sharedQuantity,rule.premiumQuantity,rule.claimExpiryDays,
    rule.allowSingle,rule.allowShared,rule.allowAutoRelease,rule.allowExclusive,
    adminId||null
  ]);
  return result.rows[0];
}

async function updateRegistrationRule(ruleId,input,adminId,client=pool){
  const id=int(ruleId,1,2147483647,0);
  if(!id)fail('Invalid registration rule','INVALID_ENTITLEMENT_RULE');
  const existing=(await client.query('SELECT * FROM lead_entitlement_registration_rules WHERE id=$1',[id])).rows[0];
  if(!existing)fail('Registration rule not found','ENTITLEMENT_RULE_NOT_FOUND');

  const rule=await validateRegistrationRuleTargets(normalizeRegistrationRule({
    name:input?.name??existing.name,
    isActive:input?.isActive??existing.is_active,
    verificationScope:input?.verificationScope??existing.verification_scope,
    industryId:input?.industryId===undefined?existing.industry_id:input.industryId,
    stateId:input?.stateId===undefined?existing.state_id:input.stateId,
    cityId:input?.cityId===undefined?existing.city_id:input.cityId,
    windowDays:input?.windowDays??existing.window_days,
    sharedQuantity:input?.sharedQuantity??existing.shared_quantity,
    premiumQuantity:input?.premiumQuantity??existing.premium_quantity,
    claimExpiryDays:input?.claimExpiryDays??existing.claim_expiry_days,
    allowSingle:input?.allowSingle??existing.allow_single,
    allowShared:input?.allowShared??existing.allow_shared,
    allowAutoRelease:input?.allowAutoRelease??existing.allow_auto_release,
    allowExclusive:input?.allowExclusive??existing.allow_exclusive
  }),client);

  const result=await client.query(`
    UPDATE lead_entitlement_registration_rules
    SET name=$2,is_active=$3,verification_scope=$4,industry_id=$5,state_id=$6,city_id=$7,
        window_days=$8,shared_quantity=$9,premium_quantity=$10,claim_expiry_days=$11,
        allow_single=$12,allow_shared=$13,allow_auto_release=$14,allow_exclusive=$15,
        updated_by=$16,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
    RETURNING *
  `,[
    id,rule.name,rule.isActive,rule.verificationScope,rule.industryId,rule.stateId,rule.cityId,
    rule.windowDays,rule.sharedQuantity,rule.premiumQuantity,rule.claimExpiryDays,
    rule.allowSingle,rule.allowShared,rule.allowAutoRelease,rule.allowExclusive,
    adminId||null
  ]);
  return result.rows[0];
}

async function deleteRegistrationRule(ruleId,client=pool){
  const id=int(ruleId,1,2147483647,0);
  if(!id)fail('Invalid registration rule','INVALID_ENTITLEMENT_RULE');
  const deleted=(await client.query('DELETE FROM lead_entitlement_registration_rules WHERE id=$1 RETURNING *',[id])).rows[0];
  if(!deleted)fail('Registration rule not found','ENTITLEMENT_RULE_NOT_FOUND');
  return{...deleted,deleted:true};
}

async function listBusinesses({search='',limit=30,verification='any'}={},client=pool){
  const clean=String(search||'').trim();
  const safeLimit=int(limit,1,100,30);
  const scope=['any','verified','unverified'].includes(String(verification||'').toLowerCase())
    ?String(verification).toLowerCase()
    :'any';
  const values=[];
  let searchSql='';
  if(clean){
    values.push(`%${clean.toLowerCase()}%`);
    searchSql=` AND (
      LOWER(u.name) LIKE $1
      OR LOWER(u.email) LIKE $1
      OR LOWER(COALESCE(bp.business_name,'')) LIKE $1
    )`;
  }
  values.push(safeLimit);
  const limitBind=String.fromCharCode(36)+values.length;
  const verificationSql=scope==='verified'
    ?`AND EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified')`
    :scope==='unverified'
      ?`AND NOT EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified')`
      :'';

  const result=await client.query(`
    SELECT u.id,u.name,u.email,u.created_at,bp.business_name,
           EXISTS(
             SELECT 1 FROM company_proof_documents cpd
             WHERE cpd.user_id=u.id AND cpd.status='verified'
           ) AS is_verified
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE u.role='business'
      AND u.is_active=TRUE
      ${verificationSql}
      ${searchSql}
    ORDER BY u.created_at DESC,u.id DESC
    LIMIT ${limitBind}
  `,values);

  return result.rows.map(row=>({...row,is_verified:Boolean(row.is_verified)}));
}

async function listBusinessCampaigns(client=pool){
  const result=await client.query(`
    SELECT bc.*,
           i.name AS industry_name,
           st.name AS state_name,
           c.name AS city_name,
           (
             SELECT COUNT(*)::int
             FROM lead_entitlement_business_campaign_users cu
             WHERE cu.campaign_id=bc.id
           ) AS selected_user_count,
           COALESCE((
             SELECT json_agg(json_build_object(
               'id',u.id,
               'name',u.name,
               'email',u.email,
               'business_name',bp.business_name,
               'is_verified',EXISTS(
                 SELECT 1 FROM company_proof_documents cpd
                 WHERE cpd.user_id=u.id AND cpd.status='verified'
               )
             ) ORDER BY u.id)
             FROM lead_entitlement_business_campaign_users cu
             JOIN users u ON u.id=cu.user_id
             LEFT JOIN business_profiles bp ON bp.user_id=u.id
             WHERE cu.campaign_id=bc.id
           ),'[]'::json) AS selected_users,
           (
             SELECT COUNT(*)::int
             FROM lead_entitlement_grants g
             WHERE g.campaign_id=bc.id AND g.revoked_at IS NULL
           ) AS recipient_count,
           (
             SELECT COUNT(*)::int
             FROM lead_entitlement_grants g
             WHERE g.campaign_id=bc.id
               AND g.revoked_at IS NULL
               AND g.starts_at<=CURRENT_TIMESTAMP
               AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP)
           ) AS active_recipient_count
    FROM lead_entitlement_business_campaigns bc
    LEFT JOIN industries i ON i.id=bc.industry_id
    LEFT JOIN states st ON st.id=bc.state_id
    LEFT JOIN cities c ON c.id=bc.city_id
    ORDER BY bc.updated_at DESC,bc.id DESC
  `);
  return result.rows;
}

function normalizeBusinessCampaign(input){
  const audienceScope=['all','specific_users'].includes(String(input?.audienceScope||'').toLowerCase())
    ?String(input.audienceScope).toLowerCase()
    :'all';
  const verificationScope=['any','verified','unverified'].includes(String(input?.verificationScope||'').toLowerCase())
    ?String(input.verificationScope).toLowerCase()
    :'any';
  const userIds=[...new Set((Array.isArray(input?.userIds)?input.userIds:[])
    .map(value=>int(value,1,2147483647,0)).filter(Boolean))].slice(0,5000);
  const normalized={
    name:String(input?.name||'').trim().slice(0,120),
    audienceScope,
    verificationScope,
    userIds,
    industryId:int(input?.industryId,1,2147483647,0)||null,
    stateId:int(input?.stateId,1,2147483647,0)||null,
    cityId:int(input?.cityId,1,2147483647,0)||null,
    sharedQuantity:int(input?.sharedQuantity,0,1000,0),
    premiumQuantity:int(input?.premiumQuantity,0,1000,0),
    validDays:int(input?.validDays,0,3650,30),
    claimExpiryDays:int(input?.claimExpiryDays,0,3650,0),
    allowSingle:bool(input?.allowSingle,true),
    allowShared:bool(input?.allowShared,true),
    allowAutoRelease:bool(input?.allowAutoRelease,true),
    allowExclusive:bool(input?.allowExclusive,false),
    notes:String(input?.notes||'').trim().slice(0,1000)
  };
  if(!normalized.name)fail('Give this business entitlement a name','INVALID_BUSINESS_CAMPAIGN');
  if(normalized.audienceScope==='specific_users'&&!normalized.userIds.length)fail('Choose at least one business','INVALID_BUSINESS_CAMPAIGN');
  if(normalized.sharedQuantity<=0&&normalized.premiumQuantity<=0)fail('Configure at least one Basic or Premium entitlement','INVALID_ENTITLEMENT_SETTINGS');
  if(!normalized.allowSingle&&!normalized.allowShared&&!normalized.allowAutoRelease)fail('Enable at least one buyer-access type','INVALID_ENTITLEMENT_ACCESS');
  return normalized;
}

async function validateBusinessCampaign(campaign,client=pool){
  await validateRegistrationRuleTargets(campaign,client);
  if(campaign.audienceScope==='specific_users'){
    const rows=(await client.query(`
      SELECT id FROM users
      WHERE id=ANY($1::int[]) AND role='business' AND is_active=TRUE
    `,[campaign.userIds])).rows;
    if(rows.length!==campaign.userIds.length)fail('One or more selected businesses are invalid or inactive','INVALID_BUSINESS_CAMPAIGN');
  }
  return campaign;
}

async function replaceCampaignUsers(client,campaignId,userIds){
  await client.query('DELETE FROM lead_entitlement_business_campaign_users WHERE campaign_id=$1',[campaignId]);
  if(userIds.length){
    await client.query(`
      INSERT INTO lead_entitlement_business_campaign_users(campaign_id,user_id)
      SELECT $1,UNNEST($2::int[])
      ON CONFLICT DO NOTHING
    `,[campaignId,userIds]);
  }
}

async function campaignAudienceUserIds(client,campaign){
  const values=[];
  const bind=value=>{values.push(value);return '$'+values.length};
  const conditions=["u.role='business'","u.is_active=TRUE"];

  if(campaign.verification_scope==='verified'){
    conditions.push("EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified')");
  }else if(campaign.verification_scope==='unverified'){
    conditions.push("NOT EXISTS(SELECT 1 FROM company_proof_documents cpd WHERE cpd.user_id=u.id AND cpd.status='verified')");
  }
  if(campaign.industry_id){
    const p=bind(Number(campaign.industry_id));
    conditions.push(`EXISTS(
      SELECT 1 FROM business_profiles bp2
      JOIN business_profile_services bps ON bps.business_profile_id=bp2.id
      WHERE bp2.user_id=u.id AND bps.is_active=TRUE AND bps.industry_id=${p}
    )`);
  }
  if(campaign.state_id){
    const p=bind(Number(campaign.state_id));
    conditions.push(`EXISTS(
      SELECT 1 FROM business_profiles bp3
      JOIN business_profile_locations bpl ON bpl.business_profile_id=bp3.id
      WHERE bp3.user_id=u.id AND bpl.is_active=TRUE AND bpl.state_id=${p}
    )`);
  }
  if(campaign.city_id){
    const p=bind(Number(campaign.city_id));
    conditions.push(`EXISTS(
      SELECT 1 FROM business_profiles bp4
      JOIN business_profile_locations bpl2 ON bpl2.business_profile_id=bp4.id
      WHERE bp4.user_id=u.id AND bpl2.is_active=TRUE AND bpl2.city_id=${p}
    )`);
  }
  if(campaign.audience_scope==='specific_users'){
    conditions.push(`EXISTS(
      SELECT 1 FROM lead_entitlement_business_campaign_users cu
      WHERE cu.campaign_id=${bind(Number(campaign.id))} AND cu.user_id=u.id
    )`);
  }

  const result=await client.query(`
    SELECT u.id
    FROM users u
    WHERE ${conditions.join(' AND ')}
    ORDER BY u.id
  `,values);
  return result.rows.map(row=>Number(row.id));
}

async function syncBusinessCampaign(client,campaignId){
  const campaign=(await client.query('SELECT * FROM lead_entitlement_business_campaigns WHERE id=$1 FOR UPDATE',[campaignId])).rows[0];
  if(!campaign)fail('Business entitlement not found','BUSINESS_CAMPAIGN_NOT_FOUND');

  const targetIds=await campaignAudienceUserIds(client,campaign);
  const targetSet=new Set(targetIds);
  await client.query('SELECT id FROM lead_entitlement_grants WHERE campaign_id=$1 FOR UPDATE',[campaignId]);
  const existing=(await client.query(`
    SELECT g.*,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='shared')::int AS used_shared,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='premium')::int AS used_premium
    FROM lead_entitlement_grants g
    LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
    WHERE g.campaign_id=$1
    GROUP BY g.id
  `,[campaignId])).rows;
  const byUser=new Map(existing.map(row=>[Number(row.user_id),row]));

  const deleteIds=[];
  const revokeIds=[];
  for(const row of existing){
    if(targetSet.has(Number(row.user_id)))continue;
    const claims=number(row.used_shared)+number(row.used_premium);
    if(claims===0)deleteIds.push(Number(row.id));
    else if(!row.revoked_at)revokeIds.push(Number(row.id));
  }
  if(deleteIds.length)await client.query('DELETE FROM lead_entitlement_grants WHERE id=ANY($1::int[])',[deleteIds]);
  if(revokeIds.length)await client.query('UPDATE lead_entitlement_grants SET revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=ANY($1::int[])',[revokeIds]);

  const syncNow=new Date();
  const updatePayload=[];
  const insertPayload=[];
  for(const userId of targetIds){
    const row=byUser.get(userId);
    const usedShared=number(row?.used_shared);
    const usedPremium=number(row?.used_premium);
    if(campaign.shared_quantity<usedShared||campaign.premium_quantity<usedPremium){
      fail('Campaign allowance cannot be lower than credits already used by a recipient','CAMPAIGN_ALLOWANCE_BELOW_USAGE');
    }
    const startsAt=row?.revoked_at?syncNow:(row?.starts_at?new Date(row.starts_at):syncNow);
    const expiresAt=Number(campaign.valid_days)>0
      ?new Date(startsAt.getTime()+Number(campaign.valid_days)*86400000)
      :null;
    const timing={starts_at:startsAt.toISOString(),expires_at:expiresAt?expiresAt.toISOString():null};
    if(row)updatePayload.push({id:Number(row.id),...timing});
    else insertPayload.push({user_id:userId,...timing});
  }

  const notes=campaign.notes||`Business entitlement campaign #${campaign.id}: ${campaign.name}`;
  if(updatePayload.length){
    await client.query(`
      UPDATE lead_entitlement_grants g
      SET source='campaign',
          starts_at=u.starts_at,
          shared_quantity=$2,
          premium_quantity=$3,
          expires_at=u.expires_at,
          claim_expiry_days=$4,
          allow_single=$5,
          allow_shared=$6,
          allow_auto_release=$7,
          allow_exclusive=$8,
          notes=$9,
          revoked_at=NULL,
          updated_at=CURRENT_TIMESTAMP
      FROM jsonb_to_recordset($1::jsonb) AS u(id int,starts_at timestamp,expires_at timestamp)
      WHERE g.id=u.id
    `,[
      JSON.stringify(updatePayload),
      campaign.shared_quantity,campaign.premium_quantity,campaign.claim_expiry_days,
      campaign.allow_single,campaign.allow_shared,campaign.allow_auto_release,campaign.allow_exclusive,
      notes
    ]);
  }

  if(insertPayload.length){
    await client.query(`
      INSERT INTO lead_entitlement_grants(
        user_id,source,campaign_id,shared_quantity,premium_quantity,starts_at,expires_at,
        claim_expiry_days,allow_single,allow_shared,allow_auto_release,allow_exclusive,
        created_by,notes
      )
      SELECT u.user_id,'campaign',$2,$3,$4,u.starts_at,u.expires_at,$5,$6,$7,$8,$9,$10,$11
      FROM jsonb_to_recordset($1::jsonb) AS u(user_id int,starts_at timestamp,expires_at timestamp)
      ON CONFLICT DO NOTHING
    `,[
      JSON.stringify(insertPayload),
      campaign.id,campaign.shared_quantity,campaign.premium_quantity,campaign.claim_expiry_days,
      campaign.allow_single,campaign.allow_shared,campaign.allow_auto_release,campaign.allow_exclusive,
      campaign.created_by,notes
    ]);
  }

  return{recipientCount:targetIds.length};
}

async function createBusinessCampaign(input,adminId){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const campaign=await validateBusinessCampaign(normalizeBusinessCampaign(input),client);
    const inserted=(await client.query(`
      INSERT INTO lead_entitlement_business_campaigns(
        name,audience_scope,verification_scope,industry_id,state_id,city_id,
        shared_quantity,premium_quantity,valid_days,claim_expiry_days,
        allow_single,allow_shared,allow_auto_release,allow_exclusive,
        notes,created_by,updated_by
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
      RETURNING *
    `,[
      campaign.name,campaign.audienceScope,campaign.verificationScope,
      campaign.industryId,campaign.stateId,campaign.cityId,
      campaign.sharedQuantity,campaign.premiumQuantity,campaign.validDays,campaign.claimExpiryDays,
      campaign.allowSingle,campaign.allowShared,campaign.allowAutoRelease,campaign.allowExclusive,
      campaign.notes||null,adminId||null
    ])).rows[0];
    await replaceCampaignUsers(client,inserted.id,campaign.audienceScope==='specific_users'?campaign.userIds:[]);
    const sync=await syncBusinessCampaign(client,inserted.id);
    await client.query('COMMIT');
    return{...inserted,...sync};
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

async function updateBusinessCampaign(campaignId,input,adminId){
  const id=int(campaignId,1,2147483647,0);
  if(!id)fail('Invalid business entitlement','INVALID_BUSINESS_CAMPAIGN');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const existing=(await client.query('SELECT * FROM lead_entitlement_business_campaigns WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!existing)fail('Business entitlement not found','BUSINESS_CAMPAIGN_NOT_FOUND');
    const selected=(await client.query('SELECT user_id FROM lead_entitlement_business_campaign_users WHERE campaign_id=$1 ORDER BY user_id',[id])).rows.map(row=>row.user_id);
    const campaign=await validateBusinessCampaign(normalizeBusinessCampaign({
      name:input?.name??existing.name,
      audienceScope:input?.audienceScope??existing.audience_scope,
      verificationScope:input?.verificationScope??existing.verification_scope,
      userIds:input?.userIds??selected,
      industryId:input?.industryId===undefined?existing.industry_id:input.industryId,
      stateId:input?.stateId===undefined?existing.state_id:input.stateId,
      cityId:input?.cityId===undefined?existing.city_id:input.cityId,
      sharedQuantity:input?.sharedQuantity??existing.shared_quantity,
      premiumQuantity:input?.premiumQuantity??existing.premium_quantity,
      validDays:input?.validDays??existing.valid_days,
      claimExpiryDays:input?.claimExpiryDays??existing.claim_expiry_days,
      allowSingle:input?.allowSingle??existing.allow_single,
      allowShared:input?.allowShared??existing.allow_shared,
      allowAutoRelease:input?.allowAutoRelease??existing.allow_auto_release,
      allowExclusive:input?.allowExclusive??existing.allow_exclusive,
      notes:input?.notes??existing.notes
    }),client);

    const updated=(await client.query(`
      UPDATE lead_entitlement_business_campaigns
      SET name=$2,audience_scope=$3,verification_scope=$4,industry_id=$5,state_id=$6,city_id=$7,
          shared_quantity=$8,premium_quantity=$9,valid_days=$10,claim_expiry_days=$11,
          allow_single=$12,allow_shared=$13,allow_auto_release=$14,allow_exclusive=$15,
          notes=$16,updated_by=$17,updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
      RETURNING *
    `,[
      id,campaign.name,campaign.audienceScope,campaign.verificationScope,
      campaign.industryId,campaign.stateId,campaign.cityId,
      campaign.sharedQuantity,campaign.premiumQuantity,campaign.validDays,campaign.claimExpiryDays,
      campaign.allowSingle,campaign.allowShared,campaign.allowAutoRelease,campaign.allowExclusive,
      campaign.notes||null,adminId||null
    ])).rows[0];
    await replaceCampaignUsers(client,id,campaign.audienceScope==='specific_users'?campaign.userIds:[]);
    const sync=await syncBusinessCampaign(client,id);
    await client.query('COMMIT');
    return{...updated,...sync};
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

async function deleteBusinessCampaign(campaignId,adminId){
  const id=int(campaignId,1,2147483647,0);
  if(!id)fail('Invalid business entitlement','INVALID_BUSINESS_CAMPAIGN');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const campaign=(await client.query('SELECT * FROM lead_entitlement_business_campaigns WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!campaign)fail('Business entitlement not found','BUSINESS_CAMPAIGN_NOT_FOUND');
    await client.query('SELECT id FROM lead_entitlement_grants WHERE campaign_id=$1 FOR UPDATE',[id]);
    const grants=(await client.query(`
      SELECT g.id,COUNT(c.id)::int AS claim_count
      FROM lead_entitlement_grants g
      LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
      WHERE g.campaign_id=$1
      GROUP BY g.id
    `,[id])).rows;
    for(const grant of grants){
      if(number(grant.claim_count)===0){
        await client.query('DELETE FROM lead_entitlement_grants WHERE id=$1',[grant.id]);
      }else{
        await client.query(`
          UPDATE lead_entitlement_grants
          SET revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP),
              updated_at=CURRENT_TIMESTAMP,
              notes=CASE
                WHEN notes IS NULL OR notes='' THEN $2
                ELSE notes || E'\\n' || $2
              END
          WHERE id=$1
        `,[grant.id,`Campaign deleted by admin #${adminId}`]);
      }
    }
    await client.query('DELETE FROM lead_entitlement_business_campaigns WHERE id=$1',[id]);
    await client.query('COMMIT');
    return{deleted:true,id};
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

async function createManualGrant(input,adminId,client=pool){
  const userId=int(input?.userId,1,2147483647,0);
  const shared=int(input?.sharedQuantity,0,1000,0);
  const premium=int(input?.premiumQuantity,0,1000,0);
  const validDays=int(input?.validDays,0,3650,30);
  const claimExpiryDays=int(input?.claimExpiryDays,0,3650,0);
  const allowSingle=bool(input?.allowSingle,true);
  const allowShared=bool(input?.allowShared,true);
  const allowAutoRelease=bool(input?.allowAutoRelease,true);
  const allowExclusive=bool(input?.allowExclusive,false);
  const notes=String(input?.notes||'').trim().slice(0,1000);

  if(!userId)fail('Choose a verified business','INVALID_GRANT_USER');
  if(shared<=0&&premium<=0)fail('Grant at least one Basic or Premium lead','INVALID_GRANT_QUANTITY');
  if(!allowSingle&&!allowShared&&!allowAutoRelease){
    fail('Enable at least one buyer-access type','INVALID_ENTITLEMENT_ACCESS');
  }

  const business=await getVerifiedBusiness(userId,client);
  if(!business||business.role!=='business'||business.is_active!==true){
    fail('Lead entitlements can only be granted to active business accounts','INVALID_GRANT_USER');
  }
  if(!business.is_verified){
    fail('Lead entitlements are available only to verified businesses','BUSINESS_NOT_VERIFIED');
  }

  const expiresAt=validDays>0?new Date(Date.now()+validDays*86400000):null;
  const result=await client.query(`
    INSERT INTO lead_entitlement_grants(
      user_id,source,shared_quantity,premium_quantity,starts_at,expires_at,
      claim_expiry_days,allow_single,allow_shared,allow_auto_release,allow_exclusive,
      created_by,notes
    )
    VALUES($1,'admin',$2,$3,CURRENT_TIMESTAMP,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `,[
    userId,shared,premium,expiresAt,claimExpiryDays,
    allowSingle,allowShared,allowAutoRelease,allowExclusive,
    adminId||null,notes||null
  ]);
  return result.rows[0];
}

async function updateGrant(grantId,input,adminId,client=pool){
  const id=int(grantId,1,2147483647,0);
  if(!id)fail('Invalid entitlement grant','INVALID_GRANT');

  const current=(await client.query(`
    SELECT g.*,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='shared')::int AS used_shared,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='premium')::int AS used_premium
    FROM lead_entitlement_grants g
    LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
    WHERE g.id=$1 AND g.revoked_at IS NULL
    GROUP BY g.id
  `,[id])).rows[0];
  if(!current)fail('Entitlement grant not found','GRANT_NOT_FOUND');

  const shared=int(input?.sharedQuantity,0,1000,number(current.shared_quantity));
  const premium=int(input?.premiumQuantity,0,1000,number(current.premium_quantity));
  const usedShared=number(current.used_shared);
  const usedPremium=number(current.used_premium);
  const validDays=int(input?.validDays,0,3650,current.expires_at?Math.max(0,Math.ceil((new Date(current.expires_at)-Date.now())/86400000)):0);
  const claimExpiryDays=int(input?.claimExpiryDays,0,3650,number(current.claim_expiry_days));
  const allowSingle=bool(input?.allowSingle,bool(current.allow_single,true));
  const allowShared=bool(input?.allowShared,bool(current.allow_shared,true));
  const allowAutoRelease=bool(input?.allowAutoRelease,bool(current.allow_auto_release,true));
  const allowExclusive=bool(input?.allowExclusive,bool(current.allow_exclusive,false));
  const notes=String(input?.notes??current.notes??'').trim().slice(0,1000);

  if(shared<=0&&premium<=0)fail('Grant at least one Basic or Premium lead','INVALID_GRANT_QUANTITY');
  if(shared<usedShared||premium<usedPremium)fail('Lead allowance cannot be lower than leads already claimed from this grant','INVALID_GRANT_QUANTITY');
  if(!allowSingle&&!allowShared&&!allowAutoRelease)fail('Enable at least one buyer-access type','INVALID_ENTITLEMENT_ACCESS');

  const expiresAt=validDays>0?new Date(Date.now()+validDays*86400000):null;
  const result=await client.query(`
    UPDATE lead_entitlement_grants
    SET shared_quantity=$2,
        premium_quantity=$3,
        expires_at=$4,
        claim_expiry_days=$5,
        allow_single=$6,
        allow_shared=$7,
        allow_auto_release=$8,
        allow_exclusive=$9,
        notes=$10,
        updated_at=CURRENT_TIMESTAMP
    WHERE id=$1 AND revoked_at IS NULL
    RETURNING *
  `,[id,shared,premium,expiresAt,claimExpiryDays,allowSingle,allowShared,allowAutoRelease,allowExclusive,notes||null]);
  if(!result.rows[0])fail('Entitlement grant not found','GRANT_NOT_FOUND');
  return result.rows[0];
}

async function deleteGrant(grantId,adminId,client=pool){
  const id=int(grantId,1,2147483647,0);
  if(!id)fail('Invalid entitlement grant','INVALID_GRANT');

  const grant=(await client.query('SELECT id,source,revoked_at FROM lead_entitlement_grants WHERE id=$1',[id])).rows[0];
  if(!grant||grant.revoked_at)fail('Entitlement grant not found or already deleted','GRANT_NOT_FOUND');

  const claimCount=number((await client.query('SELECT COUNT(*)::int AS count FROM lead_entitlement_claims WHERE grant_id=$1',[id])).rows[0]?.count);
  if(grant.source==='admin'&&claimCount===0){
    const deleted=(await client.query('DELETE FROM lead_entitlement_grants WHERE id=$1 RETURNING *',[id])).rows[0];
    if(!deleted)fail('Entitlement grant not found','GRANT_NOT_FOUND');
    return{...deleted,deleted:true};
  }

  const result=await client.query(`
    UPDATE lead_entitlement_grants
    SET revoked_at=CURRENT_TIMESTAMP,
        updated_at=CURRENT_TIMESTAMP,
        notes=CASE
          WHEN notes IS NULL OR notes='' THEN $2
          ELSE notes || E'\\n' || $2
        END
    WHERE id=$1 AND revoked_at IS NULL
    RETURNING *
  `,[id,`Deleted by admin #${adminId}`]);

  if(!result.rows[0])fail('Entitlement grant not found or already deleted','GRANT_NOT_FOUND');
  return{...result.rows[0],deleted:true,retained_for_claim_history:true};
}

async function getAdminOverview(client=pool){
  const [registrationRules,businessCampaigns,summaryResult,grantsResult]=await Promise.all([
    listRegistrationRules(client),
    listBusinessCampaigns(client),
    client.query(`
      SELECT
        COUNT(*) FILTER(
          WHERE g.revoked_at IS NULL
            AND g.starts_at<=CURRENT_TIMESTAMP
            AND (g.expires_at IS NULL OR g.expires_at>CURRENT_TIMESTAMP)
        )::int AS active_grants,
        COUNT(*) FILTER(WHERE g.source='new_business' AND g.revoked_at IS NULL)::int AS welcome_grants,
        COUNT(*) FILTER(WHERE g.source='admin' AND g.revoked_at IS NULL)::int AS manual_grants,
        COUNT(*) FILTER(WHERE g.source='campaign' AND g.revoked_at IS NULL)::int AS campaign_grants,
        COALESCE(SUM(g.shared_quantity) FILTER(WHERE g.revoked_at IS NULL),0)::int AS shared_granted,
        COALESCE(SUM(g.premium_quantity) FILTER(WHERE g.revoked_at IS NULL),0)::int AS premium_granted,
        (
          SELECT COUNT(*)::int
          FROM lead_entitlement_claims c
          WHERE c.grant_id IS NOT NULL
        ) AS grant_claims,
        (SELECT COUNT(*)::int FROM lead_entitlement_registration_rules) AS registration_rules,
        (SELECT COUNT(*)::int FROM lead_entitlement_registration_rules WHERE is_active=TRUE) AS active_registration_rules,
        (SELECT COUNT(*)::int FROM lead_entitlement_business_campaigns) AS business_campaigns
      FROM lead_entitlement_grants g
    `),
    client.query(`
      SELECT g.id,g.user_id,g.source,g.registration_rule_id,g.campaign_id,
             g.shared_quantity,g.premium_quantity,
             g.starts_at,g.expires_at,g.claim_expiry_days,
             g.allow_single,g.allow_shared,g.allow_auto_release,g.allow_exclusive,
             g.notes,g.revoked_at,g.created_at,g.updated_at,
             u.name,u.email,bp.business_name,
             COUNT(c.id) FILTER(WHERE c.entitlement_type='shared')::int AS used_shared,
             COUNT(c.id) FILTER(WHERE c.entitlement_type='premium')::int AS used_premium
      FROM lead_entitlement_grants g
      JOIN users u ON u.id=g.user_id
      LEFT JOIN business_profiles bp ON bp.user_id=u.id
      LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
      WHERE g.revoked_at IS NULL AND g.source='admin'
      GROUP BY g.id,u.name,u.email,bp.business_name
      ORDER BY COALESCE(g.updated_at,g.created_at) DESC,g.id DESC
      LIMIT 100
    `)
  ]);
  return{
    registrationRules,
    businessCampaigns,
    summary:summaryResult.rows[0]||{},
    grants:grantsResult.rows
  };
}

module.exports={
  getBusinessContext,getVerifiedBusiness,listRegistrationRules,findRegistrationRuleForBusiness,
  ensureNewBusinessGrant,getActiveGrants,findAvailableGrant,getUserGrantSummary,
  createRegistrationRule,updateRegistrationRule,deleteRegistrationRule,
  listBusinesses,listBusinessCampaigns,createBusinessCampaign,updateBusinessCampaign,deleteBusinessCampaign,
  createManualGrant,updateGrant,deleteGrant,
  getAdminOverview,remainingFor,grantAllowsLead
};
