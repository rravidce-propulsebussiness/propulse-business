const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { validateSelections } = require('./profileService');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MANAGEABLE_ROLES = new Set(['business', 'lead_partner', 'admin']);

function parsePagination(query = {}) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawPageSize = Number.parseInt(query.pageSize ?? query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 1000000) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function getDashboardStats() {
  const [platformResult,revenueResult,leadResult,actionResult,customerResult,ecosystemResult]=await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE is_active=TRUE) AS active_users,
      (SELECT COUNT(*)::int FROM users WHERE role='business') AS businesses,
      (SELECT COUNT(*)::int FROM users WHERE role='business' AND is_active=TRUE) AS active_businesses,
      (SELECT COUNT(*)::int FROM users WHERE role='lead_partner') AS lead_partners,
      (SELECT COUNT(*)::int FROM users WHERE role='lead_partner' AND is_active=TRUE) AS active_lead_partners,
      (SELECT COUNT(*)::int FROM industries WHERE is_active=TRUE) AS industries,
      (SELECT COUNT(*)::int FROM services WHERE is_active=TRUE) AS services,
      (SELECT COUNT(*)::int FROM subservices WHERE is_active=TRUE) AS subservices,
      (SELECT COUNT(*)::int FROM states WHERE is_active=TRUE) AS states,
      (SELECT COUNT(*)::int FROM cities WHERE is_active=TRUE) AS cities
    `),
    pool.query(`WITH partner_commission AS (
      SELECT
        lead_purchase_id,
        COALESCE(SUM(gross_sale_amount-earning_amount) FILTER (WHERE status IN ('available','paid')),0)::numeric AS platform_amount,
        COALESCE(SUM(earning_amount) FILTER (WHERE status IN ('available','paid')),0)::numeric AS partner_amount
      FROM lead_partner_earnings
      GROUP BY lead_purchase_id
    ), investor_allocation AS (
      SELECT
        lead_purchase_id,
        COALESCE(SUM(allocated_amount),0)::numeric AS investor_amount
      FROM investment_revenue_allocations
      GROUP BY lead_purchase_id
    ), classified_sales AS (
      SELECT
        lp.id,
        lp.lead_id,
        lp.shares,
        lp.amount::numeric AS gross_amount,
        COALESCE(p.paid_at,lp.created_at) AS event_at,
        CASE
          WHEN l.lead_partner_id IS NOT NULL THEN 'lead_partner'
          WHEN l.investor_user_id IS NOT NULL THEN 'investor'
          ELSE 'propulse'
        END AS origin,
        CASE
          WHEN l.lead_partner_id IS NOT NULL THEN GREATEST(0,COALESCE(pc.platform_amount,0))
          WHEN l.investor_user_id IS NOT NULL THEN GREATEST(0,lp.amount-COALESCE(ia.investor_amount,0))
          ELSE lp.amount
        END::numeric AS platform_amount,
        CASE WHEN l.lead_partner_id IS NOT NULL THEN GREATEST(0,COALESCE(pc.partner_amount,0)) ELSE 0 END::numeric AS partner_amount,
        CASE WHEN l.lead_partner_id IS NULL AND l.investor_user_id IS NOT NULL THEN GREATEST(0,COALESCE(ia.investor_amount,0)) ELSE 0 END::numeric AS investor_amount
      FROM lead_purchases lp
      JOIN leads l ON l.id=lp.lead_id
      LEFT JOIN payments p ON p.id=lp.payment_id
      LEFT JOIN partner_commission pc ON pc.lead_purchase_id=lp.id
      LEFT JOIN investor_allocation ia ON ia.lead_purchase_id=lp.id
      WHERE lp.status='paid'
    )
    SELECT
      COALESCE(SUM(platform_amount),0)::numeric AS revenue_total,
      COALESCE(SUM(platform_amount) FILTER (WHERE event_at>=CURRENT_DATE),0)::numeric AS revenue_today,
      COALESCE(SUM(platform_amount) FILTER (WHERE event_at>=CURRENT_TIMESTAMP-INTERVAL '7 days'),0)::numeric AS revenue_last_7_days,
      COALESCE(SUM(platform_amount) FILTER (WHERE event_at>=date_trunc('month',CURRENT_DATE)),0)::numeric AS revenue_month,

      COALESCE(SUM(platform_amount) FILTER (WHERE origin='propulse'),0)::numeric AS own_lead_revenue,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='propulse' AND event_at>=CURRENT_DATE),0)::numeric AS own_revenue_today,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='propulse' AND event_at>=date_trunc('month',CURRENT_DATE)),0)::numeric AS own_revenue_month,
      COUNT(*) FILTER (WHERE origin='propulse')::int AS own_paid_purchases,
      COUNT(DISTINCT lead_id) FILTER (WHERE origin='propulse')::int AS own_sold_leads,
      COALESCE(SUM(shares) FILTER (WHERE origin='propulse'),0)::int AS own_sold_shares,

      COALESCE(SUM(gross_amount) FILTER (WHERE origin='lead_partner'),0)::numeric AS partner_gross_sales,
      COALESCE(SUM(partner_amount) FILTER (WHERE origin='lead_partner'),0)::numeric AS partner_earnings,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='lead_partner'),0)::numeric AS lead_partner_commission,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='lead_partner' AND event_at>=CURRENT_DATE),0)::numeric AS partner_commission_today,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='lead_partner' AND event_at>=date_trunc('month',CURRENT_DATE)),0)::numeric AS partner_commission_month,
      COUNT(*) FILTER (WHERE origin='lead_partner')::int AS partner_paid_purchases,
      COUNT(DISTINCT lead_id) FILTER (WHERE origin='lead_partner')::int AS partner_sold_leads,
      COALESCE(SUM(shares) FILTER (WHERE origin='lead_partner'),0)::int AS partner_sold_shares,

      COALESCE(SUM(gross_amount) FILTER (WHERE origin='investor'),0)::numeric AS investor_gross_sales,
      COALESCE(SUM(investor_amount) FILTER (WHERE origin='investor'),0)::numeric AS investor_allocated,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='investor'),0)::numeric AS investor_commission,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='investor' AND event_at>=CURRENT_DATE),0)::numeric AS investor_commission_today,
      COALESCE(SUM(platform_amount) FILTER (WHERE origin='investor' AND event_at>=date_trunc('month',CURRENT_DATE)),0)::numeric AS investor_commission_month,
      COUNT(*) FILTER (WHERE origin='investor')::int AS investor_paid_purchases,
      COUNT(DISTINCT lead_id) FILTER (WHERE origin='investor')::int AS investor_sold_leads,
      COALESCE(SUM(shares) FILTER (WHERE origin='investor'),0)::int AS investor_sold_shares
    FROM classified_sales`),
    pool.query(`SELECT
      COUNT(*)::int AS total_leads,
      COUNT(*) FILTER (WHERE l.status='available')::int AS available_leads,
      COUNT(*) FILTER (WHERE l.created_at>=CURRENT_DATE)::int AS uploaded_today,
      COUNT(*) FILTER (WHERE l.lead_partner_id IS NULL AND l.investor_user_id IS NULL)::int AS own_total_leads,
      COUNT(*) FILTER (WHERE l.status='available' AND l.lead_partner_id IS NULL AND l.investor_user_id IS NULL)::int AS own_available_leads,
      COUNT(*) FILTER (WHERE l.lead_partner_id IS NOT NULL)::int AS partner_total_leads,
      COUNT(*) FILTER (WHERE l.status='available' AND l.lead_partner_id IS NOT NULL)::int AS partner_available_leads,
      COUNT(*) FILTER (WHERE l.lead_partner_id IS NULL AND l.investor_user_id IS NOT NULL)::int AS investor_total_leads,
      COUNT(*) FILTER (WHERE l.status='available' AND l.lead_partner_id IS NULL AND l.investor_user_id IS NOT NULL)::int AS investor_available_leads,
      (SELECT COUNT(DISTINCT lp.lead_id)::int FROM lead_purchases lp WHERE lp.status='paid') AS purchased_leads,
      (SELECT COUNT(*)::int FROM lead_purchases lp WHERE lp.status='paid') AS paid_purchases,
      (SELECT COALESCE(SUM(lp.shares),0)::int FROM lead_purchases lp WHERE lp.status='paid') AS sold_shares,
      (SELECT COUNT(*)::int
         FROM lead_purchases lp
         LEFT JOIN payments p ON p.id=lp.payment_id
        WHERE lp.status='paid' AND COALESCE(p.paid_at,lp.created_at)>=CURRENT_DATE) AS purchases_today
      FROM leads l`),
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM payments p
        WHERE p.status='pending'
          AND p.purchase_type IS DISTINCT FROM 'wallet_topup'
          AND NOT (
            COALESCE(p.purchase_type,'')='lead'
            AND p.payment_method='manual'
            AND COALESCE(BTRIM(p.manual_reference),'')=''
            AND COALESCE(BTRIM(p.proof_url),'')=''
          )) AS pending_payments,
      (SELECT COUNT(*)::int FROM wallet_topups WHERE status='pending') AS pending_wallet_topups,
      (SELECT COUNT(*)::int FROM company_proof_documents WHERE status='pending') AS pending_company_proofs,
      (SELECT COUNT(*)::int FROM lead_reports WHERE status='pending') AS pending_lead_reports,
      (SELECT COUNT(*)::int FROM lead_partner_payout_requests WHERE status='pending') AS pending_partner_payouts,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM lead_partner_payout_requests WHERE status='pending') AS pending_partner_payout_amount,
      (SELECT COUNT(*)::int FROM investor_payout_requests WHERE status='pending') AS pending_investor_withdrawals,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM investor_payout_requests WHERE status='pending') AS pending_investor_withdrawal_amount
    `),
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM users WHERE role='business' AND is_active=TRUE) AS active_businesses,
      (SELECT COUNT(*)::int FROM memberships m
        WHERE m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>CURRENT_TIMESTAMP) AS active_memberships,
      (SELECT COUNT(DISTINCT m.user_id)::int
         FROM memberships m
         JOIN membership_plans mp ON mp.id=m.membership_plan_id
        WHERE m.status='active'
          AND m.starts_at<=CURRENT_TIMESTAMP
          AND m.expires_at>CURRENT_TIMESTAMP
          AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro') AS pro_members,
      (SELECT COUNT(*)::int FROM users WHERE created_at>=date_trunc('month',CURRENT_DATE)) AS new_users_month
    `),
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM lead_partners WHERE status='active') AS active_partners,
      (SELECT COUNT(*)::int FROM leads WHERE lead_partner_id IS NOT NULL) AS partner_leads,
      (SELECT COUNT(DISTINCT user_id)::int FROM investments WHERE status<>'cancelled') AS investors,
      (SELECT COUNT(*)::int FROM investments WHERE status='active') AS active_investments,
      (SELECT COALESCE(SUM(earning_amount),0)::numeric FROM lead_partner_earnings WHERE status IN ('available','paid')) AS partner_earnings_generated,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM lead_partner_payout_requests WHERE status='paid') AS partner_payouts_paid
    `)
  ]);

  const platform=platformResult.rows[0]||{};
  const revenue=revenueResult.rows[0]||{};
  const leads=leadResult.rows[0]||{};
  const actions=actionResult.rows[0]||{};
  const customers=customerResult.rows[0]||{};
  const ecosystem=ecosystemResult.rows[0]||{};
  const number=value=>Number(value||0);

  return {
    totalUsers:number(platform.total_users),
    activeUsers:number(platform.active_users),
    businesses:number(platform.businesses),
    activeBusinesses:number(platform.active_businesses),
    leadPartners:number(platform.lead_partners),
    activeLeadPartners:number(platform.active_lead_partners),
    industries:number(platform.industries),
    services:number(platform.services),
    subservices:number(platform.subservices),
    states:number(platform.states),
    cities:number(platform.cities),
    revenue:{
      today:number(revenue.revenue_today),
      last7Days:number(revenue.revenue_last_7_days),
      month:number(revenue.revenue_month),
      total:number(revenue.revenue_total),
      ownLeads:number(revenue.own_lead_revenue),
      leadPartnerCommission:number(revenue.lead_partner_commission),
      investorCommission:number(revenue.investor_commission)
    },
    streams:{
      propulse:{
        totalLeads:number(leads.own_total_leads),
        availableLeads:number(leads.own_available_leads),
        soldLeads:number(revenue.own_sold_leads),
        paidPurchases:number(revenue.own_paid_purchases),
        soldShares:number(revenue.own_sold_shares),
        grossSales:number(revenue.own_lead_revenue),
        revenueToday:number(revenue.own_revenue_today),
        revenueMonth:number(revenue.own_revenue_month),
        revenueTotal:number(revenue.own_lead_revenue)
      },
      leadPartner:{
        activePartners:number(ecosystem.active_partners),
        totalLeads:number(leads.partner_total_leads),
        availableLeads:number(leads.partner_available_leads),
        soldLeads:number(revenue.partner_sold_leads),
        paidPurchases:number(revenue.partner_paid_purchases),
        soldShares:number(revenue.partner_sold_shares),
        grossSales:number(revenue.partner_gross_sales),
        partnerEarnings:number(revenue.partner_earnings),
        revenueToday:number(revenue.partner_commission_today),
        revenueMonth:number(revenue.partner_commission_month),
        revenueTotal:number(revenue.lead_partner_commission)
      },
      investor:{
        investors:number(ecosystem.investors),
        activeInvestments:number(ecosystem.active_investments),
        totalLeads:number(leads.investor_total_leads),
        availableLeads:number(leads.investor_available_leads),
        soldLeads:number(revenue.investor_sold_leads),
        paidPurchases:number(revenue.investor_paid_purchases),
        soldShares:number(revenue.investor_sold_shares),
        grossSales:number(revenue.investor_gross_sales),
        investorAllocated:number(revenue.investor_allocated),
        revenueToday:number(revenue.investor_commission_today),
        revenueMonth:number(revenue.investor_commission_month),
        revenueTotal:number(revenue.investor_commission)
      }
    },
    leads:{
      total:number(leads.total_leads),
      available:number(leads.available_leads),
      purchased:number(leads.purchased_leads),
      paidPurchases:number(leads.paid_purchases),
      soldShares:number(leads.sold_shares),
      uploadedToday:number(leads.uploaded_today),
      purchasesToday:number(leads.purchases_today)
    },
    actions:{
      pendingPayments:number(actions.pending_payments),
      pendingWalletTopups:number(actions.pending_wallet_topups),
      pendingCompanyProofs:number(actions.pending_company_proofs),
      pendingLeadReports:number(actions.pending_lead_reports),
      pendingPartnerPayouts:number(actions.pending_partner_payouts),
      pendingPartnerPayoutAmount:number(actions.pending_partner_payout_amount),
      pendingInvestorWithdrawals:number(actions.pending_investor_withdrawals),
      pendingInvestorWithdrawalAmount:number(actions.pending_investor_withdrawal_amount)
    },
    customers:{
      activeBusinesses:number(customers.active_businesses),
      activeMemberships:number(customers.active_memberships),
      proMembers:number(customers.pro_members),
      newUsersMonth:number(customers.new_users_month)
    },
    ecosystem:{
      activePartners:number(ecosystem.active_partners),
      partnerLeads:number(ecosystem.partner_leads),
      investors:number(ecosystem.investors),
      activeInvestments:number(ecosystem.active_investments),
      partnerEarningsGenerated:number(ecosystem.partner_earnings_generated),
      partnerPayoutsPaid:number(ecosystem.partner_payouts_paid)
    }
  };
}

