const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const authWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/signup', authWriteLimit, authController.signup);
router.post('/login', authWriteLimit, authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
