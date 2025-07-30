import slugify from 'slugify';
import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { SubtypeRepository } from '../repositories/subtype.repository.js';
import { ImageRepository } from '../repositories/image.repository.js';
import { FeatureRepository } from '../repositories/feature.repository.js';

export const ProductService = {
  async createProduct(payload) {
    payload.slug = slugify(payload.name, { lower: true, strict: true });

    return withTransaction(async (client) => {
      const product = await ProductRepository.createProduct(client, payload);
9
      // subtype (obligatoriu logic, dar validat anterior)
      await SubtypeRepository.createSubtype(client, product.id, payload);

      return product;
    });
  },

  async getProducts(filters) {
    const list = await ProductRepository.getAllProducts(filters);
    return Promise.all(list.map(async (p) => {
      const [images, features, details] = await Promise.all([
        ImageRepository.getImages(p.id),
        FeatureRepository.getFeatures(p.id),
        SubtypeRepository.getSubtype(p.id, p.category)
      ]);
      return { ...p, images, features, details, reviews: [] };
    }));
  },

  async getProduct(id) {
    const product = await ProductRepository.getProductById(id);
    if (!product) throw new AppError('Product not found', 404);

    const [images, features, details] = await Promise.all([
      ImageRepository.getImages(product.id),
      FeatureRepository.getFeatures(product.id),
      SubtypeRepository.getSubtype(product.id, product.category)
    ]);
    return { ...product, images, features, details, reviews: [] };
  },

  async updateProduct(id, payload) {
    return withTransaction(async (client) => {
      const existing = await ProductRepository.getProductById(id);
      if (!existing) throw new AppError('Product not found', 404);

      if (payload.name && payload.name !== existing.name) {
        payload.slug = slugify(payload.name, { lower: true, strict: true });
      }

      const updated = await ProductRepository.updateProduct(client, id, payload);

      if (payload.details) {
        await SubtypeRepository.updateSubtype(client, id, existing.category, payload.details);
      }

      return updated;
    });
  },

  async deleteProduct(id) {
    return withTransaction(async (client) => {
      const existing = await ProductRepository.getProductById(id);
      if (!existing) throw new AppError('Product not found', 404);
      await ProductRepository.deleteProduct(client, id);
    });
  }
};
