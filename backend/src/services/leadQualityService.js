const pool=require('../config/database');

const MAX={completeness:45,validity:25,uniqueness:15,outcome:15,total:100};
const round2=value=>Number((Number(value||0)).toFixed(2));
const bool=value=>value===true||value==='t'||value===1||value==='1';

function bandFor(score){
  if(score===null||score===undefined)return'no_data';
  if(score>=90)return'excellent';
  if(score>=80)return'strong';
  if(score>=70)return'review';
  return'attention';
}
function confidenceFor(total,purchased,reviewed){
  if(total<=0)return'none';
  if(total>=50&&(purchased>=10||reviewed>=5))return'high';
  if(total>=10)return'medium';
  return'low';
}
function labelForIssue(key){
  const labels={
    missingContact:'Missing contact',
    invalidContact:'Invalid contact',
    missingRequirement:'Missing requirement',
    missingClassification:'Missing classification',
    missingLocation:'Missing location',
    invalidPincode:'Invalid PIN',
    pincodeCityMismatch:'PIN / City mismatch',
    duplicatePhone:'Duplicate phone',
    duplicateEmail:'Duplicate email',
    duplicateIdentity:'Duplicate customer + requirement',
    classificationMismatch:'Classification mismatch',
    invalidStatus:'Invalid lead status',
    verifiedFake:'Verified fake'
  };
  return labels[key]||key;
}
function normalizeRiskCounts(input={}){
  return Object.fromEntries(Object.entries({
    missingContact:Number(input.missingContact||0),
    invalidContact:Number(input.invalidContact||0),
    missingRequirement:Number(input.missingRequirement||0),
    missingClassification:Number(input.missingClassification||0),
    missingLocation:Number(input.missingLocation||0),
    invalidPincode:Number(input.invalidPincode||0),
    pincodeCityMismatch:Number(input.pincodeCityMismatch||0),
    duplicatePhone:Number(input.duplicatePhone||0),
    duplicateEmail:Number(input.duplicateEmail||0),
    duplicateIdentity:Number(input.duplicateIdentity||0),
    classificationMismatch:Number(input.classificationMismatch||0),
    invalidStatus:Number(input.invalidStatus||0),
    verifiedFake:Number(input.verifiedFake||0)
  }).map(([key,value])=>[key,Math.max(0,value)]));
}
function buildQualityFromAggregate(row={}){
  const total=Number(row.total_leads||0);
  const purchased=Number(row.purchased_leads||0);
  const verifiedFake=Number(row.verified_fake_leads||0);
  const verifiedGenuineReports=Number(row.verified_genuine_reports||0);
  const reviewedLeads=Number(row.reviewed_leads||0);
  const riskCounts=normalizeRiskCounts({
    missingContact:row.missing_contact,
    invalidContact:row.invalid_contact,
    missingRequirement:row.missing_requirement,
    missingClassification:row.missing_classification,
    missingLocation:row.missing_location,
    invalidPincode:row.invalid_pincode,
    pincodeCityMismatch:row.pincode_city_mismatch,
    duplicatePhone:row.duplicate_phone,
    duplicateEmail:row.duplicate_email,
    duplicateIdentity:row.duplicate_identity,
    classificationMismatch:row.classification_mismatch,
    invalidStatus:row.invalid_status,
    verifiedFake
  });
  if(total<=0){
    return{
      score:null,band:'no_data',confidence:'none',sampleSize:0,
      breakdown:{completeness:{score:0,max:MAX.completeness},validity:{score:0,max:MAX.validity},uniqueness:{score:0,max:MAX.uniqueness},outcome:{score:0,max:MAX.outcome}},
      riskCounts,topIssues:[],totalLeads:0,purchasedLeads:purchased,verifiedFakeLeads:verifiedFake,
      verifiedGenuineReports,verifiedFakeRatePct:0,
      fakeRateDefinition:'Verified fake partner leads divided by distinct partner leads with at least one completed purchase, including purchases later refunded after an Admin-verified fake decision.',
      scoreDefinition:'Average per-lead score: completeness 45, validity 25, uniqueness 15 and verified buyer outcome 15.'
    };
  }
  const completeness=round2(Number(row.completeness_points||0)/total);
  const validity=round2(Number(row.validity_points||0)/total);
  const uniqueness=round2(Number(row.uniqueness_points||0)/total);
  const outcome=round2(Number(row.outcome_points||0)/total);
  const score=round2(Math.max(0,Math.min(100,completeness+validity+uniqueness+outcome)));
  const topIssues=Object.entries(riskCounts).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([key,count])=>({key,label:labelForIssue(key),count}));
  return{
    score,band:bandFor(score),confidence:confidenceFor(total,purchased,reviewedLeads),sampleSize:total,
    breakdown:{
      completeness:{score:completeness,max:MAX.completeness},
      validity:{score:validity,max:MAX.validity},
      uniqueness:{score:uniqueness,max:MAX.uniqueness},
      outcome:{score:outcome,max:MAX.outcome}
    },
    riskCounts,topIssues,totalLeads:total,purchasedLeads:purchased,verifiedFakeLeads:verifiedFake,
    verifiedGenuineReports,
    verifiedFakeRatePct:purchased>0?round2(verifiedFake*100/purchased):0,
    fakeRateDefinition:'Verified fake partner leads divided by distinct partner leads with at least one completed purchase, including purchases later refunded after an Admin-verified fake decision.',
    scoreDefinition:'Average per-lead score: completeness 45, validity 25, uniqueness 15 and verified buyer outcome 15.'
  };
}

