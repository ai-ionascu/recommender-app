export function errorHandler(err, req, res, _next) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message, ...err.meta });
  }
  // Postgres duplicate / constraint friendly message
  if (err.code === '23505') {
    return res.status(400).json({ error: 'Duplicate value', detail: err.detail });
  }
  console.error('[UNHANDLED]', err);
  res.status(500).json({ error: 'Internal Server Error' });
}
