import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ProductRepository, slugExists} from '../repositories/product.repository.js';
import { SubtypeRepository } from '../repositories/subtype.repository.js';
import { generateUniqueSlug } from '@your-org/common';
import { ImageService } from '../services/image.service.js';
import { FeatureService } from '../services/feature.service.js';


export const ProductService = {
    async createProduct(payload) {
        try {
            payload.slug = await generateUniqueSlug(payload.name, slugExists);
        } catch (err) {
            console.error('Slug generation failed:', err);
            throw new Error('Failed to generate a unique slug');
        }

        return withTransaction(async (client) => {
            const product = await ProductRepository.createProduct(client, payload);
            await SubtypeRepository.createSubtype(client, product.id, payload);

            if (Array.isArray(payload.images) && payload.images.length > 0) {
                await ImageService.add(client, product.id, payload.images);
            }

            return product;
        });
    },

  async getProducts(filters) {
    const list = await ProductRepository.getAllProducts(filters);
    return Promise.all(list.map(async (p) => {
      const [images, features, details] = await Promise.all([
        ImageService.list(p.id),
        FeatureService.list(p.id),
        SubtypeRepository.getSubtype(p.id, p.category)
      ]);
      return { ...p, images, features, details, reviews: [] };
    }));
  },

  async getProduct(id) {
    const product = await ProductRepository.getProductById(id);
    if (!product) throw new AppError('Product not found', 404);

    const [images, features, details] = await Promise.all([
      ImageService.list(product.id),
      FeatureService.list(product.id),
      SubtypeRepository.getSubtype(product.id, product.category)
    ]);
    return { ...product, images, features, details, reviews: [] };
  },

    async updateProduct(id, payload) {
        return withTransaction(async (client) => {
            const existing = await ProductRepository.getProductById(id);
            if (!existing) throw new AppError('Product not found', 404);

            if (payload.name && payload.name !== existing.name) {
                try {
                    payload.slug = await generateUniqueSlug(payload.name, slugExists);
                } catch (err) {
                console.error('Slug generation failed on update:', err);
                throw new AppError('Failed to generate a unique slug', 500);
            }
            }

            const updated = await ProductRepository.updateProduct(client, id, payload);

            if (payload.details) {
            await SubtypeRepository.updateSubtype(client, id, existing.category, payload.details);
            }

            let imageUpdateResult = { images: [], info: null };
            if (Array.isArray(payload.images)) {
                const currentImages = await ImageService.list(id);
                imageUpdateResult = await ImageService.update(client, id, currentImages, payload.images);
            }

            const [features, details] = await Promise.all([
                FeatureService.list(id),
                SubtypeRepository.getSubtype(id, updated.category)
            ]);

            return {
                ...updated,
                images: imageUpdateResult.images,
                features,
                details,
                reviews: [],
                info: {
                    mainImageAutoSet: imageUpdateResult.mainImageAutoSet
                }
            };
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
