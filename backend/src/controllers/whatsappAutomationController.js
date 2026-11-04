const crypto = require('node:crypto');
const pool = require('../config/database');

const safeClient = row => ({
  id: String(row.id),
  companyName: row.company_name,
  keyPrefix: row.api_key_prefix,
  status: row.status,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
});

function maskRecipient(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return '+' + '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

function normalizeEventData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, raw]) => {
    const safeKey = String(key).replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80);
    const safeValue = ['string', 'number', 'boolean'].includes(typeof raw) ? String(raw).slice(0, 500) : '';
    return [safeKey, safeValue];
  }).filter(([key]) => key));
}

function renderTemplate(template, data) {
  return String(template || '').replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (match, key) => data[key] || '');
}

function validateRule(body) {
  const name = String(body?.name || '').trim();
  const triggerEvent = String(body?.triggerEvent || '').trim().toLowerCase();
  const messageTemplate = String(body?.messageTemplate || '').trim();
  if (name.length < 2 || name.length > 120) return { error: 'Automation name must be between 2 and 120 characters' };
  if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(triggerEvent)) return { error: 'Use an event name such as lead.created or order.paid' };
  if (!messageTemplate || messageTemplate.length > 4096) return { error: 'Message text must be between 1 and 4096 characters' };
  return { value: { name, triggerEvent, messageTemplate, isEnabled: body?.isEnabled === true } };
}

async function getWorkspace(req, res) {
  try {
    const results = await Promise.all([
      pool.query('SELECT business_name FROM business_profiles WHERE user_id=$1 LIMIT 1', [req.user.id]),
      pool.query('SELECT COUNT(*)::int AS count FROM whatsapp_automation_rules WHERE owner_user_id=$1', [req.user.id]),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='active')::int AS active FROM messaging_api_clients WHERE owner_user_id=$1", [req.user.id]),
      pool.query("SELECT COUNT(*)::int AS count FROM whatsapp_automation_runs WHERE owner_user_id=$1 AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'", [req.user.id]),
    ]);
    return res.json({
      product: 'Propulse Messaging',
      environment: 'test',
      businessName: results[0].rows[0]?.business_name || '',
      automationCount: Number(results[1].rows[0]?.count) || 0,
      activeKeys: Number(results[2].rows[0]?.active) || 0,
      runs24h: Number(results[3].rows[0]?.count) || 0,
      meta: { connected: false, liveDeliveryEnabled: false },
    });
  } catch (error) {
    console.error('WhatsApp automation workspace failed:', error.message);
    return res.status(503).json({ error: 'WhatsApp automation data is temporarily unavailable' });
  }
}

async function listRules(req, res) {
  try {
    const result = await pool.query(
      'SELECT id,name,trigger_event,message_template,is_enabled,environment,created_at,updated_at FROM whatsapp_automation_rules WHERE owner_user_id=$1 ORDER BY updated_at DESC LIMIT 100',
      [req.user.id]
    );
    return res.json({ rules: result.rows.map(row => ({
      id: String(row.id), name: row.name, triggerEvent: row.trigger_event,
      messageTemplate: row.message_template, isEnabled: row.is_enabled,
      environment: row.environment, createdAt: row.created_at, updatedAt: row.updated_at,
    })) });
  } catch (error) {
    console.error('WhatsApp automation list failed:', error.message);
    return res.status(503).json({ error: 'Automations are temporarily unavailable' });
  }
}

async function saveRule(req, res) {
  const { error, value } = validateRule(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await pool.query(
      "INSERT INTO whatsapp_automation_rules (owner_user_id,name,trigger_event,message_template,is_enabled,environment) VALUES ($1,$2,$3,$4,$5,'test') RETURNING id,name,trigger_event,message_template,is_enabled,environment,created_at,updated_at",
      [req.user.id, value.name, value.triggerEvent, value.messageTemplate, value.isEnabled]
    );
    const row = result.rows[0];
    return res.status(201).json({ rule: { id: String(row.id), name: row.name, triggerEvent: row.trigger_event, messageTemplate: row.message_template, isEnabled: row.is_enabled, environment: row.environment, createdAt: row.created_at, updatedAt: row.updated_at } });
  } catch (error) {
    console.error('WhatsApp automation save failed:', error.message);
    return res.status(503).json({ error: 'Unable to save this automation right now' });
  }
}

