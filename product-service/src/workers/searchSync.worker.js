// syncing products and order events to Elasticsearch: product.created|updated|deleted, order.paid
// running in the same process as product-service (starts from app.js)

import 'dotenv/config.js';
import amqp from 'amqplib';
import pg from 'pg';
import { es, INDEX_ALIAS, waitForElasticsearch, indexDoc, deleteDoc } from '../search/esClient.js';

const {
  RABBITMQ_URL = 'amqp://rabbitmq',
  RABBITMQ_EXCHANGE = 'events',
  DATABASE_URL
} = process.env;

if (!DATABASE_URL) {
  console.warn('[SearchSync] DATABASE_URL missing — will fallback to ES merge on upsert.');
}

const pgClient = DATABASE_URL ? new pg.Client({ connectionString: DATABASE_URL }) : null;

// Single-product SELECT (aligned with backfill)
const ONE_PRODUCT_SQL = `
SELECT
  p.id, p.name, p.slug, p.price, p.category, p.country, p.region,
  p.description, p.highlight, p.stock, p.alcohol_content, p.volume_ml,
  p.featured, p.created_at, p.updated_at,

  COALESCE(
    (SELECT json_agg(json_build_object('url', i.url, 'alt_text', i.alt_text, 'is_main', i.is_main)
                     ORDER BY i.is_main DESC, i.id ASC)
     FROM product_images i WHERE i.product_id = p.id),
    '[]'
  ) AS images,

  COALESCE(
    (SELECT json_agg(json_build_object('label', f.label, 'value', f.value)
                     ORDER BY f.id ASC)
     FROM product_features f WHERE f.product_id = p.id),
    '[]'
  ) AS features,

  COALESCE((
    SELECT json_build_object(
      'rating_avg', ROUND(AVG(r.rating)::numeric, 2),
      'review_count', COUNT(*)
    )
    FROM product_reviews r
    WHERE r.product_id = p.id AND r.approved = true
  ), json_build_object('rating_avg', NULL, 'review_count', 0)) AS reviews,

  CASE WHEN p.category = 'wine' THEN
    json_build_object(
      'wine_type', w.wine_type,
      'grape_variety', w.grape_variety,
      'vintage', w.vintage,
      'appellation', w.appellation,
      'serving_temperature', w.serving_temperature
    )
  END AS wines,

  CASE WHEN p.category = 'spirits' THEN
    json_build_object(
      'spirit_type', s.spirit_type,
      'age_statement', s.age_statement,
      'distillation_year', s.distillation_year,
      'cask_type', s.cask_type
    )
  END AS spirits,

  CASE WHEN p.category = 'beer' THEN
    json_build_object(
      'style', b.style,
      'ibu', b.ibu,
      'fermentation_type', b.fermentation_type,
      'brewery', b.brewery
    )
  END AS beers,

  CASE WHEN p.category = 'accessories' THEN
    json_build_object(
      'accessory_type', a.accessory_type,
      'material', a.material,
      'compatible_with_product_type', a.compatible_with_product_type
    )
  END AS accessories
FROM products p
LEFT JOIN wines w        ON w.product_id = p.id
LEFT JOIN spirits s      ON s.product_id = p.id
LEFT JOIN beers b        ON b.product_id = p.id
LEFT JOIN accessories a  ON a.product_id = p.id
WHERE p.id = $1
`;

/** Build ES doc (same semantics as backfill) */
function toEsDoc(row) {
  const features = Array.isArray(row.features) ? row.features : [];
  const images   = Array.isArray(row.images)   ? row.images   : [];
  const reviews  = row.reviews || { rating_avg: null, review_count: 0 };

  const doc = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: Number(row.price),
    category: row.category,
    country: row.country ?? null,
    region: row.region ?? null,
    description: row.description ?? null,
    highlight: row.highlight ?? null,
    stock: row.stock ?? 0,
    alcohol_content: row.alcohol_content != null ? Number(row.alcohol_content) : null,
    volume_ml: row.volume_ml ?? null,
    featured: !!row.featured,
    created_at: row.created_at,
    updated_at: row.updated_at,

    images,
    features,
    reviews,

    wines: row.wines || null,
    spirits: row.spirits || null,
    beers: row.beers || null,
    accessories: row.accessories || null,

    popularity: row.popularity ?? 0,
    sales_30d: row.sales_30d ?? 0
  };

  const parts = [row.name, row.country, row.region, row.description, row.highlight];
  if (doc.wines) {
    parts.push(doc.wines.grape_variety, doc.wines.wine_type, doc.wines.appellation);
  }
  if (doc.spirits) {
    parts.push(doc.spirits.spirit_type, doc.spirits.cask_type);
  }
  if (doc.beers) {
    parts.push(doc.beers.style, doc.beers.brewery, doc.beers.fermentation_type);
  }
  if (doc.accessories) {
    parts.push(doc.accessories.accessory_type, doc.accessories.compatible_with_product_type, doc.accessories.material);
  }
  for (const f of features) parts.push(`${f.label} ${f.value ?? ''}`);
  doc.search_blob = parts.filter(Boolean).join(' | ');

  return doc;
}

