function sendError(res, status, error, fallback, options = {}) {
  const safeStatus = Number.isInteger(status) ? status : 500;
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
