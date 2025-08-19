import 'dotenv/config.js';
import { Client } from '@elastic/elasticsearch';

const {
  ES_URL = 'http://localhost:9200',
  ES_ALIAS = 'products'
} = process.env;

export const es = new Client({ 
    node: ES_URL
});
export const INDEX_ALIAS = ES_ALIAS;

// optional: health call with retry (for simultaneous start with docker compose).
// can call it at the service boot (e.g. in server.js) before starting the worker.

export async function waitForElasticsearch({ retries = 20, delayMs = 1000 } = {}) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      await es.ping();
      return true;
    } catch {
      attempt += 1;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Elasticsearch not reachable at ${ES_URL}`);
}

// small helper for searches; used by the controller.

export async function search(body) {
  return es.search({ index: INDEX_ALIAS, body });
}

// helper for index/upsert; used by worker/event sync.

export async function indexDoc(id, document, { refresh = 'false' } = {}) {
  return es.index({ index: INDEX_ALIAS, id, document, refresh });
}

// helper for delete; used by worker/event sync.
export async function deleteDoc(id) {
  return es.delete({ index: INDEX_ALIAS, id }).catch(() => null);
}
