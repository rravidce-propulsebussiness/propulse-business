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
  'lead_entitlement_grants',
  'lead_entitlement_business_campaign_users',
  'lead_entitlement_business_campaigns',
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
  ['lead_entitlement_claims','Lead entitlement claims'],
  ['lead_entitlement_grants','Lead entitlement grants'],
  ['lead_entitlement_business_campaigns','Business entitlement campaigns'],
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
    'Lead pricing, buyer-access and entitlement configuration',
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


/**
 * One-time production launch cleanup. Deliberately separate from reset():
 * leave platform settings and every administrator in place. It may be run
 * in production only by an authenticated administrator with an exact typed
 * confirmation, a current count snapshot, and no financial obligations.
 */
const criticalActionAudit=require('./criticalActionAuditService');
const LAUNCH_CONFIRMATION='DELETE NON-ADMIN USERS AND LEADS';

async function launchPreview(db=pool){
  const result=await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role='admin') AS admins,
      (SELECT COUNT(*)::int FROM users WHERE role='admin' AND is_active=TRUE) AS active_admins,
      (SELECT COUNT(*)::int FROM users WHERE role<>'admin') AS non_admin_users,
      (SELECT COUNT(*)::int FROM leads) AS leads,
      (SELECT COUNT(*)::int FROM payments) AS payments,
      (SELECT COUNT(*)::int FROM payments WHERE status<>'rejected') AS unsafe_payments,
      (SELECT COUNT(*)::int FROM lead_purchases) AS purchases,
      (SELECT COUNT(*)::int FROM lead_purchases WHERE status<>'cancelled') AS unsafe_purchases,
      (SELECT COUNT(*)::int FROM wallets w JOIN users u ON u.id=w.user_id
        WHERE u.role<>'admin' AND w.balance<>0) AS funded_wallets,
      (SELECT COUNT(*)::int FROM investments) +
      (SELECT COUNT(*)::int FROM investment_transactions) +
      (SELECT COUNT(*)::int FROM investment_cycles) +
      (SELECT COUNT(*)::int FROM investor_payout_requests) +
      (SELECT COUNT(*)::int FROM investment_revenue_allocations) +
      (SELECT COUNT(*)::int FROM lead_partner_payout_requests) +
      (SELECT COUNT(*)::int FROM lead_partner_earning_adjustments) +
      (SELECT COUNT(*)::int FROM lead_partner_earnings) AS financial_dependencies,
      (SELECT COUNT(*)::int FROM admin_google_sheet_connections WHERE status='active') AS active_sheets
  `);
  const row=result.rows[0]||{};
  const counts=Object.fromEntries(Object.entries(row).map(([key,value])=>[key,Number(value)||0]));
  const blockedReasons=[];
  if(counts.active_admins<1) blockedReasons.push('No active administrator would remain.');
  if(counts.unsafe_payments>0) blockedReasons.push('Non-rejected payments exist; financial records must be reviewed.');
  if(counts.unsafe_purchases>0) blockedReasons.push('Non-cancelled lead purchases exist.');
  if(counts.funded_wallets>0) blockedReasons.push('Non-admin wallet balances are not zero.');
  if(counts.financial_dependencies>0) blockedReasons.push('Investment, earnings, or payout records still exist.');
  return{
    counts,
    allowed:blockedReasons.length===0,
    blockedReasons,
    confirmation:LAUNCH_CONFIRMATION,
    preserved:['Every administrator account','Product configuration and pricing','Industry, service and location catalogs','Website content and media','Admin Google Sheet connection settings (sync disabled)'],
    warning:'Permanent account and lead deletion. Existing Business OS accounts connected through deleted ProPulse identities may need to be linked again. This action does not delete remote media files or backup copies.'
  };
}

function launchError(message,code){
  return Object.assign(new Error(message),{code});
}

async function launchCleanup({confirmation,acknowledged,expected,adminId}={}){
  if(confirmation!==LAUNCH_CONFIRMATION || acknowledged!==true){
    throw launchError('Enter the exact launch cleanup confirmation and acknowledge the irreversible deletion.','LAUNCH_CONFIRMATION_REQUIRED');
  }
  if(!adminId || !expected || !['non_admin_users','leads','payments','purchases'].every(key=>
    Number.isSafeInteger(expected[key]) && expected[key]>=0)){
    throw launchError('Reload the cleanup preview before proceeding.','LAUNCH_PREVIEW_STALE');
  }

  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='8s'");
    await client.query('SELECT pg_advisory_xact_lock($1)',[9062601]);
    // Hold a stable snapshot of the affected identities and sources. In-flight
    // signups or imports may not enter between preview re-check and deletion.
    await client.query(
      'LOCK TABLE users, leads, payments, lead_purchases, admin_google_sheet_connections IN SHARE ROW EXCLUSIVE MODE'
    );
    const admin=(await client.query(
      "SELECT id FROM users WHERE id=$1 AND role='admin' AND is_active=TRUE",
      [adminId]
    )).rows[0];
    if(!admin)throw launchError('Only an active administrator can run launch cleanup.','LAUNCH_ADMIN_REQUIRED');

    const before=await launchPreview(client);
    if(!before.allowed)throw launchError('Cleanup blocked: '+before.blockedReasons.join(' '),'LAUNCH_FINANCIAL_RECORDS');
    for(const key of ['non_admin_users','leads','payments','purchases']){
      if(before.counts[key]!==expected[key]){
        throw launchError('Account or lead totals have changed. Reload the preview and review them again.','LAUNCH_PREVIEW_STALE');
      }
    }

    // Disable previously connected automatic imports, without deleting the
    // connection settings; otherwise removed leads immediately reappear.
    const disabled=await client.query(
      "UPDATE admin_google_sheet_connections SET status='disabled' WHERE status='active'"
    );
    // All remaining purchase/payment rows have passed the above safety checks:
    // cancelled purchases and rejected payments, not paid financial records.
    const purchases=await client.query('DELETE FROM lead_purchases');
    const payments=await client.query(
      "DELETE FROM payments WHERE user_id IN (SELECT id FROM users WHERE role<>'admin')"
    );
    if(payments.rowCount!==before.counts.payments){
      throw launchError('Unaccounted payment ownership; launch cleanup aborted.','LAUNCH_FINANCIAL_RECORDS');
    }
    const leads=await client.query('DELETE FROM leads');
    const users=await client.query("DELETE FROM users WHERE role<>'admin'");
    if(users.rowCount!==before.counts.non_admin_users ||
       leads.rowCount!==before.counts.leads ||
       purchases.rowCount!==before.counts.purchases){
      throw launchError('Cleanup totals did not match the preview; transaction rolled back.','LAUNCH_PREVIEW_STALE');
    }

    const after=await launchPreview(client);
    if(after.counts.non_admin_users!==0 || after.counts.leads!==0 ||
       after.counts.payments!==0 || after.counts.purchases!==0 ||
       after.counts.admins!==before.counts.admins ||
       after.counts.active_admins!==before.counts.active_admins ||
       after.counts.active_sheets!==0){
      throw launchError('Post-cleanup verification failed; changes have been rolled back.','LAUNCH_VERIFICATION_FAILED');
    }
    await criticalActionAudit.record(client,{
      actorId:adminId,category:'system',action:'admin.launch_cleanup',
      entityType:'platform',entityId:'launch',
      beforeData:before.counts,afterData:after.counts,
      reason:'Administrator-confirmed production launch cleanup',
      metadata:{usersDeleted:users.rowCount,leadsDeleted:leads.rowCount,
        paymentsDeleted:payments.rowCount,purchasesDeleted:purchases.rowCount,
        sheetConnectionsDisabled:disabled.rowCount},
      source:'admin.launch_cleanup'
    });
    await client.query('COMMIT');
    return {ok:true,deleted:{users:users.rowCount,leads:leads.rowCount,
      payments:payments.rowCount,purchases:purchases.rowCount},
      disabledSheetConnections:disabled.rowCount,after,at:new Date().toISOString()};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{
    client.release();
  }
}

module.exports={RESET_TABLES,preview,reset,launchPreview,launchCleanup,LAUNCH_CONFIRMATION};
