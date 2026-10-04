const crypto = require('crypto');
const pool = require('../config/database');
const customerFlowService = require('./customerFlowService');
const pincodeDetectionService = require('./pincodeDetectionService');
const leadService = require('./leadService');
const { normalizePhone, normalizeEmail, normalizeName, validateSubmissionKey } = require('./publicContactValidationService');
const { parseMoneyPaise, paiseToMoney } = require('../utils/money');
const { fail, isEmpty, isVisible, formatAnswer, validateAnswers } = require('./customerFlowValidationService');

const KEY_RE = /^[a-z][a-z0-9_]{1,79}$/;
const RATE_TYPES = new Set(['fixed','per_unit']);
const ADJUSTMENT_TYPES = new Set(['fixed','percent']);
const QUANTITY_SCALE = 1000n;
const PERCENT_DENOMINATOR = 10000n;

function roundDivide(numerator, denominator) {
  if (denominator <= 0n) throw new Error('Invalid estimator denominator');
  if (numerator >= 0n) return (numerator + denominator / 2n) / denominator;
  return -((-numerator + denominator / 2n) / denominator);
}

function parseQuantityScaled(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (!match) fail('Estimator quantity must be a positive number with up to 3 decimal places', 'INVALID_ESTIMATOR_QUANTITY');
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] || '').padEnd(3, '0'));
  const scaled = whole * QUANTITY_SCALE + fraction;
  if (scaled <= 0n) fail('Estimator quantity must be greater than zero', 'INVALID_ESTIMATOR_QUANTITY');
  return scaled;
}

function parsePercentBps(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^([+-]?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) fail('Estimator percentage must be a valid percentage with up to 2 decimal places', 'INVALID_ESTIMATOR_PERCENT');
  const sign = match[1] === '-' ? -1n : 1n;
  return sign * (BigInt(match[2]) * 100n + BigInt((match[3] || '').padEnd(2, '0')));
}

function multiplyRate(ratePaise, quantityScaled) {
  return roundDivide(ratePaise * quantityScaled, QUANTITY_SCALE);
}

function applyPercent(amountPaise, percentBps) {
  return amountPaise + roundDivide(amountPaise * percentBps, PERCENT_DENOMINATOR);
}

function normalizeRule(rule) {
  return rule && typeof rule === 'object' && !Array.isArray(rule) ? rule : {};
}

function ruleMatches(rule, answers) {
  return isVisible({ showWhen: normalizeRule(rule) }, answers);
}

