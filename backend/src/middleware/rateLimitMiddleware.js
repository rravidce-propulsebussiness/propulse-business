const buckets = new Map();
const CLEANUP_INTERVAL_MS = 60 * 1000;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= bucket.windowMs) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  const safeWindowMs = Math.max(1000, Number(windowMs) || 15 * 60 * 1000);
  const safeMax = Math.max(1, Math.floor(Number(max) || 100));
  return (req, res, next) => {
    const identity = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    const key = `${identity}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.startedAt >= safeWindowMs) {
      bucket = { startedAt: now, count: 0, windowMs: safeWindowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(safeMax));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, safeMax - bucket.count)));
    if (bucket.count > safeMax) {
      const retryAfter = Math.ceil((bucket.startedAt + safeWindowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    return next();
  };
}

module.exports = rateLimit;
