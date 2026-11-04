const express = require('express');
const crypto = require('node:crypto');
const pool = require('../config/database');
const rateLimit = require('../middleware/rateLimitMiddleware');
const automationController = require('../controllers/whatsappAutomationController');

const router = express.Router();

async function authenticateClient(req, res, next) {
  const authorization = String(req.headers.authorization || '');
  const bearerMatch = authorization.match(/^Bearer (pma_test_[A-Za-z0-9_-]{40,})$/);
  const apiKey = String(req.get('X-Propulse-API-Key') || bearerMatch?.[1] || '');
  if (!/^pma_test_[A-Za-z0-9_-]{40,}$/.test(apiKey)) return res.status(401).json({ error: 'A valid Propulse test API key is required', code: 'API_KEY_REQUIRED' });
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  try {
    const result = await pool.query("SELECT id,company_name,environment,rate_limit_per_minute,owner_user_id FROM messaging_api_clients WHERE api_key_hash=$1 AND status='active' AND environment='test' LIMIT 1", [keyHash]);
    if (!result.rowCount) return res.status(401).json({ error: 'Invalid or revoked API key', code: 'API_KEY_INVALID' });
    req.messagingClient = result.rows[0];
    void pool.query('UPDATE messaging_api_clients SET last_used_at=CURRENT_TIMESTAMP WHERE id=$1', [req.messagingClient.id]).catch(error => console.error('Messaging API last-used update failed:', error.message));
    return next();
  } catch (error) {
    console.error('Messaging API authentication failed:', error.message);
    return res.status(503).json({ error: 'Messaging API authentication is temporarily unavailable' });
  }
}

const perClientRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: req => req.messagingClient?.id ? 'messaging-client:' + req.messagingClient.id : '',
});

function maskRecipient(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return '+' + '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

function sendError(res, status, message, code) {
  return res.status(status).json({ error: message, code, docs: '/api/v1/messaging/docs' });
}

router.get('/health', (req, res) => res.json({
  service: 'Propulse Messaging API',
  status: 'available',
  environment: 'test',
  delivery: 'simulated',
}));

router.get('/docs', (req, res) => res.json({
  name: 'Propulse Messaging API',
  version: 'v1',
  environment: 'test',
  endpoints: [
    { method: 'GET', path: '/api/v1/messaging/health', authentication: 'none' },
    { method: 'POST', path: '/api/v1/messaging/messages', authentication: 'X-Propulse-API-Key or Bearer test API key' },
    { method: 'GET', path: '/api/v1/messaging/messages', authentication: 'Bearer test API key' },
    { method: 'POST', path: '/api/v1/messaging/automations/trigger', authentication: 'X-Propulse-API-Key or Bearer workspace test API key' },
  ],
  note: 'Test messages are simulated and are not delivered through WhatsApp.',
}));

router.use(authenticateClient, perClientRateLimit);
router.post('/automations/trigger', automationController.triggerApiEvent);

router.post('/messages', async (req, res) => {
  const recipient = String(req.body?.to || '').trim();
  const messageText = String(req.body?.text || '').trim();
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) return sendError(res, 400, 'Use an international phone number in E.164 format', 'INVALID_RECIPIENT');
  if (!messageText || messageText.length > 4096) return sendError(res, 400, 'Message text must be between 1 and 4096 characters', 'INVALID_MESSAGE');
  if (idempotencyKey && (idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))) {
    return sendError(res, 400, 'Idempotency-Key may contain up to 128 letters, digits, dots, underscores, colons or hyphens', 'INVALID_IDEMPOTENCY_KEY');
  }

  try {
    if (idempotencyKey) {
      const previous = await pool.query('SELECT id,status,created_at FROM messaging_api_messages WHERE client_id=$1 AND idempotency_key=$2 LIMIT 1', [req.messagingClient.id, idempotencyKey]);
      if (previous.rowCount) return res.status(200).json({
        id: 'msg_' + previous.rows[0].id,
        status: previous.rows[0].status,
        environment: 'test',
        delivered: false,
        idempotentReplay: true,
        createdAt: previous.rows[0].created_at,
      });
    }

    const result = await pool.query(
      "INSERT INTO messaging_api_messages (client_id,environment,recipient_masked,message_length,status,idempotency_key) VALUES ($1,'test',$2,$3,'simulated',$4) ON CONFLICT (client_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING id,status,created_at",
      [req.messagingClient.id, maskRecipient(recipient), messageText.length, idempotencyKey || null]
    );
    let row = result.rows[0];
    if (!row && idempotencyKey) {
      const concurrent = await pool.query('SELECT id,status,created_at FROM messaging_api_messages WHERE client_id=$1 AND idempotency_key=$2 LIMIT 1', [req.messagingClient.id, idempotencyKey]);
      if (concurrent.rowCount) {
        row = concurrent.rows[0];
        return res.status(200).json({
          id: 'msg_' + row.id,
          status: row.status,
          environment: 'test',
          delivered: false,
          idempotentReplay: true,
          createdAt: row.created_at,
        });
      }
    }
    if (!row) return sendError(res, 503, 'Unable to record test message', 'MESSAGE_LOG_UNAVAILABLE');
    return res.status(202).json({
      id: 'msg_' + row.id,
      status: row.status,
      environment: 'test',
      delivered: false,
      simulated: true,
      company: req.messagingClient.company_name,
      createdAt: row.created_at,
      note: 'Accepted by the Propulse test sandbox. No WhatsApp message was sent.',
    });
  } catch (error) {
    console.error('Messaging sandbox request failed:', error.message);
    return sendError(res, 503, 'The test sandbox is temporarily unavailable', 'SANDBOX_UNAVAILABLE');
  }
});

router.get('/messages', async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 25));
  try {
    const result = await pool.query('SELECT id,recipient_masked,message_length,status,created_at FROM messaging_api_messages WHERE client_id=$1 ORDER BY created_at DESC LIMIT $2', [req.messagingClient.id, limit]);
    return res.json({ messages: result.rows.map(row => ({
      id: 'msg_' + row.id,
      recipient: row.recipient_masked,
      messageLength: Number(row.message_length),
      status: row.status,
      environment: 'test',
      delivered: false,
      createdAt: row.created_at,
    })) });
  } catch (error) {
    console.error('Messaging sandbox log failed:', error.message);
    return sendError(res, 503, 'The test sandbox is temporarily unavailable', 'SANDBOX_UNAVAILABLE');
  }
});

module.exports = router;