async function getUsers({ search = '', role = 'all', status = 'all', industryId = '', serviceId = '', stateId = '', cityId = '', page, pageSize, limit } = {}) {
  const { page: currentPage, pageSize: currentPageSize, offset } = parsePagination({ page, pageSize, limit });
  const params = [], conditions = [];
  if (String(search).trim()) { params.push(`%${String(search).trim()}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR bp.business_name ILIKE $${params.length} OR bp.phone ILIKE $${params.length})`); }
  if (['admin', 'business', 'lead_partner'].includes(role)) { params.push(role); conditions.push(`u.role = $${params.length}`); }
  if (status === 'active' || status === 'inactive') { params.push(status === 'active'); conditions.push(`u.is_active = $${params.length}`); }
  if (industryId) { params.push(industryId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_services x WHERE x.business_profile_id=bp.id AND x.industry_id=$${params.length} AND x.is_active=TRUE)`); }
  if (serviceId) { params.push(serviceId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_services x WHERE x.business_profile_id=bp.id AND x.service_id=$${params.length} AND x.is_active=TRUE)`); }
  if (stateId) { params.push(stateId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_locations x WHERE x.business_profile_id=bp.id AND x.state_id=$${params.length} AND x.is_active=TRUE)`); }
  if (cityId) { params.push(cityId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_locations x WHERE x.business_profile_id=bp.id AND x.city_id=$${params.length} AND x.is_active=TRUE)`); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM users u LEFT JOIN business_profiles bp ON bp.user_id = u.id ${whereClause}`, params);
  const total = countResult.rows[0]?.total || 0, dataParams = [...params, currentPageSize, offset];
  const result = await pool.query(`SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,bp.id AS business_profile_id,bp.business_name,bp.phone,bp.business_details,COALESCE((SELECT COUNT(*)::int FROM business_profile_services x WHERE x.business_profile_id=bp.id AND x.is_active=TRUE),0) AS service_count,COALESCE((SELECT COUNT(*)::int FROM business_profile_locations x WHERE x.business_profile_id=bp.id AND x.is_active=TRUE),0) AS location_count,COALESCE((SELECT json_agg(json_build_object('industryId',x.industry_id,'industryName',i.name,'serviceId',x.service_id,'serviceName',s.name,'subserviceId',x.subservice_id,'subserviceName',ss.name) ORDER BY i.name,s.name,ss.name) FROM business_profile_services x JOIN industries i ON i.id=x.industry_id JOIN services s ON s.id=x.service_id LEFT JOIN subservices ss ON ss.id=x.subservice_id WHERE x.business_profile_id=bp.id AND x.is_active=TRUE),'[]'::json) AS services,COALESCE((SELECT json_agg(json_build_object('stateId',x.state_id,'stateName',st.name,'cityId',x.city_id,'cityName',c.name,'subcityId',x.subcity_id,'subcityName',sc.name,'pincode',x.pincode) ORDER BY st.name,c.name) FROM business_profile_locations x JOIN states st ON st.id=x.state_id JOIN cities c ON c.id=x.city_id LEFT JOIN subcities sc ON sc.id=x.subcity_id WHERE x.business_profile_id=bp.id AND x.is_active=TRUE),'[]'::json) AS locations FROM users u LEFT JOIN business_profiles bp ON bp.user_id=u.id ${whereClause} ORDER BY u.created_at DESC,u.id DESC LIMIT $${dataParams.length-1} OFFSET $${dataParams.length}`, dataParams);
  return { data: result.rows, pagination: { page: currentPage, pageSize: currentPageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / currentPageSize), hasNextPage: currentPage * currentPageSize < total, hasPreviousPage: currentPage > 1 && total > 0 } };
}

async function createAdmin({ name, email, password }) {
  const cleanName = String(name || '').trim(), normalizedEmail = String(email || '').trim().toLowerCase();
  if (!cleanName || !normalizedEmail || String(password || '').length < 8) { const error = new Error('Name, valid email and password of at least 8 characters are required'); error.code='INVALID_ADMIN'; throw error; }
  if ((await pool.query('SELECT id FROM users WHERE LOWER(email)=$1',[normalizedEmail])).rowCount) { const error=new Error('An account with this email already exists'); error.code='EMAIL_EXISTS'; throw error; }
  const passwordHash=await bcrypt.hash(password,12);
  return (await pool.query(`INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin') RETURNING id,name,email,role,is_active,created_at`,[cleanName,normalizedEmail,passwordHash])).rows[0];
}

