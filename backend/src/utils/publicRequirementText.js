// Public requirement leads store form answers as individual fields.
// Only an explicitly written, marketplace-visible note belongs in Requirement.
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

module.exports = { publicWrittenRequirement, legacyStructuredSummary };
