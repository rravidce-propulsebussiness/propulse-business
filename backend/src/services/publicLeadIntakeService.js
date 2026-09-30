const pool = require('../config/database');
const customerFlowService = require('./customerFlowService');
const leadService = require('./leadService');
const leadQualityGateService = require('./leadQualityGateService');
const cityService = require('./cityService');
const pincodeDetectionService = require('./pincodeDetectionService');
const { fail, isEmpty, isVisible, formatAnswer, validateAnswers } = require('./customerFlowValidationService');
const { normalizePhone, normalizeEmail, normalizeName, validateSubmissionKey } = require('./publicContactValidationService');

function deriveLeadFields(flow, answers) {
  const result = { propertyType: null, budget: null, requirement: null };
  for (const question of flow.questions) {
    if (!isVisible(question, answers)) continue;
    if (question.visibility !== 'marketplace' || !question.leadField || isEmpty(answers[question.questionKey])) continue;
    const formatted = formatPublicAnswer(question, answers[question.questionKey]);
    if (question.leadField === 'property_type') result.propertyType = formatted;
    if (question.leadField === 'budget') result.budget = formatted;
    if (question.leadField === 'requirement') result.requirement = formatted;
  }
  return result;
}

function constructionFloorLabel(value) {
  const floors=Number(value);
  if(floors===1)return 'Ground Floor';
  if(floors===2)return 'G+1';
  if(floors===3)return 'G+2';
  if(floors===4)return 'G+3';
  if(Number.isFinite(floors)&&floors>=5)return 'Above G+3';
  return String(value??'').trim();
}

function formatPublicAnswer(question,value) {
  if(question?.questionKey==='floors')return constructionFloorLabel(value);
  if(question?.questionKey==='plot_area')return String(value??'').trim()+' sq yards';
  return formatAnswer(question,value);
}

function buildSummary(flow, answers) {
  const parts = [];
  for (const question of flow.questions) {
    if (!isVisible(question, answers) || question.visibility !== 'marketplace' || isEmpty(answers[question.questionKey]) || question.questionType === 'location') continue;
    const formatted = formatPublicAnswer(question, answers[question.questionKey]);
    if (!formatted) continue;
    parts.push(`${question.label}: ${formatted}`);
  }
  return parts.join(' · ').slice(0, 4000);
}

function buildCustomFields(flow, answers) {
  const custom = {};
  const rawAnswers = {};
  const protectedAnswers = {};
  const marketplaceAnswers = {};
  for (const question of flow.questions) {
    if (!isVisible(question, answers) || isEmpty(answers[question.questionKey])) continue;
    const rawValue = answers[question.questionKey];
    const formatted = formatPublicAnswer(question, rawValue);
    rawAnswers[question.questionKey] = rawValue;
    if (question.visibility === 'marketplace' && formatted) {
      custom[question.label] = formatted;
      marketplaceAnswers[question.questionKey] = formatted;
    } else if (question.visibility === 'protected' && formatted) {
      protectedAnswers[question.label] = formatted;
    }
  }

  if (Object.keys(protectedAnswers).length) custom._protected_answers = protectedAnswers;
  custom._intake = {
    flowKey: flow.key,
    definitionId: flow.definitionId,
    versionId: flow.versionId,
    versionNo: flow.versionNo,
    answers: rawAnswers,
  };
  custom._qualification = {
    detailedRequirementCompleted: true,
    budgetProvided: Boolean(flow.questions.some(q => q.leadField === 'budget' && !isEmpty(answers[q.questionKey]))),
    timelineProvided: Boolean(flow.questions.some(q => q.questionType === 'timeline' && !isEmpty(answers[q.questionKey]))),
    projectSizeKnown: Boolean(flow.questions.some(q => ['area','number'].includes(q.questionType) && !isEmpty(answers[q.questionKey]))),
    marketplaceAnswers,
  };
  return custom;
}

async function resolveLocation(flow, answers) {
  const locationQuestion = flow.questions.find(question =>
    question.questionType === 'location' && isVisible(question, answers) && !isEmpty(answers[question.questionKey])
  );
  if (!locationQuestion) fail('Project location is required', 'INVALID_PINCODE');

  const pincode = String(answers[locationQuestion.questionKey]).trim();
  let detected;
  try {
    detected = await pincodeDetectionService.detectPincode(pincode);
  } catch (error) {
    if (['PIN_NOT_FOUND','PIN_LOOKUP_TIMEOUT','INVALID_PINCODE'].includes(error.code)) {
      fail(error.message || 'Unable to verify this PIN code', error.code || 'INVALID_PINCODE');
    }
    throw error;
  }

  if (!detected?.city?.id || ['NEEDS_MAPPING','NO_MATCH'].includes(detected.status)) {
    fail('This PIN code is not mapped to a supported city yet. Please try another location or contact support.', 'PIN_CITY_MAPPING_REQUIRED');
  }
  return {
    pincode,
    cityId: Number(detected.city.id),
    stateId: Number(detected.city.state_id) || null,
  };
}

