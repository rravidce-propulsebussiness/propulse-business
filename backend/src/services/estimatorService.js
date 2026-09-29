const crypto = require('crypto');
const pool = require('../config/database');
const customerFlowService = require('./customerFlowService');
const pincodeDetectionService = require('./pincodeDetectionService');
const leadService = require('./leadService');
const leadQualityGateService = require('./leadQualityGateService');
const estimatePdfService = require('./estimatePdfService');
const { normalizePhone, normalizeEmail, normalizeName, validateSubmissionKey } = require('./publicContactValidationService');
const { parseMoneyPaise, paiseToMoney } = require('../utils/money');
const { fail, isEmpty, isVisible, formatAnswer, validateAnswers } = require('./customerFlowValidationService');

const KEY_RE = /^[a-z][a-z0-9_]{1,79}$/;
const RATE_TYPES = new Set(['fixed','per_unit']);
const ADJUSTMENT_TYPES = new Set(['fixed','percent','per_unit']);
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
    } else if (item.adjustmentType === 'per_unit') {
      const rawQuantity=answers?.[item.unitQuestionKey];
      if (isEmpty(rawQuantity)) fail(`Estimator adjustment requires "${item.unitQuestionKey}"`, 'ESTIMATOR_INPUT_MISSING');
      const quantity=parseQuantityScaled(rawQuantity);
      minimum += multiplyRate(parseMoneyPaise(item.valueMin,{allowZero:true,code:'INVALID_ESTIMATOR_ADJUSTMENT'}),quantity);
      maximum += multiplyRate(parseMoneyPaise(item.valueMax,{allowZero:true,code:'INVALID_ESTIMATOR_ADJUSTMENT'}),quantity);
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

async function cleanAdjustment(client, item, index, questionMap) {
  const adjustmentKey = String(item?.adjustmentKey || '').trim().toLowerCase();
  const label = String(item?.label || '').trim().slice(0, 240);
  const adjustmentType = String(item?.adjustmentType || '').trim().toLowerCase();
  const cityId = item?.cityId === '' || item?.cityId === null || item?.cityId === undefined ? null : Number(item.cityId);
  if (!KEY_RE.test(adjustmentKey) || !label || !ADJUSTMENT_TYPES.has(adjustmentType)) fail(`Estimator adjustment ${index + 1} is invalid`, 'INVALID_ESTIMATOR_CONFIG');
  if (cityId && (!Number.isInteger(cityId) || cityId <= 0 || !(await client.query('SELECT 1 FROM cities WHERE id=$1 AND is_active=TRUE',[cityId])).rows.length)) fail(`Adjustment "${label}" uses an invalid city`, 'INVALID_ESTIMATOR_CONFIG');

  const unitQuestionKey=adjustmentType==='per_unit'?String(item?.unitQuestionKey||'').trim().toLowerCase():null;
  if(adjustmentType==='per_unit'){
    const unitQuestion=questionMap.get(unitQuestionKey);
    if(!KEY_RE.test(unitQuestionKey)||!unitQuestion||!['number','area'].includes(unitQuestion.question_type)) fail(`Adjustment "${label}" needs a number or area quantity question`, 'INVALID_ESTIMATOR_CONFIG');
  }

  let min;
  let max;
  if (adjustmentType === 'fixed' || adjustmentType === 'per_unit') {
    min = cleanMoney(item?.valueMin, `${label} minimum`);
    max = cleanMoney(item?.valueMax, `${label} maximum`);
    if (max.paise < min.paise) fail(`Adjustment "${label}" maximum must be at least the minimum`, 'INVALID_ESTIMATOR_CONFIG');
  } else {
    min = cleanPercent(item?.valueMin, `${label} minimum`);
    max = cleanPercent(item?.valueMax, `${label} maximum`);
    if (max.bps < min.bps) fail(`Adjustment "${label}" maximum must be at least the minimum`, 'INVALID_ESTIMATOR_CONFIG');
  }

  return {
    adjustmentKey,label,adjustmentType,unitQuestionKey,
    valueMin:min.value,valueMax:max.value,cityId,
    showWhen:cleanRule(item?.showWhen, new Set(questionMap.keys()), `Adjustment "${label}"`),
    displayOrder:Number(item?.displayOrder) || (index + 1) * 10,
    metadata:item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {},
    isActive:item?.isActive !== false,
  };
}

function cleanPackageDetail(item, index, packageLabel) {
  const detailKey = String(item?.detailKey || '').trim().toLowerCase();
  const section = String(item?.section || 'Specifications').trim().slice(0,160) || 'Specifications';
  const label = String(item?.label || '').trim().slice(0,180);
  const value = String(item?.value || '').trim().slice(0,800);
  const note = String(item?.note || '').trim().slice(0,800) || null;
  if (!KEY_RE.test(detailKey) || !label || !value) fail(`Package "${packageLabel}" detail ${index + 1} is invalid`, 'INVALID_ESTIMATOR_PACKAGE');
  return { detailKey,section,label,value,note,displayOrder:Number(item?.displayOrder) || (index + 1) * 10,isActive:item?.isActive !== false };
}

function cleanPackage(item, index, questionMap) {
  const packageKey = String(item?.packageKey || '').trim().toLowerCase();
  const label = String(item?.label || '').trim().slice(0,160);
  const badge = String(item?.badge || '').trim().slice(0,80) || null;
  const selectorQuestionKey = String(item?.selectorQuestionKey || '').trim().toLowerCase();
  const selectorValue = String(item?.selectorValue ?? '').trim().slice(0,160);
  const summary = String(item?.summary || '').trim().slice(0,800) || null;
  const priceNote = String(item?.priceNote || '').trim().slice(0,240) || null;
  if (!KEY_RE.test(packageKey) || !label || !selectorQuestionKey || !selectorValue) fail(`Estimator package ${index + 1} is invalid`, 'INVALID_ESTIMATOR_PACKAGE');
  const question = questionMap.get(selectorQuestionKey);
  if (!question) fail(`Package "${label}" references unknown question "${selectorQuestionKey}"`, 'INVALID_ESTIMATOR_PACKAGE');
  if (!['single_select','multi_select','boolean'].includes(question.question_type)) fail(`Package "${label}" must use a select or boolean question`, 'INVALID_ESTIMATOR_PACKAGE');
  if (question.question_type === 'boolean' && !['true','false'].includes(selectorValue.toLowerCase())) fail(`Package "${label}" must use true or false for its boolean selector`, 'INVALID_ESTIMATOR_PACKAGE');
  if (question.question_type !== 'boolean' && Array.isArray(question.option_values) && !question.option_values.map(String).includes(selectorValue)) fail(`Package "${label}" references an unknown selector value`, 'INVALID_ESTIMATOR_PACKAGE');
  const rawDetails = Array.isArray(item?.details) ? item.details : [];
  if (rawDetails.length > 120) fail(`Package "${label}" has too many detail rows`, 'ESTIMATOR_CONFIG_TOO_LARGE');
  const details = rawDetails.map((detail,detailIndex)=>cleanPackageDetail(detail,detailIndex,label));
  if (new Set(details.map(detail=>detail.detailKey)).size !== details.length) fail(`Package "${label}" detail keys must be unique`, 'INVALID_ESTIMATOR_PACKAGE');
  return {
    packageKey,label,badge,selectorQuestionKey,selectorValue,summary,priceNote,
    displayOrder:Number(item?.displayOrder) || (index + 1) * 10,
    metadata:item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {},
    isActive:item?.isActive !== false,details,
  };
}

function selectedPackage(packages, answers) {
  for (const item of Array.isArray(packages) ? packages : []) {
    if (item.isActive === false) continue;
    const answer = answers?.[item.selectorQuestionKey];
    const matched = Array.isArray(answer) ? answer.map(String).includes(String(item.selectorValue)) : String(answer ?? '') === String(item.selectorValue);
    if (matched) return item;
  }
  return null;
}

async function versionQuestions(client, versionId) {
  return (await client.query(
    `SELECT q.question_key,q.question_type,
            ARRAY(SELECT o.value FROM customer_flow_question_options o WHERE o.question_id=q.id AND o.is_active=TRUE ORDER BY o.display_order,o.id) option_values
       FROM customer_flow_questions q
      WHERE q.version_id=$1 AND q.is_active=TRUE`,
    [versionId]
  )).rows;
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
    unitQuestionKey:row.unit_question_key || null,valueMin:String(row.value_min),valueMax:String(row.value_max),cityId:row.city_id,cityName:row.city_name || null,
    showWhen:row.show_when || {},displayOrder:row.display_order,metadata:row.metadata || {},isActive:row.is_active,
  }));
  const packageRows = (await client.query(
    'SELECT * FROM estimator_packages WHERE version_id=$1 ORDER BY display_order,id',
    [versionId]
  )).rows;
  const detailRows = packageRows.length ? (await client.query(
    'SELECT * FROM estimator_package_details WHERE package_id=ANY($1::int[]) ORDER BY package_id,display_order,id',
    [packageRows.map(row=>row.id)]
  )).rows : [];
  const detailsByPackage = new Map();
  for (const row of detailRows) {
    if (!detailsByPackage.has(Number(row.package_id))) detailsByPackage.set(Number(row.package_id),[]);
    detailsByPackage.get(Number(row.package_id)).push({
      id:row.id,detailKey:row.detail_key,section:row.section,label:row.label,value:row.value,note:row.note,
      displayOrder:row.display_order,isActive:row.is_active,
    });
  }
  const packages = packageRows.map(row=>({
    id:row.id,packageKey:row.package_key,label:row.label,badge:row.badge,selectorQuestionKey:row.selector_question_key,
    selectorValue:row.selector_value,summary:row.summary,priceNote:row.price_note,displayOrder:row.display_order,
    metadata:row.metadata || {},isActive:row.is_active,details:detailsByPackage.get(Number(row.id)) || [],
  }));
  return { rates, adjustments, packages };
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
    const rawPackages = Array.isArray(payload?.packages) ? payload.packages : null;
    if (rawRates.length > 250 || rawAdjustments.length > 250 || (rawPackages && rawPackages.length > 80)) fail('Estimator configuration is too large', 'ESTIMATOR_CONFIG_TOO_LARGE');
    const rates = rawRates.map((item,index) => cleanRate(item,index,questionMap));
    if (new Set(rates.map(item => item.rateKey)).size !== rates.length) fail('Estimator rate keys must be unique', 'INVALID_ESTIMATOR_CONFIG');
    const adjustments = [];
    for (let index=0; index<rawAdjustments.length; index += 1) adjustments.push(await cleanAdjustment(client,rawAdjustments[index],index,questionMap));
    if (adjustments.some(item => item.cityId) && !questions.some(question => question.question_type === 'location')) fail('Add a location question before configuring city-specific adjustments','ESTIMATOR_LOCATION_REQUIRED');
    if (new Set(adjustments.map(item => item.adjustmentKey)).size !== adjustments.length) fail('Estimator adjustment keys must be unique', 'INVALID_ESTIMATOR_CONFIG');
    const materialAdjustments=adjustments.filter(item=>item.metadata?.kind==='material_option');
    for (const item of materialAdjustments) {
      const dependency=String(item.showWhen?.questionKey||'').trim();
      const optionValue=Object.prototype.hasOwnProperty.call(item.showWhen||{},'equals')?String(item.showWhen.equals):'';
      const question=questionMap.get(dependency);
      if (!question || !['single_select','multi_select','boolean'].includes(question.question_type) || !optionValue) fail('Detailed option prices must select a specification question and option','INVALID_ESTIMATOR_CONFIG');
      if (question.question_type === 'boolean' && !['true','false'].includes(optionValue.toLowerCase())) fail('Detailed option price has an invalid boolean option','INVALID_ESTIMATOR_CONFIG');
      if (question.question_type !== 'boolean' && !question.option_values.map(String).includes(optionValue)) fail('Detailed option price references an unavailable specification option','INVALID_ESTIMATOR_CONFIG');
    }
    if (new Set(materialAdjustments.map(item=>String(item.showWhen.questionKey)+'::'+String(item.showWhen.equals)+'::'+String(item.cityId||''))).size !== materialAdjustments.length) fail('Detailed option prices must be unique per specification option and city','INVALID_ESTIMATOR_CONFIG');
    const packages = rawPackages ? rawPackages.map((item,index)=>cleanPackage(item,index,questionMap)) : null;
    if (packages && new Set(packages.map(item=>item.packageKey)).size !== packages.length) fail('Estimator package keys must be unique', 'INVALID_ESTIMATOR_PACKAGE');
    if (packages && new Set(packages.map(item=>item.selectorQuestionKey+'::'+item.selectorValue)).size !== packages.length) fail('Each estimator package must use a unique selector question and value', 'INVALID_ESTIMATOR_PACKAGE');

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
        `INSERT INTO estimator_adjustments(version_id,adjustment_key,label,adjustment_type,unit_question_key,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12)`,
        [version.id,item.adjustmentKey,item.label,item.adjustmentType,item.unitQuestionKey,item.valueMin,item.valueMax,item.cityId,JSON.stringify(item.showWhen),item.displayOrder,JSON.stringify(item.metadata),item.isActive]
      );
    }
    if (packages) {
      await client.query('DELETE FROM estimator_packages WHERE version_id=$1',[version.id]);
      for (const item of packages) {
        const packageRow = (await client.query(
          `INSERT INTO estimator_packages(version_id,package_key,label,badge,selector_question_key,selector_value,summary,price_note,display_order,metadata,is_active)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) RETURNING id`,
          [version.id,item.packageKey,item.label,item.badge,item.selectorQuestionKey,item.selectorValue,item.summary,item.priceNote,item.displayOrder,JSON.stringify(item.metadata),item.isActive]
        )).rows[0];
        for (const detail of item.details) {
          await client.query(
            `INSERT INTO estimator_package_details(package_id,detail_key,section,label,value,note,display_order,is_active)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [packageRow.id,detail.detailKey,detail.section,detail.label,detail.value,detail.note,detail.displayOrder,detail.isActive]
          );
        }
      }
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
  if (!question) return { cityId:null,stateId:null,pincode:null,cityName:null };
  const pincode = String(answers[question.questionKey]).trim();
  let detected;
  try {
    detected = await pincodeDetectionService.detectPincode(pincode);
  } catch (error) {
    if (['PIN_NOT_FOUND','PIN_LOOKUP_TIMEOUT','INVALID_PINCODE'].includes(error.code)) fail(error.message || 'Unable to verify this PIN code', error.code || 'INVALID_PINCODE');
    throw error;
  }
  if (!detected?.city?.id || ['NEEDS_MAPPING','NO_MATCH'].includes(detected.status)) fail('This PIN code is not mapped to a supported city yet.', 'PIN_CITY_MAPPING_REQUIRED');
  return {
    cityId:Number(detected.city.id),
    stateId:Number(detected.city.state_id) || null,
    pincode,
    cityName:detected.city.name || null,
  };
}

function calculationResponse({ flow, calculation, location, result, leadId=null, leadStatus=null, duplicate=false }) {
  return {
    calculationId:calculation.public_id,
    createdAt:calculation.created_at,
    flowKey:flow.key,
    versionNo:flow.versionNo,
    currency:calculation.currency || 'INR',
    minimum:Number(calculation.result_min),
    maximum:Number(calculation.result_max),
    cityId:calculation.city_id || location?.cityId || null,
    cityName:location?.cityName || null,
    breakdown:result.breakdown,
    package:selectedPackage(calculation.config_snapshot?.packages || flow.packages,calculation.answers || {}),
    leadCaptured:Boolean(leadId),
    leadId:leadId ? Number(leadId) : null,
    leadStatus:leadStatus || null,
    duplicate:Boolean(duplicate),
    pdfToken:estimatePdfService.createPdfToken(calculation.public_id),
    disclaimer:String(flow.config?.estimatorDisclaimer || 'This is an indicative estimate based on the information provided. Final pricing may change after site inspection, measurements, specifications and professional review.'),
  };
}

async function ensureEstimatorContactLead({flow,calculation,location,intakeKey,contact}) {
  const details=buildEstimatorLeadPayload(flow,calculation,{source:'estimator_calculation',contactPending:false});
  if (calculation.lead_id) {
    const current=(await pool.query('SELECT id,status,customer_name,customer_phone FROM leads WHERE id=$1',[Number(calculation.lead_id)])).rows[0];
    if (current?.customer_phone) return {leadId:Number(current.id),leadStatus:current.status};
    if (current) {
      const updated=(await pool.query(
        `UPDATE leads SET customer_name=$1,customer_phone=$2,customer_email=$3,requirement=$4,property_type=$5,budget=$6,
           source='public_estimator',state_id=$7,city_id=$8,pincode=$9,
           custom_fields=COALESCE(custom_fields,'{}'::jsonb) || $10::jsonb,
           contact_consent_at=CURRENT_TIMESTAMP,contact_consent_version='estimator-contact-v1',updated_at=CURRENT_TIMESTAMP
         WHERE id=$11 RETURNING id,status`,
        [contact.name,contact.phone,contact.email,details.requirement,details.propertyType,details.budget,location?.stateId||null,calculation.city_id||location?.cityId||null,calculation.pincode||location?.pincode||null,JSON.stringify(details.customFields),current.id]
      )).rows[0];
      const gated=await leadQualityGateService.evaluateAndApply(Number(current.id),{context:'public_estimator',autoRelease:true});
      await pool.query('UPDATE estimator_calculations SET converted_at=COALESCE(converted_at,CURRENT_TIMESTAMP) WHERE id=$1',[calculation.id]);
      return {leadId:Number(current.id),leadStatus:gated.lead?.status || updated.status};
    }
  }

  let lead;
  try {
    lead=await leadService.createLead({
      industryId:flow.industryId,serviceId:flow.serviceId,subserviceId:flow.subserviceId,
      stateId:location?.stateId || null,cityId:calculation.city_id || location?.cityId || null,
      customerName:contact.name,customerPhone:contact.phone,customerEmail:contact.email,
      requirement:details.requirement,propertyType:details.propertyType,budget:details.budget,
      source:'public_estimator',notes:null,customFields:details.customFields,pincode:calculation.pincode || location?.pincode || null,
      contactConsentAt:new Date(),contactConsentVersion:'estimator-contact-v1',intakeSubmissionKey:intakeKey,
      qualityGateContext:'public_estimator',createdBy:null,
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_LEAD' && error.leadId) {
      lead=(await pool.query('SELECT id,status FROM leads WHERE id=$1',[Number(error.leadId)])).rows[0];
    } else if (error.code === '23505') {
      lead=(await pool.query('SELECT id,status FROM leads WHERE intake_submission_key=$1 LIMIT 1',[intakeKey])).rows[0];
      if (!lead) throw error;
    } else throw error;
  }
  if (!lead) fail('Unable to create estimator lead','ESTIMATOR_LEAD_CREATE_FAILED',409);
  const leadId=Number(lead.id);
  const linked=(await pool.query(
    `UPDATE estimator_calculations SET lead_id=$1,converted_at=COALESCE(converted_at,CURRENT_TIMESTAMP)
      WHERE id=$2 AND lead_id IS NULL RETURNING lead_id`,
    [leadId,calculation.id]
  )).rows[0];
  if (!linked) {
    const current=(await pool.query('SELECT lead_id FROM estimator_calculations WHERE id=$1',[calculation.id])).rows[0];
    if (current?.lead_id) return {leadId:Number(current.lead_id),leadStatus:lead.status};
    fail('Unable to link the estimate to its customer lead','ESTIMATOR_LEAD_LINK_FAILED',409);
  }
  return {leadId,leadStatus:lead.status};
}

async function calculate({ key, flowToken, answers, submissionKey, contact, consent, website }) {
  if (String(website || '').trim()) fail('Unable to calculate this estimate','INVALID_ESTIMATOR_SUBMISSION');
  if (consent !== true) fail('Consent is required to calculate an estimate and create your project enquiry','CONSENT_REQUIRED');
  const contactData={name:normalizeName(contact?.name),phone:normalizePhone(contact?.phone),email:normalizeEmail(contact?.email)};
  const flow = await customerFlowService.getPublishedFlow(key);
  if (flow.flowType !== 'estimator') fail('This flow is not an estimator', 'NOT_ESTIMATOR', 404);
  customerFlowService.verifyFlowToken(flowToken, flow.versionId);
  const safeAnswers = validateAnswers(flow,answers);
  const intakeKey = String(submissionKey || '').trim() ? validateSubmissionKey(submissionKey) : `estcalc_${crypto.randomBytes(18).toString('base64url')}`;
  const { rates, adjustments, packages } = await getEstimatorConfigForVersion(pool,flow.versionId);
  if (!rates.some(item => item.isActive !== false)) fail('This estimator is not configured yet', 'ESTIMATOR_NOT_CONFIGURED', 409);

  const existing = (await pool.query(
    `SELECT ec.*,c.state_id,c.name city_name,l.status lead_status
       FROM estimator_calculations ec
       LEFT JOIN cities c ON c.id=ec.city_id
       LEFT JOIN leads l ON l.id=ec.lead_id
      WHERE ec.intake_submission_key=$1
      LIMIT 1`,
    [intakeKey]
  )).rows[0];
  if (existing) {
    if (Number(existing.definition_id) !== Number(flow.definitionId)) fail('Submission session belongs to a different estimator', 'INVALID_SUBMISSION_KEY', 409);
    const historicalFlow=Number(existing.version_id)===Number(flow.versionId)?flow:await customerFlowService.getVersionFlow(existing.version_id);
    const existingAnswers=existing.answers && typeof existing.answers === 'object' && !Array.isArray(existing.answers) ? existing.answers : safeAnswers;
    const savedConfig=existing.config_snapshot && typeof existing.config_snapshot==='object' && !Array.isArray(existing.config_snapshot)?existing.config_snapshot:{};
    const existingRates=Array.isArray(savedConfig.rates)?savedConfig.rates:rates;
    const existingAdjustments=Array.isArray(savedConfig.adjustments)?savedConfig.adjustments:adjustments;
    const existingResult=calculateEstimateFromConfig({ answers:existingAnswers,rateItems:existingRates,adjustments:existingAdjustments,cityId:existing.city_id });
    const location={cityId:existing.city_id,stateId:existing.state_id,pincode:existing.pincode,cityName:existing.city_name};
    const captured=await ensureEstimatorContactLead({flow:historicalFlow,calculation:existing,location,intakeKey,contact:contactData});
    existing.lead_id=captured.leadId;
    return calculationResponse({flow:historicalFlow,calculation:existing,location,result:existingResult,leadId:captured.leadId,leadStatus:captured.leadStatus,duplicate:true});
  }

  const location = await resolveLocation(flow,safeAnswers);
  const result = calculateEstimateFromConfig({ answers:safeAnswers,rateItems:rates,adjustments,cityId:location.cityId });
  const snapshot = {
    flow:{definitionId:flow.definitionId,key:flow.key,versionId:flow.versionId,versionNo:flow.versionNo},
    rates,
    adjustments,
    packages,
  };
  const snapshotJson = JSON.stringify(snapshot);
  const configHash = crypto.createHash('sha256').update(snapshotJson).digest('hex');
  const publicId = crypto.randomBytes(18).toString('base64url');
  let inserted;
  try {
    inserted = (await pool.query(
      `INSERT INTO estimator_calculations(public_id,definition_id,version_id,city_id,pincode,answers,config_snapshot,config_hash,result_min,result_max,currency,intake_submission_key)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,'INR',$11)
       RETURNING *`,
      [publicId,flow.definitionId,flow.versionId,location.cityId,location.pincode,JSON.stringify(safeAnswers),snapshotJson,configHash,result.minimum,result.maximum,intakeKey]
    )).rows[0];
  } catch (error) {
    if (error.code !== '23505') throw error;
    const raced=(await pool.query(
      `SELECT ec.*,c.state_id,c.name city_name,l.status lead_status
         FROM estimator_calculations ec
         LEFT JOIN cities c ON c.id=ec.city_id
         LEFT JOIN leads l ON l.id=ec.lead_id
        WHERE ec.intake_submission_key=$1 LIMIT 1`,
      [intakeKey]
    )).rows[0];
    if (!raced) throw error;
    const racedFlow=Number(raced.version_id)===Number(flow.versionId)?flow:await customerFlowService.getVersionFlow(raced.version_id);
    const racedConfig=raced.config_snapshot && typeof raced.config_snapshot==='object' && !Array.isArray(raced.config_snapshot)?raced.config_snapshot:{};
    const racedRates=Array.isArray(racedConfig.rates)?racedConfig.rates:rates;
    const racedAdjustments=Array.isArray(racedConfig.adjustments)?racedConfig.adjustments:adjustments;
    const racedResult=calculateEstimateFromConfig({ answers:raced.answers || safeAnswers,rateItems:racedRates,adjustments:racedAdjustments,cityId:raced.city_id });
    const racedLocation={cityId:raced.city_id,stateId:raced.state_id,pincode:raced.pincode,cityName:raced.city_name};
    const captured=await ensureEstimatorContactLead({flow:racedFlow,calculation:raced,location:racedLocation,intakeKey,contact:contactData});
    raced.lead_id=captured.leadId;
    return calculationResponse({flow:racedFlow,calculation:raced,location:racedLocation,result:racedResult,leadId:captured.leadId,leadStatus:captured.leadStatus,duplicate:true});
  }

  try {
    const captured=await ensureEstimatorContactLead({flow,calculation:inserted,location,intakeKey,contact:contactData});
    inserted.lead_id=captured.leadId;
    return calculationResponse({flow,calculation:inserted,location,result,leadId:captured.leadId,leadStatus:captured.leadStatus});
  } catch (error) {
    await pool.query('DELETE FROM estimator_calculations WHERE id=$1 AND lead_id IS NULL',[inserted.id]).catch(()=>{});
    throw error;
  }
}

function buildEstimatorLeadPayload(flow, calculation, {source='estimator_calculation',contactPending=false}={}) {
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
  const packageSnapshot=selectedPackage(calculation.config_snapshot?.packages || flow.packages,answers);
  custom._estimator = {
    calculationId: calculation.public_id,flowKey: flow.key,definitionId: flow.definitionId,versionId: flow.versionId,versionNo: flow.versionNo,
    minimum:Number(calculation.result_min),maximum:Number(calculation.result_max),currency:calculation.currency,calculatedAt:calculation.created_at,
    configHash:calculation.config_hash,contactPending:Boolean(contactPending),lifecycle:contactPending?'estimate_completed':'estimate_completed_with_contact',answers,
    package:packageSnapshot?{packageKey:packageSnapshot.packageKey,label:packageSnapshot.label,badge:packageSnapshot.badge||null,summary:packageSnapshot.summary||null,priceNote:packageSnapshot.priceNote||null,details:(packageSnapshot.details||[]).filter(detail=>detail.isActive!==false)}:null,
  };
  custom._intake = {
    flowKey:flow.key,definitionId:flow.definitionId,versionId:flow.versionId,versionNo:flow.versionNo,source,answers,
  };
  custom._qualification = {
    detailedRequirementCompleted:true,budgetProvided:Boolean(budget),
    timelineProvided:Boolean((flow.questions || []).some(q => q.questionType === 'timeline' && !isEmpty(answers[q.questionKey]))),
    projectSizeKnown:Boolean((flow.questions || []).some(q => ['area','number'].includes(q.questionType) && !isEmpty(answers[q.questionKey]))),
    estimatorCompleted:true,marketplaceAnswers,
  };
  if (Object.keys(protectedAnswers).length) custom._protected_answers = protectedAnswers;

  const summary = summaryParts.join(' · ').slice(0, 3200);
  const fallback='Customer completed estimator';
  const requirement = (explicitRequirement ? `${explicitRequirement} · ${estimateText}` : `${flow.name}: ${summary || fallback} · ${estimateText}`).slice(0, 4000);
  return { customFields:custom,propertyType,budget,requirement };
}


async function getCalculation(publicId) {
  const id = String(publicId || '').trim();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(id)) fail('Estimate not found', 'ESTIMATE_NOT_FOUND', 404);
  const row = (await pool.query(
    `SELECT ec.public_id,ec.result_min,ec.result_max,ec.currency,ec.created_at,ec.city_id,ec.answers,ec.config_snapshot,c.name city_name,
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
    package:selectedPackage(row.config_snapshot?.packages,row.answers || {}),
    pdfToken:estimatePdfService.createPdfToken(row.public_id),
  };
}

module.exports = {
  getAdminConfig,
  saveAdminConfig,
  calculate,
  getCalculation,
  buildEstimatorLeadPayload,
  calculateEstimateFromConfig,
  parseQuantityScaled,
  parsePercentBps,
  multiplyRate,
  applyPercent,
};
