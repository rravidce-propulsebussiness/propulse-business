const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { getMembershipAccess } = require('./membershipAccessService');
const companyProofStorage = require('./companyProofStorageService');
const securityRiskService = require('./securityRiskService');

const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be at least 32 characters in production');
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'change-this-secret-in-development-only';

const PUBLIC_SIGNUP_ROLES = new Set(['business', 'lead_partner']);
const MAX_PASSWORD_CHARS = 64;
const MAX_BCRYPT_BYTES = 72;

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > MAX_PASSWORD_CHARS) return false;
  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_BYTES) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

function normalizePublicSignupRole(value) {
  const role = String(value || 'business').trim().toLowerCase();
  return PUBLIC_SIGNUP_ROLES.has(role) ? role : null;
}

async function getMembershipSummary(userId, client = pool) {
  try {
    const access = await getMembershipAccess(userId, client);
    return { membership_type: access.isPro ? 'pro' : 'standard', is_pro_member: access.isPro, membership_expires_at: access.proExpiresAt, is_booster_active: access.isBoosterActive, booster_expires_at: access.boosterExpiresAt };
  } catch {
    return { membership_type: 'standard', is_pro_member: false, membership_expires_at: null, is_booster_active: false, booster_expires_at: null };
  }
}

async function publicUser(user, profile = null) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, profile, ...(await getMembershipSummary(user.id)) };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, auth_version: Number(user.auth_version || 0) }, EFFECTIVE_JWT_SECRET, { expiresIn: '7d' });
}

async function getBusinessProfile(userId, client = pool) {
  const profileResult = await client.query(`SELECT id, phone, business_name, business_details FROM business_profiles WHERE user_id = $1`, [userId]);
  const profile = profileResult.rows[0];
  if (!profile) return null;
  const [serviceResult, locationResult] = await Promise.all([
    client.query(`SELECT bps.id,bps.industry_id,i.name AS industry_name,bps.service_id,s.name AS service_name,bps.subservice_id,ss.name AS subservice_name FROM business_profile_services bps INNER JOIN industries i ON i.id=bps.industry_id INNER JOIN services s ON s.id=bps.service_id LEFT JOIN subservices ss ON ss.id=bps.subservice_id WHERE bps.business_profile_id=$1 AND bps.is_active=TRUE ORDER BY i.name,s.name,ss.name`, [profile.id]),
    client.query(`SELECT bpl.id,bpl.state_id,st.name AS state_name,bpl.city_id,c.name AS city_name FROM business_profile_locations bpl INNER JOIN states st ON st.id=bpl.state_id INNER JOIN cities c ON c.id=bpl.city_id WHERE bpl.business_profile_id=$1 AND bpl.is_active=TRUE ORDER BY st.name,c.name`, [profile.id]),
  ]);
  return { ...profile, services: serviceResult.rows, locations: locationResult.rows };
}

