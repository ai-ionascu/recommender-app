import { ordersHttp } from "@/api/http";

// q: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }
export async function getAnalyticsSummary(q = {}) {
  const { data } = await ordersHttp.get("/analytics/summary", { params: q });
  return data;
}

export async function getSalesDaily(q = {}) {
  const { data } = await ordersHttp.get("/analytics/sales-daily", { params: q });
  return data?.items || [];
}

export async function getTopProducts(q = {}) {
  const { data } = await ordersHttp.get("/analytics/top-products", { params: q });
  return data?.items || [];
}

export async function getTopCustomers(q = {}) {
  const { data } = await ordersHttp.get("/analytics/top-customers", { params: q });
  return data?.items || [];
}
