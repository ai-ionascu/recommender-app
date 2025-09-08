import axios from "axios";

const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_BASE || "/api";
const AUTH_BASE    = import.meta.env.VITE_AUTH_BASE    || "/auth";
const ORDER_BASE   = import.meta.env.VITE_ORDER_BASE   || "/api/orders";
const CART_BASE    = import.meta.env.VITE_CART_BASE    || "/api/cart";

export const http         = axios.create({ baseURL: PRODUCT_BASE });
export const authHttp     = axios.create({ baseURL: AUTH_BASE });
export const ordersHttp   = axios.create({ baseURL: ORDER_BASE });
export const cartHttp     = axios.create({ baseURL: CART_BASE });
export const publicAuthHttp = axios.create({ baseURL: "/auth" });

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

export function setAuthToken(token) {
  const value = token ? `Bearer ${token}` : null;
  for (const inst of [authHttp, ordersHttp, cartHttp, api]) {
    if (!inst) continue;
    if (value) inst.defaults.headers.common.Authorization = value;
    else delete inst.defaults.headers.common.Authorization;
  }

  // products remain public
  delete http.defaults.headers.common.Authorization;
}
setAuthToken(localStorage.getItem("token") || null);

// 401 - erase local token (the store is handling the cart)
[authHttp, ordersHttp, cartHttp, http].forEach((inst) => {
  inst.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        setAuthToken(null);
      }
      return Promise.reject(err);
    }
  );
});

// for POST/PUT/DELETE on products, attaching token if exists
http.interceptors.request.use((config) => {
  const isGet = (config.method || "get").toLowerCase() === "get";
  if (!isGet) {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