async function findBySubmissionKey(key) {
  return (await pool.query(
    `SELECT id,source,status,custom_fields,industry_id,service_id,subservice_id,state_id,city_id,
            customer_name,customer_phone,customer_email,lead_type,intake_submission_key
       FROM leads
      WHERE intake_submission_key=$1
      LIMIT 1`,
    [key]
  )).rows[0] || null;
}

function cleanAttribution(value, max = 220) {
  return String(value || '').trim().slice(0, max);
}

function buildAcquisitionAttribution(input = {}) {
  const data = {
    utmSource: cleanAttribution(input.utmSource, 120),
    utmMedium: cleanAttribution(input.utmMedium, 120),
    utmCampaign: cleanAttribution(input.utmCampaign, 160),
    utmContent: cleanAttribution(input.utmContent, 160),
    utmTerm: cleanAttribution(input.utmTerm, 160),
    referrer: cleanAttribution(input.referrer, 500),
    landingPath: cleanAttribution(input.landingPath, 300),
  };
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value));
}

const CONSULTATION_LABELS = {
  projectType: {
    residential: 'Residential',
    commercial: 'Commercial',
    renovation: 'Renovation',
    extension: 'Extension',
    house_construction: 'Residential',
    commercial_building: 'Commercial',
    building_extension: 'Extension',
  },
  propertyType: {
    apartment: 'Apartment',
    villa: 'Villa',
    independent_house: 'Independent house',
    office: 'Office',
    commercial_space: 'Commercial space',
    commercial: 'Commercial property',
    plot: 'Plot / land',
  },
  bhk: {
    '1bhk': '1 BHK',
    '2bhk': '2 BHK',
    '3bhk': '3 BHK',
    '4bhk': '4 BHK',
    '5plus': '5+ BHK',
  },
  propertyIntent: {
    buy: 'Buy a property',
    rent: 'Rent a property',
    sell: 'Sell a property',
    invest: 'Invest in property',
  },
};

function cleanConsultationText(value, max = 1000) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function allowedConsultationValue(value, map, label, { required = true } = {}) {
  const normalized = cleanConsultationText(value, 80);
  if (!normalized && !required) return '';
  if (!Object.prototype.hasOwnProperty.call(map, normalized)) fail(`Select a valid ${label}`, 'INVALID_CONSULTATION_DETAILS');
  return normalized;
}

function consultationDetails(flowKey, input = {}) {
  const additional = cleanConsultationText(input.additional, 1000);
  if (flowKey === 'build') {
    const projectType = allowedConsultationValue(input.projectType, CONSULTATION_LABELS.projectType, 'project type');
    const floors = Number(input.floors);
    if (!Number.isInteger(floors) || floors < 1 || floors > 100) fail('Enter the planned number of floors', 'INVALID_CONSULTATION_DETAILS');
    const plotAreaRaw = cleanConsultationText(input.plotArea, 20);
    const plotArea = plotAreaRaw === '' ? null : Number(plotAreaRaw);
    if (plotArea !== null && (!Number.isFinite(plotArea) || plotArea < 10 || plotArea > 100000)) {
      fail('Plot area must be between 10 and 1,00,000 sq yards', 'INVALID_CONSULTATION_DETAILS');
    }
    return { projectType, floors, plotArea, additional };
  }
  if (flowKey === 'design') {
    const propertyType = allowedConsultationValue(input.propertyType, CONSULTATION_LABELS.propertyType, 'property type');
    const residential = ['apartment','villa','independent_house'].includes(propertyType);
    const bhk = residential ? allowedConsultationValue(input.bhk, CONSULTATION_LABELS.bhk, 'BHK', { required: false }) : '';
    const areaRaw = cleanConsultationText(input.area, 20);
    const area = areaRaw === '' ? null : Number(areaRaw);
    if (area !== null && (!Number.isFinite(area) || area < 50 || area > 1000000)) {
      fail('Area must be between 50 and 10,00,000 sq ft', 'INVALID_CONSULTATION_DETAILS');
    }
    return { propertyType, bhk, area, additional };
  }
  if (flowKey === 'property') {
    const propertyIntent = allowedConsultationValue(input.propertyIntent, CONSULTATION_LABELS.propertyIntent, 'property intent');
    const propertyType = allowedConsultationValue(input.propertyType, CONSULTATION_LABELS.propertyType, 'property type');
    const budget = cleanConsultationText(input.budget, 100);
    return { propertyIntent, propertyType, budget, additional };
  }
  fail('Unsupported consultation flow', 'INVALID_CONSULTATION_FLOW');
}

