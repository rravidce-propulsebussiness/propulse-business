const authService = require('../services/authService');
const { sendPasswordResetEmail } = require('../services/emailService');

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

async function signup(req, res) {
  try {
    const {
      name, email, password, phone, businessName, businessDetails, services, locations,
    } = req.body;

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
      name, email, password, phone, businessName, businessDetails, services, locations,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') return res.status(409).json({ error: error.message });
    if (error.code === 'INVALID_BUSINESS_SELECTION') return res.status(400).json({ error: error.message });
    console.error('Signup failed:', error.message);
    return res.status(500).json({ error: 'Failed to create account' });
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
    const { credential } = req.body;
    return res.json(await authService.googleLogin({ idToken: credential }));
  } catch (error) {
    if (['GOOGLE_NOT_CONFIGURED', 'INVALID_GOOGLE_TOKEN'].includes(error.code)) return res.status(400).json({ error: error.message });
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

module.exports = { signup, login, googleLogin, forgotPassword, resetPassword, me };