async function validateBusinessSelections(client, services, locations) {
  if (!Array.isArray(services) || services.length === 0) throw Object.assign(new Error('At least one service selection is required'), { code: 'INVALID_BUSINESS_SELECTION' });
  if (!Array.isArray(locations) || locations.length === 0) throw Object.assign(new Error('At least one location selection is required'), { code: 'INVALID_BUSINESS_SELECTION' });

  const normalizedServices = services.map(selection => {
    const industryId = Number(selection?.industryId);
    const serviceId = Number(selection?.serviceId);
    const subserviceId = selection?.subserviceId == null || selection.subserviceId === '' ? null : Number(selection.subserviceId);
    if (!Number.isInteger(industryId) || industryId <= 0 || !Number.isInteger(serviceId) || serviceId <= 0 || (subserviceId !== null && (!Number.isInteger(subserviceId) || subserviceId <= 0))) {
      throw Object.assign(new Error('Selected service configuration is invalid'), { code: 'INVALID_BUSINESS_SELECTION' });
    }
    return { industryId, serviceId, subserviceId };
  });
  const serviceKeys = new Set(normalizedServices.map(x => `${x.industryId}:${x.serviceId}:${x.subserviceId || ''}`));
  if (serviceKeys.size !== normalizedServices.length) throw Object.assign(new Error('Duplicate service selections are not allowed'), { code: 'INVALID_BUSINESS_SELECTION' });

  const normalizedLocations = locations.map(selection => {
    const stateId = Number(selection?.stateId);
    const cityId = Number(selection?.cityId);
    if (!Number.isInteger(stateId) || stateId <= 0 || !Number.isInteger(cityId) || cityId <= 0) {
      throw Object.assign(new Error('Selected location configuration is invalid'), { code: 'INVALID_BUSINESS_SELECTION' });
    }
    return { stateId, cityId };
  });
  const locationKeys = new Set(normalizedLocations.map(x => `${x.stateId}:${x.cityId}`));
  if (locationKeys.size !== normalizedLocations.length) throw Object.assign(new Error('Duplicate locations are not allowed'), { code: 'INVALID_BUSINESS_SELECTION' });

  const [serviceResult, locationResult] = await Promise.all([
    client.query(`
      WITH requested AS (
        SELECT * FROM UNNEST($1::int[],$2::int[],$3::int[]) AS x(industry_id,service_id,subservice_id)
      )
      SELECT COUNT(*)::int valid_count
      FROM requested r
      JOIN services s ON s.id=r.service_id AND s.industry_id=r.industry_id AND s.is_active=TRUE
      LEFT JOIN subservices ss ON ss.id=r.subservice_id AND ss.service_id=r.service_id AND ss.is_active=TRUE
      WHERE r.subservice_id IS NULL OR ss.id IS NOT NULL
    `,[
      normalizedServices.map(x=>x.industryId),
      normalizedServices.map(x=>x.serviceId),
      normalizedServices.map(x=>x.subserviceId)
    ]),
    client.query(`
      WITH requested AS (
        SELECT * FROM UNNEST($1::int[],$2::int[]) AS x(state_id,city_id)
      )
      SELECT COUNT(*)::int valid_count
      FROM requested r
      JOIN states st ON st.id=r.state_id AND st.is_active=TRUE
      JOIN cities c ON c.id=r.city_id AND c.state_id=r.state_id AND c.is_active=TRUE
    `,[
      normalizedLocations.map(x=>x.stateId),
      normalizedLocations.map(x=>x.cityId)
    ])
  ]);

  if (Number(serviceResult.rows[0]?.valid_count || 0) !== normalizedServices.length) {
    throw Object.assign(new Error('Selected service, industry or subservice relationship is invalid'), { code: 'INVALID_BUSINESS_SELECTION' });
  }
  if (Number(locationResult.rows[0]?.valid_count || 0) !== normalizedLocations.length) {
    throw Object.assign(new Error('Selected city does not belong to the selected state'), { code: 'INVALID_BUSINESS_SELECTION' });
  }
  return { services: normalizedServices, locations: normalizedLocations };
}

