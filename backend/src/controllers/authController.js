const authService = require('../services/authService');

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

async function signup(req, res) {
  try {
    const {
      name, email, password, phone, businessName, businessDetails,
      industryId, serviceId, subserviceId, stateId, cityId,
    } = req.body;

    const required = [name, email, password, phone, businessName, businessDetails, industryId, serviceId, stateId, cityId];
    if (required.some((value) => value === undefined || value === null || String(value).trim() === '') || !validatePassword(password)) {
      return res.status(400).json({ error: 'Please complete all required account, business and lead preference fields' });
    }

    const ids = [industryId, serviceId, stateId, cityId].map(Number);
    if (ids.some((id) => !Number.isInteger(id) || id < 1) || (subserviceId && (!Number.isInteger(Number(subserviceId)) || Number(subserviceId) < 1))) {
      return res.status(400).json({ error: 'Please select valid business and location options' });
    }

    const result = await authService.signup({
      name, email, password, phone, businessName, businessDetails,
      industryId: ids[0], serviceId: ids[1], subserviceId: subserviceId ? Number(subserviceId) : null,
      stateId: ids[2], cityId: ids[3],
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
