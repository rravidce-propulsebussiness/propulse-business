const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const service = require('../services/whatsappCloudService');

function send(res, error) {
  if (error?.code === 'WHATSAPP_NOT_CONFIGURED') return res.status(503).json({ error: error.message, code: error.code, missing: error.missing || [] });
  if (error?.code === 'WHATSAPP_TOKEN_UNREADABLE') return res.status(502).json({ error: error.message, code: error.code, reconnect: true });
  if (error?.code === 'WHATSAPP_GRAPH_ERROR') return res.status(502).json({ error: error.message, code: error.code });
  if (error?.code === 'WHATSAPP_TIMEOUT') return res.status(504).json({ error: error.message, code: error.code });
  if (error?.status && error.status < 500) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error('WhatsApp Cloud request failed:', error?.message || error);
  return res.status(500).json({ error: 'WhatsApp Cloud request failed' });
}
const handle = fn => async (req, res) => {
  try { return res.json(await fn(req)); } catch (error) { return send(res, error); }
};

const router = express.Router();
router.use(requireAuth);
router.get('/accounts', handle(req => service.listAccounts(req.user.id)));
router.post('/accounts', handle(req => service.upsertAccount({
  userId: req.user.id,
  businessAccountId: req.body?.businessAccountId,
  phoneNumberId: req.body?.phoneNumberId,
  accessToken: req.body?.accessToken,
  displayPhoneNumber: req.body?.displayPhoneNumber,
  verifiedName: req.body?.verifiedName,
})));
router.delete('/accounts/:id', handle(req => service.disconnect({ userId: req.user.id, accountId: req.params.id })));
router.post('/accounts/:id/messages', handle(req => service.sendMessage({
  userId: req.user.id,
  accountId: req.params.id,
  to: req.body?.to,
  text: req.body?.text,
  template: req.body?.template,
  idempotencyKey: req.get('idempotency-key') || req.body?.idempotencyKey,
})));

module.exports = { router, webhook: express.Router()
  .get('/', (req, res) => {
    const challenge = service.verifySubscription({
      mode: req.query['hub.mode'],
      token: req.query['hub.verify_token'],
      challenge: req.query['hub.challenge'],
    });
    if (challenge === null) return res.status(403).send('Forbidden');
    return res.type('text/plain').send(challenge);
  })
  .post('/', (req, res) => {
    service.handleWebhook({ rawBody: req.body, signature: req.get('x-hub-signature-256') })
      .then(result => res.status(200).json({ received: true, accepted: result.accepted }))
      .catch(error => {
        if (error?.status === 401 || error?.status === 400) return res.status(error.status).json({ error: error.message });
        console.error('WhatsApp webhook failed:', error?.message || error);
        return res.status(500).json({ error: 'WhatsApp webhook failed' });
      });
  })
};