async function resolveConsultationLocation(cityId, pincode) {
  const city = await cityService.getCityById(Number(cityId));
  if (!city) fail('Select a supported city or location', 'INVALID_CITY');
  const normalizedPincode = String(pincode || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(normalizedPincode)) fail('Select or enter a valid 6-digit PIN code', 'INVALID_PINCODE');

  let detected;
  try {
    detected = await pincodeDetectionService.detectPincode(normalizedPincode);
  } catch (error) {
    if (['PIN_NOT_FOUND','PIN_LOOKUP_TIMEOUT','INVALID_PINCODE'].includes(error.code)) {
      fail(error.message || 'Unable to verify this PIN code', error.code || 'INVALID_PINCODE');
    }
    throw error;
  }

  if (!detected?.city?.id || ['NEEDS_MAPPING','NO_MATCH'].includes(detected.status)) {
    fail('This PIN code is not mapped to a supported city yet.', 'PIN_CITY_MAPPING_REQUIRED');
  }
  if (Number(detected.city.id) !== Number(city.id)) {
    fail(`This PIN code belongs to ${detected.city.name || 'another city'}. Select the matching city.`, 'PIN_CITY_MISMATCH');
  }

  return { city, pincode: normalizedPincode, stateId: Number(detected.city.state_id) || Number(city.state_id) || null };
}

function consultationLeadData(flow, details) {
  const marketplace = {};
  const protectedAnswers = {};
  const summary = [];
  let propertyType = null;
  let budget = null;

  if (flow.key === 'build') {
    marketplace.project_type = CONSULTATION_LABELS.projectType[details.projectType];
    marketplace.floors = constructionFloorLabel(details.floors);
    if (details.plotArea !== null) marketplace.plot_area = `${details.plotArea} sq yards`;
    summary.push(marketplace.project_type, marketplace.floors);
    if (details.plotArea !== null) summary.push(`Plot ${details.plotArea} sq yards`);
    propertyType = ['commercial','commercial_building'].includes(details.projectType) ? 'Commercial' : 'Residential';
  } else if (flow.key === 'design') {
    propertyType = CONSULTATION_LABELS.propertyType[details.propertyType];
    marketplace.property_type = propertyType;
    if (details.bhk) marketplace.bhk = CONSULTATION_LABELS.bhk[details.bhk];
    if (details.area !== null) marketplace.area = `${details.area} sq ft`;
    summary.push(propertyType);
    if (details.bhk) summary.push(marketplace.bhk);
    if (details.area !== null) summary.push(`${details.area} sq ft`);
  } else if (flow.key === 'property') {
    propertyType = CONSULTATION_LABELS.propertyType[details.propertyType];
    marketplace.property_intent = CONSULTATION_LABELS.propertyIntent[details.propertyIntent];
    marketplace.property_type = propertyType;
    if (details.budget) {
      marketplace.budget = details.budget;
      budget = details.budget;
    }
    summary.push(marketplace.property_intent, propertyType);
    if (details.budget) summary.push(`Budget ${details.budget}`);
  }

  if (details.additional) protectedAnswers['Additional information'] = details.additional;

  return {
    marketplace,
    protectedAnswers,
    propertyType,
    budget,
    requirement: summary.filter(Boolean).join(' · ').slice(0, 4000) || `${flow.name} requirement`,
  };
}

