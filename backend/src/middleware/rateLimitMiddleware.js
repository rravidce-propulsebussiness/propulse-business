const pool = require('../config/database');

const buckets = new Map();
const CLEANUP_INTERVAL_MS = 60 * 1000;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= bucket.windowMs) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

function getIdentity(req) {
  return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
}

function getRouteKey(req) {
  const routeKey = req.route?.path || req.path;
  return `${getIdentity(req)}:${req.baseUrl}${routeKey}`;
}

function getLocalBucket(key, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    bucket = { startedAt: now, count: 0, windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return { count: bucket.count, retryAfter: Math.max(1, Math.ceil((bucket.startedAt + windowMs - now) / 1000)) };
}

async function consumeSharedBucket(key, windowMs) {
  const result = await pool.query(
    `INSERT INTO rate_limit_buckets (bucket_key, window_started_at, request_count)
     VALUES ($1, CURRENT_TIMESTAMP, 1)
     ON CONFLICT (bucket_key) DO UPDATE
       SET request_count = CASE
             WHEN rate_limit_buckets.window_started_at + ($2 * INTERVAL '1 millisecond') <= CURRENT_TIMESTAMP
               THEN 1
             ELSE rate_limit_buckets.request_count + 1
           END,
           window_started_at = CASE
             WHEN rate_limit_buckets.window_started_at + ($2 * INTERVAL '1 millisecond') <= CURRENT_TIMESTAMP
               THEN CURRENT_TIMESTAMP
             ELSE rate_limit_buckets.window_started_at
           END,
           updated_at = CURRENT_TIMESTAMP
     RETURNING request_count,
               GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((window_started_at + ($2 * INTERVAL '1 millisecond')) - CURRENT_TIMESTAMP))))::int AS retry_after`,
    [key, windowMs]
  );
  return result.rows[0];
}

function rateLimit({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  const safeWindowMs = Math.max(1000, Number(windowMs) || 15 * 60 * 1000);
  const safeMax = Math.max(1, Math.floor(Number(max) || 100));

  return async (req, res, next) => {
    const key = getRouteKey(req);
    let bucket;

    if (process.env.NODE_ENV === 'production') {
      try {
        bucket = await consumeSharedBucket(key, safeWindowMs);
      } catch (error) {
        console.error('Shared rate limiter failed:', error.message);
        return res.status(503).json({ error: 'Request protection is temporarily unavailable. Please try again.' });
      }
    } else {
      bucket = getLocalBucket(key, safeWindowMs);
    }

    const count = Number(bucket.request_count ?? bucket.count);
    const retryAfter = Number(bucket.retry_after ?? bucket.retryAfter);
    res.setHeader('RateLimit-Limit', String(safeMax));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, safeMax - count)));

    if (count > safeMax) {
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    return next();
  };
}

module.exports = rateLimit;
