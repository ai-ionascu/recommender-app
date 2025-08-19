import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@elastic/elasticsearch';

const ES_URL  = process.env.ES_URL  || 'http://localhost:9200';
const ES_INDEX = process.env.ES_INDEX || 'products-v1';
const ES_ALIAS = process.env.ES_ALIAS || 'products';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readMapping() {
  const mappingPath = path.join(__dirname, '../products.mapping.json');
  const raw = await fs.readFile(mappingPath, 'utf8');
  return JSON.parse(raw);
}

async function ensureIndexAndAlias() {
  const es = new Client({ node: ES_URL });

  // wait for ES to be up (simple retry)
  let attempts = 0;
  while (attempts < 20) {
    try {
      await es.ping();
      break;
    } catch {
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  if (attempts === 20) {
    throw new Error(`Elasticsearch not reachable at ${ES_URL}`);
  }

  const mapping = await readMapping();

  // create index if missing
  const exists = await es.indices.exists({ index: ES_INDEX });
  if (!exists) {
    await es.indices.create({ index: ES_INDEX, ...mapping });
    console.log(`[ES] Created index ${ES_INDEX}`);
  } else {
    console.log(`[ES] Index ${ES_INDEX} already exists`);
  }

  // ensure alias points to index
  const aliasExists = await es.indices.existsAlias({ name: ES_ALIAS }).catch(() => false);
  if (!aliasExists) {
    await es.indices.updateAliases({
      actions: [{ add: { index: ES_INDEX, alias: ES_ALIAS } }]
    });
    console.log(`[ES] Created alias ${ES_ALIAS} -> ${ES_INDEX}`);
  } else {
    // verify alias mapping
    const aliasInfo = await es.indices.getAlias({ name: ES_ALIAS });
    const currentIndices = Object.keys(aliasInfo);
    if (!currentIndices.includes(ES_INDEX)) {
      // move alias to this index (remove from others)
      const actions = currentIndices.map(i => ({ remove: { index: i, alias: ES_ALIAS } }));
      actions.push({ add: { index: ES_INDEX, alias: ES_ALIAS } });
      await es.indices.updateAliases({ actions });
      console.log(`[ES] Moved alias ${ES_ALIAS} -> ${ES_INDEX}`);
    } else {
      console.log(`[ES] Alias ${ES_ALIAS} already points to ${ES_INDEX}`);
    }
  }
}

ensureIndexAndAlias().catch(err => {
  console.error('[ES] initProductsIndex failed:', err);
  process.exit(1);
});
