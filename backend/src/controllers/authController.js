const authService = require('../services/authService');

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

module.exports = { signup, login, me };