function calculateEstimateFromConfig({ answers, rateItems, adjustments, cityId = null }) {
  let minimum = 0n;
  let maximum = 0n;
  const breakdown = [];
  let appliedRateCount = 0;

  for (const item of Array.isArray(rateItems) ? rateItems : []) {
    if (item.isActive === false || !ruleMatches(item.showWhen, answers)) continue;
    let itemMin = parseMoneyPaise(item.amountMin, { allowZero: true, code: 'INVALID_ESTIMATOR_RATE' });
    let itemMax = parseMoneyPaise(item.amountMax, { allowZero: true, code: 'INVALID_ESTIMATOR_RATE' });

    if (item.calculationType === 'per_unit') {
      const rawQuantity = answers?.[item.unitQuestionKey];
      if (isEmpty(rawQuantity)) fail(`Estimator configuration requires "${item.unitQuestionKey}"`, 'ESTIMATOR_INPUT_MISSING');
      const quantity = parseQuantityScaled(rawQuantity);
      itemMin = multiplyRate(itemMin, quantity);
      itemMax = multiplyRate(itemMax, quantity);
    } else if (item.calculationType !== 'fixed') {
      fail('Estimator rate configuration is invalid', 'INVALID_ESTIMATOR_RATE');
    }

    minimum += itemMin;
    maximum += itemMax;
    appliedRateCount += 1;
    breakdown.push({
      kind: 'rate',
      key: item.rateKey,
      label: item.label,
      minimum: paiseToMoney(itemMin),
      maximum: paiseToMoney(itemMax),
    });
  }

  if (!appliedRateCount) fail('No estimator rate applies to these answers. Admin configuration needs review.', 'ESTIMATOR_NOT_CONFIGURED');

  for (const item of Array.isArray(adjustments) ? adjustments : []) {
    if (item.isActive === false || !ruleMatches(item.showWhen, answers)) continue;
    if (item.cityId && Number(item.cityId) !== Number(cityId)) continue;

    const beforeMin = minimum;
    const beforeMax = maximum;
    if (item.adjustmentType === 'fixed') {
      minimum += parseMoneyPaise(item.valueMin, { allowZero: true, code: 'INVALID_ESTIMATOR_ADJUSTMENT' });
      maximum += parseMoneyPaise(item.valueMax, { allowZero: true, code: 'INVALID_ESTIMATOR_ADJUSTMENT' });
    } else if (item.adjustmentType === 'percent') {
      minimum = applyPercent(minimum, parsePercentBps(item.valueMin));
      maximum = applyPercent(maximum, parsePercentBps(item.valueMax));
    } else {
      fail('Estimator adjustment configuration is invalid', 'INVALID_ESTIMATOR_ADJUSTMENT');
    }

    if (minimum < 0n || maximum < minimum) fail('Estimator adjustment produced an invalid range', 'INVALID_ESTIMATOR_RESULT');
    breakdown.push({
      kind: 'adjustment',
      key: item.adjustmentKey,
      label: item.label,
      minimum: paiseToMoney(minimum - beforeMin),
      maximum: paiseToMoney(maximum - beforeMax),
    });
  }

  return {
    minimumPaise: minimum,
    maximumPaise: maximum,
    minimum: paiseToMoney(minimum),
    maximum: paiseToMoney(maximum),
    breakdown,
  };
}

function cleanRule(rule, questionKeys, label) {
  const value = normalizeRule(rule);
  const dependency = String(value.questionKey || '').trim();
  if (!dependency) return {};
  if (!questionKeys.has(dependency)) fail(`${label} references an unknown question "${dependency}"`, 'INVALID_ESTIMATOR_RULE');
  const hasRule = Object.prototype.hasOwnProperty.call(value, 'equals') || Object.prototype.hasOwnProperty.call(value, 'notEquals') || Array.isArray(value.in);
  if (!hasRule) fail(`${label} must define equals, notEquals, or in`, 'INVALID_ESTIMATOR_RULE');
  if (Array.isArray(value.in) && !value.in.length) fail(`${label} has an empty condition list`, 'INVALID_ESTIMATOR_RULE');
  return value;
}

function cleanMoney(value, label) {
  const paise = parseMoneyPaise(value, { allowZero: true, code: 'INVALID_ESTIMATOR_CONFIG' });
  return { paise, value: paiseToMoney(paise).toFixed(2) };
}

function cleanRate(item, index, questionMap) {
  const rateKey = String(item?.rateKey || '').trim().toLowerCase();
  const label = String(item?.label || '').trim().slice(0, 240);
  const calculationType = String(item?.calculationType || '').trim().toLowerCase();
  const unitQuestionKey = String(item?.unitQuestionKey || '').trim().toLowerCase() || null;
  if (!KEY_RE.test(rateKey) || !label || !RATE_TYPES.has(calculationType)) fail(`Estimator rate ${index + 1} is invalid`, 'INVALID_ESTIMATOR_CONFIG');
  if (calculationType === 'per_unit') {
    const question = questionMap.get(unitQuestionKey);
    if (!question || !['number','area'].includes(question.question_type)) fail(`Rate "${label}" must use a number or area question`, 'INVALID_ESTIMATOR_CONFIG');
  }
  if (calculationType === 'fixed' && unitQuestionKey) fail(`Fixed rate "${label}" cannot use a quantity question`, 'INVALID_ESTIMATOR_CONFIG');
  const min = cleanMoney(item?.amountMin, `${label} minimum`);
  const max = cleanMoney(item?.amountMax, `${label} maximum`);
  if (max.paise < min.paise) fail(`Rate "${label}" maximum must be at least the minimum`, 'INVALID_ESTIMATOR_CONFIG');
  return {
    rateKey,label,calculationType,unitQuestionKey,
    amountMin:min.value,amountMax:max.value,
    showWhen:cleanRule(item?.showWhen, new Set(questionMap.keys()), `Rate "${label}"`),
    displayOrder:Number(item?.displayOrder) || (index + 1) * 10,
    metadata:item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {},
    isActive:item?.isActive !== false,
  };
}

