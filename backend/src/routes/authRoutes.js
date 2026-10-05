const crypto = require('crypto');
const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const authWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
function hashRecoveryIdentity(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function passwordRecoveryKey(req, prefix, value) {
  const identityHash = hashRecoveryIdentity(value);
  if (!identityHash) return '';
  const sourceHash = hashRecoveryIdentity(req.ip || req.socket?.remoteAddress || 'unknown');
  return `${prefix}:${identityHash}:source:${sourceHash || 'unknown'}`;
}

const forgotPasswordLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => passwordRecoveryKey(req, 'password-recovery-email', req.body?.email),
});
const resetPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => passwordRecoveryKey(req, 'password-reset-token', req.body?.token),
});
const companyProofUploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/signup', authWriteLimit, authController.signup);
router.post('/company-proofs', requireAuth, companyProofUploadLimit, authController.uploadCompanyProofs);
router.get('/company-proofs/:documentId', requireAuth, authController.downloadCompanyProof);
router.post('/login', authWriteLimit, authController.login);
router.post('/google', authWriteLimit, authController.googleLogin);
router.post('/forgot-password', forgotPasswordLimit, authController.forgotPassword);
router.post('/reset-password', resetPasswordLimit, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/session', authController.session);
router.post('/supabase/link', requireAuth, authWriteLimit, authController.linkSupabaseIdentity);
router.get('/me', requireAuth, authController.me);

module.exports = router;
