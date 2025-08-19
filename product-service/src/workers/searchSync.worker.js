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
  console.warn('[SearchSync] DATABASE_URL lipsă — fallback doar pe payload-ul de eveniment.');
}

const pgClient = DATABASE_URL ? new pg.Client({ connectionString: DATABASE_URL }) : null;

// sql querying a single product with all details - aligned with the backfill

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

// transforming SQL row to ES document
function toEsDoc(row) {
  const features = row.features || [];
  const images = row.images || [];
  const reviews = row.reviews || { rating_avg: null, review_count: 0 };

  const parts = [
    row.name, row.country, row.region,
    row.description, row.highlight,
    row.wines?.grape_variety,
    ...(Array.isArray(features) ? features.map(f => `${f.label} ${f.value || ''}`) : [])
  ].filter(Boolean);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: Number(row.price),
    category: row.category,
    country: row.country,
    region: row.region,
    description: row.description,
    highlight: row.highlight,
    stock: row.stock,
    alcohol_content: row.alcohol_content != null ? Number(row.alcohol_content) : null,
    volume_ml: row.volume_ml,
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

    search_blob: parts.join(' | '),

    // dynamic signals — will be modified by order.paid/update later
    popularity: row.popularity ?? 0,
    sales_30d: row.sales_30d ?? 0
  };
}

// helper to fetch product from DB if DATABASE_URL is set
async function fetchProductFromDb(productId) {
  if (!pgClient) return null;
  const { rows } = await pgClient.query(ONE_PRODUCT_SQL, [productId]);
  return rows[0] || null;
}

// helper to upsert product document in ES from DB or payload
async function upsertProductDoc(payload) {

  // payload can be { product: {...} } or direct doc with id
  const maybe = payload.product || payload;

  let row = maybe;
  if (!maybe || typeof maybe !== 'object' || !('name' in maybe)) {

    // minimalist payload -> fetch from DB
    row = await fetchProductFromDb(maybe.id || maybe.productId || payload.id);
    if (!row) throw new Error(`Product not found for upsert (payload has only ids)`);
  }

  const doc = toEsDoc(row);
  await indexDoc(doc.id, doc, { refresh: 'false' });
}

// helperer to delete product document in ES
async function deleteProductDoc(payload) {
  const id = payload.id || payload.productId;
  if (!id) throw new Error('deleteProductDoc: missing id');
  await deleteDoc(id);
}

// helper to increment counters on order.paid

async function bumpCountersFromOrder(order) {
  if (!order?.items || !Array.isArray(order.items)) return;
  // painless update per item
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
      }
    }).catch(async (err) => {

      // if doc not yet existing (order event came before product create), try to build it from DB and retry
      if (err?.meta?.statusCode === 404) {
        const row = await fetchProductFromDb(pid);
        if (row) {
          const baseDoc = toEsDoc(row);
          baseDoc.popularity = (baseDoc.popularity ?? 0) + qty;
          baseDoc.sales_30d = (baseDoc.sales_30d ?? 0) + qty;
          await indexDoc(pid, baseDoc, { refresh: 'false' });
        }
      } else {
        throw err;
      }
    });
  }
}

// start worker
export async function startSearchSyncWorker() {
  await waitForElasticsearch();
  if (pgClient) await pgClient.connect().catch(() => null);

  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  await ch.assertExchange(RABBITMQ_EXCHANGE, 'topic', { durable: true });

  // dedicated and persistent queue for search worker
  const queueName = 'search-sync-q';
  await ch.assertQueue(queueName, { durable: true });
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'product.created');
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'product.updated');
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'product.deleted');
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, 'order.paid');

  // processing 10 messages in parallel
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
 
      // if unrecoverable error on payload, avoid infinite retry
      ch.nack(msg, false, false); // dead-letter (if DLX) or drop
    }
  });

  console.log('[SearchSync] Worker started. Listening on product.* and order.paid');
}