function cleanPercent(value, label) {
  const bps = parsePercentBps(value);
  if (bps <= -10000n || bps > 100000n) fail(`${label} must be greater than -100% and no more than 1000%`, 'INVALID_ESTIMATOR_CONFIG');
  return { bps, value: (Number(bps) / 100).toFixed(2) };
}

async function cleanAdjustment(client, item, index, questionKeys) {
  const adjustmentKey = String(item?.adjustmentKey || '').trim().toLowerCase();
  const label = String(item?.label || '').trim().slice(0, 240);
  const adjustmentType = String(item?.adjustmentType || '').trim().toLowerCase();
  const cityId = item?.cityId === '' || item?.cityId === null || item?.cityId === undefined ? null : Number(item.cityId);
  if (!KEY_RE.test(adjustmentKey) || !label || !ADJUSTMENT_TYPES.has(adjustmentType)) fail(`Estimator adjustment ${index + 1} is invalid`, 'INVALID_ESTIMATOR_CONFIG');
  if (cityId && (!Number.isInteger(cityId) || cityId <= 0 || !(await client.query('SELECT 1 FROM cities WHERE id=$1 AND is_active=TRUE',[cityId])).rows.length)) fail(`Adjustment "${label}" uses an invalid city`, 'INVALID_ESTIMATOR_CONFIG');

  let min;
  let max;
  if (adjustmentType === 'fixed') {
    min = cleanMoney(item?.valueMin, `${label} minimum`);
    max = cleanMoney(item?.valueMax, `${label} maximum`);
    if (max.paise < min.paise) fail(`Adjustment "${label}" maximum must be at least the minimum`, 'INVALID_ESTIMATOR_CONFIG');
  } else {
    min = cleanPercent(item?.valueMin, `${label} minimum`);
    max = cleanPercent(item?.valueMax, `${label} maximum`);
    if (max.bps < min.bps) fail(`Adjustment "${label}" maximum must be at least the minimum`, 'INVALID_ESTIMATOR_CONFIG');
  }

  return {
    adjustmentKey,label,adjustmentType,
    valueMin:min.value,valueMax:max.value,cityId,
    showWhen:cleanRule(item?.showWhen, questionKeys, `Adjustment "${label}"`),
    displayOrder:Number(item?.displayOrder) || (index + 1) * 10,
    metadata:item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {},
    isActive:item?.isActive !== false,
  };
}

async function versionQuestions(client, versionId) {
  return (await client.query('SELECT question_key,question_type FROM customer_flow_questions WHERE version_id=$1 AND is_active=TRUE',[versionId])).rows;
}

async function getEstimatorConfigForVersion(client, versionId) {
  const rates = (await client.query(
    'SELECT * FROM estimator_rate_items WHERE version_id=$1 ORDER BY display_order,id',
    [versionId]
  )).rows.map(row => ({
    id:row.id,rateKey:row.rate_key,label:row.label,calculationType:row.calculation_type,
    unitQuestionKey:row.unit_question_key,amountMin:String(row.amount_min),amountMax:String(row.amount_max),
    showWhen:row.show_when || {},displayOrder:row.display_order,metadata:row.metadata || {},isActive:row.is_active,
  }));
  const adjustments = (await client.query(
    `SELECT a.*,c.name city_name FROM estimator_adjustments a LEFT JOIN cities c ON c.id=a.city_id
      WHERE a.version_id=$1 ORDER BY a.display_order,a.id`,
    [versionId]
  )).rows.map(row => ({
    id:row.id,adjustmentKey:row.adjustment_key,label:row.label,adjustmentType:row.adjustment_type,
    valueMin:String(row.value_min),valueMax:String(row.value_max),cityId:row.city_id,cityName:row.city_name || null,
    showWhen:row.show_when || {},displayOrder:row.display_order,metadata:row.metadata || {},isActive:row.is_active,
  }));
  return { rates, adjustments };
}