const ADMIN_MUTATION_LOCK_NAMESPACE = 2147482999;

async function lockAdminMutations(client) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_MUTATION_LOCK_NAMESPACE]);
}

async function setUserStatus(userId,isActive) {
  const targetUserId=Number(userId);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await lockAdminMutations(client);
    const current=(await client.query('SELECT id,name,email,role,is_active FROM users WHERE id=$1 FOR UPDATE',[targetUserId])).rows[0];
    if(!current){await client.query('COMMIT');return null;}
    if(current.role==='admin' && current.is_active && !Boolean(isActive)){
      const activeAdmins=Number((await client.query(`SELECT COUNT(*)::int AS total FROM users WHERE role='admin' AND is_active=TRUE`)).rows[0].total||0);
      if(activeAdmins<=1){
        const error=new Error('At least one active administrator must remain.');
        error.code='LAST_ADMIN';
        throw error;
      }
    }
    const updated=(await client.query(`UPDATE users SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id,name,email,role,is_active`,[Boolean(isActive),targetUserId])).rows[0]||null;
    await client.query('COMMIT');
    return updated;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function ensureLeadPartnerProfile(client,userId) {
  const existing=(await client.query('SELECT id,status FROM lead_partners WHERE user_id=$1 FOR UPDATE',[userId])).rows[0];
  if(existing)return existing;
  return (await client.query(`INSERT INTO lead_partners(user_id,status) VALUES($1,'active') RETURNING id,status`,[userId])).rows[0];
}

async function setUserRole({ userId, role, actingAdminId }) {
  const targetUserId=Number(userId), normalizedRole=String(role||'').trim().toLowerCase(), actorId=Number(actingAdminId);
  if(!Number.isInteger(targetUserId)||!MANAGEABLE_ROLES.has(normalizedRole)){const error=new Error('Choose a valid account type: User, Lead Partner, or Admin');error.code='INVALID_ROLE';throw error;}
  if(targetUserId===actorId){const error=new Error('You cannot change your own administrator role.');error.code='SELF_ROLE_CHANGE';throw error;}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await lockAdminMutations(client);
    const current=(await client.query('SELECT id,name,email,role,is_active FROM users WHERE id=$1 FOR UPDATE',[targetUserId])).rows[0];
    if(!current){const error=new Error('User not found');error.code='NOT_FOUND';throw error;}
    if(current.role==='admin'&&normalizedRole!=='admin'){
      const activeAdmins=Number((await client.query(`SELECT COUNT(*)::int AS total FROM users WHERE role='admin' AND is_active=TRUE AND id<>$1`,[targetUserId])).rows[0].total||0);
      if(activeAdmins<1){const error=new Error('At least one other active administrator must remain.');error.code='LAST_ADMIN';throw error;}
    }
    if(normalizedRole==='lead_partner')await ensureLeadPartnerProfile(client,targetUserId);
    if(current.role===normalizedRole){await client.query('COMMIT');return current;}
    const updated=(await client.query(`UPDATE users SET role=$1,auth_version=auth_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id,name,email,role,is_active,created_at`,[normalizedRole,targetUserId])).rows[0];
    await client.query('COMMIT');
    return updated;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function updateUserProfile(userId,{ name,email,phone,businessName,businessDetails,services,locations }) {
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const user=(await client.query('SELECT id,name,email,role FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
    if(!user){const e=new Error('User not found');e.code='NOT_FOUND';throw e;}
    const cleanName=String(name??user.name).trim(),normalizedEmail=String(email??user.email).trim().toLowerCase();
    if(!cleanName||!normalizedEmail){const e=new Error('Name and email are required');e.code='INVALID_USER';throw e;}
    if((await client.query('SELECT id FROM users WHERE LOWER(email)=$1 AND id<>$2',[normalizedEmail,userId])).rowCount){const e=new Error('An account with this email already exists');e.code='EMAIL_EXISTS';throw e;}
    const updatedUser=(await client.query('UPDATE users SET name=$1,email=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id,name,email,role,is_active,created_at',[cleanName,normalizedEmail,userId])).rows[0];
    if(['business','lead_partner'].includes(user.role)){
      const hasConfiguration=Array.isArray(services)||Array.isArray(locations);
      if(hasConfiguration)await validateSelections(client,services,locations);
      const profile=(await client.query('SELECT id FROM business_profiles WHERE user_id=$1 FOR UPDATE',[userId])).rows[0];
      if(!profile){
        if(String(phone??'').trim()||String(businessName??'').trim()||String(businessDetails??'').trim()||hasConfiguration){
          const created=(await client.query('INSERT INTO business_profiles(user_id,phone,business_name,business_details) VALUES($1,$2,$3,$4) RETURNING id',[userId,String(phone??'').trim(),String(businessName??'').trim(),String(businessDetails??'').trim()])).rows[0];
          if(hasConfiguration){
            for(const item of services)await client.query(`INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id,is_active) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT (business_profile_id,industry_id,service_id,subservice_id) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[created.id,item.industryId,item.serviceId,item.subserviceId||null]);
            for(const item of locations)await client.query(`INSERT INTO business_profile_locations (business_profile_id,state_id,city_id,subcity_id,pincode,is_active) VALUES($1,$2,$3,$4,$5,TRUE) ON CONFLICT (business_profile_id,state_id,city_id) DO UPDATE SET subcity_id=EXCLUDED.subcity_id,pincode=EXCLUDED.pincode,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[created.id,item.stateId,item.cityId,item.subcityId||null,item.pincode||null]);
          }
        }
      }else{
        await client.query('UPDATE business_profiles SET phone=$1,business_name=$2,business_details=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4',[String(phone??'').trim(),String(businessName??'').trim(),String(businessDetails??'').trim(),profile.id]);
        if(hasConfiguration){
          await client.query('UPDATE business_profile_services SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE business_profile_id=$1',[profile.id]);
          for(const item of services)await client.query(`INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id,is_active) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT (business_profile_id,industry_id,service_id,subservice_id) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[profile.id,item.industryId,item.serviceId,item.subserviceId||null]);
          await client.query('UPDATE business_profile_locations SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE business_profile_id=$1',[profile.id]);
          for(const item of locations)await client.query(`INSERT INTO business_profile_locations (business_profile_id,state_id,city_id,subcity_id,pincode,is_active) VALUES($1,$2,$3,$4,$5,TRUE) ON CONFLICT (business_profile_id,state_id,city_id) DO UPDATE SET subcity_id=EXCLUDED.subcity_id,pincode=EXCLUDED.pincode,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[profile.id,item.stateId,item.cityId,item.subcityId||null,item.pincode||null]);
        }
      }
    }
    await client.query('COMMIT');return updatedUser;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function getCompanyProofs({ status = 'pending', page, pageSize, limit } = {}) {
  const normalizedStatus = String(status || 'pending').trim().toLowerCase();
  if (!['pending', 'verified', 'rejected'].includes(normalizedStatus)) {
    const error = new Error('Invalid company proof status');
    error.code = 'INVALID_PROOF_STATUS';
    throw error;
  }
  const { page: currentPage, pageSize: currentPageSize, offset } = parsePagination({ page, pageSize, limit });
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM company_proof_documents cpd
     WHERE cpd.status=$1`,
    [normalizedStatus],
  );
  const total = countResult.rows[0]?.total || 0;
  const result = await pool.query(
    `SELECT cpd.id,cpd.user_id,cpd.original_name,cpd.mime_type,cpd.file_size,cpd.status,
            cpd.created_at,cpd.updated_at,cpd.reviewed_by,cpd.reviewed_at,cpd.review_reason,
            u.name AS user_name,u.email AS user_email,bp.business_name
     FROM company_proof_documents cpd
     INNER JOIN users u ON u.id=cpd.user_id
     LEFT JOIN business_profiles bp ON bp.user_id=cpd.user_id
     WHERE cpd.status=$1
     ORDER BY CASE WHEN cpd.status='pending' THEN cpd.created_at END ASC, cpd.created_at DESC, cpd.id DESC
     LIMIT $2 OFFSET $3`,
    [normalizedStatus, currentPageSize, offset],
  );
  return {
    data: result.rows,
    pagination: {
      page: currentPage,
      pageSize: currentPageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / currentPageSize),
      hasNextPage: currentPage * currentPageSize < total,
      hasPreviousPage: currentPage > 1 && total > 0,
    },
  };
}

async function reviewCompanyProof({ documentId, status, reviewReason = '', reviewedBy }) {
  const normalizedDocumentId = Number(documentId);
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedReviewer = Number(reviewedBy);
  const reason = String(reviewReason || '').trim();

  if (!Number.isInteger(normalizedDocumentId) || normalizedDocumentId <= 0) {
    const error = new Error('Invalid company proof document');
    error.code = 'INVALID_PROOF_DOCUMENT';
    throw error;
  }
  if (!['verified', 'rejected'].includes(normalizedStatus)) {
    const error = new Error('Company proof can only be verified or rejected');
    error.code = 'INVALID_PROOF_STATUS';
    throw error;
  }
  if (!Number.isInteger(normalizedReviewer) || normalizedReviewer <= 0) {
    const error = new Error('Invalid reviewing administrator');
    error.code = 'INVALID_REVIEWER';
    throw error;
  }
  if (normalizedStatus === 'rejected' && !reason) {
    const error = new Error('A rejection reason is required');
    error.code = 'REJECTION_REASON_REQUIRED';
    throw error;
  }
  if (reason.length > 1000) {
    const error = new Error('Rejection reason must be 1000 characters or fewer');
    error.code = 'REJECTION_REASON_TOO_LONG';
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query(
      'SELECT id,status FROM company_proof_documents WHERE id=$1 FOR UPDATE',
      [normalizedDocumentId],
    )).rows[0];

    if (!current) {
      const error = new Error('Company proof document not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
    if (current.status !== 'pending') {
      const error = new Error(`Company proof is already ${current.status}`);
      error.code = 'PROOF_ALREADY_REVIEWED';
      throw error;
    }

    const updated = (await client.query(
      `UPDATE company_proof_documents
       SET status=$1,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,
           review_reason=$3,updated_at=CURRENT_TIMESTAMP
       WHERE id=$4
       RETURNING id,user_id,original_name,mime_type,file_size,status,
                 created_at,updated_at,reviewed_by,reviewed_at,review_reason`,
      [normalizedStatus, normalizedReviewer, normalizedStatus === 'rejected' ? reason : null, normalizedDocumentId],
    )).rows[0];

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports={getDashboardStats,getUsers,createAdmin,setUserStatus,setUserRole,updateUserProfile,getCompanyProofs,reviewCompanyProof};