function buildConsultationCustomFields(flow, city, pincode, details, attribution) {
  const leadData = consultationLeadData(flow, details);
  const custom = {};
  const labelMap = {
    project_type: 'Project type',
    floors: 'Floors',
    plot_area: 'Plot area',
    property_type: 'Property type',
    bhk: 'BHK',
    area: 'Area',
    property_intent: 'Property intent',
    budget: 'Budget',
  };
  Object.entries(leadData.marketplace).forEach(([key, value]) => { custom[labelMap[key] || key] = value; });
  if (Object.keys(leadData.protectedAnswers).length) custom._protected_answers = leadData.protectedAnswers;

  custom._intake = {
    flowKey: flow.key,
    definitionId: flow.definitionId,
    versionId: flow.versionId,
    versionNo: flow.versionNo,
    stage: 'basic_live',
    basicLeadLive: true,
    detailedRequirementCompleted: false,
    cityId: Number(city.id),
    cityName: city.name,
    pincode,
    answers: details,
  };
  custom._qualification = {
    detailedRequirementCompleted: false,
    basicLeadLive: true,
    budgetProvided: Boolean(leadData.budget),
    timelineProvided: false,
    projectSizeKnown: Boolean(details.floors || details.plotArea || details.area),
    marketplaceAnswers: leadData.marketplace,
  };
  const acquisition = buildAcquisitionAttribution(attribution);
  if (Object.keys(acquisition).length) custom._acquisition = acquisition;
  return { custom, leadData };
}

async function submitConsultation({
  key,
  cityId,
  pincode,
  details,
  contact,
  consent,
  submissionKey,
  website,
  attribution,
}) {
  if (String(website || '').trim()) {
    return { accepted: true, filtered: true };
  }

  const flow = await customerFlowService.getPublishedFlow(key);
  if (flow.flowType !== 'requirement') fail('This flow is not a requirement form', 'NOT_REQUIREMENT', 404);
  if (consent !== true) fail('Consent is required to request a consultation', 'CONSENT_REQUIRED');

  const name = normalizeName(contact?.name);
  const phone = normalizePhone(contact?.phone);
  const email = normalizeEmail(contact?.email);
  const idempotencyKey = validateSubmissionKey(submissionKey);
  const existing = await findBySubmissionKey(idempotencyKey);
  if (existing) return { accepted: true, leadId: existing.id, duplicate: true, stage: existing.custom_fields?._intake?.stage || 'basic_live', live: existing.status === 'available' };

  const normalizedDetails = consultationDetails(flow.key, details || {});
  const location = await resolveConsultationLocation(cityId, pincode);
  const { custom: customFields, leadData } = buildConsultationCustomFields(flow, location.city, location.pincode, normalizedDetails, attribution);

  try {
    const lead = await leadService.createLead({
      industryId: flow.industryId,
      serviceId: flow.serviceId,
      subserviceId: flow.subserviceId,
      stateId: location.stateId,
      cityId: Number(location.city.id),
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      requirement: leadData.requirement,
      propertyType: leadData.propertyType,
      budget: leadData.budget,
      source: 'homepage_consultation',
      notes: 'Basic homeowner consultation lead. Detailed requirement may be added later.',
      customFields,
      pincode: location.pincode,
      leadType: 'basic',
      accessStrategy: 'shared',
      buyerCapacity: 3,
      contactConsentAt: new Date(),
      contactConsentVersion: 'homepage-submit-notice-v1',
      intakeSubmissionKey: idempotencyKey,
      qualityGateContext: 'homepage_basic',
      deferQualityGate: false,
      createdBy: null,
    });
    return {
      accepted: true,
      leadId: lead.id,
      duplicate: false,
      stage: 'basic_live',
      live: lead.status === 'available',
      status: lead.status,
      buyerCapacity: Number(lead.buyer_capacity || 3),
    };
  } catch (error) {
    if (error.code === 'DUPLICATE_LEAD') {
      return { accepted: true, leadId: error.leadId || null, duplicate: true, stage: 'basic_live' };
    }
    if (error.code === '23505') {
      const retry = await findBySubmissionKey(idempotencyKey);
      if (retry) return { accepted: true, leadId: retry.id, duplicate: true, stage: retry.custom_fields?._intake?.stage || 'basic_live', live: retry.status === 'available' };
    }
    throw error;
  }
}

