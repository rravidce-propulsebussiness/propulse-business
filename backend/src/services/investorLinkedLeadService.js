const pool=require('../config/database');

function mapLead(row){
  return{
    ...row,
    cycle_id:row.cycle_id==null?null:Number(row.cycle_id),
    gross_sale_amount:Number(row.gross_sale_amount||0),
    paid_sale_count:Number(row.paid_sale_count||0),
    purchased_buyer_count:Number(row.purchased_buyer_count||0),
    buyer_capacity:Math.max(1,Number(row.buyer_capacity||1)),
    remaining_buyer_slots:Math.max(0,Number(row.buyer_capacity||1)-Number(row.purchased_buyer_count||0)),
    investor_revenue:Number(row.investor_revenue||0)
  };
}

async function getLinkedLeads({investorId,cycleId=null,page=null,limit=null,availability='all'}){
  const id=Number(investorId);
  const cid=cycleId==null?null:Number(cycleId);
  const saleState=String(availability||'all').trim().toLowerCase();
  if(!['all','available','sold'].includes(saleState))throw Object.assign(new Error('Invalid investor lead availability filter'),{code:'INVALID_AVAILABILITY'});
  const paginated=page!==null||limit!==null||saleState!=='all';
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100);
  const safePage=Math.max(Number(page)||1,1);
  const params=cid==null?[id]:[id,cid];
  const cycleClause=cid==null?'':' AND l.cycle_id=$2';
  const buyerCountSql="COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.status='paid')";
  const capacitySql='GREATEST(1,COALESCE(l.buyer_capacity,1))';
  const havingSql=saleState==='sold'
    ?` HAVING ${buyerCountSql} >= ${capacitySql}`
    :saleState==='available'
      ?` HAVING ${buyerCountSql} < ${capacitySql}`
      :'';

  let total=null;
  let pageValue=safePage;
  let paginationSql='';
  let stats=null;
  const dataParams=[...params];

  if(paginated){
    const statsRow=(await pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER(WHERE purchased_buyer_count < buyer_capacity)::int AS available,
             COUNT(*) FILTER(WHERE purchased_buyer_count >= buyer_capacity)::int AS sold
      FROM (
        SELECT l.id,${capacitySql}::int AS buyer_capacity,
               ${buyerCountSql}::int AS purchased_buyer_count
        FROM leads l
        LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
        WHERE l.investor_user_id=$1${cycleClause}
        GROUP BY l.id,l.buyer_capacity
      ) q
    `,params)).rows[0]||{};
    stats={total:Number(statsRow.total||0),available:Number(statsRow.available||0),sold:Number(statsRow.sold||0)};
    total=saleState==='sold'?stats.sold:saleState==='available'?stats.available:stats.total;
    const pages=Math.ceil(total/safeLimit);
    pageValue=pages>0?Math.min(safePage,pages):1;
    dataParams.push(safeLimit,(pageValue-1)*safeLimit);
    paginationSql=` LIMIT $${dataParams.length-1} OFFSET $${dataParams.length}`;
  }

  const leads=(await pool.query(`
    SELECT DISTINCT l.id,l.customer_name AS name,l.customer_phone AS phone,l.customer_email AS email,l.industry_id,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,l.budget,l.requirement AS requirements,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at,l.cycle_id,
      COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS gross_sale_amount,
      COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sale_count,
      ${buyerCountSql}::int AS purchased_buyer_count,
      COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments ix ON ix.id=a.investment_id WHERE ix.user_id=$1 AND a.lead_purchase_id IN (SELECT id FROM lead_purchases WHERE lead_id=l.id)),0) AS investor_revenue
    FROM leads l
    JOIN industries i ON i.id=l.industry_id
    LEFT JOIN services s ON s.id=l.service_id
    LEFT JOIN subservices ss ON ss.id=l.subservice_id
    LEFT JOIN states st ON st.id=l.state_id
    LEFT JOIN cities c ON c.id=l.city_id
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    WHERE l.investor_user_id=$1${cycleClause}
    GROUP BY l.id,l.customer_name,l.customer_phone,l.customer_email,l.industry_id,i.name,s.name,ss.name,st.name,c.name,l.budget,l.requirement,l.property_type,l.source,l.notes,l.custom_fields,l.pricing,l.lead_type,l.is_exclusive,l.exclusive_delay_days,l.buyer_capacity,l.pincode,l.status,l.created_at,l.updated_at,l.cycle_id
    ${havingSql}
    ORDER BY l.created_at DESC,l.id DESC${paginationSql}
  `,dataParams)).rows.map(mapLead);

  if(!paginated)return leads;
  return{leads,total,page:pageValue,limit:safeLimit,pages:Math.max(1,Math.ceil(total/safeLimit)),stats};
}

module.exports={getLinkedLeads};
