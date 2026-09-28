const pool = require('../config/database');
const customerFlowService = require('./customerFlowService');
const leadService = require('./leadService');
const pincodeDetectionService = require('./pincodeDetectionService');

function fail(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  throw error;
}

function isEmpty(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function isVisible(question, answers) {
  const rule = question?.showWhen && typeof question.showWhen === 'object' ? question.showWhen : {};
  const dependency = String(rule.questionKey || '').trim();
  if (!dependency) return true;
  const actual = answers?.[dependency];
  if (Object.prototype.hasOwnProperty.call(rule, 'equals')) return actual === rule.equals;
  if (Array.isArray(rule.in)) return rule.in.includes(actual);
  if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) return actual !== rule.notEquals;
  return true;
}

function optionMap(question) {
  return new Map((question.options || []).map(option => [String(option.value), option]));
}

function formatAnswer(question, value) {
  const options = optionMap(question);
  if (Array.isArray(value)) return value.map(item => options.get(String(item))?.label || String(item)).join(', ');
  if (question.questionType === 'boolean') return value === true ? 'Yes' : value === false ? 'No' : '';
  return options.get(String(value))?.label || String(value ?? '').trim();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(local)) return `+91${local}`;
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  fail('Enter a valid 10-digit Indian mobile number', 'INVALID_PHONE');
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return null;
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address', 'INVALID_EMAIL');
  return email;
}

function validateSubmissionKey(value) {
  const key = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key)) fail('Submission session is invalid. Reload the form and try again.', 'INVALID_SUBMISSION_KEY');
  return key;
}

function validateAnswer(question, value) {
  if (isEmpty(value)) {
    if (question.isRequired) fail(`Please answer: ${question.label}`, 'REQUIRED_ANSWER');
    return;
  }

  const validation = question.validation || {};
  if (['single_select','timeline'].includes(question.questionType)) {
    if (!optionMap(question).has(String(value))) fail(`Choose a valid option for: ${question.label}`, 'INVALID_ANSWER');
    return;
  }

  if (question.questionType === 'multi_select') {
    if (!Array.isArray(value)) fail(`Choose one or more valid options for: ${question.label}`, 'INVALID_ANSWER');
    const allowed = optionMap(question);
    const unique = [...new Set(value.map(item => String(item)))];
    if (unique.some(item => !allowed.has(item))) fail(`Choose valid options for: ${question.label}`, 'INVALID_ANSWER');
    const minItems = Number(validation.minItems ?? 0);
    const maxItems = Number(validation.maxItems ?? 50);
    if (unique.length < minItems || unique.length > maxItems) fail(`Choose the allowed number of options for: ${question.label}`, 'INVALID_ANSWER');
    return;
  }

  if (question.questionType === 'boolean') {
    if (value !== true && value !== false) fail(`Choose Yes or No for: ${question.label}`, 'INVALID_ANSWER');
    return;
  }

  if (['number','area'].includes(question.questionType)) {
    const number = Number(value);
    if (!Number.isFinite(number)) fail(`Enter a valid number for: ${question.label}`, 'INVALID_ANSWER');
    if (validation.min !== undefined && number < Number(validation.min)) fail(`${question.label} is below the allowed minimum`, 'INVALID_ANSWER');
    if (validation.max !== undefined && number > Number(validation.max)) fail(`${question.label} is above the allowed maximum`, 'INVALID_ANSWER');
    return;
  }

  if (question.questionType === 'location') {
    if (!/^\d{6}$/.test(String(value).trim())) fail(`Enter a valid 6-digit PIN code for: ${question.label}`, 'INVALID_PINCODE');
    return;
  }

  const text = String(value).trim();
  const maxLength = Number(validation.maxLength ?? (question.questionType === 'text' ? 2000 : 240));
  if (!text || text.length > maxLength) fail(`Enter a valid response for: ${question.label}`, 'INVALID_ANSWER');
}

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
  customerFlowService.verifyFlowToken(flowToken, flow.versionId);

  const safeAnswers = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  for (const question of flow.questions) {
    if (!isVisible(question, safeAnswers)) continue;
    validateAnswer(question, safeAnswers[question.questionKey]);
  }

  if (consent !== true) fail('Consent is required to request quotations or callbacks', 'CONSENT_REQUIRED');
  const name = String(contact?.name || '').trim();
  if (!name || name.length > 160) fail('Enter your name', 'INVALID_CONTACT');
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

module.exports = {
  submitRequirement,
  isVisible,
  validateAnswer,
  normalizePhone,
};