async function getAdminConfig(flowId) {
  const definition = (await pool.query(
    `SELECT id,key,name,flow_type FROM customer_flow_definitions WHERE id=$1`,
    [Number(flowId)]
  )).rows[0];
  if (!definition) fail('Customer flow not found', 'FLOW_NOT_FOUND', 404);
  if (definition.flow_type !== 'estimator') fail('This flow is not an estimator', 'NOT_ESTIMATOR');

  const version = (await pool.query(
    `SELECT id,version_no,status FROM customer_flow_versions WHERE definition_id=$1
      ORDER BY CASE WHEN status='draft' THEN 0 WHEN status='published' THEN 1 ELSE 2 END,version_no DESC LIMIT 1`,
    [definition.id]
  )).rows[0];
  if (!version) fail('Estimator has no version', 'ESTIMATOR_VERSION_NOT_FOUND', 404);
  return { definition, version, editable:version.status === 'draft', ...(await getEstimatorConfigForVersion(pool, version.id)) };
}

async function saveAdminConfig(flowId, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const definition = (await client.query('SELECT id,flow_type FROM customer_flow_definitions WHERE id=$1 FOR UPDATE',[Number(flowId)])).rows[0];
    if (!definition) fail('Customer flow not found', 'FLOW_NOT_FOUND', 404);
    if (definition.flow_type !== 'estimator') fail('This flow is not an estimator', 'NOT_ESTIMATOR');
    const version = (await client.query(
      `SELECT id,version_no FROM customer_flow_versions WHERE definition_id=$1 AND status='draft' ORDER BY version_no DESC LIMIT 1 FOR UPDATE`,
      [definition.id]
    )).rows[0];
    if (!version) fail('Save the flow as a draft before changing estimator rates', 'ESTIMATOR_DRAFT_REQUIRED');

    const questions = await versionQuestions(client, version.id);
    const questionMap = new Map(questions.map(q => [q.question_key,q]));
    const questionKeys = new Set(questionMap.keys());
    const rawRates = Array.isArray(payload?.rates) ? payload.rates : [];
    const rawAdjustments = Array.isArray(payload?.adjustments) ? payload.adjustments : [];
    if (rawRates.length > 250 || rawAdjustments.length > 250) fail('Estimator configuration is too large', 'ESTIMATOR_CONFIG_TOO_LARGE');
    const rates = rawRates.map((item,index) => cleanRate(item,index,questionMap));
    if (new Set(rates.map(item => item.rateKey)).size !== rates.length) fail('Estimator rate keys must be unique', 'INVALID_ESTIMATOR_CONFIG');
    const adjustments = [];
    for (let index=0; index<rawAdjustments.length; index += 1) adjustments.push(await cleanAdjustment(client,rawAdjustments[index],index,questionKeys));
    if (adjustments.some(item => item.cityId) && !questions.some(question => question.question_type === 'location')) fail('Add a location question before configuring city-specific adjustments','ESTIMATOR_LOCATION_REQUIRED');
    if (new Set(adjustments.map(item => item.adjustmentKey)).size !== adjustments.length) fail('Estimator adjustment keys must be unique', 'INVALID_ESTIMATOR_CONFIG');

    await client.query('DELETE FROM estimator_rate_items WHERE version_id=$1',[version.id]);
    await client.query('DELETE FROM estimator_adjustments WHERE version_id=$1',[version.id]);
    for (const item of rates) {
      await client.query(
        `INSERT INTO estimator_rate_items(version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11)`,
        [version.id,item.rateKey,item.label,item.calculationType,item.unitQuestionKey,item.amountMin,item.amountMax,JSON.stringify(item.showWhen),item.displayOrder,JSON.stringify(item.metadata),item.isActive]
      );
    }
    for (const item of adjustments) {
      await client.query(
        `INSERT INTO estimator_adjustments(version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11)`,
        [version.id,item.adjustmentKey,item.label,item.adjustmentType,item.valueMin,item.valueMax,item.cityId,JSON.stringify(item.showWhen),item.displayOrder,JSON.stringify(item.metadata),item.isActive]
      );
    }
    await client.query('COMMIT');
    return getAdminConfig(flowId);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function resolveLocation(flow, answers) {
  const question = flow.questions.find(item => item.questionType === 'location' && isVisible(item,answers) && !isEmpty(answers[item.questionKey]));
  if (!question) return { cityId:null,pincode:null,cityName:null };
  const pincode = String(answers[question.questionKey]).trim();
  let detected;
  try {
    detected = await pincodeDetectionService.detectPincode(pincode);
  } catch (error) {
    if (['PIN_NOT_FOUND','PIN_LOOKUP_TIMEOUT','INVALID_PINCODE'].includes(error.code)) fail(error.message || 'Unable to verify this PIN code', error.code || 'INVALID_PINCODE');
    throw error;
  }
  if (!detected?.city?.id || ['NEEDS_MAPPING','NO_MATCH'].includes(detected.status)) fail('This PIN code is not mapped to a supported city yet.', 'PIN_CITY_MAPPING_REQUIRED');
  return { cityId:Number(detected.city.id),pincode,cityName:detected.city.name || null };
}

async function calculate({ key, flowToken, answers }) {
  const flow = await customerFlowService.getPublishedFlow(key);
  if (flow.flowType !== 'estimator') fail('This flow is not an estimator', 'NOT_ESTIMATOR', 404);
  customerFlowService.verifyFlowToken(flowToken, flow.versionId);
  const safeAnswers = validateAnswers(flow,answers);
  const { rates, adjustments } = await getEstimatorConfigForVersion(pool,flow.versionId);
  if (!rates.some(item => item.isActive !== false)) fail('This estimator is not configured yet', 'ESTIMATOR_NOT_CONFIGURED', 409);
  const location = await resolveLocation(flow,safeAnswers);
  const result = calculateEstimateFromConfig({ answers:safeAnswers,rateItems:rates,adjustments,cityId:location.cityId });

  const snapshot = {
    flow:{definitionId:flow.definitionId,key:flow.key,versionId:flow.versionId,versionNo:flow.versionNo},
    rates,
    adjustments,
  };
  const snapshotJson = JSON.stringify(snapshot);
  const configHash = crypto.createHash('sha256').update(snapshotJson).digest('hex');
  const publicId = crypto.randomBytes(18).toString('base64url');
  const inserted = (await pool.query(
    `INSERT INTO estimator_calculations(public_id,definition_id,version_id,city_id,pincode,answers,config_snapshot,config_hash,result_min,result_max,currency)
     VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,'INR')
     RETURNING public_id,created_at`,
    [publicId,flow.definitionId,flow.versionId,location.cityId,location.pincode,JSON.stringify(safeAnswers),snapshotJson,configHash,result.minimum,result.maximum]
  )).rows[0];

  return {
    calculationId:inserted.public_id,
    createdAt:inserted.created_at,
    flowKey:flow.key,
    versionNo:flow.versionNo,
    currency:'INR',
    minimum:result.minimum,
    maximum:result.maximum,
    cityId:location.cityId,
    cityName:location.cityName,
    breakdown:result.breakdown,
    quoteEligible:Boolean(location.cityId && location.pincode),
    disclaimer:String(flow.config?.estimatorDisclaimer || 'This is an indicative estimate based on the information provided. Final pricing may change after site inspection, measurements, specifications and professional review.'),
  };
}


function buildEstimatorLeadPayload(flow, calculation) {
  const answers = calculation.answers && typeof calculation.answers === 'object' && !Array.isArray(calculation.answers) ? calculation.answers : {};
  const custom = {};
  const marketplaceAnswers = {};
  const protectedAnswers = {};
  let propertyType = null;
  let budget = null;
  let explicitRequirement = null;
  const summaryParts = [];

  for (const question of flow.questions || []) {
    if (!isVisible(question, answers) || isEmpty(answers[question.questionKey])) continue;
    const formatted = formatAnswer(question, answers[question.questionKey]);
    if (!formatted) continue;
    if (question.leadField === 'property_type') propertyType = formatted;
    if (question.leadField === 'budget') budget = formatted;
    if (question.leadField === 'requirement') explicitRequirement = formatted;
    if (question.visibility === 'marketplace') {
      custom[question.label] = formatted;
      marketplaceAnswers[question.questionKey] = formatted;
      if (question.questionType !== 'location') summaryParts.push(`${question.label}: ${formatted}`);
    } else if (question.visibility === 'protected') {
      protectedAnswers[question.label] = formatted;
    }
  }

  const estimateText = `Indicative estimate ₹${Number(calculation.result_min).toLocaleString('en-IN')} – ₹${Number(calculation.result_max).toLocaleString('en-IN')}`;
  custom._estimator = {
    calculationId: calculation.public_id,
    flowKey: flow.key,
    definitionId: flow.definitionId,
    versionId: flow.versionId,
    versionNo: flow.versionNo,
    minimum: Number(calculation.result_min),
    maximum: Number(calculation.result_max),
    currency: calculation.currency,
    calculatedAt: calculation.created_at,
    configHash: calculation.config_hash,
    answers,
  };
  custom._intake = {
    flowKey: flow.key,
    definitionId: flow.definitionId,
    versionId: flow.versionId,
    versionNo: flow.versionNo,
    source: 'estimator_quote_request',
    answers,
  };
  custom._qualification = {
    detailedRequirementCompleted: true,
    budgetProvided: Boolean(budget),
    timelineProvided: Boolean((flow.questions || []).some(q => q.questionType === 'timeline' && !isEmpty(answers[q.questionKey]))),
    projectSizeKnown: Boolean((flow.questions || []).some(q => ['area','number'].includes(q.questionType) && !isEmpty(answers[q.questionKey]))),
    estimatorCompleted: true,
    marketplaceAnswers,
  };
  if (Object.keys(protectedAnswers).length) custom._protected_answers = protectedAnswers;

  const summary = summaryParts.join(' · ').slice(0, 3200);
  const requirement = (explicitRequirement ? `${explicitRequirement} · ${estimateText}` : `${flow.name}: ${summary || 'Customer requested actual quotations'} · ${estimateText}`).slice(0, 4000);
  return { customFields: custom, propertyType, budget, requirement };
}

async function convertCalculation({ publicId, contact, consent, submissionKey, website }) {
  if (String(website || '').trim()) return { accepted:true, filtered:true };
  if (consent !== true) fail('Consent is required to request quotations or callbacks','CONSENT_REQUIRED');

  const id = String(publicId || '').trim();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(id)) fail('Estimate not found','ESTIMATE_NOT_FOUND',404);
  const name = normalizeName(contact?.name);
  const phone = normalizePhone(contact?.phone);
  const email = normalizeEmail(contact?.email);
  const intakeKey = validateSubmissionKey(submissionKey);
  const lockKey = `estimator:convert:${id}`;
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))',[lockKey]);
    locked = true;
    const calculation = (await client.query(
      `SELECT ec.*,c.state_id
         FROM estimator_calculations ec
         LEFT JOIN cities c ON c.id=ec.city_id
        WHERE ec.public_id=$1
        LIMIT 1`,
      [id]
    )).rows[0];
    if (!calculation) fail('Estimate not found','ESTIMATE_NOT_FOUND',404);
    if (!calculation.city_id || !calculation.state_id || !calculation.pincode) fail('A verified project location is required before requesting quotations','ESTIMATOR_LOCATION_REQUIRED',409);
    if (calculation.lead_id) return { accepted:true,leadId:Number(calculation.lead_id),duplicate:true,calculationId:id };

    const flow = await customerFlowService.getVersionFlow(calculation.version_id);
    if (flow.flowType !== 'estimator') fail('This estimate is no longer available for quote requests','NOT_ESTIMATOR',404);
    const details = buildEstimatorLeadPayload(flow,calculation);

    let leadId = null;
    let duplicate = false;
    try {
      const lead = await leadService.createLead({
        industryId:flow.industryId,
        serviceId:flow.serviceId,
        subserviceId:flow.subserviceId,
        stateId:calculation.state_id || null,
        cityId:calculation.city_id || null,
        customerName:name,
        customerPhone:phone,
        customerEmail:email,
        requirement:details.requirement,
        propertyType:details.propertyType,
        budget:details.budget,
        source:'public_estimator',
        notes:null,
        customFields:details.customFields,
        pincode:calculation.pincode || null,
        contactConsentAt:new Date(),
        contactConsentVersion:'estimator-quote-contact-v1',
        intakeSubmissionKey:intakeKey,
        qualityGateContext:'public_estimator',
        createdBy:null,
      });
      leadId = Number(lead.id);
    } catch (error) {
      if (error.code === 'DUPLICATE_LEAD' && error.leadId) {
        leadId = Number(error.leadId);
        duplicate = true;
      } else if (error.code === '23505') {
        const existing = (await client.query('SELECT id FROM leads WHERE intake_submission_key=$1 LIMIT 1',[intakeKey])).rows[0];
        if (!existing) throw error;
        leadId = Number(existing.id);
        duplicate = true;
      } else {
        throw error;
      }
    }

    const linked = (await client.query(
      `UPDATE estimator_calculations
          SET lead_id=$1,converted_at=COALESCE(converted_at,CURRENT_TIMESTAMP)
        WHERE id=$2 AND lead_id IS NULL
        RETURNING lead_id,converted_at`,
      [leadId,calculation.id]
    )).rows[0];
    if (!linked) {
      const current = (await client.query('SELECT lead_id FROM estimator_calculations WHERE id=$1',[calculation.id])).rows[0];
      if (current?.lead_id) return { accepted:true,leadId:Number(current.lead_id),duplicate:true,calculationId:id };
      fail('Unable to link this estimate to a quote request','ESTIMATOR_CONVERSION_FAILED',409);
    }
    return { accepted:true,leadId,duplicate,calculationId:id };
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(hashtext($1))',[lockKey]).catch(()=>{});
    client.release();
  }
}

