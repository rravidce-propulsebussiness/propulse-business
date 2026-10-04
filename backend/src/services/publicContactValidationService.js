const { fail } = require('./customerFlowValidationService');

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

function normalizeName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 160) fail('Enter your name', 'INVALID_CONTACT');
  return name;
}

function validateSubmissionKey(value) {
  const key = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key)) fail('Submission session is invalid. Reload the form and try again.', 'INVALID_SUBMISSION_KEY');
  return key;
}

module.exports = { normalizePhone, normalizeEmail, normalizeName, validateSubmissionKey };
