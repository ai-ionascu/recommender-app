import AppError from '../errors/AppError.js';

// Validate payload for adding/updating images
export function validateImages(req, _res, next) {
  const images = req.body.images;
  if (!Array.isArray(images)) {
    throw new AppError('`images` must be an array', 400);
  }
  if (images.length > 3) {
    throw new AppError('You can associate at most 3 images per product', 400);
  }
  const mainCount = images.filter(i => i.is_main).length;
  if (images.length > 0 && mainCount !== 1) {
    throw new AppError('Exactly one image must be marked as main', 400);
  }
  for (const img of images) {
    if (!img.url || typeof img.url !== 'string') {
      throw new AppError('Each image must have a valid `url` string', 400);
    }
    if (img.alt_text != null && typeof img.alt_text !== 'string') {
      throw new AppError('`alt_text` must be a string', 400);
    }
    if (typeof img.is_main !== 'boolean') {
      throw new AppError('`is_main` must be a boolean', 400);
    }
  }
  next();
}

