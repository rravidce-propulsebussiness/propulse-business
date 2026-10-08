// Public requirement leads store form answers as individual fields.
// Only an explicitly written, marketplace-visible note belongs in Requirement.
const { parseProjectQuoteRequirement } = require('../services/projectQuoteRequirementDetails');
const clean = value => typeof value === 'string' ? value.trim() : '';

function legacyStructuredSummary(value, custom) {
  const parts = clean(value).split(' · ').filter(Boolean);
  if (!parts.length) return false;
  const displayedAnswers = Object.entries(custom || {})
    .filter(([key, answer]) => !key.startsWith('_') && typeof answer === 'string' && answer.trim())
    .map(([key, answer]) => `${key}: ${answer}`);
  return parts.every(part => displayedAnswers.includes(part));
}

function publicWrittenRequirement(row, custom = row?.custom_fields || {}) {
  const intake = custom?._intake;
  const raw = clean(row?.requirement);
  if (!intake || typeof intake !== 'object') return raw;
  // New submissions distinguish free text from the separately recorded answers.
  if (Object.prototype.hasOwnProperty.call(intake, 'writtenRequirement')) {
    return clean(intake.writtenRequirement);
  }
  // Historical submissions did not record that distinction. Recover only
  // marketplace-visible additional text, never protected/internal answers.
  const marketplaceAnswers = custom?._qualification?.marketplaceAnswers;
  const written = clean(marketplaceAnswers?.additional_requirement);
  if (written) return written;
  const labels = new Set([
    'additionalrequirement', 'additionalrequirements', 'requirementdetails',
    'sharemoredetailsandrequirement', 'writtenrequirement'
  ]);
  for (const [key, value] of Object.entries(custom)) {
    if (labels.has(String(key).toLowerCase().replace(/[^a-z0-9]/g, '')) && clean(value)) {
      return clean(value);
    }
  }
  // Old versions concatenated every question+answer into the Requirement column.
  // Suppress only confirmed generated summaries; retain genuine standalone text.
  return legacyStructuredSummary(raw, custom) ? '' : raw;
}


const projectIntro = /^(?:Interior Design|Real Estate|Construction) enquiry from a completed project\.\s*/i;
const generatedCallback = /^Customer requested a callback about (?:this|their) project(?: requirement)?\.?$/i;
const additionalLabel = /^(?:additional requirements?|additional information|other details|share more details and requirement|written requirement)\s*:/i;

function projectWrittenRequirement(row, custom = row?.custom_fields || {}) {
  const origin = custom?._project_origin || {};
  if (Object.prototype.hasOwnProperty.call(origin, 'writtenRequirement')) {
    return clean(origin.writtenRequirement);
  }
  const source = String(row?.source || '').toLowerCase();
  const raw = clean(row?.requirement);
  if (source === 'professional_project_callback' || source === 'professional_profile_callback') {
    const message = raw.replace(projectIntro, '').trim();
    return generatedCallback.test(message) ? '' : message;
  }
  if (source !== 'professional_project_quote') return raw;

  // Historical project quotations stored a full "Label: Value" form in requirement.
  // Recover only a labelled, customer-written additional-requirement answer.
  const formText = raw.replace(projectIntro, '').trim();
  if (formText.split(/\r?\n/).some(line => additionalLabel.test(line.trim()))) {
    return clean(parseProjectQuoteRequirement(formText)['Additional Requirements']);
  }
  // Some older marketplace leads saved the introductory sentence followed by a
  // genuine free-text note instead of a labelled form answer.
  if (projectIntro.test(raw) && formText && !/\r?\n/.test(formText)
    && !/^[\w -]{2,70}\s*:/.test(formText)
    && !generatedCallback.test(formText)) return formText;
  return '';
}

function writtenLeadRequirement(row, custom = row?.custom_fields || {}) {
  const source = String(row?.source || '').toLowerCase();
  if (source === 'public_requirement') return publicWrittenRequirement(row, custom);
  if (source === 'public_estimator') {
    if (Object.prototype.hasOwnProperty.call(custom?._intake || {}, 'writtenRequirement')) {
      return clean(custom._intake.writtenRequirement);
    }
    // Old estimator conversions composed a price + questionnaire summary.
    // Only recover explicitly entered marketplace-visible text answers.
    const keys = new Set(['requirement','requirements','additionalrequirement','additionalrequirements','sharemoredetailsandrequirement']);
    const written = Object.entries(custom || {}).find(([key,value]) =>
      keys.has(String(key).toLowerCase().replace(/[^a-z0-9]/g,'')) && clean(value));
    return written ? clean(written[1]) : '';
  }
  if (source === 'homepage_consultation') return '';
  if (source === 'professional_project_quote' || source === 'professional_project_callback' || source === 'professional_profile_callback') {
    return projectWrittenRequirement(row, custom);
  }
  return clean(row?.requirement);
}

module.exports = { publicWrittenRequirement, legacyStructuredSummary, projectWrittenRequirement, writtenLeadRequirement };
