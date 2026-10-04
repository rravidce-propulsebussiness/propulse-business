const crypto = require('crypto');
const pool = require('../config/database');

const DEFAULT_PROCESSING_TTL_MINUTES = 5;
const DEFAULT_REPLAY_TTL_HOURS = 24;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function requestHash(req, scope) {
  const payload = {
    scope,
    method: String(req.method || '').toUpperCase(),
    params: req.params || {},
    body: req.body ?? null,
  };
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

async function cleanupExpired(limit = 25) {
  await pool.query(
    `DELETE FROM api_idempotency_keys
     WHERE id IN (
       SELECT id FROM api_idempotency_keys
       WHERE expires_at <= CURRENT_TIMESTAMP
       ORDER BY expires_at ASC
       LIMIT $1
     )`,
    [limit]
  );
}

async function claimKey({ userId, scope, key, hash, processingTtlMinutes }) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const inserted = await pool.query(
      `INSERT INTO api_idempotency_keys(user_id,scope,idempotency_key,request_hash,status,expires_at)
       VALUES($1,$2,$3,$4,'processing',CURRENT_TIMESTAMP + ($5 * INTERVAL '1 minute'))
       ON CONFLICT(user_id,scope,idempotency_key) DO NOTHING
       RETURNING id`,
      [userId, scope, key, hash, processingTtlMinutes]
    );
    if (inserted.rowCount) return { state: 'owner', id: inserted.rows[0].id };

    const existing = (await pool.query(
      `SELECT id,request_hash,status,response_status,response_body,expires_at,(expires_at<=CURRENT_TIMESTAMP) AS expired
       FROM api_idempotency_keys
       WHERE user_id=$1 AND scope=$2 AND idempotency_key=$3`,
      [userId, scope, key]
    )).rows[0];

    if (!existing) continue;
    if (existing.request_hash !== hash) return { state: 'mismatch' };
    if (existing.status === 'completed' && !existing.expired) return { state: 'replay', row: existing };
    if (existing.expired) {
      await pool.query('DELETE FROM api_idempotency_keys WHERE id=$1 AND expires_at<=CURRENT_TIMESTAMP', [existing.id]);
      continue;
    }
    return { state: 'processing' };
  }
  return { state: 'processing' };
}

function idempotency(scope, options = {}) {
  const required = options.required !== false;
  const processingTtlMinutes = Math.max(1, Number(options.processingTtlMinutes) || DEFAULT_PROCESSING_TTL_MINUTES);
  const replayTtlHours = Math.max(1, Number(options.replayTtlHours) || DEFAULT_REPLAY_TTL_HOURS);

  return async function requireIdempotency(req, res, next) {
    try {
      const key = String(req.get('Idempotency-Key') || '').trim();
      if (!key) {
        if (!required) return next();
        return res.status(400).json({ error: 'Idempotency-Key header is required', code: 'IDEMPOTENCY_KEY_REQUIRED' });
      }
      if (!KEY_PATTERN.test(key)) return res.status(400).json({ error: 'Idempotency-Key must be 8-128 URL-safe characters', code: 'IDEMPOTENCY_KEY_INVALID' });
      if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });

      await cleanupExpired().catch(error => console.error('Idempotency cleanup failed:', error.message));
      const hash = requestHash(req, scope);
      const claim = await claimKey({ userId: req.user.id, scope, key, hash, processingTtlMinutes });

      if (claim.state === 'mismatch') return res.status(409).json({ error: 'Idempotency-Key was already used for a different request', code: 'IDEMPOTENCY_KEY_REUSED' });
      if (claim.state === 'processing') {
        res.setHeader('Retry-After', '2');
        return res.status(409).json({ error: 'A request with this Idempotency-Key is still processing', code: 'IDEMPOTENCY_IN_PROGRESS' });
      }
      if (claim.state === 'replay') {
        res.setHeader('Idempotency-Replayed', 'true');
        return res.status(Number(claim.row.response_status) || 200).json(claim.row.response_body ?? {});
      }

      const originalJson = res.json.bind(res);
      let finalized = false;
      res.setHeader('Idempotency-Key', key);
      res.json = function idempotentJson(body) {
        if (finalized) return res;
        finalized = true;
        const status = Number(res.statusCode) || 200;
        const finalize = status >= 200 && status < 300
          ? pool.query(
              `UPDATE api_idempotency_keys
               SET status='completed',response_status=$2,response_body=$3::jsonb,updated_at=CURRENT_TIMESTAMP,
                   expires_at=CURRENT_TIMESTAMP + ($4 * INTERVAL '1 hour')
               WHERE id=$1`,
              [claim.id, status, JSON.stringify(body ?? null), replayTtlHours]
            )
          : pool.query('DELETE FROM api_idempotency_keys WHERE id=$1', [claim.id]);

        finalize.catch(error => console.error('Idempotency finalize failed:', error.message)).finally(() => originalJson(body));
        return res;
      };

      return next();
    } catch (error) {
      console.error('Idempotency middleware failed:', error.message);
      return res.status(503).json({ error: 'Unable to safely process this request', code: 'IDEMPOTENCY_UNAVAILABLE' });
    }
  };
}

module.exports = idempotency;
module.exports.stableStringify = stableStringify;
module.exports.requestHash = requestHash;