async function getCalculation(publicId) {
  const id = String(publicId || '').trim();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(id)) fail('Estimate not found', 'ESTIMATE_NOT_FOUND', 404);
  const row = (await pool.query(
    `SELECT ec.public_id,ec.result_min,ec.result_max,ec.currency,ec.created_at,ec.city_id,c.name city_name,
            d.key flow_key,v.version_no
       FROM estimator_calculations ec
       JOIN customer_flow_definitions d ON d.id=ec.definition_id
       JOIN customer_flow_versions v ON v.id=ec.version_id
       LEFT JOIN cities c ON c.id=ec.city_id
      WHERE ec.public_id=$1`,
    [id]
  )).rows[0];
  if (!row) fail('Estimate not found', 'ESTIMATE_NOT_FOUND', 404);
  return {
    calculationId:row.public_id,minimum:Number(row.result_min),maximum:Number(row.result_max),
    currency:row.currency,createdAt:row.created_at,cityId:row.city_id,cityName:row.city_name || null,
    flowKey:row.flow_key,versionNo:row.version_no,
  };
}

module.exports = {
  getAdminConfig,
  saveAdminConfig,
  calculate,
  getCalculation,
  convertCalculation,
  buildEstimatorLeadPayload,
  calculateEstimateFromConfig,
  parseQuantityScaled,
  parsePercentBps,
  multiplyRate,
  applyPercent,
};
