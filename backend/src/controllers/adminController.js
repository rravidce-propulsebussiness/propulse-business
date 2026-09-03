const adminService = require('../services/adminService');

async function getDashboardStats(req, res) {
  try { return res.json(await adminService.getDashboardStats()); }
  catch (error) { console.error('Get admin dashboard stats failed:', error.message); return res.status(500).json({ error: 'Failed to load dashboard statistics' }); }
}
async function getUsers(req, res) { try { return res.json(await adminService.getUsers(req.query)); } catch (error) { console.error('Get admin users failed:', error.message); return res.status(500).json({ error: 'Failed to load users' }); } }
async function createAdmin(req, res) {
  try { return res.status(201).json(await adminService.createAdmin(req.body || {})); }
  catch (error) {
    if (error.code === 'EMAIL_EXISTS') return res.status(409).json({ error: error.message });
    if (error.code === 'INVALID_ADMIN') return res.status(400).json({ error: error.message });
    console.error('Create admin failed:', error.message);
    return res.status(500).json({ error: 'Failed to create admin' });
  }
}
async function setUserStatus(req, res) { try { const user = await adminService.setUserStatus(req.params.id, Boolean(req.body?.isActive)); if (!user) return res.status(404).json({ error: 'User not found' }); return res.json(user); } catch (error) { console.error('Set user status failed:', error.message); return res.status(500).json({ error: 'Failed to update user status' }); } }
async function updateUserProfile(req, res) {
  try { return res.json(await adminService.updateUserProfile(req.params.id, req.body || {})); }
  catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'EMAIL_EXISTS' || error.code === 'INVALID_USER') return res.status(400).json({ error: error.message });
    console.error('Update admin user profile failed:', error.message);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
}
async function updateMembership(req, res) {
  try { return res.json(await adminService.updateMembership(req.params.id, req.body || {})); }
  catch (error) {
    if (['NOT_FOUND','NO_MEMBERSHIP','INVALID_MEMBERSHIP_ACTION','INVALID_PLAN','INVALID_DAYS','INVALID_DATES'].includes(error.code)) return res.status(400).json({ error: error.message });
    console.error('Update admin membership failed:', error.message);
    return res.status(500).json({ error: 'Failed to update membership' });
  }
}
async function removeMembership(req, res) { return updateMembership({ params: req.params, body: { action: 'terminate' } }, res); }
module.exports = { getDashboardStats, getUsers, createAdmin, setUserStatus, updateUserProfile, updateMembership, removeMembership };
