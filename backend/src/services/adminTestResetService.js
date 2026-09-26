const pool=require('../config/database');

const RESET_TABLES=[
  'lead_partner_payout_items',
  'lead_partner_payout_requests',
  'lead_partner_earning_adjustment_allocations',
  'lead_partner_earning_adjustments',
  'lead_partner_earnings',
  'investment_revenue_allocations',
  'investment_ad_spends',
  'investment_ad_allocations',
  'investment_transactions',
  'investor_payout_requests',
  'investments',
  'investment_cycles',
  'investment_payment_drafts',
  'lead_reports',
  'lead_reporting_controls',
  'lead_crm',
  'lead_entitlement_claims',
  'lead_purchases',
  'coupon_redemptions',
  'membership_admin_history',
  'memberships',
  'booster_orders',
  'wallet_topups',
  'wallet_transactions',
  'payments',
  'leads'
];

const SUMMARY_TABLES=[
  ['leads','Leads'],
  ['lead_purchases','Purchased leads'],
  ['lead_entitlement_claims','Membership lead claims'],
  ['payments','Payments'],
  ['wallet_transactions','Wallet history'],
  ['wallet_topups','Wallet top-ups'],
  ['memberships','Memberships'],
  ['lead_partner_earnings','Lead Partner earnings'],
  ['lead_partner_payout_requests','Partner payouts'],
  ['investments','Investments'],
  ['investor_payout_requests','Investor withdrawals'],
  ['investment_revenue_allocations','Investor lead allocations']
];

const enabled=()=>process.env.NODE_ENV!=='production'||String(process.env.ALLOW_ADMIN_DATA_RESET||'').toLowerCase()==='true';

async function existingTables(client,names){
  const rows=(await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=ANY($1::text[])`,[names])).rows;
  return new Set(rows.map(row=>row.table_name));
}

async function preview(client=pool){
  const names=[...new Set([...RESET_TABLES,'wallets','coupons','lead_partner_sheet_connections'])];
  const exists=await existingTables(client,names);
  const counts={};
  for(const [table,label] of SUMMARY_TABLES){
    counts[table]={label,count:exists.has(table)?Number((await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`)).rows[0]?.count||0):0};
  }
  let wallets={count:0,totalBalance:0,nonZero:0};
  if(exists.has('wallets')){
    const row=(await client.query(`SELECT COUNT(*)::int AS count,COUNT(*) FILTER(WHERE balance<>0)::int AS non_zero,COALESCE(SUM(balance),0)::numeric AS total_balance FROM wallets`)).rows[0]||{};
    wallets={count:Number(row.count||0),totalBalance:Number(row.total_balance||0),nonZero:Number(row.non_zero||0)};
  }
  return{enabled:enabled(),confirmation:'RESET TEST DATA',counts,wallets,preserved:[
    'Users and admin accounts',
    'Business and Lead Partner profiles',
    'Industries, services, locations and PIN mappings',
    'Lead pricing and buyer-access configuration',
    'Membership plans and coupon configuration',
    'Investor/Lead Partner settings and payout accounts',
    'Google Sheet connections',
    'Website content, FAQs and media'
  ]};
}

async function reset({confirmation,adminId}={}){
  if(!enabled()){
    const error=new Error('Test data reset is disabled in production. Set ALLOW_ADMIN_DATA_RESET=true only when an intentional reset is required.');
    error.code='RESET_DISABLED';
    throw error;
  }
  if(String(confirmation||'').trim()!=='RESET TEST DATA'){
    const error=new Error('Type RESET TEST DATA exactly to continue.');
    error.code='RESET_CONFIRMATION_REQUIRED';
    throw error;
  }

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)',[9062601]);
    const before=await preview(client);
    const exists=await existingTables(client,[...new Set([...RESET_TABLES,'wallets','coupons','lead_partner_sheet_connections'])]);
    const tables=RESET_TABLES.filter(name=>exists.has(name));
    if(tables.length){
      const quoted=tables.map(name=>`"${name}"`).join(',');
      await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    }
    if(exists.has('wallets'))await client.query(`UPDATE wallets SET balance=0,updated_at=CURRENT_TIMESTAMP`);
    if(exists.has('coupons'))await client.query(`UPDATE coupons SET used_count=0,updated_at=CURRENT_TIMESTAMP`);
    if(exists.has('lead_partner_sheet_connections'))await client.query(`UPDATE lead_partner_sheet_connections SET last_synced_at=NULL,last_sync_created=0,last_sync_duplicate=0,last_sync_failed=0,last_sync_failures='[]'::jsonb,updated_at=CURRENT_TIMESTAMP`);
    await client.query('COMMIT');
    return{ok:true,resetBy:Number(adminId)||null,resetAt:new Date().toISOString(),before,after:await preview(pool)};
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

module.exports={RESET_TABLES,preview,reset};
