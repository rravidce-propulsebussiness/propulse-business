const pool=require('../config/database');
const base=require('./leadPurchaseCouponService');
async function getPurchases(userId){const leads=await base.getPurchases(userId);if(!leads.length)return leads;const crmRows=(await pool.query(`SELECT crm.lead_id,crm.status AS crm_status,COALESCE(crm.remarks,'') AS crm_remarks,crm.last_followed_up_at,crm.next_followup_at,COALESCE(crm.followup_count,0)::int AS followup_count,crm.contacted_by_user_id,COALESCE(u.name,'') AS contacted_by_name FROM lead_crm crm LEFT JOIN users u ON u.id=crm.contacted_by_user_id WHERE crm.user_id=$1 AND crm.lead_id=ANY($2::int[])`,[userId,leads.map(x=>Number(x.lead_id))])).rows;const byLead=new Map(crmRows.map(x=>[Number(x.lead_id),x]));return leads.map(lead=>({...lead,...(byLead.get(Number(lead.lead_id))||{crm_status:'new',crm_remarks:'',last_followed_up_at:null,next_followup_at:null,followup_count:0,contacted_by_user_id:null,contacted_by_name:''})}));}
async function getHistory(userId){
  return (await pool.query(`
    SELECT l.id AS lead_id,
           COALESCE(lp.id,c.id) AS access_id,
           COALESCE(lp.shares,1)::int AS shares,
           COALESCE(lp.amount,0)::numeric AS amount,
           COALESCE(lp.pricing_tier,CASE WHEN c.grant_id IS NOT NULL THEN 'entitlement' ELSE 'membership' END) AS pricing_tier,
           COALESCE(lp.status,'claimed') AS purchase_status,
           lp.payment_id,
           lp.created_at AS purchase_created_at,
           c.id AS claim_id,c.claimed_at,c.expires_at,c.entitlement_type,c.membership_id,c.grant_id,
           CASE WHEN c.id IS NOT NULL AND lp.id IS NULL
             THEN CASE WHEN c.grant_id IS NOT NULL THEN 'entitlement' ELSE 'membership' END
             ELSE COALESCE(pay.payment_method,'')
           END AS payment_method,
           CASE WHEN c.id IS NOT NULL AND lp.id IS NULL THEN 'claimed' ELSE COALESCE(pay.status,'') END AS payment_status,
           COALESCE(pay.wallet_amount,0)::numeric AS wallet_amount,
           COALESCE(pay.external_amount,0)::numeric AS external_amount,
           COALESCE(pay.manual_reference,'') AS manual_reference,
           l.industry_id,l.service_id,l.subservice_id,l.state_id,
           l.customer_name,l.customer_phone,l.customer_email,l.requirement,l.property_type,l.budget,
           l.custom_fields,l.buyer_capacity,l.source,l.notes,
           i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,
           st.name AS state_name,cit.name AS city_name,
           crm.status AS crm_status,COALESCE(crm.remarks,'') AS crm_remarks,
           crm.last_followed_up_at,crm.next_followup_at,COALESCE(crm.followup_count,0)::int AS followup_count,
           COALESCE(lp.created_at,c.claimed_at) AS created_at
    FROM leads l
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id AND lp.user_id=$1 AND lp.status='paid'
    LEFT JOIN lead_entitlement_claims c ON c.lead_id=l.id AND c.user_id=$1
    LEFT JOIN payments pay ON pay.id=lp.payment_id
    LEFT JOIN lead_crm crm ON crm.lead_id=l.id AND crm.user_id=$1
    LEFT JOIN industries i ON i.id=l.industry_id
    LEFT JOIN services s ON s.id=l.service_id
    LEFT JOIN subservices ss ON ss.id=l.subservice_id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities cit ON cit.id=l.city_id
    WHERE lp.id IS NOT NULL OR c.id IS NOT NULL
    ORDER BY COALESCE(lp.created_at,c.claimed_at) DESC,l.id DESC
  `,[userId])).rows.map(row=>({
    ...row,
    amount:Number(row.amount||0),
    wallet_amount:Number(row.wallet_amount||0),
    external_amount:Number(row.external_amount||0)
  }));
}

async function getExportPurchases(userId,{from,to}={}){const params=[userId],filters=[];if(from){params.push(from);filters.push(`COALESCE(p.created_at,c.claimed_at) >= $${params.length}`)}if(to){params.push(to);filters.push(`COALESCE(p.created_at,c.claimed_at) < $${params.length}`)}const where=filters.length?` AND ${filters.join(' AND ')}`:'';return (await pool.query(`SELECT l.id AS lead_id,l.customer_name,l.customer_phone,l.customer_email,l.requirement,l.property_type,l.budget,l.source,l.notes,l.custom_fields,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,cit.name AS city_name,COALESCE(p.created_at,c.claimed_at) AS access_date,CASE WHEN c.id IS NOT NULL AND p.id IS NULL THEN 'Membership' ELSE INITCAP(COALESCE(p.pricing_tier,'normal')) END AS access_type,COALESCE(p.shares,1)::int AS shares,crm.status AS crm_status,COALESCE(crm.remarks,'') AS crm_remarks,crm.last_followed_up_at,crm.next_followup_at,COALESCE(crm.followup_count,0)::int AS followup_count,COALESCE(cu.name,'') AS contacted_by_name FROM leads l LEFT JOIN lead_purchases p ON p.lead_id=l.id AND p.user_id=$1 AND p.status='paid' LEFT JOIN lead_entitlement_claims c ON c.lead_id=l.id AND c.user_id=$1 LEFT JOIN lead_crm crm ON crm.lead_id=l.id AND crm.user_id=$1 LEFT JOIN users cu ON cu.id=crm.contacted_by_user_id LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities cit ON cit.id=l.city_id WHERE (p.id IS NOT NULL OR c.id IS NOT NULL)${where} ORDER BY COALESCE(p.created_at,c.claimed_at) DESC`,params)).rows;}
module.exports={...base,getPurchases,getHistory,getExportPurchases};