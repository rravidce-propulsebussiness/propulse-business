const adminService = require('../services/adminService');

async function getDashboardStats(req, res) {
  try { return res.json(await adminService.getDashboardStats()); }
  catch (error) { console.error('Get admin dashboard stats failed:', error.message); return res.status(500).json({ error: 'Failed to load dashboard statistics' }); }
}
async function getBusinesses(req, res) { try { return res.json(await adminService.getBusinesses(req.query)); } catch (error) { console.error('Get admin businesses failed:', error.message); return res.status(500).json({ error: 'Failed to load businesses' }); } }
async function getUsers(req, res) { try { return res.json(await adminService.getUsers(req.query)); } catch (error) { console.error('Get admin users failed:', error.message); return res.status(500).json({ error: 'Failed to load users' }); } }
async function setBusinessStatus(req, res) { try { const business = await adminService.setBusinessStatus(req.params.id, Boolean(req.body?.isActive)); if (!business) return res.status(404).json({ error: 'Business not found' }); return res.json(business); } catch (error) { console.error('Set business status failed:', error.message); return res.status(500).json({ error: 'Failed to update business status' }); } }
async function setUserStatus(req, res) { try { const user = await adminService.setUserStatus(req.params.id, Boolean(req.body?.isActive)); if (!user) return res.status(404).json({ error: 'User not found' }); return res.json(user); } catch (error) { console.error('Set user status failed:', error.message); return res.status(500).json({ error: 'Failed to update user status' }); } }
async function removeMembership(req, res) { try { const membership = await adminService.removeMembership(req.params.id); if (!membership) return res.status(404).json({ error: 'No active membership found' }); return res.json(membership); } catch (error) { console.error('Remove membership failed:', error.message); return res.status(500).json({ error: 'Failed to remove membership' }); } }
module.exports = { getDashboardStats, getBusinesses, getUsers, setBusinessStatus, setUserStatus, removeMembership };
