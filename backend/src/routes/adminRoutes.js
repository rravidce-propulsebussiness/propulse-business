const express = require('express');
const adminController = require('../controllers/adminController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  return next();
}

router.use(requireAuth, requireAdmin);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/businesses', adminController.getBusinesses);
router.patch('/businesses/:id/status', adminController.setBusinessStatus);

module.exports = router;