async function signup({ name, email, password, phone, businessName, businessDetails, services, locations, role = 'business', googleCredential = null }) {
  const signupRole = normalizePublicSignupRole(role);
  if (!signupRole) throw Object.assign(new Error('Only User or Lead Partner accounts can be created through public signup'), { code: 'INVALID_SIGNUP_ROLE' });
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(normalizedPhone)) throw Object.assign(new Error('Mobile number must be exactly 10 digits'), { code: 'INVALID_PHONE' });
  if (!googleCredential && !isValidPassword(password)) {
    throw Object.assign(new Error('Password must be 8-64 characters, contain at least one letter and one number, and stay within bcrypt limits'), { code: 'INVALID_PASSWORD' });
  }
  let normalizedEmail = email.trim().toLowerCase();
  let signupName = name.trim();
  let passwordValue = password;
  if (googleCredential) {
    const googleUser = await verifyGoogleIdToken(googleCredential);
    normalizedEmail = googleUser.email.trim().toLowerCase();
    signupName = String(googleUser.name || name || '').trim();
    if (!signupName) throw Object.assign(new Error('Your Google account does not provide a name'), { code: 'INVALID_GOOGLE_TOKEN' });
    passwordValue = crypto.randomBytes(32).toString('hex');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email)=$1', [normalizedEmail]);
    if (existing.rows.length) throw Object.assign(new Error('An account with this email already exists'), { code: 'EMAIL_EXISTS' });
    const validatedSelections = await validateBusinessSelections(client, services, locations);
    const passwordHash = await bcrypt.hash(passwordValue, 12);
    const user = (await client.query(`INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,auth_version`, [signupName, normalizedEmail, passwordHash, signupRole])).rows[0];
    if (signupRole === 'lead_partner') {
      await client.query(`INSERT INTO lead_partners (user_id,status) VALUES ($1,'pending') ON CONFLICT (user_id) DO NOTHING`, [user.id]);
    }
    const profileId = (await client.query(`INSERT INTO business_profiles (user_id,phone,business_name,business_details) VALUES ($1,$2,$3,$4) RETURNING id`, [user.id, phone.trim(), businessName.trim(), businessDetails.trim()])).rows[0].id;
    await client.query(`
      INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id)
      SELECT $1,x.industry_id,x.service_id,x.subservice_id
      FROM UNNEST($2::int[],$3::int[],$4::int[]) AS x(industry_id,service_id,subservice_id)
      ON CONFLICT DO NOTHING
    `,[
      profileId,
      validatedSelections.services.map(x=>x.industryId),
      validatedSelections.services.map(x=>x.serviceId),
      validatedSelections.services.map(x=>x.subserviceId)
    ]);
    await client.query(`
      INSERT INTO business_profile_locations (business_profile_id,state_id,city_id)
      SELECT $1,x.state_id,x.city_id
      FROM UNNEST($2::int[],$3::int[]) AS x(state_id,city_id)
      ON CONFLICT DO NOTHING
    `,[
      profileId,
      validatedSelections.locations.map(x=>x.stateId),
      validatedSelections.locations.map(x=>x.cityId)
    ]);
    const profile = await getBusinessProfile(user.id, client);
    await client.query('COMMIT');
    return { user: await publicUser(user, profile), token: signToken(user) };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function saveCompanyProofDocuments(userId, documents = []) {
  if (!Array.isArray(documents) || !documents.length) throw new Error('At least one company proof document is required');
  if (documents.length > 8) throw new Error('You can upload up to 8 company proof documents');

  const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  // Validate and prepare every document before creating any file or database row.
  const preparedDocuments = documents.map((document) => {
    const mimeType = String(document?.type || '').toLowerCase();
    const originalName = String(document?.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const raw = String(document?.data || '');
    const expectedPrefix = `data:${mimeType};base64,`;
    if (!allowedTypes.has(mimeType) || !raw.startsWith(expectedPrefix)) throw new Error('Only PDF, JPG and PNG company proof documents are allowed');

    const base64 = raw.slice(expectedPrefix.length).replace(/\s/g, '');
    if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) throw new Error('Invalid company proof document encoding');
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('Each company proof document must be 5 MB or smaller');

    const signature = buffer.subarray(0, 8);
    const validSignature =
      (mimeType === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-') ||
      (mimeType === 'image/png' && signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (mimeType === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff);
    if (!validSignature) throw new Error('Company proof document content does not match its file type');

    const extension = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
    return { mimeType, originalName, buffer, extension };
  });

  const client = await pool.connect();
  const createdFiles = [];
  try {
    await client.query('BEGIN');

    const saved = [];
    for (const document of preparedDocuments) {
      const storedName=await companyProofStorage.storeBuffer({
        userId,buffer:document.buffer,mimeType:document.mimeType,extension:document.extension
      });
      createdFiles.push(storedName);

      const fileUrl='/api/auth/company-proofs/pending';
      const inserted = (await client.query(
        `INSERT INTO company_proof_documents (user_id,original_name,stored_name,mime_type,file_size,file_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [userId, document.originalName, storedName, document.mimeType, document.buffer.length, fileUrl],
      )).rows[0];
      await client.query('UPDATE company_proof_documents SET file_url=$1 WHERE id=$2',[`/api/auth/company-proofs/${inserted.id}`,inserted.id]);

      saved.push({
        id: inserted.id,
        original_name: document.originalName,
        mime_type: document.mimeType,
        file_size: document.buffer.length,
        file_url: `/api/auth/company-proofs/${inserted.id}`,
        status: 'pending',
      });
    }

    await client.query('COMMIT');
    return saved;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Company proof upload rollback failed:', rollbackError.message);
    }

    for (const reference of createdFiles) {
      try {
        await companyProofStorage.remove(reference);
      } catch (cleanupError) {
        console.error('Company proof orphan cleanup failed:', cleanupError.message);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function login({ email, password, source=null }) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(`SELECT id,name,email,password_hash,role,auth_version FROM users WHERE LOWER(email)=$1 AND is_active=TRUE`, [normalizedEmail]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    await securityRiskService.recordFailedLogin({email:normalizedEmail,userId:user?.id||null,source}).catch(error=>console.error('Risk logging failed for invalid login:',error.message));
    throw Object.assign(new Error('Invalid email or password'), { code: 'INVALID_CREDENTIALS' });
  }
  return { user: await getPublicAuthenticatedUser(user), token: signToken(user) };
}

async function verifyGoogleIdToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) throw Object.assign(new Error('Google sign-in is not configured'), { code: 'GOOGLE_NOT_CONFIGURED' });
  if (!idToken || typeof idToken !== 'string') throw Object.assign(new Error('Google credential is required'), { code: 'INVALID_GOOGLE_TOKEN' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 64 * 1024) throw Object.assign(new Error('Invalid Google sign-in credential'), { code: 'INVALID_GOOGLE_TOKEN' });
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > 64 * 1024) throw Object.assign(new Error('Invalid Google sign-in credential'), { code: 'INVALID_GOOGLE_TOKEN' });
    let payload = {};
    try { payload = JSON.parse(body); } catch (_) { payload = {}; }
    if (!response.ok || payload.aud !== process.env.GOOGLE_CLIENT_ID || !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss) || payload.email_verified !== 'true' || !payload.email || !payload.sub) throw Object.assign(new Error('Invalid Google sign-in credential'), { code: 'INVALID_GOOGLE_TOKEN' });
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('Google sign-in verification timed out'), { code: 'GOOGLE_TOKEN_TIMEOUT' });
    if (error.code === 'INVALID_GOOGLE_TOKEN') throw error;
    throw Object.assign(new Error('Google sign-in verification failed'), { code: 'GOOGLE_TOKEN_VERIFICATION_FAILED' });
  } finally {
    clearTimeout(timeout);
  }
}

async function googleLogin({ idToken }) {
  const googleUser = await verifyGoogleIdToken(idToken);
  const normalizedEmail = googleUser.email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query(`SELECT id,name,email,password_hash,role,auth_version FROM users WHERE LOWER(email)=$1 AND is_active=TRUE FOR UPDATE`, [normalizedEmail])).rows[0];
    if (!user) {
      throw Object.assign(new Error('No Propulse account exists for this Google email. Please create an account first.'), { code: 'GOOGLE_ACCOUNT_NOT_FOUND' });
    }
    await client.query('COMMIT');
    return { user: await getPublicAuthenticatedUser(user), token: signToken(user) };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('An account with this email already exists. Sign in with your email and password.'), { code: 'EMAIL_EXISTS' });
    throw error;
  } finally { client.release(); }
}

async function createPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(`SELECT id,name,email FROM users WHERE LOWER(email)=$1 AND is_active=TRUE`, [normalizedEmail]);
  const user = result.rows[0];
  if (!user) return null;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at < CURRENT_TIMESTAMP`, [user.id]);
  await pool.query(`INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '30 minutes')`, [user.id, tokenHash]);
  return { user, token: rawToken };
}

async function resetPassword({ token, password }) {
  if (!token || typeof token !== 'string' || !isValidPassword(password)) throw Object.assign(new Error('A valid reset token and a password of 8-64 characters with a letter and number are required'), { code: 'INVALID_RESET_REQUEST' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT pr.id,pr.user_id,u.id,u.name,u.email,u.role,u.auth_version FROM password_reset_tokens pr INNER JOIN users u ON u.id=pr.user_id WHERE pr.token_hash=$1 AND pr.used_at IS NULL AND pr.expires_at > CURRENT_TIMESTAMP AND u.is_active=TRUE FOR UPDATE`, [tokenHash]);
    const row = result.rows[0];
    if (!row) throw Object.assign(new Error('This password reset link is invalid or has expired'), { code: 'INVALID_RESET_TOKEN' });
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(`UPDATE users SET password_hash=$1,auth_version=auth_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [passwordHash, row.user_id]);
    await client.query(`UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=$1`, [row.user_id]);
    await client.query('COMMIT');
    return { user: await publicUser({ id: row.user_id, name: row.name, email: row.email, role: row.role }, await getBusinessProfile(row.user_id)) };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

function verifyToken(token) { return jwt.verify(token, EFFECTIVE_JWT_SECRET); }

async function revokeAuthSessions(userId) {
  await pool.query(
    'UPDATE users SET auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id=$1',
    [userId],
  );
}

async function getAuthenticatedUser(id, authVersion) {
  const result = await pool.query(`SELECT id,name,email,role,auth_version FROM users WHERE id=$1 AND is_active=TRUE`, [id]);
  const user = result.rows[0];
  if (!user) return null;
  if (authVersion !== undefined && Number(user.auth_version || 0) !== Number(authVersion)) return null;
  return user;
}

async function getAuthenticatedUserBySupabaseId(supabaseUserId) {
  const normalizedId = String(supabaseUserId || '').trim();
  if (!normalizedId) return null;
  const result = await pool.query(
    `SELECT id,name,email,role,auth_version,supabase_user_id
     FROM users
     WHERE supabase_user_id=$1 AND is_active=TRUE`,
    [normalizedId],
  );
  return result.rows[0] || null;
}

async function linkSupabaseIdentity({ appUserId, supabaseUserId, email }) {
  const normalizedSupabaseId = String(supabaseUserId || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedSupabaseId || !normalizedEmail) {
    throw Object.assign(new Error('A verified Supabase identity is required'), { code: 'INVALID_SUPABASE_IDENTITY' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET supabase_user_id=$2, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1
         AND LOWER(email)=$3
         AND (supabase_user_id IS NULL OR supabase_user_id=$2)
       RETURNING id,name,email,role,auth_version,supabase_user_id`,
      [appUserId, normalizedSupabaseId, normalizedEmail],
    );
    if (!result.rows[0]) {
      throw Object.assign(
        new Error('Supabase email must match the signed-in Propulse account email'),
        { code: 'SUPABASE_EMAIL_MISMATCH' },
      );
    }
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw Object.assign(
        new Error('This Supabase account is already linked to another Propulse account'),
        { code: 'SUPABASE_IDENTITY_ALREADY_LINKED' },
      );
    }
    throw error;
  }
}

async function getPublicAuthenticatedUser(user) {
  if (!user?.id) return null;
  const [profile, membership] = await Promise.all([
    getBusinessProfile(user.id),
    getMembershipSummary(user.id),
  ]);
  return { id: user.id, name: user.name, email: user.email, role: user.role, profile, ...membership };
}

async function getUserById(id) {
  const user = await getAuthenticatedUser(id);
  if (!user) return null;
  return getPublicAuthenticatedUser(user);
}

async function getCompanyProofDocument({ documentId, userId, isAdmin = false }) {
  const normalizedDocumentId = Number(documentId);
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedDocumentId) || normalizedDocumentId <= 0) return null;
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) return null;
  const result = await pool.query(
    `SELECT id,user_id,original_name,stored_name,mime_type,file_size,status
     FROM company_proof_documents
     WHERE id=$1 AND (user_id=$2 OR $3=TRUE)`,
    [normalizedDocumentId, normalizedUserId, Boolean(isAdmin)],
  );
  return result.rows[0] || null;
}

module.exports = { signup, saveCompanyProofDocuments, getCompanyProofDocument, login, googleLogin, createPasswordReset, resetPassword, verifyToken, getUserById, getPublicAuthenticatedUser, getAuthenticatedUser, getAuthenticatedUserBySupabaseId, linkSupabaseIdentity, revokeAuthSessions };
