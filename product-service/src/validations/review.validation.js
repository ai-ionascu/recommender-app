import AppError from '../errors/AppError.js';

export function validateReview(req, _res, next) {
  const { user_id, rating, comment, approved } = req.body;
  if (user_id == null || isNaN(Number(user_id))) {
    throw new AppError('`user_id` is required and must be a number', 400);
  }
  const r = Number(rating);
  if (rating == null || isNaN(r) || r < 1 || r > 5) {
    throw new AppError('`rating` is required and must be between 1 and 5', 400);
  }
  if (comment != null && typeof comment !== 'string') {
    throw new AppError('`comment` must be a string', 400);
  }
  if (approved != null && typeof approved !== 'boolean') {
    throw new AppError('`approved` must be a boolean', 400);
  }
  next();
}
