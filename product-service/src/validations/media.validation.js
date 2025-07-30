import AppError from '../errors/AppError.js';

export function validateImageSearch(req, _res, next) {
  const { query, per_page, page } = req.query;
  if (!query || typeof query !== 'string') {
    throw new AppError('`query` parameter is required', 400);
  }
  if (per_page != null && (isNaN(Number(per_page)) || Number(per_page) < 1)) {
    throw new AppError('`per_page` must be a positive number', 400);
  }
  if (page != null && (isNaN(Number(page)) || Number(page) < 1)) {
    throw new AppError('`page` must be a positive number', 400);
  }
  next();
}
