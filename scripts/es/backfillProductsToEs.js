// using .env: ES_URL, ES_ALIAS, DATABASE_URL

import 'dotenv/config.js';
import pg from 'pg';
import { Client } from '@elastic/elasticsearch';

const {
  ES_URL = 'http://localhost:9200',
  ES_ALIAS = 'products',
  DATABASE_URL
} = process.env;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in env');
  process.exit(1);
}

const es = new Client({ node: ES_URL });

const pgClient = new pg.Client({ connectionString: DATABASE_URL });

// SQL: quering products + images + features + reviews + category details
// using LEFT JOINs to ensure all products are included even if no images/features/reviews
const BASE_SQL = `
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
WHERE p.id > $1
ORDER BY p.id
LIMIT $2
`;

// transformation SQL line -> ES doc (aligned with mapping)
function toEsDoc(row) {
  const features = row.features || [];
  const images = row.images || [];
  const reviews = row.reviews || { rating_avg: null, review_count: 0 };

  const parts = [
    row.name, row.country, row.region,
    row.description, row.highlight,
    row.wines?.grape_variety,
    ...features.map(f => `${f.label} ${f.value || ''}`)
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

    popularity: 0,   // initial 0, will be updated from order.paid
    sales_30d: 0     // initial 0, will be updated from order.paid
  };
}

// bulk helper (in batches of 500)
async function bulkIndex(rows) {
  if (!rows.length) return;

  const body = [];
  for (const r of rows) {
    body.push({ index: { _index: ES_ALIAS, _id: r.id } });
    body.push(toEsDoc(r));
  }

  const resp = await es.bulk({ refresh: 'true', body });
  if (resp.errors) {
    // detailed logging for the first errors
    const errs = resp.items.filter(i => i.index && i.index.error).slice(0, 5);
    console.error('Bulk had errors:', JSON.stringify(errs, null, 2));
    throw new Error('Bulk indexing failed');
  }
}

async function runBackfill({ pageSize = 500 } = {}) {
  await pgClient.connect();
  console.log(`[Backfill] Start -> ES: ${ES_URL}, index/alias: ${ES_ALIAS}`);

  let lastId = 0;
  let total = 0;

  // simple pagination by ID (assumes SERIAL incremental IDs)
  while (true) {
    const { rows } = await pgClient.query(BASE_SQL, [lastId, pageSize]);
    if (rows.length === 0) break;

    await bulkIndex(rows);
    lastId = rows[rows.length - 1].id;
    total += rows.length;
    console.log(`[Backfill] Indexed ${total} products (lastId=${lastId})`);
  }

  await pgClient.end();
  console.log(`[Backfill] Done. Total indexed: ${total}`);
}

runBackfill().catch(err => {
  console.error('[Backfill] Failed:', err);
  process.exit(1);
});
