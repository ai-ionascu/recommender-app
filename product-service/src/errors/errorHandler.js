export function errorHandler(err, req, res, _next) {
  console.error(err);
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  res.status(500).json({ error: 'Server error' });
}
