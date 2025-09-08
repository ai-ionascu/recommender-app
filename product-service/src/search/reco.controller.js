import { es, INDEX_ALIAS } from './esClient.js';
import { ProductService } from '../services/product.service.js';
import AppError from '../errors/AppError.js';
import { getSimilarProducts } from '../reco/getSimilarProducts.js';

const ORDER_SVC_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:4001';

export const RecoController = {
  // GET /reco/similar/:productId?limit=8
  similar: async (req, res, next) => {
    try {
      const { productId } = req.params;
      const limit = Number(req.query.limit || 8);
      if (!productId) throw new AppError('productId is required', 400);

      // try content-based (MLT)
      const items = await getSimilarProducts({
        productId,
        limit,
        esClient: es,
        esAlias: INDEX_ALIAS,
        fetchProductById: async (id) => ProductService.getProduct(Number(id))
      });

      if (items.length > 0) {
        return res.json({ items, total: items.length, fallback: false });
      }

      // Fallback: if MLT returns empty, take products from the same category
      const anchor = await ProductService.getProduct(Number(productId));
      if (!anchor?.category) {
        return res.json({ items: [], total: 0, fallback: true });
      }

      const resp = await es.search({
        index: INDEX_ALIAS,
        body: {
          size: limit,
          query: { term: { category: String(anchor.category).toLowerCase() } }
        }
      });

      const hits = resp?.hits?.hits ?? [];
      const mapped = hits
        .filter(h => String(h?._source?.id) !== String(anchor.id))
        .map(h => {
          const doc = h._source || {};
          const img = Array.isArray(doc.images)
            ? (doc.images.find(i => i?.is_main) || doc.images[0])
            : null;
          return {
            id: doc.id ?? h._id,
            name: doc.name ?? '',
            price: doc.price ?? null,
            image: img?.url || doc.main_image_url || doc.image_url || null,
            score: h._score ?? null,
            category: doc.category ?? anchor.category
          };
        })
        .slice(0, limit);

      return res.json({ items: mapped, total: mapped.length, fallback: true });
    } catch (err) {
      next(err);
    }
  },

  // GET /reco/fbt/:productId?limit=8
  fbt: async (req, res, next) => {
    try {
      const { productId } = req.params;
      const limit = Number(req.query.limit || 8);

      const url = `${ORDER_SVC_URL}/internal/copurchase/${encodeURIComponent(productId)}?limit=${encodeURIComponent(limit)}`;
      const r = await fetch(url);
      if (!r.ok) {
        const txt = await r.text();
        return res.status(502).json({ error: `order-service error: ${txt}` });
      }
      const data = await r.json(); // { items: [{productId, score, coCount}], total }

      // Enrich co-purchase ids with product details (name, price, image)
      const items = [];
      for (const co of data.items || []) {
        try {
          const p = await ProductService.getProduct(Number(co.productId));
          if (p?.id) {
            const mainImg = Array.isArray(p.images)
              ? (p.images.find(i => i.is_main) || p.images[0])
              : null;
            items.push({
              id: p.id,
              name: p.name,
              price: p.price ?? null,
              image: mainImg?.url || null,
              score: co.score,
              coCount: co.coCount
            });
          }
        } catch (_) { /* ignore single item failures */ }
      }

      res.json({ items, total: items.length });
    } catch (err) {
      next(err);
    }
  }
};
