const pool = require('../config/database');
const customerFlowService = require('./customerFlowService');
const leadService = require('./leadService');
const pincodeDetectionService = require('./pincodeDetectionService');
const { fail, isEmpty, isVisible, formatAnswer, validateAnswers } = require('./customerFlowValidationService');
const { normalizePhone, normalizeEmail, normalizeName, validateSubmissionKey } = require('./publicContactValidationService');

function deriveLeadFields(flow, answers) {
  const result = { propertyType: null, budget: null, requirement: null };
  for (const question of flow.questions) {
    if (!isVisible(question, answers)) continue;
    if (question.visibility !== 'marketplace' || !question.leadField || isEmpty(answers[question.questionKey])) continue;
    const formatted = formatAnswer(question, answers[question.questionKey]);
    if (question.leadField === 'property_type') result.propertyType = formatted;
    if (question.leadField === 'budget') result.budget = formatted;
    if (question.leadField === 'requirement') result.requirement = formatted;
  }
  return result;
}

function buildSummary(flow, answers) {
  const parts = [];
  for (const question of flow.questions) {
    if (!isVisible(question, answers) || question.visibility !== 'marketplace' || isEmpty(answers[question.questionKey]) || question.questionType === 'location') continue;
    const formatted = formatAnswer(question, answers[question.questionKey]);
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
    const formatted = formatAnswer(question, rawValue);
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
    'SELECT id FROM leads WHERE intake_submission_key=$1 LIMIT 1',
    [key]
  )).rows[0] || null;
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
      contactConsentVersion: 'quote-contact-v1',
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

module.exports = { submitRequirement };
