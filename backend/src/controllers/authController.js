const authService = require('../services/authService');
const { sendPasswordResetEmail } = require('../services/emailService');

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
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
      accountType,
    } = req.body;

    const role = normalizePublicSignupRole(accountType);
    if (!role) {
      return res.status(400).json({ error: 'Choose either User or Lead Partner as your account type' });
    }
    if (!name?.trim() || !email?.trim() || !validatePassword(password)) {
      return res.status(400).json({ error: 'Name, email and a password of at least 8 characters are required' });
    }
    if (!phone?.trim() || !businessName?.trim() || !businessDetails?.trim()) {
      return res.status(400).json({ error: 'Phone, business name and business details are required' });
    }
    if (!Array.isArray(services) || !services.length || !Array.isArray(locations) || !locations.length) {
      return res.status(400).json({ error: 'Select at least one service and one location' });
    }

    const result = await authService.signup({
      name, email, password, phone, businessName, businessDetails, services, locations, role,
    });
    return res.status(201).json(result);
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

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) return res.status(400).json({ error: 'Email and password are required' });
    return res.json(await authService.login({ email, password }));
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS') return res.status(401).json({ error: error.message });
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Failed to sign in' });
  }
}

async function googleLogin(req, res) {
  try {
    const { credential, accountType } = req.body || {};
    const role = normalizePublicSignupRole(accountType);
    if (!role) return res.status(400).json({ error: 'Choose either User or Lead Partner as your account type' });
    return res.json(await authService.googleLogin({ idToken: credential, role }));
  } catch (error) {
    if (['GOOGLE_NOT_CONFIGURED', 'INVALID_GOOGLE_TOKEN', 'INVALID_SIGNUP_ROLE'].includes(error.code)) return res.status(400).json({ error: error.message });
    if (error.code === 'GOOGLE_ACCOUNT_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'EMAIL_EXISTS') return res.status(409).json({ error: error.message });
    console.error('Google login failed:', error.message);
    return res.status(500).json({ error: 'Failed to sign in with Google' });
  }
}

async function forgotPassword(req, res) {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const reset = await authService.createPasswordReset(email);
    if (!reset) return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });

    const baseUrl = String(process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || '').split(',')[0].replace(/\/$/, '');
    if (!baseUrl) throw new Error('PUBLIC_APP_URL is not configured');
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(reset.token)}`;
    await sendPasswordResetEmail({ to: reset.user.email, name: reset.user.name, resetUrl });
    return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password failed:', error.message);
    return res.status(503).json({ error: 'Password reset email could not be sent right now. Please try again later.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (!token || !validatePassword(password)) return res.status(400).json({ error: 'Enter a password of at least 8 characters.' });
    await authService.resetPassword({ token, password });
    return res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (error) {
    if (['INVALID_RESET_REQUEST', 'INVALID_RESET_TOKEN'].includes(error.code)) return res.status(400).json({ error: error.message });
    console.error('Reset password failed:', error.message);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

async function me(req, res) {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    return res.json(user);
  } catch (error) {
    console.error('Get current user failed:', error.message);
    return res.status(500).json({ error: 'Failed to load account' });
  }
}

module.exports = { signup, uploadCompanyProofs, login, googleLogin, forgotPassword, resetPassword, me };
