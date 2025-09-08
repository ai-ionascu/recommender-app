import { http, ordersHttp } from "@/api/http";

// Basic products client (public endpoints)
export async function getProducts({ page = 1, limit = 8 } = {}) {
  const params = {
    page,
    limit,
    size: limit,
    offset: (page - 1) * limit,
  };
  const { data } = await http.get(`/products`, { params });

  if (Array.isArray(data)) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return { items: data.slice(start, end), total: data.length };
  }

  const items = data.items ?? data.results ?? data.data ?? [];
  const total = Number(data.total ?? data.count ?? items.length);
  return { items, total };
}

export async function getProductById(id) {
  const { data } = await http.get(`/products/${id}`);
  return data;
}

export async function createProduct(payload) {
  const { data } = await http.post(`/products`, payload);
  return data;
}

export async function updateProduct(id, payload) {
  const { data } = await http.put(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await http.delete(`/products/${id}`);
  return data;
}

export async function getProductReviews(id) {
  const { data } = await http.get(`/products/${id}/reviews`);
  // server poate returna {items:[]} sau []
  return Array.isArray(data) ? data : data?.items ?? [];
}

// UI gating (client-side). Serverul trebuie să verifice din nou la POST.
export async function canUserReview(productId) {
  try {
    const { data } = await ordersHttp.get("", { params: { status: "paid", limit: 50 } });
    const items = Array.isArray(data?.items) ? data.items : [];
    const found = items.some((o) =>
      Array.isArray(o?.items) && o.items.some((it) => String(it.productId) === String(productId))
    );
    return found;
  } catch {
    return false;
  }
}

export async function addProductReview(productId, payload) {
  // payload: { rating, comment }
  const { data } = await http.post(`/products/${productId}/reviews`, payload);
  return data;
}