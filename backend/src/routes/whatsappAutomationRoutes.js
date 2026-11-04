const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');
const controller = require('../controllers/whatsappAutomationController');

const router = express.Router();

function requireBusinessWorkspace(req, res, next) {
  if (req.user?.role !== 'business') return res.status(403).json({ error: 'A Propulse business account is required' });
  return next();
}

router.use(requireAuth, requireBusinessWorkspace);
router.get('/overview', controller.getWorkspace);
router.get('/rules', controller.listRules);
router.post('/rules', rateLimit({ windowMs: 60000, max: 30 }), controller.saveRule);
router.put('/rules/:ruleId', rateLimit({ windowMs: 60000, max: 30 }), controller.updateRule);
router.delete('/rules/:ruleId', rateLimit({ windowMs: 60000, max: 20 }), controller.deleteRule);
router.post('/rules/:ruleId/test', rateLimit({ windowMs: 60000, max: 30 }), controller.testRule);
router.get('/runs', controller.listRuns);
router.get('/keys', controller.listKeys);
router.post('/keys', rateLimit({ windowMs: 60000, max: 10 }), controller.createKey);
router.post('/keys/:clientId/revoke', rateLimit({ windowMs: 60000, max: 10 }), controller.revokeKey);

module.exports = router;
