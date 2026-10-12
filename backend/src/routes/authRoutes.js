const crypto = require('crypto');
const express = require('express');
const authController = require('../controllers/authController');
const emailVerificationController = require('../controllers/emailVerificationController');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const authWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
function hashRecoveryIdentity(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

const forgotPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const hash = hashRecoveryIdentity(req.body?.email);
    return hash ? `password-recovery-email:v2:${hash}` : '';
  },
});
const resetPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => {
    const hash = hashRecoveryIdentity(req.body?.token);
    return hash ? `password-reset-token:v2:${hash}` : '';
  },
});
const companyProofUploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/signup', authWriteLimit, authController.signup);
router.post('/company-proofs', requireAuth, companyProofUploadLimit, authController.uploadCompanyProofs);
router.get('/company-proofs/:documentId', requireAuth, authController.downloadCompanyProof);
router.post('/login', authWriteLimit, authController.login);
// This is a public OAuth *client identifier*, not a secret. The frontend may be
// prebuilt on GitHub without access to Hostinger runtime environment variables.
router.get('/google/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ clientId: String(process.env.GOOGLE_CLIENT_ID || '').trim() || null });
});
router.post('/google', authWriteLimit, authController.googleLogin);
// Email ownership verification is independent of password resets.
router.get('/email-verification', requireAuth, emailVerificationController.showRequest);
router.post('/email-verification/request', requireAuth,
  rateLimit({windowMs:60*60*1000,max:3,keyGenerator:req=>'verified-email:'+String(req.user.id)}),
  emailVerificationController.request);
router.get('/email-verification/confirm', emailVerificationController.showConfirm);
router.post('/email-verification/confirm',
  express.urlencoded({extended:false,limit:'4kb'}),
  rateLimit({windowMs:15*60*1000,max:20}),
  emailVerificationController.confirm);
router.post('/forgot-password', forgotPasswordLimit, authController.forgotPassword);
router.post('/reset-password', resetPasswordLimit, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/session', authController.session);
router.post('/supabase/link', requireAuth, authWriteLimit, authController.linkSupabaseIdentity);
router.get('/me', requireAuth, authController.me);

module.exports = router;
