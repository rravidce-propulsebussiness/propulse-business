const crypto = require('node:crypto');
const pool = require('../config/database');

const safeClient = row => ({
  id: String(row.id),
  companyName: row.company_name,
  contactEmail: row.contact_email || '',
  environment: row.environment,
  keyPrefix: row.api_key_prefix,
  status: row.status,
  rateLimitPerMinute: Number(row.rate_limit_per_minute) || 60,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
});

async function getOverview(req, res) {
  try {
    const results = await Promise.all([
      pool.query("SELECT COUNT(*) FILTER (WHERE status='active')::int AS active_clients, COUNT(*) FILTER (WHERE status='revoked')::int AS revoked_clients FROM messaging_api_clients"),
      pool.query("SELECT COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::int AS messages_24h, COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' AND status='simulated')::int AS simulated_24h FROM messaging_api_messages"),
    ]);
    const clients = results[0].rows[0] || {};
    const messages = results[1].rows[0] || {};
    const productionReady = Boolean(process.env.META_APP_ID && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
    const publicOrigin = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
    const origin = publicOrigin || (req.protocol + '://' + req.get('host'));
    return res.json({
      product: 'Propulse Messaging',
      mode: 'test',
      activeClients: Number(clients.active_clients) || 0,
      revokedClients: Number(clients.revoked_clients) || 0,
      messages24h: Number(messages.messages_24h) || 0,
      simulated24h: Number(messages.simulated_24h) || 0,
      meta: {
        appIdConfigured: Boolean(process.env.META_APP_ID),
        phoneNumberConfigured: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
        accessTokenConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
        webhookConfigured: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
        productionReady,
      },
      endpoints: { baseUrl: origin + '/api/v1/messaging', messages: origin + '/api/v1/messaging/messages' },
    });
  } catch (error) {
    console.error('Messaging API overview failed:', error.message);
    return res.status(503).json({ error: 'Messaging API data is temporarily unavailable' });
  }
}

async function listClients(req, res) {
  try {
    const result = await pool.query("SELECT id,company_name,contact_email,environment,api_key_prefix,status,rate_limit_per_minute,created_at,last_used_at,revoked_at FROM messaging_api_clients ORDER BY created_at DESC LIMIT 100");
    return res.json({ clients: result.rows.map(safeClient) });
  } catch (error) {
    console.error('Messaging API client list failed:', error.message);
    return res.status(503).json({ error: 'Messaging API clients are temporarily unavailable' });
  }
}

async function createClient(req, res) {
  const companyName = String(req.body?.companyName || '').trim();
  const contactEmail = String(req.body?.contactEmail || '').trim().toLowerCase();
  if (companyName.length < 2 || companyName.length > 160) return res.status(400).json({ error: 'Company name must be between 2 and 160 characters' });
  if (contactEmail && (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) return res.status(400).json({ error: 'Enter a valid contact email address' });

  const apiKey = 'pma_test_' + crypto.randomBytes(32).toString('base64url');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.slice(0, 18) + '…';
  try {
    const result = await pool.query(
      "INSERT INTO messaging_api_clients (company_name,contact_email,environment,api_key_hash,api_key_prefix,created_by) VALUES ($1,$2,'test',$3,$4,$5) RETURNING id,company_name,contact_email,environment,api_key_prefix,status,rate_limit_per_minute,created_at,last_used_at,revoked_at",
      [companyName, contactEmail || null, apiKeyHash, keyPrefix, req.user?.id || null]
    );
    return res.status(201).json({ client: safeClient(result.rows[0]), apiKey, notice: 'Copy this test key now. It is only shown once.' });
  } catch (error) {
    console.error('Messaging API client creation failed:', error.message);
    return res.status(503).json({ error: 'Unable to create a test API key right now' });
  }
}

async function revokeClient(req, res) {
  const clientId = String(req.params.clientId || '');
  if (!/^\d+$/.test(clientId)) return res.status(400).json({ error: 'Invalid API client' });
  try {
    const result = await pool.query("UPDATE messaging_api_clients SET status='revoked', revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP) WHERE id=$1 AND status='active' RETURNING id", [clientId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Active API client not found' });
    return res.json({ success: true, id: clientId, status: 'revoked' });
  } catch (error) {
    console.error('Messaging API key revocation failed:', error.message);
    return res.status(503).json({ error: 'Unable to revoke this API key right now' });
  }
}

async function listMessages(req, res) {
  const clientFilter = String(req.query?.clientId || '').trim();
  const values = [];
  let where = '';
  if (clientFilter) {
    if (!/^\d+$/.test(clientFilter)) return res.status(400).json({ error: 'Invalid API client' });
    values.push(clientFilter);
    where = 'WHERE m.client_id=$1';
  }
  try {
    const result = await pool.query(
      'SELECT m.id,m.client_id,c.company_name,m.recipient_masked,m.message_length,m.status,m.created_at FROM messaging_api_messages m JOIN messaging_api_clients c ON c.id=m.client_id ' + where + ' ORDER BY m.created_at DESC LIMIT 100',
      values
    );
    return res.json({ messages: result.rows.map(row => ({
      id: 'msg_' + row.id,
      clientId: String(row.client_id),
      companyName: row.company_name,
      recipient: row.recipient_masked,
      messageLength: Number(row.message_length),
      status: row.status,
      createdAt: row.created_at,
    })) });
  } catch (error) {
    console.error('Messaging API message list failed:', error.message);
    return res.status(503).json({ error: 'Messaging API logs are temporarily unavailable' });
  }
}

module.exports = { getOverview, listClients, createClient, revokeClient, listMessages };
