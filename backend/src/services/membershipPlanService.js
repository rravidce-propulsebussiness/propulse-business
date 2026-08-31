const pool = require('../config/database');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calculatePrice(base, months, discount = 0) {
  const raw = Math.max(0, toNumber(base)) * Math.max(1, toNumber(months, 1));
  const pct = Math.min(100, Math.max(0, toNumber(discount)));
  return Number((raw * (1 - pct / 100)).toFixed(2));
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
    const monthly = Math.max(0, toNumber(item.monthly_quantity ?? item.monthlyLimit ?? item.quantity ?? 0));
    const totalValue = item.period_total_quantity ?? item.periodTotal ?? item.totalLimit;
    const total = totalValue === undefined || totalValue === ''
      ? monthly * Math.max(1, toNumber(months, 1))
      : Math.max(0, toNumber(totalValue));
    return { ...item, quantity: monthly, monthly_quantity: monthly, period_total_quantity: total, complimentary: item.complimentary !== false };
  });
}

function normalizePlanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
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
  const name = normalizePlanName(d.name);
  if (!name) throw new Error('Plan name is required');
  const months = Math.max(1, Math.round(toNumber(d.billingMonths || d.durationMonths || 1, 1)));
  const base = d.monthlyBasePrice === undefined || d.monthlyBasePrice === '' ? Math.max(0, toNumber(d.price)) : Math.max(0, toNumber(d.monthlyBasePrice));
  const discount = Math.min(100, Math.max(0, toNumber(d.discountPercent)));
  const hasOverride = d.priceOverride !== undefined && d.priceOverride !== '' && Number.isFinite(Number(d.priceOverride));
  const finalPrice = hasOverride ? Math.max(0, toNumber(d.priceOverride)) : calculatePrice(base, months, discount);
  const days = Math.max(1, Math.round(toNumber(d.durationDays || months * 30.4375, 1)));
  const planType = normalizePlanType(d.planType);
  const entitlements = planType === 'booster' ? [] : normalizeEntitlements(d.leadEntitlements, months);
  const expiryDays = d.leadExpiryDays === undefined || d.leadExpiryDays === '' || d.leadExpiryDays === null ? null : Math.max(1, Math.round(toNumber(d.leadExpiryDays)));
  const r = await pool.query(`
    INSERT INTO membership_plans(name,plan_group,plan_type,description,price,duration_days,billing_period,billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,add_ons,lead_rollover_enabled,lead_expiry_days)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    ON CONFLICT (name) DO UPDATE SET
      plan_group=EXCLUDED.plan_group, plan_type=EXCLUDED.plan_type, description=EXCLUDED.description,
      price=EXCLUDED.price, duration_days=EXCLUDED.duration_days, billing_period=EXCLUDED.billing_period,
      billing_months=EXCLUDED.billing_months, monthly_base_price=EXCLUDED.monthly_base_price,
      discount_percent=EXCLUDED.discount_percent, benefits=EXCLUDED.benefits,
      lead_entitlements=EXCLUDED.lead_entitlements, add_ons=EXCLUDED.add_ons,
      lead_rollover_enabled=EXCLUDED.lead_rollover_enabled, lead_expiry_days=EXCLUDED.lead_expiry_days,
      updated_at=CURRENT_TIMESTAMP
    RETURNING *
  `, [name, normalizePlanName(d.planGroup || name), planType, d.description || null, finalPrice, days,
      String(d.billingPeriod || `${months}-month`).trim().slice(0, 40), months, base, discount,
      JSON.stringify(safeJson(d.benefits)), JSON.stringify(entitlements), JSON.stringify(safeJson(d.addOns)),
      d.leadRolloverEnabled !== false, expiryDays]);
  return r.rows[0];
}

