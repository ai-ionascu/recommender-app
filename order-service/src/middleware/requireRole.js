export const requireRole = (allowed = []) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access forbidden: insufficient permissions.' });
  }
  next();
};