const FEATURE_CTES=`
WITH partner_leads AS (
  SELECT l.id,l.lead_partner_id,l.customer_name,l.customer_phone,l.customer_email,l.requirement,
         l.industry_id,l.service_id,l.subservice_id,l.state_id,l.city_id,l.pincode,l.property_type,
         l.budget,l.source,l.status,l.custom_fields,
         regexp_replace(COALESCE(l.customer_phone,''),'[^0-9]','','g') AS phone_key,
         LOWER(TRIM(COALESCE(l.customer_email,''))) AS email_key,
         CASE
           WHEN NULLIF(LOWER(TRIM(COALESCE(l.customer_name,''))),'') IS NOT NULL
            AND NULLIF(LOWER(TRIM(COALESCE(l.requirement,''))),'') IS NOT NULL
           THEN md5(LOWER(TRIM(l.customer_name)) || '|' || LOWER(TRIM(l.requirement)))
           ELSE ''
         END AS identity_key
  FROM leads l
  WHERE l.lead_partner_id=ANY($1::int[])
),
report_stats AS (
  SELECT r.lead_id,
         BOOL_OR(r.status='verified_fake') AS verified_fake,
         BOOL_OR(r.status='verified_genuine') AS verified_genuine,
         COUNT(*) FILTER(WHERE r.status='verified_genuine')::int AS verified_genuine_reports,
         BOOL_OR(r.status IN ('verified_fake','verified_genuine')) AS reviewed
  FROM lead_reports r
  JOIN partner_leads pl ON pl.id=r.lead_id
  GROUP BY r.lead_id
),
purchase_stats AS (
  SELECT p.lead_id,BOOL_OR(p.status IN ('paid','refunded')) AS purchased
  FROM lead_purchases p
  JOIN partner_leads pl ON pl.id=p.lead_id
  GROUP BY p.lead_id
),
joined AS (
  SELECT pl.*,
         s.industry_id AS service_industry_id,
         ss.service_id AS subservice_service_id,
         COALESCE(rs.verified_fake,FALSE) AS verified_fake,
         COALESCE(rs.verified_genuine,FALSE) AS verified_genuine,
         COALESCE(rs.verified_genuine_reports,0)::int AS verified_genuine_reports,
         COALESCE(rs.reviewed,FALSE) AS reviewed,
         COALESCE(ps.purchased,FALSE) AS purchased,
         EXISTS(
           SELECT 1 FROM city_pincodes cp
           WHERE cp.pincode=pl.pincode AND cp.city_id=pl.city_id AND cp.is_active=TRUE
         ) AS pincode_city_mapped
  FROM partner_leads pl
  LEFT JOIN services s ON s.id=pl.service_id
  LEFT JOIN subservices ss ON ss.id=pl.subservice_id
  LEFT JOIN report_stats rs ON rs.lead_id=pl.id
  LEFT JOIN purchase_stats ps ON ps.lead_id=pl.id
),
ranked AS (
  SELECT j.*,
         COUNT(*) OVER(PARTITION BY lead_partner_id,phone_key) AS phone_count,
         COUNT(*) OVER(PARTITION BY lead_partner_id,email_key) AS email_count,
         COUNT(*) OVER(PARTITION BY lead_partner_id,identity_key) AS identity_count
  FROM joined j
),
features AS (
  SELECT r.*,
    NULLIF(TRIM(COALESCE(customer_name,'')),'') IS NOT NULL AS has_name,
    (NULLIF(TRIM(COALESCE(customer_phone,'')),'') IS NOT NULL OR NULLIF(TRIM(COALESCE(customer_email,'')),'') IS NOT NULL) AS has_contact,
    NULLIF(TRIM(COALESCE(requirement,'')),'') IS NOT NULL AS has_requirement,
    industry_id IS NOT NULL AS has_industry,
    (service_id IS NOT NULL OR subservice_id IS NOT NULL) AS has_service_detail,
    state_id IS NOT NULL AS has_state,
    city_id IS NOT NULL AS has_city,
    NULLIF(TRIM(COALESCE(pincode,'')),'') IS NOT NULL AS has_pincode,
    (NULLIF(TRIM(COALESCE(property_type,'')),'') IS NOT NULL OR NULLIF(TRIM(COALESCE(budget::text,'')),'') IS NOT NULL OR COALESCE(custom_fields,'{}'::jsonb)<>'{}'::jsonb) AS has_project_detail,
    (
      char_length(phone_key) BETWEEN 10 AND 13
      OR LOWER(TRIM(COALESCE(customer_email,''))) ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
    ) AS valid_contact,
    COALESCE(pincode,'') ~ '^[0-9]{6}$' AS valid_pincode,
    (
      industry_id IS NOT NULL
      AND (service_id IS NULL OR service_industry_id=industry_id)
      AND (subservice_id IS NULL OR (service_id IS NOT NULL AND subservice_service_id=service_id))
    ) AS classification_valid,
    (phone_key='' OR phone_count=1) AS unique_phone,
    (email_key='' OR email_count=1) AS unique_email,
    (identity_key='' OR identity_count=1) AS unique_identity
  FROM ranked r
)
`;

