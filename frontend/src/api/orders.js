import { ordersHttp, cartHttp } from "@/api/http";

// CART (server)
export const getCart = async () => {
  const { data } = await cartHttp.get("/");                 // GET /api/cart
  return data;
};

export const addToCart = async ({ productId, qty }) => {
  const { data } = await cartHttp.post("/items", { productId, qty }); // POST /api/cart/items
  return data;
};

export const updateCartItem = async (itemId, qty) => {
  const { data } = await cartHttp.put(`/items/${itemId}`, { qty });   // PUT /api/cart/items/:id
  return data;
};

export const removeCartItem = async (itemId) => {
  const { data } = await cartHttp.delete(`/items/${itemId}`);         // DELETE /api/cart/items/:id
  return data;
};

export const clearCart = async () => {
  const { data } = await cartHttp.delete("/");   // DELETE /api/cart
  return data;
};

// ORDERS (server)

// Create an order from the current cart
export const checkout = async () => {
  const { data } = await ordersHttp.post("/checkout");               // POST /api/orders/checkout
  // Backend returns the whole order doc; caller should extract id/_id.
  return data; 
};

// List orders (current user)
export const listOrders = async (params = {}) => {
  const { data } = await ordersHttp.get("/", { params });            // GET /api/orders
  return data; // { items: [...] } or [...]
};

// Get a single order
export const getOrder = async (orderId) => {
  const { data } = await ordersHttp.get(`/${orderId}`);              // GET /api/orders/:id
  return data;
};

// Ensure / create PaymentIntent for an order
export const ensurePaymentIntent = async (orderId, { idempotencyKey } = {}) => {
  const headers = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;   // optional idempotency
  const { data } = await ordersHttp.post(`/${orderId}/pay`, null, { headers }); // POST /api/orders/:id/pay
  return data; // { client_secret, intent_id, ... }
};
