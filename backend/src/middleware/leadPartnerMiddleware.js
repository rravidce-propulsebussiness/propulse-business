const requireAuth = require('./authMiddleware');
const leadPartnerService = require('../services/leadPartnerService');

function requireLeadPartner(req, res, next) {
  return requireAuth(req, res, async () => {
    if (req.user.role !== 'lead_partner') {
      return res.status(403).json({ error: 'Lead Partner access required.' });
    }
    try {
      req.leadPartner = await leadPartnerService.assertActivePartner(req.user.id);
      return next();
    } catch (error) {
      if (['PARTNER_NOT_FOUND', 'PARTNER_NOT_ACTIVE'].includes(error.code)) {
        return res.status(403).json({
          error: error.code === 'PARTNER_NOT_FOUND'
            ? 'Lead Partner application is required before using this workspace.'
            : 'Lead Partner approval is required before using this workspace.',
          code: error.code,
        });
      }
      console.error('Lead Partner authorization failed:', error.message);
      return res.status(500).json({ error: 'Unable to verify Lead Partner access.' });
    }
  });
}

module.exports = requireLeadPartner;
