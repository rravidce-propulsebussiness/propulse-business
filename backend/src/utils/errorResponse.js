// Raw PostgreSQL errors (SQLSTATE code + severity) must never reach users: they expose table and
// column names and are never the client's fault, whatever status the caller picked.
function isDatabaseError(error) {
  return Boolean(error && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) && ('severity' in error || 'routine' in error));
}

function sendError(res, status, error, fallback, options = {}) {
  const databaseError = isDatabaseError(error);
  if (databaseError) console.error(`${fallback}:`, error.message);
  const safeStatus = databaseError ? 500 : (Number.isInteger(status) ? status : 500);
  const isServerError = safeStatus >= 500;
  const body = {
    error: isServerError ? fallback : (error?.message || fallback),
  };

  if (options.code && !isServerError) {
    body.code = options.code;
  } else if (options.code && options.exposeCode === true) {
    body.code = options.code;
  }

  return res.status(safeStatus).json(body);
}

module.exports = { sendError };
