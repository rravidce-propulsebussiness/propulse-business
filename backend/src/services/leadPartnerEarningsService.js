const pool=require('../config/database');
const leadQualityService=require('./leadQualityService');
async function getCommissionPercent(client=pool){const row=(await client.query('SELECT commission_percent FROM lead_partner_settings WHERE id=1')).rows[0]||{};const value=Number(row.commission_percent??5);return Number.isFinite(value)?Math.max(0,Math.min(100,value)):5}
async function applyOutstandingRecovery(client,earning){
  const outstanding=(await client.query(`SELECT id,amount FROM lead_partner_earning_adjustments WHERE partner_id=$1 AND status='outstanding' ORDER BY created_at,id FOR UPDATE`,[earning.partner_id])).rows;
  let remaining=Number(earning.earning_amount||0);
  for(const adjustment of outstanding){
    if(remaining<=0.001)break;
    const already=Number((await client.query(`SELECT COALESCE(SUM(amount),0) total FROM lead_partner_earning_adjustment_allocations WHERE adjustment_id=$1`,[adjustment.id])).rows[0].total||0);
    const due=Math.max(0,Number(adjustment.amount)-already);
    const allocation=Number(Math.min(due,remaining).toFixed(2));
    if(allocation<=0)continue;
    await client.query(`INSERT INTO lead_partner_earning_adjustment_allocations(adjustment_id,earning_id,amount) VALUES($1,$2,$3) ON CONFLICT(adjustment_id,earning_id) DO NOTHING`,[adjustment.id,earning.id,allocation]);
    await client.query(`UPDATE lead_partner_earning_adjustments SET status=CASE WHEN (SELECT COALESCE(SUM(amount),0) FROM lead_partner_earning_adjustment_allocations WHERE adjustment_id=$1)>=amount THEN 'recovered' ELSE 'outstanding' END,recovered_at=CASE WHEN (SELECT COALESCE(SUM(amount),0) FROM lead_partner_earning_adjustment_allocations WHERE adjustment_id=$1)>=amount THEN CURRENT_TIMESTAMP ELSE recovered_at END,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[adjustment.id]);
    remaining=Number((remaining-allocation).toFixed(2));
  }
}
async function createForPurchase(client,{leadId,leadPurchaseId,paymentId,grossAmount}){const lead=(await client.query(`SELECT l.id,l.lead_partner_id,lp.user_id FROM leads l JOIN lead_partners lp ON lp.id=l.lead_partner_id WHERE l.id=$1 FOR UPDATE OF l,lp`,[Number(leadId)])).rows[0];if(!lead?.lead_partner_id)return null;const gross=Number(grossAmount||0);if(!Number.isFinite(gross)||gross<=0)return null;const commissionPercent=await getCommissionPercent(client),earningAmount=Number((gross-(gross*commissionPercent/100)).toFixed(2));const result=await client.query(`INSERT INTO lead_partner_earnings(partner_id,user_id,lead_id,lead_purchase_id,payment_id,gross_sale_amount,commission_percent,earning_amount,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'available') ON CONFLICT(lead_purchase_id) DO NOTHING RETURNING *`,[lead.lead_partner_id,lead.user_id,Number(leadId),Number(leadPurchaseId),paymentId?Number(paymentId):null,gross,commissionPercent,earningAmount]);const earning=result.rows[0]||null;if(earning)await applyOutstandingRecovery(client,earning);return earning}
async function reverseForPurchase(client,leadPurchaseId,reason='Verified fake lead'){
  const id=Number(leadPurchaseId);
  const locked=(await client.query(`SELECT * FROM lead_partner_earnings WHERE lead_purchase_id=$1 FOR UPDATE`,[id])).rows[0]||null;
  if(!locked||!['available','paid'].includes(locked.status))return null;
  const row=(await client.query(`UPDATE lead_partner_earnings SET status='reversed',reversal_reason=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[locked.id,reason])).rows[0]||null;
  if(!row)return null;
  const paidAmount=Number((await client.query(`SELECT COALESCE(SUM(i.amount),0) total FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=$1 AND i.status='paid' AND r.status='paid'`,[row.id])).rows[0].total||0);
  if(paidAmount>0)await client.query(`INSERT INTO lead_partner_earning_adjustments(partner_id,user_id,earning_id,lead_purchase_id,amount,type,status,reason) VALUES($1,$2,$3,$4,$5,'fake_lead_recovery','outstanding',$6) ON CONFLICT(type,lead_purchase_id) DO NOTHING`,[row.partner_id,row.user_id,row.id,row.lead_purchase_id,Number(paidAmount.toFixed(2)),reason]);
  const pendingItems=(await client.query(`SELECT i.payout_id FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=$1 AND i.status='reserved' AND r.status='pending' GROUP BY i.payout_id`,[row.id])).rows;
  await client.query(`UPDATE lead_partner_payout_items SET status='released',updated_at=CURRENT_TIMESTAMP WHERE earning_id=$1 AND status='reserved'`,[row.id]);
  for(const item of pendingItems){
    const remaining=(await client.query(`SELECT COALESCE(SUM(amount),0) AS total FROM lead_partner_payout_items WHERE payout_id=$1 AND status='reserved'`,[item.payout_id])).rows[0].total;
    if(Number(remaining)>0)await client.query(`UPDATE lead_partner_payout_requests SET amount=$1,notes=COALESCE(notes,'') || CASE WHEN COALESCE(notes,'')='' THEN 'Earning reversed; affected allocation released.' ELSE ' Earning reversed; affected allocation released.' END,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND status='pending'`,[Number(Number(remaining).toFixed(2)),item.payout_id]);
    else await client.query(`UPDATE lead_partner_payout_requests SET status='rejected',rejection_reason=$1,processed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND status='pending'`,['Earning reversed because the related lead was verified fake.',item.payout_id]);
  }
  return row;
}
async function getAdminPartnerFinancials(partnerId,client=pool){
  const id=Number(partnerId);
  if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('Invalid Lead Partner ID'),{code:'PARTNER_NOT_FOUND'});

  const partner=(await client.query(`
    SELECT lp.id,lp.user_id,lp.status,lp.quality_score,lp.created_at,lp.updated_at,
           u.name AS user_name,u.email AS user_email,
           bp.business_name,bp.phone AS business_phone,
           pa.method AS payout_method,pa.account_holder_name,pa.account_number,
           pa.ifsc_code,pa.bank_name,pa.upi_id
    FROM lead_partners lp
    JOIN users u ON u.id=lp.user_id
    LEFT JOIN business_profiles bp ON bp.user_id=lp.user_id
    LEFT JOIN LATERAL (
      SELECT method,account_holder_name,account_number,ifsc_code,bank_name,upi_id
      FROM lead_partner_payout_accounts
      WHERE user_id=lp.user_id AND is_active=TRUE
      ORDER BY updated_at DESC,id DESC
      LIMIT 1
    ) pa ON TRUE
    WHERE lp.id=$1
  `,[id])).rows[0];
  if(!partner)throw Object.assign(new Error('Lead Partner not found'),{code:'PARTNER_NOT_FOUND'});

  const [summaryResult,recoveryResult,historyResult,leadsResult,payoutsResult]=await Promise.all([
    client.query(`
      SELECT
        COALESCE(SUM(e.earning_amount-COALESCE(x.adjusted,0)-COALESCE(x.reserved,0)-COALESCE(x.paid,0))
          FILTER(WHERE e.status='available'),0)::numeric AS available_earnings,
        COALESCE(SUM(COALESCE(x.paid,0)),0)::numeric AS paid_earnings,
        COALESCE(SUM(COALESCE(x.reserved,0)) FILTER(WHERE e.status='available'),0)::numeric AS reserved_earnings,
        COALESCE(SUM(e.earning_amount) FILTER(WHERE e.status='reversed'),0)::numeric AS reversed_earnings,
        COALESCE(SUM(e.gross_sale_amount) FILTER(WHERE e.status<>'reversed'),0)::numeric AS gross_sales,
        COALESCE(SUM(e.earning_amount) FILTER(WHERE e.status<>'reversed'),0)::numeric AS generated_earnings,
        COUNT(*)::int AS earning_events
      FROM lead_partner_earnings e
      LEFT JOIN LATERAL(
        SELECT
          COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) adjusted,
          COALESCE(SUM(i.amount) FILTER(WHERE i.status='reserved' AND r.status='pending'),0) reserved,
          COALESCE(SUM(i.amount) FILTER(WHERE i.status='paid' AND r.status='paid'),0) paid
        FROM lead_partner_payout_items i
        JOIN lead_partner_payout_requests r ON r.id=i.payout_id
        WHERE i.earning_id=e.id
      )x ON TRUE
      WHERE e.partner_id=$1
    `,[id]),
    client.query(`
      SELECT
        COALESCE(SUM(amount),0)::numeric total,
        COALESCE(SUM(
          CASE WHEN status='outstanding'
            THEN amount-COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.adjustment_id=lead_partner_earning_adjustments.id),0)
            ELSE 0 END
        ),0)::numeric outstanding
      FROM lead_partner_earning_adjustments
      WHERE partner_id=$1
    `,[id]),
    client.query(`
      SELECT e.*,l.customer_name,l.requirement,l.status lead_status,
             i.name industry_name,s.name service_name,c.name city_name,
             COALESCE((SELECT SUM(pi.amount) FROM lead_partner_payout_items pi WHERE pi.earning_id=e.id AND pi.status='reserved'),0)::numeric reserved_payout,
             COALESCE((SELECT SUM(pi.amount) FROM lead_partner_payout_items pi WHERE pi.earning_id=e.id AND pi.status='paid'),0)::numeric paid_payout,
             COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0)::numeric recovery_allocated
      FROM lead_partner_earnings e
      JOIN leads l ON l.id=e.lead_id
      LEFT JOIN industries i ON i.id=l.industry_id
      LEFT JOIN services s ON s.id=l.service_id
      LEFT JOIN cities c ON c.id=l.city_id
      WHERE e.partner_id=$1
      ORDER BY e.created_at DESC,e.id DESC
      LIMIT 500
    `,[id]),
    client.query(`
      WITH purchase_stats AS (
        SELECT lead_id,
               COUNT(*) FILTER(WHERE status IN ('paid','refunded'))::int AS purchase_count,
               COALESCE(SUM(amount) FILTER(WHERE status='paid'),0)::numeric AS paid_sales,
               COALESCE(SUM(amount) FILTER(WHERE status='refunded'),0)::numeric AS refunded_sales,
               MAX(created_at) FILTER(WHERE status IN ('paid','refunded')) AS last_purchase_at
        FROM lead_purchases
        GROUP BY lead_id
      ),
      earning_stats AS (
        SELECT lead_id,
               COALESCE(SUM(gross_sale_amount) FILTER(WHERE status<>'reversed'),0)::numeric AS gross_sales,
               COALESCE(SUM(earning_amount) FILTER(WHERE status<>'reversed'),0)::numeric AS generated_earning,
               COALESCE(SUM(earning_amount) FILTER(WHERE status='reversed'),0)::numeric AS reversed_earning
        FROM lead_partner_earnings
        WHERE partner_id=$1
        GROUP BY lead_id
      ),
      report_stats AS (
        SELECT lead_id,
               BOOL_OR(status='verified_fake') AS verified_fake,
               BOOL_OR(status='verified_genuine') AS verified_genuine
        FROM lead_reports
        GROUP BY lead_id
      )
      SELECT l.id,l.customer_name,l.requirement,l.status,l.lead_type,l.created_at,l.updated_at,
             i.name AS industry_name,s.name AS service_name,c.name AS city_name,st.name AS state_name,
             COALESCE(ps.purchase_count,0)::int AS purchase_count,
             COALESCE(ps.paid_sales,0)::numeric AS paid_sales,
             COALESCE(ps.refunded_sales,0)::numeric AS refunded_sales,
             ps.last_purchase_at,
             COALESCE(es.gross_sales,0)::numeric AS gross_sales,
             COALESCE(es.generated_earning,0)::numeric AS generated_earning,
             COALESCE(es.reversed_earning,0)::numeric AS reversed_earning,
             COALESCE(rs.verified_fake,FALSE) AS verified_fake,
             COALESCE(rs.verified_genuine,FALSE) AS verified_genuine
      FROM leads l
      LEFT JOIN industries i ON i.id=l.industry_id
      LEFT JOIN services s ON s.id=l.service_id
      LEFT JOIN cities c ON c.id=l.city_id
      LEFT JOIN states st ON st.id=l.state_id
      LEFT JOIN purchase_stats ps ON ps.lead_id=l.id
      LEFT JOIN earning_stats es ON es.lead_id=l.id
      LEFT JOIN report_stats rs ON rs.lead_id=l.id
      WHERE l.lead_partner_id=$1
      ORDER BY l.created_at DESC,l.id DESC
      LIMIT 500
    `,[id]),
    client.query(`
      SELECT id,amount,status,payout_method,payout_account_snapshot,
             transfer_reference,proof_url,notes,rejection_reason,
             requested_at,processed_at,paid_at
      FROM lead_partner_payout_requests
      WHERE partner_id=$1
      ORDER BY requested_at DESC,id DESC
      LIMIT 300
    `,[id])
  ]);

  const summary=summaryResult.rows[0]||{};
  const recovery=recoveryResult.rows[0]||{};
  const payoutRows=payoutsResult.rows||[];
  const pendingTransfer=payoutRows.filter(x=>x.status==='pending').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const transferredAmount=payoutRows.filter(x=>x.status==='paid').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const [quality,leadQualityMap]=await Promise.all([leadQualityService.getPartnerQuality(id,client),leadQualityService.getLeadQualityMap(id,client)]);

  return{
    partner:{
      ...partner,
      id:Number(partner.id),
      user_id:Number(partner.user_id),
      quality_score:quality.score
    },
    availableEarnings:Number(summary.available_earnings||0),
    reservedEarnings:Number(summary.reserved_earnings||0),
    paidEarnings:Number(summary.paid_earnings||0),
    reversedEarnings:Number(summary.reversed_earnings||0),
    generatedEarnings:Number(summary.generated_earnings||0),
    grossSales:Number(summary.gross_sales||0),
    earningEvents:Number(summary.earning_events||0),
    pendingTransfer:Number(pendingTransfer.toFixed(2)),
    transferredAmount:Number(transferredAmount.toFixed(2)),
    recoveryOutstanding:Number(recovery.outstanding||0),
    recoveryTotal:Number(recovery.total||0),
    quality,
    leads:leadsResult.rows.map(row=>({
      ...row,
      id:Number(row.id),
      quality_score:leadQualityMap.get(Number(row.id))?.score ?? null,
      quality_band:leadQualityMap.get(Number(row.id))?.band || 'no_data',
      quality_flags:leadQualityMap.get(Number(row.id))?.flags || [],
      quality_breakdown:leadQualityMap.get(Number(row.id))?.breakdown || null,
      purchase_count:Number(row.purchase_count||0),
      paid_sales:Number(row.paid_sales||0),
      refunded_sales:Number(row.refunded_sales||0),
      gross_sales:Number(row.gross_sales||0),
      generated_earning:Number(row.generated_earning||0),
      reversed_earning:Number(row.reversed_earning||0)
    })),
    history:historyResult.rows.map(row=>({
      ...row,
      id:Number(row.id),
      lead_id:Number(row.lead_id),
      lead_purchase_id:Number(row.lead_purchase_id),
      gross_sale_amount:Number(row.gross_sale_amount||0),
      commission_percent:Number(row.commission_percent||0),
      earning_amount:Number(row.earning_amount||0),
      reserved_payout:Number(row.reserved_payout||0),
      paid_payout:Number(row.paid_payout||0),
      recovery_allocated:Number(row.recovery_allocated||0)
    })),
    payouts:payoutRows.map(row=>({...row,id:Number(row.id),amount:Number(row.amount||0)}))
  };
}
module.exports={getCommissionPercent,createForPurchase,reverseForPurchase,getAdminPartnerFinancials};
