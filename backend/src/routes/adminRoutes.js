const express = require('express');
const adminController = require('../controllers/adminController');
const requireAuth = require('../middleware/authMiddleware');
const router = express.Router();
function requireAdmin(req, res, next) { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' }); return next(); }
router.use(requireAuth, requireAdmin);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.post('/users/admin', adminController.createAdmin);
router.patch('/users/:id/status', adminController.setUserStatus);
router.patch('/users/:id/membership/remove', adminController.removeMembership);
module.exports = router;