async function updateRule(req, res) {
  const ruleId = String(req.params.ruleId || '');
  if (!/^\d+$/.test(ruleId)) return res.status(400).json({ error: 'Invalid automation' });
  const { error, value } = validateRule(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await pool.query(
      'UPDATE whatsapp_automation_rules SET name=$3,trigger_event=$4,message_template=$5,is_enabled=$6,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND owner_user_id=$2 RETURNING id,name,trigger_event,message_template,is_enabled,environment,created_at,updated_at',
      [ruleId, req.user.id, value.name, value.triggerEvent, value.messageTemplate, value.isEnabled]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Automation not found' });
    const row = result.rows[0];
    return res.json({ rule: { id: String(row.id), name: row.name, triggerEvent: row.trigger_event, messageTemplate: row.message_template, isEnabled: row.is_enabled, environment: row.environment, createdAt: row.created_at, updatedAt: row.updated_at } });
  } catch (error) {
    console.error('WhatsApp automation update failed:', error.message);
    return res.status(503).json({ error: 'Unable to update this automation right now' });
  }
}

async function deleteRule(req, res) {
  const ruleId = String(req.params.ruleId || '');
  if (!/^\d+$/.test(ruleId)) return res.status(400).json({ error: 'Invalid automation' });
  try {
    const result = await pool.query('DELETE FROM whatsapp_automation_rules WHERE id=$1 AND owner_user_id=$2 RETURNING id', [ruleId, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Automation not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('WhatsApp automation delete failed:', error.message);
    return res.status(503).json({ error: 'Unable to delete this automation right now' });
  }
}

async function recordRun({ ownerUserId, rule, recipient, data, apiClientId = null }) {
  const renderedMessage = renderTemplate(rule.message_template, data);
  const result = await pool.query(
    "INSERT INTO whatsapp_automation_runs (owner_user_id,rule_id,api_client_id,event_name,recipient_masked,message_length,status) VALUES ($1,$2,$3,$4,$5,$6,'simulated') RETURNING id,created_at",
    [ownerUserId, rule.id, apiClientId, rule.trigger_event, maskRecipient(recipient), renderedMessage.length]
  );
  return {
    id: 'run_' + result.rows[0].id,
    automation: rule.name,
    event: rule.trigger_event,
    recipient: maskRecipient(recipient),
    status: 'simulated',
    delivered: false,
    preview: renderedMessage,
    createdAt: result.rows[0].created_at,
  };
}

async function testRule(req, res) {
  const ruleId = String(req.params.ruleId || '');
  const recipient = String(req.body?.to || '').trim();
  if (!/^\d+$/.test(ruleId)) return res.status(400).json({ error: 'Invalid automation' });
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) return res.status(400).json({ error: 'Use a test recipient in international E.164 format' });
  try {
    const result = await pool.query('SELECT id,name,trigger_event,message_template FROM whatsapp_automation_rules WHERE id=$1 AND owner_user_id=$2 LIMIT 1', [ruleId, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Automation not found' });
    const run = await recordRun({ ownerUserId: req.user.id, rule: result.rows[0], recipient, data: normalizeEventData(req.body?.data) });
    return res.status(202).json({ ...run, environment: 'test', note: 'Test automation simulated. No WhatsApp message was sent.' });
  } catch (error) {
    console.error('WhatsApp automation test failed:', error.message);
    return res.status(503).json({ error: 'Unable to run this test right now' });
  }
}

async function listRuns(req, res) {
  try {
    const result = await pool.query(
      'SELECT r.id,r.rule_id,w.name AS automation_name,r.event_name,r.recipient_masked,r.message_length,r.status,r.created_at FROM whatsapp_automation_runs r LEFT JOIN whatsapp_automation_rules w ON w.id=r.rule_id WHERE r.owner_user_id=$1 ORDER BY r.created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json({ runs: result.rows.map(row => ({
      id: 'run_' + row.id, ruleId: String(row.rule_id), automation: row.automation_name || 'Removed automation',
      event: row.event_name, recipient: row.recipient_masked, messageLength: Number(row.message_length),
      status: row.status, createdAt: row.created_at,
    })) });
  } catch (error) {
    console.error('WhatsApp automation runs failed:', error.message);
    return res.status(503).json({ error: 'Automation history is temporarily unavailable' });
  }
}

