import AppError from '../errors/AppError.js';

// Node 18+ has global fetch; fallback if needed
const _fetch = (typeof fetch === 'function') ? fetch : (await import('node-fetch')).default;

const ORDER_SVC_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:4001';
const AUTH_SVC_URL  = process.env.AUTH_SERVICE_URL  || 'http://auth-service:4000';

/**
 * Ensures the caller is authenticated and has at least one PAID order
 * that contains the target product (:id). Also injects req.body.user_id.
 */
export async function ensureBuyerOfProduct(req, _res, next) {
  try {
    const bearer = req.headers.authorization || null;
    if (!bearer) throw new AppError('Unauthorized', 401);

    // 1) Identify current user
    const prof = await _fetch(`${AUTH_SVC_URL}/auth/profile`, {
      headers: { Authorization: bearer }
    });
    if (!prof.ok) {
      const txt = await prof.text().catch(() => '');
      throw new AppError(`Unauthorized (auth-service said: ${prof.status} ${txt.slice(0,120)})`, 401);
    }
    const user = await prof.json();
    const userId = String(user?.id || '').trim();  // UUID from auth-service
    if (!userId) throw new AppError('Unauthorized', 401);
    // Inject user_id (UUID) for validation + repo
    req.body.user_id = userId;

    // 2) Check paid orders contain this product
    const url = new URL(`${ORDER_SVC_URL}/orders`);
    url.searchParams.set('status', 'paid');
    url.searchParams.set('limit', '100');

    const r = await _fetch(url, { headers: { Authorization: bearer } });
    if (!r.ok) throw new AppError('Forbidden', 403);

    const data = await r.json();
    const orders = Array.isArray(data?.items) ? data.items : [];
    const pidNum = Number(req.params.id);
    const pidStr = String(pidNum);

    const bought = orders.some(o =>
      Array.isArray(o?.items) &&
      o.items.some(it =>
        String(it?.productId) === pidStr || Number(it?.productId) === pidNum
      )
    );

    if (!bought) {
      throw new AppError('Only customers who purchased this product can write a review.', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
}
