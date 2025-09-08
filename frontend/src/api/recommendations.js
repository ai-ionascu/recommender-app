// frontend/src/api/recommendations.js
import { api } from "./http";

/**
 * Fetch similar products for a given product.
 * GET /reco/similar/:productId?limit=
 * Response: { items: [{ id, name, price, image, category, score }], total, fallback? }
 */
export async function getSimilar(productId, { limit = 8 } = {}) {
  if (!productId) return { items: [], total: 0 };
  const { data } = await api.get(`/reco/similar/${encodeURIComponent(productId)}`, {
    params: { limit }
  });
  return data || { items: [], total: 0 };
}

/**
 * Fetch "Frequently Bought Together" for an anchor product.
 * GET /reco/fbt/:productId?limit=
 * Response: { items: [{ id, name, price, image, score, coCount }], total }
 */
export async function getFBT(productId, { limit = 8 } = {}) {
  if (!productId) return { items: [], total: 0 };
  const { data } = await api.get(`/reco/fbt/${encodeURIComponent(productId)}`, {
    params: { limit }
  });
  return data || { items: [], total: 0 };
}
