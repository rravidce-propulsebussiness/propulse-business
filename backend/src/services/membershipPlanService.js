const pool = require('../config/database');

function calculatePrice(base, months, discount = 0) {
  const raw = Number(base || 0) * Number(months || 1);
  return Number((raw * (1 - (Number(discount) || 0) / 100)).toFixed(2));
}

function safeJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizePlanType(value, fallback = 'non_pro') {
  const type = String(value || fallback).trim().toLowerCase();
  return ['pro', 'investor', 'booster', 'non_pro'].includes(type) ? type : fallback;
}

function normalizeEntitlements(items, months = 1) {
  return safeJson(items).map(item => {
    const monthly = Math.max(0, Number(item.monthly_quantity ?? item.monthlyLimit ?? item.quantity ?? 0));
    const total = item.period_total_quantity ?? item.periodTotal ?? item.totalLimit;
    return {
      ...item,
      quantity: monthly,
      monthly_quantity: monthly,
      period_total_quantity: total === undefined || total === '' ? monthly * months : Math.max(0, Number(total)),
      complimentary: item.complimentary !== false,
    };
  });
}

async function getPlans(includeInactive = true) {
  const r = await pool.query(`
    SELECT id,name,plan_group,plan_type,description,price,duration_days,billing_period,
           billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,
           add_ons,lead_rollover_enabled,lead_expiry_days,is_active,created_at,updated_at
    FROM membership_plans
    ${includeInactive ? '' : 'WHERE is_active=TRUE'}
    ORDER BY COALESCE(plan_group,name),plan_type,billing_months ASC,id
  `);
  return r.rows;
}

async function createPlan(d) {
  const months = Math.max(1, Number(d.billingMonths || d.durationMonths || 1));
  const base = d.monthlyBasePrice === undefined || d.monthlyBasePrice === '' ? Number(d.price || 0) : Number(d.monthlyBasePrice);
  const discount = Number(d.discountPercent) || 0;
  const finalPrice = d.priceOverride !== undefined && d.priceOverride !== '' ? Number(d.priceOverride) : calculatePrice(base, months, discount);
  const days = d.durationDays || Math.round(months * 30.4375);
  const benefits = safeJson(d.benefits);
  const planType = normalizePlanType(d.planType);
  const entitlements = planType === 'booster' ? [] : normalizeEntitlements(d.leadEntitlements, months);
  const addOns = safeJson(d.addOns);
  const period = d.billingPeriod || `${months}-month`;
  const rollover = d.leadRolloverEnabled !== false;
  const expiryDays = d.leadExpiryDays === undefined || d.leadExpiryDays === '' ? null : Number(d.leadExpiryDays);

  const r = await pool.query(`
    INSERT INTO membership_plans(
      name,plan_group,plan_type,description,price,duration_days,billing_period,
      billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,
      add_ons,lead_rollover_enabled,lead_expiry_days
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *
  `, [d.name,d.planGroup || d.name,planType,d.description || null,finalPrice,days,period,months,base,discount,JSON.stringify(benefits),JSON.stringify(entitlements),JSON.stringify(addOns),rollover,expiryDays]);
  return r.rows[0];
}

async function createPlanBundle(d) {
  const rows = [];
  const periods = Array.isArray(d.periods) ? d.periods.filter(x => x && x.enabled !== false && Number(x.months) > 0) : [];
  const planType = normalizePlanType(d.planType, 'pro');
  const isBooster = planType === 'booster';

  for (const period of periods) {
    const months = Number(period.months);
    const label = String(period.label || `${months}-month`).trim();
    const p = d.pricing?.[period.key] || {};
    const entitlements = isBooster ? [] : normalizeEntitlements(period.leadEntitlements ?? d.leadEntitlements, months);
    const name = `${d.name} ${label}`;

    const payload = {
      name,
      planGroup: d.name,
      planType,
      description: d.description,
      billingPeriod: label,
      billingMonths: months,
      monthlyBasePrice: d.monthlyBasePrice,
      discountPercent: p.discount || 0,
      priceOverride: p.customPrice === true ? p.price : '',
      benefits: d.benefits,
      leadEntitlements: entitlements,
      addOns: d.addOns,
      leadRolloverEnabled: d.leadRolloverEnabled !== false,
      leadExpiryDays: d.leadExpiryDays,
    };

    // The admin configurator can be used repeatedly. If a cycle already exists,
    // update that plan instead of failing on membership_plans_name_key.
    const existing = await pool.query('SELECT id FROM membership_plans WHERE name=$1 LIMIT 1', [name]);
    if (existing.rows[0]) {
      rows.push(await updatePlan(existing.rows[0].id, payload));
    } else {
      rows.push(await createPlan(payload));
    }
  }
  return rows;
}

async function updatePlan(id, d) {
  const cur = await pool.query('SELECT * FROM membership_plans WHERE id=$1', [id]);
  if (!cur.rows[0]) return null;

  const months = Math.max(1, Number(d.billingMonths || d.durationMonths || cur.rows[0].billing_months || 1));
  const base = d.monthlyBasePrice === undefined || d.monthlyBasePrice === '' ? Number(d.price || cur.rows[0].monthly_base_price || cur.rows[0].price) : Number(d.monthlyBasePrice);
  const discount = Number(d.discountPercent) || 0;
  const final = d.priceOverride !== undefined && d.priceOverride !== '' ? Number(d.priceOverride) : calculatePrice(base, months, discount);
  const days = d.durationDays || Math.round(months * 30.4375);
  const benefits = safeJson(d.benefits, safeJson(cur.rows[0].benefits));
  const planType = normalizePlanType(d.planType, normalizePlanType(cur.rows[0].plan_type));
  const incomingEntitlements = normalizeEntitlements(d.leadEntitlements, months);
  const entitlements = planType === 'booster'
    ? []
    : (incomingEntitlements.length ? incomingEntitlements : normalizeEntitlements(cur.rows[0].lead_entitlements, months));
  const addOns = safeJson(d.addOns, safeJson(cur.rows[0].add_ons));
  const rollover = d.leadRolloverEnabled === undefined ? cur.rows[0].lead_rollover_enabled : Boolean(d.leadRolloverEnabled);
  const expiryDays = d.leadExpiryDays === undefined ? cur.rows[0].lead_expiry_days : (d.leadExpiryDays === '' ? null : Number(d.leadExpiryDays));

  const r = await pool.query(`
    UPDATE membership_plans SET
      name=$1,plan_group=$2,plan_type=$3,description=$4,price=$5,duration_days=$6,
      billing_period=$7,billing_months=$8,monthly_base_price=$9,discount_percent=$10,
      benefits=$11,lead_entitlements=$12,add_ons=$13,lead_rollover_enabled=$14,
      lead_expiry_days=$15,updated_at=CURRENT_TIMESTAMP
    WHERE id=$16 RETURNING *
  `, [d.name || cur.rows[0].name,d.planGroup || cur.rows[0].plan_group || d.name,planType,d.description || null,final,days,d.billingPeriod || cur.rows[0].billing_period,months,base,discount,JSON.stringify(benefits),JSON.stringify(entitlements),JSON.stringify(addOns),rollover,expiryDays,id]);
  return r.rows[0] || null;
}

async function setPlanStatus(id, active) {
  return (await pool.query('UPDATE membership_plans SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[active,id])).rows[0] || null;
}

async function deletePlan(id) {
  return (await pool.query('DELETE FROM membership_plans WHERE id=$1 RETURNING id',[id])).rows[0] || null;
}

module.exports = { getPlans, createPlan, createPlanBundle, updatePlan, setPlanStatus, deletePlan, calculatePrice };
