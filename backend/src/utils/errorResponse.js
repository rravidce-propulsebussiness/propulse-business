function sendError(res, status, error, fallback, options = {}) {
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
  // Database errors use numeric SQLSTATE codes. Only application-defined codes
  // can carry their original message to clients.
  const publicCode = typeof options.code === 'string' &&
    (/^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/.test(options.code) || options.code === 'CANCELLED')
    ? options.code : null;
  const isServerError = safeStatus >= 500 || !publicCode;
  const body = {
    error: isServerError ? fallback : (error?.message || fallback),
  };

  if (publicCode && !isServerError) {
    body.code = publicCode;
  }

  return res.status(safeStatus).json(body);
}

module.exports = { sendError };