async function listKeys(req, res) {
  try {
    const result = await pool.query(
      'SELECT id,company_name,api_key_prefix,status,created_at,last_used_at FROM messaging_api_clients WHERE owner_user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json({ clients: result.rows.map(safeClient) });
  } catch (error) {
    console.error('WhatsApp API key list failed:', error.message);
    return res.status(503).json({ error: 'API keys are temporarily unavailable' });
  }
}

async function createKey(req, res) {
  const companyName = String(req.body?.companyName || '').trim();
  if (companyName.length < 2 || companyName.length > 160) return res.status(400).json({ error: 'Company or workspace name must be between 2 and 160 characters' });
  const apiKey = 'pma_test_' + crypto.randomBytes(32).toString('base64url');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  try {
    const result = await pool.query(
      "INSERT INTO messaging_api_clients (company_name,environment,api_key_hash,api_key_prefix,created_by,owner_user_id) VALUES ($1,'test',$2,$3,$4,$4) RETURNING id,company_name,api_key_prefix,status,created_at,last_used_at",
      [companyName, apiKeyHash, apiKey.slice(0, 18) + '…', req.user.id]
    );
    return res.status(201).json({ client: safeClient(result.rows[0]), apiKey, notice: 'Copy this key now. It is only shown once.' });
  } catch (error) {
    console.error('WhatsApp API key creation failed:', error.message);
    return res.status(503).json({ error: 'Unable to create a test API key right now' });
  }
}

async function revokeKey(req, res) {
  const clientId = String(req.params.clientId || '');
  if (!/^\d+$/.test(clientId)) return res.status(400).json({ error: 'Invalid API key' });
  try {
    const result = await pool.query(
      "UPDATE messaging_api_clients SET status='revoked',revoked_at=COALESCE(revoked_at,CURRENT_TIMESTAMP) WHERE id=$1 AND owner_user_id=$2 AND status='active' RETURNING id",
      [clientId, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Active API key not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('WhatsApp API key revoke failed:', error.message);
    return res.status(503).json({ error: 'Unable to revoke this key right now' });
  }
}

async function triggerApiEvent(req, res) {
  const client = req.messagingClient;
  if (!client?.owner_user_id) return res.status(403).json({ error: 'This test key is not linked to a company workspace', code: 'WORKSPACE_NOT_LINKED' });
  const eventName = String(req.body?.event || '').trim().toLowerCase();
  const recipient = String(req.body?.to || '').trim();
  if (!/^[a-z][a-z0-9_.-]{1,79}$/.test(eventName)) return res.status(400).json({ error: 'Use a valid event name such as lead.created', code: 'INVALID_EVENT' });
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) return res.status(400).json({ error: 'Use an international phone number in E.164 format', code: 'INVALID_RECIPIENT' });
  try {
    const rules = await pool.query(
      "SELECT id,name,trigger_event,message_template FROM whatsapp_automation_rules WHERE owner_user_id=$1 AND trigger_event=$2 AND is_enabled=TRUE AND environment='test' ORDER BY created_at ASC LIMIT 10",
      [client.owner_user_id, eventName]
    );
    const data = normalizeEventData(req.body?.data);
    const runs = [];
    for (const rule of rules.rows) runs.push(await recordRun({ ownerUserId: client.owner_user_id, rule, recipient, data, apiClientId: client.id }));
    return res.status(runs.length ? 202 : 200).json({
      environment: 'test', event: eventName, accepted: true, matched: runs.length,
      delivered: false, simulated: true, runs,
      note: 'Automation event processed in the Propulse test sandbox. No WhatsApp message was sent.',
    });
  } catch (error) {
    console.error('WhatsApp automation event failed:', error.message);
    return res.status(503).json({ error: 'Unable to process this test event right now', code: 'AUTOMATION_UNAVAILABLE' });
  }
}

module.exports = {
  getWorkspace, listRules, saveRule, updateRule, deleteRule, testRule, listRuns,
  listKeys, createKey, revokeKey, triggerApiEvent,
};
