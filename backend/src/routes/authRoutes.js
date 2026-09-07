const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const authWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const recoveryLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/signup', authWriteLimit, authController.signup);
router.post('/login', authWriteLimit, authController.login);
router.post('/google', authWriteLimit, authController.googleLogin);
router.post('/forgot-password', recoveryLimit, authController.forgotPassword);
router.post('/reset-password', recoveryLimit, authController.resetPassword);
router.get('/me', requireAuth, authController.me);

module.exports = router;
