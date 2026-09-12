const pool=require('../config/database');

async function getLinkedLeads({investorId}){
  const id=Number(investorId);
  return (await pool.query(`
    SELECT DISTINCT l.id,l.customer_name AS name,l.customer_phone AS phone,l.customer_email AS email,l.industry_id,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,l.budget,l.requirement AS requirements,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at,
      COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS gross_sale_amount,
      COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sale_count,
      COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.status='paid')::int AS purchased_buyer_count,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments ix ON ix.id=a.investment_id WHERE ix.user_id=$1 AND a.lead_purchase_id IN (SELECT id FROM lead_purchases WHERE lead_id=l.id)),0) AS investor_revenue
    FROM leads l
    JOIN industries i ON i.id=l.industry_id
    LEFT JOIN services s ON s.id=l.service_id
    LEFT JOIN subservices ss ON ss.id=l.subservice_id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities c ON c.id=l.city_id
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    WHERE l.investor_user_id=$1
    GROUP BY l.id,l.customer_name,l.customer_phone,l.customer_email,l.industry_id,i.name,s.name,ss.name,st.name,c.name,l.budget,l.requirement,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at
    ORDER BY l.created_at DESC,l.id DESC
  `,[id])).rows.map(row=>({...row,gross_sale_amount:Number(row.gross_sale_amount||0),paid_sale_count:Number(row.paid_sale_count||0),purchased_buyer_count:Number(row.purchased_buyer_count||0),buyer_capacity:Math.max(1,Number(row.buyer_capacity||1)),remaining_buyer_slots:Math.max(0,Number(row.buyer_capacity||1)-Number(row.purchased_buyer_count||0)),investor_revenue:Number(row.investor_revenue||0)}));
}

module.exports={getLinkedLeads};