async function getPartnerQualityBatch(partnerIds,client=pool){
  const ids=[...new Set((Array.isArray(partnerIds)?partnerIds:[partnerIds]).map(Number).filter(id=>Number.isInteger(id)&&id>0))];
  const out=new Map();
  if(!ids.length)return out;
  const result=await client.query(`${FEATURE_CTES}
    SELECT lead_partner_id,
      COUNT(*)::int AS total_leads,
      COUNT(*) FILTER(WHERE purchased)::int AS purchased_leads,
      COUNT(*) FILTER(WHERE verified_fake)::int AS verified_fake_leads,
      COALESCE(SUM(verified_genuine_reports),0)::int AS verified_genuine_reports,
      COUNT(*) FILTER(WHERE reviewed)::int AS reviewed_leads,
      COALESCE(SUM(
        (CASE WHEN has_name THEN 6 ELSE 0 END)
        +(CASE WHEN has_contact THEN 10 ELSE 0 END)
        +(CASE WHEN has_requirement THEN 8 ELSE 0 END)
        +(CASE WHEN has_industry THEN 5 ELSE 0 END)
        +(CASE WHEN has_service_detail THEN 4 ELSE 0 END)
        +(CASE WHEN has_state THEN 3 ELSE 0 END)
        +(CASE WHEN has_city THEN 4 ELSE 0 END)
        +(CASE WHEN has_pincode THEN 3 ELSE 0 END)
        +(CASE WHEN has_project_detail THEN 2 ELSE 0 END)
      ),0)::numeric AS completeness_points,
      COALESCE(SUM(
        (CASE WHEN valid_contact THEN 8 ELSE 0 END)
        +(CASE WHEN valid_pincode THEN 5 ELSE 0 END)
        +(CASE WHEN pincode_city_mapped THEN 5 ELSE 0 END)
        +(CASE WHEN classification_valid THEN 5 ELSE 0 END)
        +(CASE WHEN status<>'invalid' THEN 2 ELSE 0 END)
      ),0)::numeric AS validity_points,
      COALESCE(SUM(
        (CASE WHEN unique_phone THEN 8 ELSE 0 END)
        +(CASE WHEN unique_email THEN 4 ELSE 0 END)
        +(CASE WHEN unique_identity THEN 3 ELSE 0 END)
      ),0)::numeric AS uniqueness_points,
      COALESCE(SUM(
        CASE WHEN verified_fake THEN 0
             WHEN verified_genuine THEN 15
             WHEN purchased THEN 12
             ELSE 10 END
      ),0)::numeric AS outcome_points,
      COUNT(*) FILTER(WHERE NOT has_contact)::int AS missing_contact,
      COUNT(*) FILTER(WHERE has_contact AND NOT valid_contact)::int AS invalid_contact,
      COUNT(*) FILTER(WHERE NOT has_requirement)::int AS missing_requirement,
      COUNT(*) FILTER(WHERE NOT has_industry)::int AS missing_classification,
      COUNT(*) FILTER(WHERE NOT has_state OR NOT has_city)::int AS missing_location,
      COUNT(*) FILTER(WHERE NOT valid_pincode)::int AS invalid_pincode,
      COUNT(*) FILTER(WHERE valid_pincode AND has_city AND NOT pincode_city_mapped)::int AS pincode_city_mismatch,
      COUNT(*) FILTER(WHERE phone_key<>'' AND NOT unique_phone)::int AS duplicate_phone,
      COUNT(*) FILTER(WHERE email_key<>'' AND NOT unique_email)::int AS duplicate_email,
      COUNT(*) FILTER(WHERE identity_key<>'' AND NOT unique_identity)::int AS duplicate_identity,
      COUNT(*) FILTER(WHERE NOT classification_valid)::int AS classification_mismatch,
      COUNT(*) FILTER(WHERE status='invalid')::int AS invalid_status
    FROM features
    GROUP BY lead_partner_id`,[ids]);
  for(const id of ids)out.set(id,buildQualityFromAggregate({total_leads:0}));
  for(const row of result.rows)out.set(Number(row.lead_partner_id),buildQualityFromAggregate(row));
  return out;
}
async function getPartnerQuality(partnerId,client=pool){
  const id=Number(partnerId);
  if(!Number.isInteger(id)||id<=0)throw new Error('Invalid Lead Partner ID');
  return(await getPartnerQualityBatch([id],client)).get(id)||buildQualityFromAggregate({total_leads:0});
}
function scoreLeadFeature(row){
  const completeness=(bool(row.has_name)?6:0)+(bool(row.has_contact)?10:0)+(bool(row.has_requirement)?8:0)+(bool(row.has_industry)?5:0)+(bool(row.has_service_detail)?4:0)+(bool(row.has_state)?3:0)+(bool(row.has_city)?4:0)+(bool(row.has_pincode)?3:0)+(bool(row.has_project_detail)?2:0);
  const validity=(bool(row.valid_contact)?8:0)+(bool(row.valid_pincode)?5:0)+(bool(row.pincode_city_mapped)?5:0)+(bool(row.classification_valid)?5:0)+(String(row.status)!=='invalid'?2:0);
  const uniqueness=(bool(row.unique_phone)?8:0)+(bool(row.unique_email)?4:0)+(bool(row.unique_identity)?3:0);
  const outcome=bool(row.verified_fake)?0:(bool(row.verified_genuine)?15:(bool(row.purchased)?12:10));
  const score=round2(completeness+validity+uniqueness+outcome);
  const flags=[];
  if(!bool(row.has_contact))flags.push('missing_contact');
  else if(!bool(row.valid_contact))flags.push('invalid_contact');
  if(!bool(row.has_requirement))flags.push('missing_requirement');
  if(!bool(row.has_industry))flags.push('missing_classification');
  if(!bool(row.has_state)||!bool(row.has_city))flags.push('missing_location');
  if(!bool(row.valid_pincode))flags.push('invalid_pincode');
  else if(bool(row.has_city)&&!bool(row.pincode_city_mapped))flags.push('pincode_city_mismatch');
  if(String(row.phone_key||'')&&!bool(row.unique_phone))flags.push('duplicate_phone');
  if(String(row.email_key||'')&&!bool(row.unique_email))flags.push('duplicate_email');
  if(String(row.identity_key||'')&&!bool(row.unique_identity))flags.push('duplicate_identity');
  if(!bool(row.classification_valid))flags.push('classification_mismatch');
  if(String(row.status)==='invalid')flags.push('invalid_status');
  if(bool(row.verified_fake))flags.push('verified_fake');
  return{score,band:bandFor(score),breakdown:{completeness:{score:completeness,max:MAX.completeness},validity:{score:validity,max:MAX.validity},uniqueness:{score:uniqueness,max:MAX.uniqueness},outcome:{score:outcome,max:MAX.outcome}},flags};
}
async function getLeadQualityMap(partnerId,client=pool){
  const id=Number(partnerId);
  if(!Number.isInteger(id)||id<=0)throw new Error('Invalid Lead Partner ID');
  const result=await client.query(`${FEATURE_CTES}
    SELECT id,status,phone_key,email_key,identity_key,verified_fake,verified_genuine,purchased,
           has_name,has_contact,has_requirement,has_industry,has_service_detail,has_state,has_city,has_pincode,has_project_detail,
           valid_contact,valid_pincode,pincode_city_mapped,classification_valid,unique_phone,unique_email,unique_identity
    FROM features
    ORDER BY id DESC`,[[id]]);
  return new Map(result.rows.map(row=>[Number(row.id),scoreLeadFeature(row)]));
}

module.exports={MAX,bandFor,confidenceFor,buildQualityFromAggregate,getPartnerQualityBatch,getPartnerQuality,getLeadQualityMap,scoreLeadFeature};
