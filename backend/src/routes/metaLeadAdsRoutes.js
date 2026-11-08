const express = require('express');
const requireAdmin = require('../middleware/adminMiddleware');
const requireLeadPartner = require('../middleware/leadPartnerMiddleware');
const service = require('../services/metaLeadAdsService');

// Map service errors to safe client responses (no stack traces or secrets).
function send(res, error) {
  if (['PARTNER_NOT_FOUND', 'PARTNER_NOT_ACTIVE'].includes(error?.code)) return res.status(403).json({ error: 'Lead Partner approval is required.', code: error.code });
  if (error?.code === 'META_NOT_CONFIGURED') return res.status(503).json({ error: error.message, code: error.code, missing: error.missing || [] });
  if (error?.code === 'META_GRAPH_ERROR') return res.status(502).json({ error: error.message, code: error.code, reconnect: Boolean(error.needsReconnect) });
  if (error?.code === 'META_TIMEOUT' || error?.code === 'META_TOKEN_UNREADABLE') return res.status(502).json({ error: error.message, code: error.code, reconnect: error.code === 'META_TOKEN_UNREADABLE' });
  if (error?.status && error.status < 500) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error('Meta Lead Ads request failed:', error?.message || error);
  return res.status(500).json({ error: 'Meta Lead Ads request failed' });
}
const handle = fn => async (req, res) => { try { res.json(await fn(req)); } catch (error) { send(res, error); } };

// One router per owner type, each behind that owner's existing guard.
function ownerRouter(scope, guard) {
  const router = express.Router();
  router.use(...guard);
  const owner = req => ({ userId: req.user.id, scope });
  router.get('/status', handle(req => service.getStatus(owner(req))));
  router.post('/oauth/start', handle(req => service.startOauth(owner(req))));
  router.get('/pages/:pageId/forms', handle(req => service.listForms({ ...owner(req), pageId: req.params.pageId })));
  router.post('/preview', handle(req => service.previewForm({ ...owner(req), ...pickBody(req.body) })));
  router.post('/connections', handle(req => service.connectForm({ ...owner(req), ...pickBody(req.body) })));
  router.post('/connections/:id/sync', handle(req => service.backfillConnection({ ...owner(req), connectionId: req.params.id, days: req.body?.days })));
  router.delete('/connections/:id', handle(req => service.disconnectForm({ ...owner(req), connectionId: req.params.id })));
  router.post('/disconnect', handle(req => service.disconnectAccount(owner(req))));
  return router;
}
function pickBody(body = {}) {
  return {
    pageId: body.pageId, formId: body.formId,
    columnMappings: body.columnMappings && typeof body.columnMappings === 'object' ? body.columnMappings : {},
    defaultIndustryId: body.defaultIndustryId ?? null,
    defaults: body.defaults && typeof body.defaults === 'object' ? body.defaults : {},
  };
}

const router = express.Router();
router.use('/admin', ownerRouter('admin', [requireAdmin]));
router.use('/partner', ownerRouter('lead_partner', [requireLeadPartner]));

// Facebook redirects the browser here after login. Identity comes from the
// signed, short-lived `state` created by /oauth/start, not from this request.
router.get('/oauth/callback', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const target = await service.finishOauth({ code: req.query.code, state: req.query.state, error: req.query.error });
  return res.redirect(302, target);
});

// Webhook endpoints are mounted separately (raw body, before JSON/CSRF).
const webhook = express.Router();
webhook.get('/', (req, res) => {
  const challenge = service.verifyWebhookSubscription({ mode: req.query['hub.mode'], token: req.query['hub.verify_token'], challenge: req.query['hub.challenge'] });
  if (challenge === null) return res.status(403).send('Forbidden');
  return res.type('text/plain').send(challenge);
});
webhook.post('/', (req, res) => {
  try {
    const result = service.handleWebhook({ rawBody: req.body, signature: req.get('x-hub-signature-256') });
    // Acknowledge immediately; imports run in the background queue.
    return res.status(200).json({ received: true, accepted: result.accepted });
  } catch (error) {
    if (error?.status === 401 || error?.status === 400) return res.status(error.status).json({ error: error.message });
    console.error('Meta webhook rejected:', error?.message || error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = { router, webhook };