/** Fetch product row from DB (full join) */
async function fetchProductFromDb(productId) {
  if (!pgClient) return null;
  const { rows } = await pgClient.query(ONE_PRODUCT_SQL, [productId]);
  return rows[0] || null;
}

/** Safe merge with existing ES doc to avoid dropping category subdocs when DB is unavailable. */
async function mergeWithExistingEsDoc(id, partial) {
  try {
    const resp = await es.get({ index: INDEX_ALIAS, id });
    const existing = resp?._source || {};
    return { ...existing, ...partial };
  } catch {
    return partial;
  }
}

/** Upsert that NEVER drops category subdocs:
 * - Prefer DB row with full joins
 * - Fallback: merge event payload over existing ES doc (preserve subdocs)
 */
async function upsertProductDoc(payload) {
  const p = payload.product || payload;
  const id = p?.id || p?.productId;
  if (!id) throw new Error('upsertProductDoc: missing id in payload');

  let row = await fetchProductFromDb(id);

  if (!row) {
    // DB not available or row missing: merge payload over existing ES doc
    // IMPORTANT: do NOT remove subdocs; keep existing 'wines/spirits/beers/accessories'
    const safe = await mergeWithExistingEsDoc(id, p);
    row = safe;
    // If category subdoc can be built from flat fields (rare), do it defensively:
    if (safe.category === 'wine' && !safe.wines) {
      safe.wines = {
        wine_type: safe.wine_type ?? null,
        grape_variety: safe.grape_variety ?? null,
        vintage: safe.vintage ?? null,
        appellation: safe.appellation ?? null
      };
    } else if (safe.category === 'spirits' && !safe.spirits) {
      safe.spirits = {
        spirit_type: safe.spirit_type ?? null,
        age_statement: safe.age_statement ?? null,
        distillation_year: safe.distillation_year ?? null,
        cask_type: safe.cask_type ?? null
      };
    } else if (safe.category === 'beer' && !safe.beers) {
      safe.beers = {
        style: safe.style ?? null,
        ibu: safe.ibu ?? null,
        fermentation_type: safe.fermentation_type ?? null,
        brewery: safe.brewery ?? null
      };
    } else if (safe.category === 'accessories' && !safe.accessories) {
      safe.accessories = {
        accessory_type: safe.accessory_type ?? null,
        material: safe.material ?? null,
        compatible_with_product_type: safe.compatible_with_product_type ?? null
      };
    }
  }

  const doc = toEsDoc(row);
  await indexDoc(doc.id, doc, { refresh: 'false' });
}

/** Delete in ES */
async function deleteProductDoc(payload) {
  const id = payload.id || payload.productId;
  if (!id) throw new Error('deleteProductDoc: missing id');
  await deleteDoc(id);
}

/** Increment counters on order.paid */
async function bumpCountersFromOrder(order) {
  if (!order?.items || !Array.isArray(order.items)) return;
  for (const item of order.items) {
    const pid = item.productId || item.product_id || item.id;
    const qty = Number(item.qty || item.quantity || 1);
    if (!pid) continue;

    await es.update({
      index: INDEX_ALIAS,
      id: pid,
      script: {
        source: `
          if (ctx._source.popularity == null) ctx._source.popularity = 0;
          if (ctx._source.sales_30d == null) ctx._source.sales_30d = 0;
          ctx._source.popularity += params.p;
          ctx._source.sales_30d += params.s;
        `,
        params: { p: qty, s: qty }
      },
      // doc_as_upsert could be used, but we handle 404 below to preserve subdocs
    }).catch(async (err) => {
      if (err?.meta?.statusCode === 404) {
        const row = await fetchProductFromDb(pid);
        if (row) {
          const baseDoc = toEsDoc(row);
          baseDoc.popularity = (baseDoc.popularity ?? 0) + qty;
          baseDoc.sales_30d  = (baseDoc.sales_30d  ?? 0) + qty;
          await indexDoc(pid, baseDoc, { refresh: 'false' });
        }
      } else {
        throw err;
      }
    });
  }
}

/** Start worker */
export async function startSearchSyncWorker() {
  await waitForElasticsearch();
  if (pgClient) await pgClient.connect().catch(() => null);

  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  await ch.assertExchange(RABBITMQ_EXCHANGE, 'topic', { durable: true });

  const queueName = 'search-sync-q';
  await ch.assertQueue(queueName, { durable: true });
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'product.created');
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'product.updated');
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'product.deleted');
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'order.paid');

  ch.prefetch(10);

  ch.consume(queueName, async (msg) => {
    if (!msg) return;
    const rk = msg.fields.routingKey;
    let payload;

    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[SearchSync] Invalid JSON payload, rk=', rk);
      ch.ack(msg);
      return;
    }

    try {
      if (rk === 'product.created' || rk === 'product.updated') {
        await upsertProductDoc(payload.product ? payload.product : payload);
      } else if (rk === 'product.deleted') {
        await deleteProductDoc(payload);
      } else if (rk === 'order.paid') {
        await bumpCountersFromOrder(payload);
      }
      ch.ack(msg);
    } catch (err) {
      console.error('[SearchSync] Error handling', rk, err?.message || err);
      // Avoid infinite retry on bad payloads
      ch.nack(msg, false, false);
    }
  });

  console.log('[SearchSync] Worker started. Listening on product.* and order.paid');
}
