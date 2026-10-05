const authService = require('../services/authService');
const { sendPasswordResetEmail, isConfigured: isEmailConfigured } = require('../services/emailService');
const companyProofStorage = require('../services/companyProofStorageService');
const supabaseAuthService = require('../services/supabaseAuthService');
const operationalMonitoringService = require('../services/operationalMonitoringService');
const { sendProofDescriptor } = require('../utils/proofResponse');

const AUTH_COOKIE = 'propulse_auth';
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res, token, { remember = true } = {}) {
  const parts = [`${AUTH_COOKIE}=${encodeURIComponent(token)}`, 'HttpOnly', 'Path=/', 'SameSite=Lax'];
  if (remember) parts.push(`Max-Age=${Math.floor(AUTH_COOKIE_MAX_AGE / 1000)}`);
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res) {
  const parts = [`${AUTH_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function publicAuthResult(res, result, status = 200, { remember = true } = {}) {
  setAuthCookie(res, result.token, { remember });
  const { token, ...safeResult } = result;
  return res.status(status).json(safeResult);
}

function validatePassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 64) return false;
  if (Buffer.byteLength(password, 'utf8') > 72) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

const PUBLIC_SIGNUP_ROLES = new Set(['business', 'lead_partner']);

function normalizePublicSignupRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return PUBLIC_SIGNUP_ROLES.has(role) ? role : null;
}

async function signup(req, res) {
  try {
    const {
      name, email, password, phone, businessName, businessDetails, services, locations,
      accountType, role: requestedRole, googleCredential,
    } = req.body;

    // Accept both the current `accountType` field and the role field used by
    // older/newer clients. Public signup still allows only business/lead_partner.
    const role = normalizePublicSignupRole(accountType || requestedRole);
    if (!role) {
      return res.status(400).json({ error: 'Choose either User or Lead Partner as your account type' });
    }
    if (!googleCredential && (!name?.trim() || !email?.trim() || !validatePassword(password))) {
      return res.status(400).json({ error: 'Name, email and a password of 8-64 characters with a letter and number are required' });
    }
    if (googleCredential && (!name?.trim() || !email?.trim())) {
      return res.status(400).json({ error: 'Google registration requires a verified Google account' });
    }
    if (!phone?.trim() || !businessName?.trim() || !businessDetails?.trim()) {
      return res.status(400).json({ error: 'Phone, business name and business details are required' });
    }
    if (!Array.isArray(services) || !services.length || !Array.isArray(locations) || !locations.length) {
      return res.status(400).json({ error: 'Select at least one service and one location' });
    }

    const result = await authService.signup({
      name, email, password, phone, businessName, businessDetails, services, locations, role, googleCredential,
    });
    return publicAuthResult(res, result, 201);
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') return res.status(409).json({ error: error.message });
    if (error.code === 'INVALID_BUSINESS_SELECTION') return res.status(400).json({ error: error.message });
    if (error.code === 'INVALID_SIGNUP_ROLE') return res.status(400).json({ error: error.message });
    console.error('Signup failed:', error.message);
    return res.status(500).json({ error: 'Failed to create account' });
  }
}

async function uploadCompanyProofs(req, res) {
  try {
    const documents = req.body?.documents;
    if (!Array.isArray(documents) || !documents.length) return res.status(400).json({ error: 'Upload at least one company proof document' });
    const saved = await authService.saveCompanyProofDocuments(req.user.id, documents);
    return res.status(201).json({ documents: saved });
  } catch (error) {
    console.error('Company proof upload failed:', error.message);
    return res.status(400).json({ error: error.message || 'Failed to upload company proof documents' });
  }
}

async function downloadCompanyProof(req, res) {
  try {
    const document = await authService.getCompanyProofDocument({
      documentId: req.params.documentId,
      userId: req.user.id,
      isAdmin: req.user.role === 'admin',
    });
    if (!document) return res.status(404).json({ error: 'Company proof document not found' });

    const descriptor=await companyProofStorage.descriptor(document.stored_name,{mimeType:document.mime_type,size:document.file_size});
    if(!descriptor)return res.status(404).json({error:'Company proof document not found'});
    return sendProofDescriptor(res,descriptor);
  } catch (error) {
    console.error('Company proof download failed:', error.message);
    return res.status(500).json({ error: 'Failed to load company proof document' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) return res.status(400).json({ error: 'Email and password are required' });
    return publicAuthResult(res, await authService.login({ email, password, source:req.ip||req.socket?.remoteAddress||null }), 200, { remember: req.body?.remember !== false });
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS') return res.status(401).json({ error: error.message });
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Failed to sign in' });
  }
}

async function googleLogin(req, res) {
  try {
    const { credential } = req.body || {};
    // Google sign-in is an authentication flow, not account creation.
    // The verified Google email determines the existing Propulse account.
    return publicAuthResult(res, await authService.googleLogin({ idToken: credential }), 200, { remember: req.body?.remember !== false });
  } catch (error) {
    if (['GOOGLE_NOT_CONFIGURED', 'INVALID_GOOGLE_TOKEN', 'INVALID_SIGNUP_ROLE'].includes(error.code)) return res.status(400).json({ error: error.message });
    if (['GOOGLE_TOKEN_TIMEOUT', 'GOOGLE_TOKEN_VERIFICATION_FAILED'].includes(error.code)) return res.status(503).json({ error: 'Google sign-in verification is temporarily unavailable. Please try again.' });
    if (error.code === 'GOOGLE_ACCOUNT_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'EMAIL_EXISTS') return res.status(409).json({ error: error.message });
    console.error('Google login failed:', error.message);
    return res.status(500).json({ error: 'Failed to sign in with Google' });
  }
}

async function forgotPassword(req, res) {
  let reset = null;
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    reset = await authService.createPasswordReset(email);
    if (!reset || reset.cooldown) {
      return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
    }

    const baseUrl = String(
      process.env.PUBLIC_APP_URL
      || process.env.FRONTEND_URL
      || process.env.APP_URL
      || process.env.CORS_ORIGIN
      || ''
    ).split(',')[0].trim().replace(/\/$/, '');
    if (!baseUrl) throw new Error('Public application URL is not configured');
    const resetUrl = `${baseUrl}/reset-password#token=${encodeURIComponent(reset.token)}`;
    await sendPasswordResetEmail({ to: reset.user.email, name: reset.user.name, resetUrl });
    return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (error) {
    if (reset?.token) {
      await authService.discardPasswordResetToken(reset.token).catch((cleanupError) => {
        console.error('Password reset token cleanup failed:', cleanupError.message);
      });
    }
    console.error('Forgot password failed:', error.message, error?.code||'', error?.providerStatus||'');
    await operationalMonitoringService.recordEvent({
      source:'backend',
      eventType:'password_recovery_email_failure',
      severity:'error',
      message:'Password reset email delivery failed',
      route:'/api/auth/forgot-password',
      method:'POST',
      statusCode:503,
      requestId:req.requestId,
      metadata:{
        providerCode:error?.code||null,
        providerStatus:Number.isInteger(Number(error?.providerStatus))?Number(error.providerStatus):null,
        emailConfigured:isEmailConfigured()
      }
    }).catch(monitorError=>console.error('Password recovery failure telemetry failed:',monitorError.message));
    return res.status(503).json({
      error: 'Password reset email could not be sent right now. Please try again later.',
      code: 'PASSWORD_RESET_EMAIL_UNAVAILABLE',
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (!token || !validatePassword(password)) return res.status(400).json({ error: 'Enter a password of 8-64 characters with a letter and number.' });
    await authService.resetPassword({ token, password });
    return res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (error) {
    if (['INVALID_RESET_REQUEST', 'INVALID_RESET_TOKEN'].includes(error.code)) return res.status(400).json({ error: error.message });
    console.error('Reset password failed:', error.message);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

async function logout(req, res) {
  try {
    const header = req.headers.authorization || '';
    const cookieHeader = String(req.headers.cookie || '');
    const cookieToken = cookieHeader
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(`${AUTH_COOKIE}=`))
      ?.slice(AUTH_COOKIE.length + 1);
    const encodedToken = header.startsWith('Bearer ') ? header.slice(7) : cookieToken;

    if (encodedToken) {
      try {
        const token = decodeURIComponent(encodedToken);
        const tokenUser = authService.verifyToken(token);
        await authService.revokeAuthSessions(tokenUser.id);
      } catch {
        // Always clear the browser cookie even when the token is already invalid.
      }
    }
  } finally {
    clearAuthCookie(res);
  }
  return res.status(204).send();
}



async function session(req, res) {
  const header = req.headers.authorization || '';
  const cookieHeader = String(req.headers.cookie || '');
  const cookieToken = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${AUTH_COOKIE}=`))
    ?.slice(AUTH_COOKIE.length + 1);
  const encodedToken = header.startsWith('Bearer ') ? header.slice(7) : cookieToken;

  if (!encodedToken) return res.json({ authenticated: false, user: null });

  try {
    const token = decodeURIComponent(encodedToken);
    const tokenUser = authService.verifyToken(token);
    const currentUser = await authService.getAuthenticatedUser(tokenUser.id, tokenUser.auth_version);
    if (!currentUser) {
      clearAuthCookie(res);
      return res.json({ authenticated: false, user: null });
    }
    const user = await authService.getPublicAuthenticatedUser(currentUser);
    if (!user) {
      clearAuthCookie(res);
      return res.json({ authenticated: false, user: null });
    }
    return res.json({ authenticated: true, user });
  } catch {
    clearAuthCookie(res);
    return res.json({ authenticated: false, user: null });
  }
}

async function linkSupabaseIdentity(req, res) {
  try {
    const accessToken = String(req.body?.accessToken || '').trim();
    if (!accessToken) return res.status(400).json({ error: 'Supabase access token is required' });
    if (!supabaseAuthService.isConfigured()) {
      return res.status(503).json({ error: 'Supabase Auth is not enabled on this server' });
    }

    const supabaseUser = await supabaseAuthService.verifyAccessToken(accessToken);
    const linkedUser = await authService.linkSupabaseIdentity({
      appUserId: req.user.id,
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email,
    });
    const user = await authService.getPublicAuthenticatedUser(linkedUser);
    return res.json({ linked: true, user });
  } catch (error) {
    if (error.code === 'SUPABASE_EMAIL_MISMATCH') return res.status(409).json({ error: error.message, code: error.code });
    if (error.code === 'SUPABASE_IDENTITY_ALREADY_LINKED') return res.status(409).json({ error: error.message, code: error.code });
    if (error.code === 'SUPABASE_AUTH_TIMEOUT') return res.status(503).json({ error: 'Authentication service is temporarily unavailable' });
    if (['INVALID_SUPABASE_SESSION', 'INVALID_SUPABASE_IDENTITY'].includes(error.code)) {
      return res.status(401).json({ error: 'Invalid or expired Supabase session' });
    }
    console.error('Supabase identity linking failed:', error.message);
    return res.status(500).json({ error: 'Failed to link Supabase account' });
  }
}


async function me(req, res) {
  try {
    const user = await authService.getPublicAuthenticatedUser(req.user);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    return res.json(user);
  } catch (error) {
    console.error('Get current user failed:', error.message);
    return res.status(500).json({ error: 'Failed to load account' });
  }
}

module.exports = { signup, uploadCompanyProofs, downloadCompanyProof, login, googleLogin, forgotPassword, resetPassword, logout, session, linkSupabaseIdentity, me };
