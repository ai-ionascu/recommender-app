/**
 * Content-based recommendations via Elasticsearch MLT.
 * - Requires: esClient (from product-service/src/search/esClient.js)
 * - Requires: fetchProductById(id) -> product (id, name, description, category, details)
 * - Uses process.env.ES_ALIAS || 'products'
 *
 * Returns: [{ id, name, price, image, score, category }]
 */
export async function getSimilarProducts({ productId, limit = 8, esClient, fetchProductById, esAlias }) {
  if (!productId) throw new Error('productId is required');

  const product = await fetchProductById(productId);
  if (!product) return [];

  const alias = esAlias || process.env.ES_ALIAS || 'products';

  // Build a compact bag-of-words from product fields
  const tokens = [];
  const add = v => { if (v && typeof v === 'string') tokens.push(v); };

  add(product.name);
  add(product.description);

  // category-specific fields if present
  const d = product.details || {};
  // wine
  add(d.wine_type);
  add(d.grape_variety);
  add(d.appellation);
  // spirits
  add(d.spirit_type);
  // beer
  add(d.style);
  add(d.fermentation_type);
  // common
  add(product.region);
  add(product.country);

  const likeText = tokens.filter(Boolean).join(' ');

  // Prefer category match to keep results homogeneous
  const mustFilters = [];
  if (product.category) {
    mustFilters.push({ term: { category: String(product.category).toLowerCase() } });
  }

  // Exclude the same product
  const mustNot = [{ term: { id: Number(product.id) || String(product.id) } }];

  const body = {
    size: Number(limit) > 0 ? Number(limit) : 8,
    query: {
      bool: {
        must: [
          ...(mustFilters.length ? mustFilters : []),
          {
            more_like_this: {
              fields: [
                'name',          // fără ^2
                'description',
                'grape_variety',
                'region',
                'country',
                'wine_type',
                'spirit_type',
                'style',
                'appellation',
                'accessory_type'
              ],
              like: likeText || String(product.name || product.id),
              min_term_freq: 1,
              min_doc_freq: 1
            }
          }
        ],
        must_not: mustNot
      }
    },
    _source: [
      'id', 'name', 'price', 'category',
      'images', 'image_main', 'image_url', 'main_image_url'
    ]
  };

  const resp = await esClient.search({ index: alias, body });
  const hits = (resp?.hits?.hits ?? []);

  const pickMainImage = (src) => {
    if (!src) return null;
    if (typeof src === 'string') return src;
    if (Array.isArray(src)) {
      const main = src.find(i => i?.is_main) || src[0];
      return main?.url || null;
    }
    if (src?.url) return src.url;
    return null;
  };

  return hits.map(h => {
    const doc = h._source || {};
    return {
      id: doc.id ?? h._id,
      name: doc.name ?? '',
      price: doc.price ?? null,
      category: doc.category ?? product.category ?? null,
      image: pickMainImage(doc.image_main) ||
             pickMainImage(doc.main_image_url) ||
             pickMainImage(doc.image_url) ||
             pickMainImage(doc.images),
      score: h._score ?? null
    };
  });
}
