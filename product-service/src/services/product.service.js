import AppError from '../errors/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { ProductRepository, slugExists} from '../repositories/product.repository.js';
import { SubtypeRepository } from '../repositories/subtype.repository.js';
import { generateUniqueSlug } from '../../../common/utils/generateUniqueSlug.js';
import { ImageService } from '../services/image.service.js';
import { FeatureService } from '../services/feature.service.js';

import { es, INDEX_ALIAS } from '../search/esClient.js';

async function indexProductById(id, fallbackDoc = null) {
  // try to index the enriched doc (images/features/details)
  const doc = await ProductService.getProduct(id).catch(() => fallbackDoc);
  if (!doc) return;
  await es.index({
    index: INDEX_ALIAS,
    id: String(id), // important: _id = product.id
    document: doc,
    refresh: 'wait_for'
  });
}

export const ProductService = {
    async createProduct(payload) {

        // unique slug generation
        try {
            payload.slug = await generateUniqueSlug(payload.name, slugExists);
        } catch (err) {
            console.error('Slug generation failed:', err);
            throw new Error('Failed to generate a unique slug');
        }

        // DB transaction
      const created = await withTransaction(async (client) => {
        const product = await ProductRepository.createProduct(client, payload);
        await SubtypeRepository.createSubtype(client, product.id, payload);

        let images = payload.images;
        if (images && !Array.isArray(images)) images = [images];
        if (Array.isArray(images) && images.length > 0) {
          await ImageService.add(product.id, images, client);
        }

        return product; // DB row post-commit to be indexed
      });

      // post-commit: index în ES
      try {
        await indexProductById(created.id, created);
      } catch (e) {
        console.error('ES index failed on create', created.id, e);
      }

      return created;
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
    const product = await ProductRepository.getProductByIdPool(id);
    if (!product) throw new AppError('Product not found', 404);

    const [images, features, details] = await Promise.all([
      ImageService.list(product.id),
      FeatureService.list(product.id),
      SubtypeRepository.getSubtype(product.id, product.category)
    ]);
    return { ...product, images, features, details, reviews: [] };
  },

  async updateProduct(id, payload) {
    // DB transaction
    const updated = await withTransaction(async (client) => {
      const existing = await ProductRepository.getProductById(client, id);
      if (!existing) throw new AppError('Product not found', 404);

      if (payload.name && payload.name !== existing.name) {
        try {
          payload.slug = await generateUniqueSlug(payload.name, slugExists);
        } catch (err) {
          console.error('Slug generation failed on update:', err);
          throw new AppError('Failed to generate a unique slug', 500);
        }
      }

      const updatedRow = await ProductRepository.updateProduct(client, id, payload);

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
        SubtypeRepository.getSubtype(id, updatedRow.category)
      ]);

      // return updatedRow; transaction will commit before indexing
      return {
        ...updatedRow,
        images: imageUpdateResult.images,
        features,
        details,
        reviews: [],
        info: { mainImageAutoSet: imageUpdateResult.mainImageAutoSet }
      };
    });

    // post-commit: re-index in ES
    try {
      await es.index({
        index: INDEX_ALIAS,
        id: String(updated.id),
        document: updated,
        refresh: 'wait_for'
      });
    } catch (e) {
      console.error('ES index failed on update', id, e);
    }

    return updated;
  },

  async deleteProduct(id) {
    // DB transaction
    await withTransaction(async (client) => {
      const existing = await ProductRepository.getProductById(client, id);
      if (!existing) throw new AppError('Product not found', 404);
      const ok = await ProductRepository.deleteProduct(client, id);
      if (!ok) throw new AppError('Product not found', 404);
    });

    // post-commit: delete from ES (avoid orphans)
    try {

      await es.delete({ index: INDEX_ALIAS, id: String(id), refresh: true });
    } catch (e) {
      if (e?.meta?.statusCode === 404) return; // already deleted
      console.warn('ES delete by _id failed, fallback to delete_by_query', id);
      try {
        await es.deleteByQuery({
          index: INDEX_ALIAS,
          refresh: true,
          query: { term: { id } }
        });
      } catch (e2) {
        console.error('ES deleteByQuery failed for product', id, e2);
      }
    }
  }
};
