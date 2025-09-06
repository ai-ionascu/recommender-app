// frontend/src/api/orders.js
import { ordersHttp, cartHttp } from "@/api/http";

/* =========================
 * CART (server)
 * =======================*/

// GET /api/cart
export const getCart = async () => {
  const { data } = await cartHttp.get("/");
  return data;
};

// POST /api/cart/items
export const addToCart = async ({ productId, qty }) => {
  const { data } = await cartHttp.post("/items", { productId, qty });
  return data;
};

// PUT /api/cart/items/:id
export const updateCartItem = async (itemId, qty) => {
  const { data } = await cartHttp.put(`/items/${itemId}`, { qty });
  return data;
};

// DELETE /api/cart/items/:id
export const removeCartItem = async (itemId) => {
  const { data } = await cartHttp.delete(`/items/${itemId}`);
  return data;
};

// DELETE /api/cart
export const clearCart = async () => {
  const { data } = await cartHttp.delete("/");
  return data;
};

/* =========================
 * ORDERS (server)
 * =======================*/

// Normalizăm orice formă de adresă în structura pe care o cere BE:
// { name, phone, address1, address2, city, zip, country }
function normalizeShipping(sh = {}) {
  const pick = (a, b) => (a ?? a === 0 ? a : b);

  return {
    name:      pick(sh.name,      sh.full_name),
    phone:     pick(sh.phone,     sh.telephone),
    address1:  pick(sh.address1,  sh.line1),
    address2:  pick(sh.address2,  sh.line2),
    city:      pick(sh.city,      sh.town),
    zip:       pick(sh.zip,       sh.postal_code ?? sh.postcode),
    country:   pick(sh.country,   sh.country_code ?? sh.countryCode ?? "FR"),
  };
}

/**
 * Create/update an order from the current cart, passing shipping.
 * Backend endpoint: POST /api/orders/checkout
 * Returns: { orderId, clientSecret, order }
 */
export const checkout = async (shipping) => {
  const payload = { shipping: normalizeShipping(shipping) };
  const { data } = await ordersHttp.post("/checkout", payload);
  return data;
};

// Alias mai explicit
export const saveShipping = checkout;

/**
 * Ensure (or create) a PaymentIntent for a given order.
 * POST /api/orders/:orderId/pay
 * Returns: { client_secret, intent_id, ... }
 */
export const ensurePaymentIntent = async (orderId, { idempotencyKey } = {}) => {
  const headers = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const { data } = await ordersHttp.post(`/${orderId}/pay`, null, { headers });
  return data;
};

export const startPayment = ensurePaymentIntent;

/**
 * List orders of current user
 * GET /api/orders
 */
export const listOrders = async ({ limit = 20, offset = 0, status, sort } = {}) => {
  const params = { limit, offset };
  if (status) params.status = status;
  if (sort) params.sort = sort;
  const { data } = await ordersHttp.get("/", { params });
  return data; // { items, total, limit, offset, sort }
};

/**
 * Get a single order
 * GET /api/orders/:id
 */
export const getOrder = async (orderId) => {
  const { data } = await ordersHttp.get(`/${orderId}`);
  return data;
};

export const refreshOrder = getOrder;
