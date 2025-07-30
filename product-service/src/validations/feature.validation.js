import AppError from '../errors/AppError.js';

// validate individual feature body for add/update operations
export function validateFeatureBody(req, _res, next) {
  const { label, value } = req.body;
  if (!label || typeof label !== 'string') {
    throw new AppError('`label` is required and must be a non-empty string', 400);
  }
  if (value == null || typeof value !== 'string') {
    throw new AppError('`value` is required and must be a string', 400);
  }
  next();
}
