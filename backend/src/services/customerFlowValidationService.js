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
  if (Object.prototype.hasOwnProperty.call(rule, 'equals')) return Array.isArray(actual) ? actual.includes(rule.equals) : actual === rule.equals;
  if (Array.isArray(rule.in)) return Array.isArray(actual) ? actual.some(value => rule.in.includes(value)) : rule.in.includes(actual);
  if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) return Array.isArray(actual) ? !actual.includes(rule.notEquals) : actual !== rule.notEquals;
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

function validateAnswers(flow, answers) {
  const safeAnswers = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  for (const question of flow?.questions || []) {
    if (!isVisible(question, safeAnswers)) continue;
    validateAnswer(question, safeAnswers[question.questionKey]);
  }
  return safeAnswers;
}

module.exports = { fail, isEmpty, isVisible, optionMap, formatAnswer, validateAnswer, validateAnswers };