async function enrichConsultationLead({ existing, flow, safeAnswers, name, phone, email }) {
  const location = await resolveLocation(flow, safeAnswers);
  const leadFields = deriveLeadFields(flow, safeAnswers);
  const summary = buildSummary(flow, safeAnswers);
  const detailedFields = buildCustomFields(flow, safeAnswers);
  const customFields = {
    ...(existing.custom_fields || {}),
    ...detailedFields,
    _acquisition: existing.custom_fields?._acquisition || detailedFields._acquisition,
    _intake: {
      ...detailedFields._intake,
      stage: 'detailed_requirement',
      consultationCaptured: true,
    },
  };
  const requirement = leadFields.requirement || summary || `${flow.name} requirement`;
  const pricing = await leadService.getConfiguredPricing(flow.industryId, location.cityId, existing.lead_type || 'basic');

  const updated = (await pool.query(
    `UPDATE leads
        SET industry_id=$1,
            service_id=$2,
            subservice_id=$3,
            state_id=$4,
            city_id=$5,
            customer_name=$6,
            customer_phone=$7,
            customer_email=$8,
            requirement=$9,
            property_type=$10,
            budget=$11,
            source='public_requirement',
            custom_fields=$12::jsonb,
            pricing=$13::jsonb,
            pincode=$14,
            contact_consent_at=CURRENT_TIMESTAMP,
            contact_consent_version='requirement-submit-notice-v1',
            updated_at=CURRENT_TIMESTAMP
      WHERE id=$15
      RETURNING *`,
    [
      flow.industryId,
      flow.serviceId || null,
      flow.subserviceId || null,
      location.stateId,
      location.cityId,
      name,
      phone,
      email,
      requirement,
      leadFields.propertyType,
      leadFields.budget,
      JSON.stringify(customFields),
      JSON.stringify(pricing),
      location.pincode,
      existing.id,
    ]
  )).rows[0];

  if (!updated) fail('Consultation lead could not be updated', 'LEAD_NOT_FOUND', 404);
  await leadQualityGateService.evaluateAndApply(existing.id, { context: 'public_requirement', autoRelease: true });
  return { accepted: true, leadId: existing.id, duplicate: false, enriched: true };
}

async function submitRequirement({
  key,
  flowToken,
  answers,
  contact,
  consent,
  submissionKey,
  website,
}) {
  if (String(website || '').trim()) {
    return { accepted: true, filtered: true };
  }

  const flow = await customerFlowService.getPublishedFlow(key);
  if (flow.flowType !== 'requirement') fail('This flow is not a requirement form', 'NOT_REQUIREMENT', 404);
  customerFlowService.verifyFlowToken(flowToken, flow.versionId);

  const safeAnswers = validateAnswers(flow, answers);

  if (consent !== true) fail('Consent is required to request quotations or callbacks', 'CONSENT_REQUIRED');
  const name = normalizeName(contact?.name);
  const phone = normalizePhone(contact?.phone);
  const email = normalizeEmail(contact?.email);
  const idempotencyKey = validateSubmissionKey(submissionKey);

  const existing = await findBySubmissionKey(idempotencyKey);
  if (existing?.source === 'homepage_consultation') {
    const capturedFlowKey = String(existing.custom_fields?._intake?.flowKey || '');
    if (capturedFlowKey && capturedFlowKey !== flow.key) {
      fail('This consultation belongs to a different requirement flow. Start a new consultation for this service.', 'SUBMISSION_FLOW_MISMATCH');
    }
    return enrichConsultationLead({ existing, flow, safeAnswers, name, phone, email });
  }
  if (existing) return { accepted: true, leadId: existing.id, duplicate: true };

  const location = await resolveLocation(flow, safeAnswers);
  const leadFields = deriveLeadFields(flow, safeAnswers);
  const summary = buildSummary(flow, safeAnswers);
  const customFields = buildCustomFields(flow, safeAnswers);
  const requirement = leadFields.requirement || summary || `${flow.name} requirement`;

  try {
    const lead = await leadService.createLead({
      industryId: flow.industryId,
      serviceId: flow.serviceId,
      subserviceId: flow.subserviceId,
      stateId: location.stateId,
      cityId: location.cityId,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      requirement,
      propertyType: leadFields.propertyType,
      budget: leadFields.budget,
      source: 'public_requirement',
      notes: null,
      customFields,
      pincode: location.pincode,
      contactConsentAt: new Date(),
      contactConsentVersion: 'requirement-submit-notice-v1',
      intakeSubmissionKey: idempotencyKey,
      qualityGateContext: 'public_requirement',
      createdBy: null,
    });
    return { accepted: true, leadId: lead.id, duplicate: false };
  } catch (error) {
    if (error.code === 'DUPLICATE_LEAD') {
      return { accepted: true, leadId: error.leadId || null, duplicate: true };
    }
    if (error.code === '23505') {
      const retry = await findBySubmissionKey(idempotencyKey);
      if (retry) return { accepted: true, leadId: retry.id, duplicate: true };
      const duplicate = await leadService.findDuplicateLead({
        industryId: flow.industryId,
        serviceId: flow.serviceId,
        subserviceId: flow.subserviceId,
        customerPhone: phone,
        customerEmail: email,
        customerName: name,
        requirement,
      });
      if (duplicate) return { accepted: true, leadId: duplicate.id, duplicate: true };
    }
    throw error;
  }
}

module.exports = { submitConsultation, submitRequirement };
