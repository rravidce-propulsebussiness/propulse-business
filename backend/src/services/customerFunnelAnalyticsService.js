const pool = require('../config/database');

const PERIODS = new Map([
  ['7',7],
  ['30',30],
  ['90',90],
  ['365',365],
  ['all',null],
]);
const CONVERSION_FILTERS = new Set(['all','converted','unconverted']);

function positiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed,max);
}

function parseFilters(query = {}) {
  const periodKey = PERIODS.has(String(query.period || '30')) ? String(query.period || '30') : '30';
  const days = PERIODS.get(periodKey);
  const flowIdRaw = Number(query.flowId);
  const flowId = Number.isInteger(flowIdRaw) && flowIdRaw > 0 ? flowIdRaw : null;
  const conversion = CONVERSION_FILTERS.has(String(query.conversion || 'all')) ? String(query.conversion || 'all') : 'all';
  const page = positiveInt(query.page,1,1000000);
  const limit = positiveInt(query.limit,25,100);
  const search = String(query.q || '').trim().slice(0,100);
  const fromDate = days === null ? null : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { periodKey,days,fromDate,flowId,conversion,page,limit,search };
}

function periodClause(alias, values, fromDate) {
  if (!fromDate) return '';
  values.push(fromDate);
  return ` AND ${alias}.created_at >= $${values.length}`;
}

function flowClause(alias, values, flowId) {
  if (!flowId) return '';
  values.push(flowId);
  return ` AND ${alias}.definition_id = $${values.length}`;
}

