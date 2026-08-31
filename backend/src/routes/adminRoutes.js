const express = require('express');
const adminController = require('../controllers/adminController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard/stats', requireAuth, (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}, adminController.getDashboardStats);

module.exports = router;
