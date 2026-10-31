const pool = require('../config/database');
const { normalizePhone, normalizeEmail, normalizeName, validateSubmissionKey } = require('./publicContactValidationService');

const SERVICE_TYPES = new Set(['construction', 'interiors']);
const STATUSES = new Set(['new', 'contacted', 'site_visit', 'quoted', 'won', 'closed']);

function inputError(message, code='INVALID_DIRECT_ENQUIRY') {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  throw error;
}

function positiveId(raw) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) inputError('Invalid direct enquiry ID');
  return id;
}

function validateSubmission(input={}) {
  if (input.consent !== true) inputError('Consent to be contacted by ProPulse is required', 'CONSENT_REQUIRED');
  const submissionKey = validateSubmissionKey(input.submissionKey);
  const name = normalizeName(input.name);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const serviceType = String(input.serviceType || '').trim().toLowerCase();
  if (!SERVICE_TYPES.has(serviceType)) inputError('Choose construction or interiors');
  const location = String(input.location || '').trim().replace(/\s+/g, ' ');
  const requirement = String(input.requirement || '').trim();
  if (location.length < 2 || location.length > 160) inputError('Enter your project locality (2–160 characters)');
  if (requirement.length < 10 || requirement.length > 2000) inputError('Describe your project in 10–2000 characters');
  return { submissionKey, name, phone, email, serviceType, location, requirement };
}

async function submit(input={}) {
  // Honeypot submissions are accepted without storage to limit automated spam.
  if (String(input.website || '').trim()) return { accepted:true, filtered:true };
  const v=validateSubmission(input);
  try {
    const result=await pool.query(
      `INSERT INTO propulse_direct_project_enquiries
       (submission_key,customer_name,customer_phone,customer_email,service_type,project_location,requirement)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (submission_key) DO NOTHING RETURNING id`,
      [v.submissionKey,v.name,v.phone,v.email,v.serviceType,v.location,v.requirement]
    );
    if (result.rows[0]) return { accepted:true, enquiryId:Number(result.rows[0].id), duplicate:false };
    const existing=await pool.query(
      'SELECT id FROM propulse_direct_project_enquiries WHERE submission_key=$1',
      [v.submissionKey]
    );
    if (!existing.rows[0]) inputError('Could not save the enquiry. Please retry.');
    return { accepted:true, enquiryId:Number(existing.rows[0].id), duplicate:true };
  } catch (error) {
    if (error.code==='23505') inputError('Duplicate enquiry. Please retry with a new submission.');
    throw error;
  }
}

async function list({ page=1, limit=25, status='all' }={}) {
  const safePage=Math.min(10000,Math.max(1,parseInt(page,10)||1));
  const safeLimit=Math.min(50,Math.max(10,parseInt(limit,10)||25));
  const safeStatus=String(status||'all');
  if (safeStatus!=='all'&&!STATUSES.has(safeStatus)) inputError('Invalid enquiry status');
  const params=safeStatus==='all'?[]:[safeStatus];
  const where=params.length?' WHERE status=$1':'';
  const [count,records]=await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM propulse_direct_project_enquiries'+where,params),
    pool.query('SELECT id,customer_name,customer_phone,customer_email,service_type,project_location,requirement,status,created_at,updated_at FROM propulse_direct_project_enquiries'+where+' ORDER BY created_at DESC,id DESC LIMIT $'+(params.length+1)+' OFFSET $'+(params.length+2),[...params,safeLimit,(safePage-1)*safeLimit])
  ]);
  const total=Number(count.rows[0]?.total||0);
  return {items:records.rows,pagination:{page:safePage,limit:safeLimit,total,totalPages:Math.max(1,Math.ceil(total/safeLimit))}};
}

async function changeStatus(id, status) {
  const enquiryId=positiveId(id);
  const next=String(status||'');
  if (!STATUSES.has(next)) inputError('Invalid enquiry status');
  const result=await pool.query(
    'UPDATE propulse_direct_project_enquiries SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,status,updated_at',
    [enquiryId,next]
  );
  if (!result.rows[0]) {
    const error=new Error('Direct ProPulse enquiry not found');
    error.code='DIRECT_ENQUIRY_NOT_FOUND';
    error.status=404;
    throw error;
  }
  return result.rows[0];
}

module.exports={submit,list,changeStatus,validateSubmission};