function percent(part,total) {
  const numerator = Number(part || 0);
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getEstimatorDefinitions() {
  const rows = (await pool.query(
    `SELECT id,key,name,is_active
       FROM customer_flow_definitions
      WHERE flow_type='estimator'
      ORDER BY is_active DESC,name,id`
  )).rows;
  return rows.map(row => ({
    id:Number(row.id),
    key:row.key,
    name:row.name,
    isActive:row.is_active !== false,
  }));
}

async function getEstimatorSummary(filters) {
  const values = [];
  let where = ' WHERE 1=1';
  where += periodClause('ec',values,filters.fromDate);
  where += flowClause('ec',values,filters.flowId);
  const row = (await pool.query(
    `SELECT COUNT(*)::int calculations,
            COUNT(*) FILTER (WHERE ec.converted_at IS NOT NULL)::int converted,
            COALESCE(AVG(ec.result_min),0)::numeric(14,2) average_min,
            COALESCE(AVG(ec.result_max),0)::numeric(14,2) average_max,
            MAX(ec.created_at) latest_calculation_at,
            MAX(ec.converted_at) latest_conversion_at
       FROM estimator_calculations ec${where}`,
    values
  )).rows[0] || {};
  return {
    calculations:number(row.calculations),
    converted:number(row.converted),
    conversionRate:percent(row.converted,row.calculations),
    averageMinimum:number(row.average_min),
    averageMaximum:number(row.average_max),
    latestCalculationAt:row.latest_calculation_at || null,
    latestConversionAt:row.latest_conversion_at || null,
  };
}

async function getEstimatorBreakdown(filters) {
  const values = [];
  let where = ` WHERE d.flow_type='estimator'`;
  where += periodClause('ec',values,filters.fromDate);
  where += flowClause('ec',values,filters.flowId);
  const rows = (await pool.query(
    `SELECT d.id definition_id,d.key,d.name,
            COUNT(ec.id)::int calculations,
            COUNT(ec.id) FILTER (WHERE ec.converted_at IS NOT NULL)::int converted,
            COALESCE(AVG(ec.result_min),0)::numeric(14,2) average_min,
            COALESCE(AVG(ec.result_max),0)::numeric(14,2) average_max,
            MAX(ec.created_at) latest_calculation_at
       FROM customer_flow_definitions d
       LEFT JOIN estimator_calculations ec ON ec.definition_id=d.id
       ${where}
       GROUP BY d.id,d.key,d.name
       ORDER BY calculations DESC,d.name`,
    values
  )).rows;
  return rows.map(row => ({
    definitionId:Number(row.definition_id),
    key:row.key,
    name:row.name,
    calculations:number(row.calculations),
    converted:number(row.converted),
    conversionRate:percent(row.converted,row.calculations),
    averageMinimum:number(row.average_min),
    averageMaximum:number(row.average_max),
    latestCalculationAt:row.latest_calculation_at || null,
  }));
}

async function getLeadSourceBreakdown(filters) {
  const values = ['public_requirement','public_estimator'];
  let where = ` WHERE l.source IN ($1,$2)`;
  where += periodClause('l',values,filters.fromDate);
  const rows = (await pool.query(
    `WITH funnel_leads AS (
       SELECT l.id,l.source,l.status
         FROM leads l
         ${where}
     ),
     paid AS (
       SELECT lp.lead_id,
              COUNT(*) FILTER (WHERE lp.status='paid')::int paid_purchases,
              COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric(14,2) paid_sales
         FROM lead_purchases lp
         JOIN funnel_leads fl ON fl.id=lp.lead_id
        GROUP BY lp.lead_id
     )
     SELECT fl.source,fl.status,COUNT(*)::int leads,
            COUNT(*) FILTER (WHERE COALESCE(p.paid_purchases,0)>0)::int monetized_leads,
            COALESCE(SUM(p.paid_sales),0)::numeric(14,2) paid_sales
       FROM funnel_leads fl
       LEFT JOIN paid p ON p.lead_id=fl.id
       GROUP BY fl.source,fl.status
       ORDER BY fl.source,fl.status`,
    values
  )).rows;

  const bySource = new Map();
  for (const row of rows) {
    const current = bySource.get(row.source) || {
      source:row.source,
      leads:0,
      monetizedLeads:0,
      paidSales:0,
      statuses:{},
    };
    current.leads += number(row.leads);
    current.monetizedLeads += number(row.monetized_leads);
    current.paidSales += number(row.paid_sales);
    current.statuses[row.status] = number(row.leads);
    bySource.set(row.source,current);
  }
  return ['public_requirement','public_estimator'].map(source => bySource.get(source) || {
    source,leads:0,monetizedLeads:0,paidSales:0,statuses:{},
  });
}

async function getRequirementFlowBreakdown(filters) {
  const values = ['public_requirement'];
  let where = ` WHERE l.source=$1`;
  where += periodClause('l',values,filters.fromDate);
  const rows = (await pool.query(
    `SELECT COALESCE(NULLIF(l.custom_fields->'_intake'->>'flowKey',''),'unknown') flow_key,
            COUNT(*)::int leads,
            COUNT(*) FILTER (WHERE l.status='sold')::int sold,
            MAX(l.created_at) latest_lead_at
       FROM leads l
       ${where}
       GROUP BY 1
       ORDER BY leads DESC,flow_key`,
    values
  )).rows;
  return rows.map(row => ({
    flowKey:row.flow_key,
    leads:number(row.leads),
    sold:number(row.sold),
    latestLeadAt:row.latest_lead_at || null,
  }));
}

async function getCityBreakdown(filters) {
  const values = [];
  let where = ' WHERE ec.city_id IS NOT NULL';
  where += periodClause('ec',values,filters.fromDate);
  where += flowClause('ec',values,filters.flowId);
  const rows = (await pool.query(
    `SELECT c.id city_id,c.name city_name,s.name state_name,
            COUNT(ec.id)::int calculations,
            COUNT(ec.id) FILTER (WHERE ec.converted_at IS NOT NULL)::int converted,
            COALESCE(AVG(ec.result_min),0)::numeric(14,2) average_min,
            COALESCE(AVG(ec.result_max),0)::numeric(14,2) average_max
       FROM estimator_calculations ec
       JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states s ON s.id=c.state_id
       ${where}
       GROUP BY c.id,c.name,s.name
       ORDER BY calculations DESC,converted DESC,c.name
       LIMIT 12`,
    values
  )).rows;
  return rows.map(row => ({
    cityId:Number(row.city_id),
    cityName:row.city_name,
    stateName:row.state_name || null,
    calculations:number(row.calculations),
    converted:number(row.converted),
    conversionRate:percent(row.converted,row.calculations),
    averageMinimum:number(row.average_min),
    averageMaximum:number(row.average_max),
  }));
}

async function getRecentCalculations(filters) {
  const values = [];
  const clauses = ['1=1'];
  if (filters.fromDate) {
    values.push(filters.fromDate);
    clauses.push(`ec.created_at >= $${values.length}`);
  }
  if (filters.flowId) {
    values.push(filters.flowId);
    clauses.push(`ec.definition_id = $${values.length}`);
  }
  if (filters.conversion === 'converted') clauses.push('ec.converted_at IS NOT NULL');
  if (filters.conversion === 'unconverted') clauses.push('ec.converted_at IS NULL');
  if (filters.search) {
    values.push(`%${filters.search}%`);
    const index = values.length;
    clauses.push(`(ec.public_id ILIKE $${index} OR COALESCE(ec.pincode,'') ILIKE $${index} OR d.name ILIKE $${index} OR COALESCE(c.name,'') ILIKE $${index} OR COALESCE(s.name,'') ILIKE $${index})`);
  }
  const where = ` WHERE ${clauses.join(' AND ')}`;
  const count = number((await pool.query(
    `SELECT COUNT(*)::int count
       FROM estimator_calculations ec
       JOIN customer_flow_definitions d ON d.id=ec.definition_id
       LEFT JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states s ON s.id=c.state_id
       ${where}`,
    values
  )).rows[0]?.count);

  const pageCount = Math.max(1,Math.ceil(count / filters.limit));
  const page = Math.min(filters.page,pageCount);
  const offset = (page - 1) * filters.limit;
  const listValues = [...values,filters.limit,offset];
  const limitIndex = listValues.length - 1;
  const offsetIndex = listValues.length;
  const rows = (await pool.query(
    `SELECT ec.public_id,ec.result_min,ec.result_max,ec.currency,ec.pincode,ec.created_at,ec.converted_at,
            d.id definition_id,d.key flow_key,d.name flow_name,v.version_no,
            c.name city_name,s.name state_name,
            l.id lead_id,l.status lead_status,l.source lead_source,
            COALESCE(sales.paid_purchases,0)::int paid_purchases,
            COALESCE(sales.paid_sales,0)::numeric(14,2) paid_sales
       FROM estimator_calculations ec
       JOIN customer_flow_definitions d ON d.id=ec.definition_id
       JOIN customer_flow_versions v ON v.id=ec.version_id
       LEFT JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states s ON s.id=c.state_id
       LEFT JOIN leads l ON l.id=ec.lead_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (WHERE lp.status='paid')::int paid_purchases,
                COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric(14,2) paid_sales
           FROM lead_purchases lp
          WHERE lp.lead_id=ec.lead_id
       ) sales ON TRUE
       ${where}
       ORDER BY ec.created_at DESC,ec.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    listValues
  )).rows;

  return {
    items:rows.map(row => ({
      calculationId:row.public_id,
      definitionId:Number(row.definition_id),
      flowKey:row.flow_key,
      flowName:row.flow_name,
      versionNo:Number(row.version_no),
      minimum:number(row.result_min),
      maximum:number(row.result_max),
      currency:row.currency,
      pincode:row.pincode || null,
      cityName:row.city_name || null,
      stateName:row.state_name || null,
      createdAt:row.created_at,
      convertedAt:row.converted_at || null,
      leadId:row.lead_id ? Number(row.lead_id) : null,
      leadStatus:row.lead_status || null,
      leadSource:row.lead_source || null,
      paidPurchases:number(row.paid_purchases),
      paidSales:number(row.paid_sales),
    })),
    pagination:{page,limit:filters.limit,total:count,pages:pageCount},
  };
}

async function getCustomerFunnelAnalytics(query = {}) {
  const filters = parseFilters(query);
  const [definitions,estimator,estimators,sources,requirements,cities,recent] = await Promise.all([
    getEstimatorDefinitions(),
    getEstimatorSummary(filters),
    getEstimatorBreakdown(filters),
    getLeadSourceBreakdown(filters),
    getRequirementFlowBreakdown(filters),
    getCityBreakdown(filters),
    getRecentCalculations(filters),
  ]);
  const direct = sources.find(item => item.source === 'public_requirement') || {leads:0,monetizedLeads:0,paidSales:0,statuses:{}};
  const estimatorLeads = sources.find(item => item.source === 'public_estimator') || {leads:0,monetizedLeads:0,paidSales:0,statuses:{}};
  return {
    filters:{
      period:filters.periodKey,
      days:filters.days,
      from:filters.fromDate,
      flowId:filters.flowId,
      conversion:filters.conversion,
      q:filters.search,
    },
    estimatorDefinitions:definitions,
    summary:{
      ...estimator,
      directRequirementLeads:direct.leads,
      estimatorCanonicalLeads:estimatorLeads.leads,
      customerFunnelLeads:direct.leads + estimatorLeads.leads,
      monetizedLeads:direct.monetizedLeads + estimatorLeads.monetizedLeads,
      paidLeadSales:Number((direct.paidSales + estimatorLeads.paidSales).toFixed(2)),
    },
    estimators,
    sources,
    requirements,
    cities,
    recent,
  };
}

module.exports = {
  getCustomerFunnelAnalytics,
  parseFilters,
};
