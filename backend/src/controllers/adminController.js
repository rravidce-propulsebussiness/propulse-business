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
async function removeMembership(req, res) { try { const membership = await adminService.removeMembership(req.params.id); if (!membership) return res.status(404).json({ error: 'No active membership found' }); return res.json(membership); } catch (error) { console.error('Remove membership failed:', error.message); return res.status(500).json({ error: 'Failed to remove membership' }); } }
module.exports = { getDashboardStats, getUsers, createAdmin, setUserStatus, removeMembership };
