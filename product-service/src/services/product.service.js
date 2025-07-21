import { findAll, findById } from '../repositories/product.repository.js';
import { validateProductData, normalize } from '@your-org/common';
import { AppError } from '../errors/AppError.js';

export async function listProducts(filter) {
  const rows = await findAll(filter);
  // (later on: attach images, details)
  return rows;
}

export async function getProduct(id) {
  const row = await findById(id);
  if (!row) throw new AppError('Product not found', 404);
  // (attach details, images)
  return row;
}

export async function createProduct(data) {
  const normalized = normalize(data);
  const errors = validateProductData(normalized);
  if (Object.keys(errors).length) {
    throw new AppError('Validation failed', 400, { fields: errors });
  }
  // (insert – later on: handle images, etc.)
}
