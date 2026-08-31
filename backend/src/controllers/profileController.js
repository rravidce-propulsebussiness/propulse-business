const profileService = require('../services/profileService');

async function getProfile(req, res) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Business profile not found' });
    return res.json(profile);
  } catch (error) {
    console.error('Get profile failed:', error.message);
    return res.status(500).json({ error: 'Failed to load business profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, email, phone, businessName, businessDetails, services, locations } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !businessName?.trim() || !businessDetails?.trim()) {
      return res.status(400).json({ error: 'Complete all business details' });
    }
    const result = await profileService.updateProfile(req.user.id, {
      name, email, phone, businessName, businessDetails, services, locations,
    });
    return res.json(result);
  } catch (error) {
    console.error('Update profile failed:', error.message);
    return res.status(400).json({ error: error.message || 'Failed to update profile' });
  }
}

module.exports = { getProfile, updateProfile };