async function createPlanBundle(d) {
  const periods = Array.isArray(d.periods) ? d.periods.filter(x => x && x.enabled !== false && Number(x.months) > 0) : [];
  if (!periods.length) throw new Error('At least one billing cycle is required');
  const planType = normalizePlanType(d.planType, 'pro');
  const planName = normalizePlanName(d.name);
  if (!planName) throw new Error('Plan name is required');
  const rows = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const period of periods) {
      const months = Math.max(1, Math.round(toNumber(period.months, 1)));
      const label = String(period.label || `${months}-month`).trim().slice(0, 40);
      const p = d.pricing?.[period.key] || {};
      const entitlements = planType === 'booster' ? [] : normalizeEntitlements(period.leadEntitlements ?? d.leadEntitlements, months);
      const name = normalizePlanName(`${planName} ${label}`);
      const base = Math.max(0, toNumber(d.monthlyBasePrice));
      const discount = Math.min(100, Math.max(0, toNumber(p.discount)));
      const rawOverride = p.customPrice === true ? p.price : '';
      const priceOverride = rawOverride !== '' && Number.isFinite(Number(rawOverride)) ? Number(rawOverride) : '';
      const finalPrice = priceOverride === '' ? calculatePrice(base, months, discount) : Math.max(0, priceOverride);
      const result = await client.query(`
        INSERT INTO membership_plans(name,plan_group,plan_type,description,price,duration_days,billing_period,billing_months,monthly_base_price,discount_percent,benefits,lead_entitlements,add_ons,lead_rollover_enabled,lead_expiry_days)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (name) DO UPDATE SET
          plan_group=EXCLUDED.plan_group, plan_type=EXCLUDED.plan_type, description=EXCLUDED.description,
          price=EXCLUDED.price, duration_days=EXCLUDED.duration_days, billing_period=EXCLUDED.billing_period,
          billing_months=EXCLUDED.billing_months, monthly_base_price=EXCLUDED.monthly_base_price,
          discount_percent=EXCLUDED.discount_percent, benefits=EXCLUDED.benefits,
          lead_entitlements=EXCLUDED.lead_entitlements, add_ons=EXCLUDED.add_ons,
          lead_rollover_enabled=EXCLUDED.lead_rollover_enabled, lead_expiry_days=EXCLUDED.lead_expiry_days,
          updated_at=CURRENT_TIMESTAMP
        RETURNING *
      `, [name, planName, planType, d.description || null, finalPrice, Math.max(1, Math.round(months * 30.4375)), label,
          months, base, discount, JSON.stringify(safeJson(d.benefits)), JSON.stringify(entitlements), JSON.stringify(safeJson(d.addOns)),
          d.leadRolloverEnabled !== false,
          d.leadExpiryDays === undefined || d.leadExpiryDays === '' || d.leadExpiryDays === null ? null : Math.max(1, Math.round(toNumber(d.leadExpiryDays)))]);
      rows.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updatePlan(id, d) {
  const cur = await pool.query('SELECT * FROM membership_plans WHERE id=$1', [id]);
  if (!cur.rows[0]) return null;
  const current = cur.rows[0];
  const months = Math.max(1, Math.round(toNumber(d.billingMonths || d.durationMonths || current.billing_months || 1, 1)));
  const base = d.monthlyBasePrice === undefined || d.monthlyBasePrice === '' ? Math.max(0, toNumber(d.price || current.monthly_base_price || current.price)) : Math.max(0, toNumber(d.monthlyBasePrice));
  const discount = Math.min(100, Math.max(0, toNumber(d.discountPercent)));
  const hasOverride = d.priceOverride !== undefined && d.priceOverride !== '' && Number.isFinite(Number(d.priceOverride));
  const final = hasOverride ? Math.max(0, toNumber(d.priceOverride)) : calculatePrice(base, months, discount);
  const planType = normalizePlanType(d.planType, normalizePlanType(current.plan_type));
  const incomingEntitlements = normalizeEntitlements(d.leadEntitlements, months);
  const entitlements = planType === 'booster' ? [] : (incomingEntitlements.length ? incomingEntitlements : normalizeEntitlements(current.lead_entitlements, months));
  const expiryDays = d.leadExpiryDays === undefined ? current.lead_expiry_days : (d.leadExpiryDays === '' || d.leadExpiryDays === null ? null : Math.max(1, Math.round(toNumber(d.leadExpiryDays))));
  const r = await pool.query(`
    UPDATE membership_plans SET name=$1,plan_group=$2,plan_type=$3,description=$4,price=$5,duration_days=$6,
      billing_period=$7,billing_months=$8,monthly_base_price=$9,discount_percent=$10,benefits=$11,lead_entitlements=$12,
      add_ons=$13,lead_rollover_enabled=$14,lead_expiry_days=$15,updated_at=CURRENT_TIMESTAMP
    WHERE id=$16 RETURNING *
  `, [normalizePlanName(d.name || current.name), normalizePlanName(d.planGroup || current.plan_group || d.name || current.name), planType,
      d.description === undefined ? current.description : (d.description || null), final, Math.max(1, Math.round(toNumber(d.durationDays || months * 30.4375, 1))),
      String(d.billingPeriod || current.billing_period || `${months}-month`).trim().slice(0, 40), months, base, discount,
      JSON.stringify(safeJson(d.benefits, safeJson(current.benefits))), JSON.stringify(entitlements), JSON.stringify(safeJson(d.addOns, safeJson(current.add_ons))),
      d.leadRolloverEnabled === undefined ? current.lead_rollover_enabled : Boolean(d.leadRolloverEnabled), expiryDays, id]);
  return r.rows[0] || null;
}

async function setPlanStatus(id, active) {
  return (await pool.query('UPDATE membership_plans SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[Boolean(active),id])).rows[0] || null;
}

async function deletePlan(id) {
  return (await pool.query('DELETE FROM membership_plans WHERE id=$1 RETURNING id',[id])).rows[0] || null;
}

module.exports = { getPlans, createPlan, createPlanBundle, updatePlan, setPlanStatus, deletePlan, calculatePrice };
